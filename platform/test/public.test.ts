import {
  applyD1Migrations,
  env,
  SELF,
  type D1Migration,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { SECTION_KEYS } from "../src/domain/project";
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
  project.sections.background_and_history = {
    ...project.sections.background_and_history,
    state: "unknown",
    summary: "旧记录未提供该栏目，等待深度核验。",
    body: "",
    evidence_ids: [],
    confidence: "low",
  };
  project.attribution = [
    { creator_id: "person-aider", role: "creator", evidence_ids: ["repo-readme"] },
    { creator_id: "org-aider", role: "organization", evidence_ids: [] },
  ];
  project.discovery.capabilities = ["coding,assistant", "pair", "cli"];
  project.discovery.project_types = ["cli"];
  await projects.insertRevision(testEnv.DB, project);
  await creators.upsertCreator(testEnv.DB, {
    creatorId: "person-aider",
    type: "person",
    name: "Aider",
    displayName: "Aider 创建者",
    biography: "Aider 项目的创建者。",
    aliases: [],
    officialSites: ["javascript:alert(1)"],
    socialProfiles: [{ platform: "homepage", url: "https://aider.chat/" }],
    codeHostIdentities: [],
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
    codeHostIdentities: [],
  });
  await creators.replaceProjectRoles(testEnv.DB, "project-aider", project.attribution);
});

describe("public project experience", () => {
  it("renders the searchable catalog as the first screen", async () => {
    const response = await SELF.fetch("https://example.test/?q=Aider");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("开源大梳理");
    expect(html).toContain('role="search"');
    expect(html).toContain("Aider AI 编程助手");
    expect(html).toContain("找到 1 个项目");
    expect(html).toContain("<main");
    expect(html).toContain("<aside");
    expect(html).toContain("book-cover");
    expect(html).toContain("tag-list");
    expect(html.toLowerCase()).not.toContain("sponsored");
  });

  it("renders all fixed sections in template order", async () => {
    const response = await SELF.fetch(
      "https://example.test/projects/project-aider",
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    let previousIndex = -1;
    for (const key of SECTION_KEYS) {
      const index = html.indexOf(`data-section="${key}"`);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
    expect(html).toContain("待深度核验");
    expect(html).toContain("证据与来源");
    expect(html).toContain("作者与组织");
    expect(html).toContain("标签");
    // 广告坑位固定：左右广告轨 + 多个固定槽（位置与数量固定，不挡内容）
    expect(html).toContain("ad-rail-left");
    expect(html).toContain("ad-rail-right");
    expect(html).toContain("data-ad-slot");
  });

  it("does not render unsafe external URLs", async () => {
    const response = await SELF.fetch(
      "https://example.test/creators/person-aider",
    );
    const html = await response.text();
    expect(html).not.toContain("javascript:");
    expect(html).toContain("https://aider.chat/");
    const projectHtml = await (
      await SELF.fetch("https://example.test/projects/project-aider")
    ).text();
    expect(projectHtml).toContain("person-aider");
    expect(projectHtml).toContain("org-aider");
  });

  it("round-trips tags containing commas through filter links", async () => {
    const detail = await SELF.fetch(
      "https://example.test/projects/project-aider",
    );
    const html = await detail.text();
    expect(html).toContain(
      '/?capability=coding%2Cassistant',
    );
    const filtered = await SELF.fetch(
      "https://example.test/?capability=coding%2Cassistant",
    );
    const filteredHtml = await filtered.text();
    expect(filteredHtml).toContain("Aider AI 编程助手");
  });

  it("serves the same published record through the API", async () => {
    const response = await SELF.fetch(
      "https://example.test/api/v1/projects/project-aider",
    );
    const payload = (await response.json()) as {
      project_id: string;
      publication: { revision: number };
    };

    expect(response.status).toBe(200);
    expect(payload.project_id).toBe("project-aider");
    expect(payload.publication.revision).toBe(1);
  });

  it("searches through one structured API contract", async () => {
    const response = await SELF.fetch(
      "https://example.test/api/v1/search?q=Aider&domain=devtools&language=Python",
    );
    const payload = (await response.json()) as {
      total: number;
      items: Array<{ project_id: string }>;
      facets?: Record<string, Record<string, number>>;
    };

    expect(response.status).toBe(200);
    expect(payload.total).toBe(1);
    expect(payload.items[0]?.project_id).toBe("project-aider");
    expect(payload.items[0]).not.toHaveProperty("sponsored");
    // facet 计数：基于当前条件（domain=devtools & language=Python）返回各维度分布
    expect(payload.facets).toBeDefined();
    expect(payload.facets?.["language"]).toBeDefined();
    expect(payload.facets?.["language"]?.["Python"]).toBeGreaterThan(0);
  });

  it.each(["/robots.txt", "/sitemap.xml", "/llms.txt", "/openapi.json"])(
    "serves discovery endpoint %s",
    async (path) => {
      const response = await SELF.fetch(`https://example.test${path}`);
      expect(response.status).toBe(200);
      expect((await response.text()).length).toBeGreaterThan(20);
    },
  );
});
