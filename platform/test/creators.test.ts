import {
  applyD1Migrations,
  env,
  SELF,
  type D1Migration,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import * as creators from "../src/storage/creators";
import * as projects from "../src/storage/projects";
import { projectFixture } from "./factories";

interface TestEnv {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
}

const testEnv = env as unknown as TestEnv;

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
  const project = projectFixture({ status: "published" });
  project.attribution = [
    { creator_id: "person-aider", role: "creator", evidence_ids: ["repo-readme"] },
    { creator_id: "org-aider", role: "organization", evidence_ids: ["repo-readme"] },
  ];
  await projects.insertRevision(testEnv.DB, project);
  await creators.upsertCreator(testEnv.DB, {
    creatorId: "person-aider",
    type: "person",
    name: "Aider",
    displayName: "Aider 创建者",
    biography: "Aider 项目的创建者。",
    aliases: ["aider maintainer"],
    officialSites: ["https://aider.chat/"],
    socialProfiles: [],
    codeHostIdentities: ["github:Aider-AI"],
  });
  await creators.upsertCreator(testEnv.DB, {
    creatorId: "org-aider",
    type: "organization",
    name: "Aider",
    displayName: "Aider AI",
    biography: "维护 Aider 的组织。",
    aliases: [],
    officialSites: ["https://aider.chat/"],
    socialProfiles: [],
    codeHostIdentities: ["github:Aider-AI"],
  });
  await creators.replaceProjectRoles(testEnv.DB, "project-aider", project.attribution);
});

describe("creator identity and aggregation", () => {
  it("keeps same-name person and organization identities separate", async () => {
    const results = await creators.searchCreators(testEnv.DB, "Aider");

    expect(results.map((item) => [item.creatorId, item.type])).toEqual([
      ["org-aider", "organization"],
      ["person-aider", "person"],
    ]);
  });

  it("searches creators through the public API", async () => {
    const response = await SELF.fetch(
      "https://example.test/api/v1/search?entity=creator&q=Aider",
    );
    const payload = (await response.json()) as {
      creators: Array<{ creator_id: string; type: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.creators).toEqual([
      expect.objectContaining({ creator_id: "org-aider", type: "organization" }),
      expect.objectContaining({ creator_id: "person-aider", type: "person" }),
    ]);
  });

  it("renders curated projects before explicitly unreviewed repositories", async () => {
    const response = await SELF.fetch("https://example.test/creators/person-aider");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Aider 创建者");
    expect(html).toContain("创建者");
    expect(html.indexOf("本站精选项目")).toBeLessThan(
      html.indexOf("其他公开仓库，尚未深度整理"),
    );
    expect(html).toContain("Aider AI 编程助手");
  });

  it("serves objective creator data and explicit roles through the API", async () => {
    const response = await SELF.fetch(
      "https://example.test/api/v1/creators/person-aider",
    );
    const payload = (await response.json()) as {
      creator_id: string;
      type: string;
      projects: Array<{ role: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.creator_id).toBe("person-aider");
    expect(payload.type).toBe("person");
    expect(payload.projects[0]?.role).toBe("creator");
  });
});
