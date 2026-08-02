import {
  applyD1Migrations,
  env,
  SELF,
  type D1Migration,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { SECTION_KEYS } from "../src/domain/project";
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
  await projects.insertRevision(testEnv.DB, project);
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
    };

    expect(response.status).toBe(200);
    expect(payload.total).toBe(1);
    expect(payload.items[0]?.project_id).toBe("project-aider");
    expect(payload.items[0]).not.toHaveProperty("sponsored");
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
