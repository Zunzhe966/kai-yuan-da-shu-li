import {
  applyD1Migrations,
  env,
  SELF,
  type D1Migration,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { hashBearerToken } from "../src/http/auth";
import * as projects from "../src/storage/projects";
import * as workflow from "../src/storage/workflow";
import { projectFixture, TEST_NOW } from "./factories";

interface TestEnv {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
}

const testEnv = env as unknown as TestEnv;

async function seedCredential(
  actorId: string,
  token: string,
  scopes: string[],
): Promise<void> {
  await testEnv.DB.prepare(
    `INSERT INTO actors (actor_id, actor_type, display_name)
     VALUES (?, 'agent', ?)
     ON CONFLICT(actor_id) DO NOTHING`,
  )
    .bind(actorId, actorId)
    .run();
  await testEnv.DB.prepare(
    `INSERT INTO api_credentials (
      credential_id, actor_id, token_hash, scopes_json, created_at
    ) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      `credential-${actorId}`,
      actorId,
      await hashBearerToken(token),
      JSON.stringify(scopes),
      TEST_NOW,
    )
    .run();
}

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
  await seedCredential("actor-studio-editor", "studio-editor", [
    "draft:create",
    "draft:update",
    "evidence:add",
  ]);
  await seedCredential("actor-studio-publisher", "studio-publisher", [
    "draft:update",
    "review:approve",
    "publish",
  ]);

  const published = projectFixture({
    projectId: "project-studio",
    repositoryId: "repository-studio",
    status: "published",
  });
  await projects.insertRevision(testEnv.DB, published);
  const draft = projectFixture({
    projectId: "project-studio",
    repositoryId: "repository-studio",
    revision: 2,
  });
  draft.card.summary = "只存在于控制台草稿的摘要";
  draft.sections.overview.summary = "草稿预览专用概览";
  await workflow.createDraft(testEnv.DB, {
    draftId: "draft-studio",
    projectId: "project-studio",
    baseRevision: 1,
    document: draft,
    actorId: "actor-studio-editor",
    createdAt: TEST_NOW,
  });
  await workflow.createDraft(testEnv.DB, {
    draftId: "draft-studio-action",
    projectId: null,
    baseRevision: 0,
    document: projectFixture({
      projectId: "project-studio-action",
      repositoryId: "repository-studio-action",
    }),
    actorId: "actor-studio-editor",
    createdAt: TEST_NOW,
  });
});

describe("internal agent editorial studio", () => {
  it("rejects unauthenticated callers", async () => {
    const response = await SELF.fetch("https://example.test/studio");
    expect(response.status).toBe(401);
  });

  it("shows authorized actors the editorial queue", async () => {
    const response = await SELF.fetch("https://example.test/studio", {
      headers: { Authorization: "Bearer studio-editor" },
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("智能体编辑台");
    expect(html).toContain("draft-studio");
    expect(html).toContain("draft");
  });

  it("renders every fixed project workspace tab", async () => {
    const response = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio",
      { headers: { Authorization: "Bearer studio-editor" } },
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    for (const label of [
      "基本资料",
      "仓库来源",
      "作者与组织",
      "搜索与筛选",
      "卡片",
      "固定正文栏目",
      "证据",
      "变化报告",
      "版本差异",
      "公开预览",
      "审核与发布",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("base revision 1");
    expect(html).toContain(
      '/studio/projects/draft-studio/tabs/identity',
    );
  });

  it.each([
    ["identity", "基本资料"],
    ["repositories", "仓库来源"],
    ["creators", "作者与组织"],
    ["discovery", "搜索与筛选"],
    ["card", "卡片"],
    ["evidence", "证据"],
    ["reports", "变化报告"],
    ["diff", "版本差异"],
    ["review", "审核与发布"],
  ])("opens the %s workspace tab", async (tab, label) => {
    const response = await SELF.fetch(
      `https://example.test/studio/projects/draft-studio/tabs/${tab}`,
      { headers: { Authorization: "Bearer studio-editor" } },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain(label);
  });

  it("previews the draft without changing the public revision", async () => {
    const preview = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio/preview",
      { headers: { Authorization: "Bearer studio-editor" } },
    );
    const publicPage = await SELF.fetch(
      "https://example.test/projects/project-studio",
    );

    expect(await preview.text()).toContain("只存在于控制台草稿的摘要");
    expect(await publicPage.text()).not.toContain("只存在于控制台草稿的摘要");
  });

  it("shows publishing controls only to a publishing identity", async () => {
    const editorResponse = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio",
      { headers: { Authorization: "Bearer studio-editor" } },
    );
    const publisherResponse = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio",
      { headers: { Authorization: "Bearer studio-publisher" } },
    );

    expect(await editorResponse.text()).not.toContain('data-action="publish"');
    expect(await publisherResponse.text()).toContain('data-action="publish"');
  });

  it("saves one fixed section through the scoped workflow service", async () => {
    const response = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio/sections/overview",
      {
        method: "POST",
        redirect: "manual",
        headers: {
          Authorization: "Bearer studio-editor",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          base_revision: "1",
          state: "inferred",
          summary: "通过编辑台保存的新概览",
          body: "这是固定栏目正文。",
          confidence: "medium",
        }),
      },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "/studio/projects/draft-studio/sections/overview",
    );
    const stored = await workflow.getDraft(testEnv.DB, "draft-studio");
    expect(stored?.document.sections.overview).toMatchObject({
      state: "inferred",
      summary: "通过编辑台保存的新概览",
      body: "这是固定栏目正文。",
      confidence: "medium",
    });
  });

  it("saves an allowed structured project group", async () => {
    const stored = await workflow.getDraft(testEnv.DB, "draft-studio");
    const card = { ...stored!.document.card, summary: "通过卡片标签保存的摘要" };
    const response = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio/tabs/card",
      {
        method: "POST",
        redirect: "manual",
        headers: {
          Authorization: "Bearer studio-editor",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          base_revision: "1",
          value_json: JSON.stringify(card),
        }),
      },
    );

    expect(response.status).toBe(303);
    expect(
      (await workflow.getDraft(testEnv.DB, "draft-studio"))?.document.card.summary,
    ).toBe("通过卡片标签保存的摘要");
  });

  it("submits, independently approves and publishes through Studio actions", async () => {
    const editorHeaders = { Authorization: "Bearer studio-editor" };
    const publisherHeaders = { Authorization: "Bearer studio-publisher" };
    const submit = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio-action/actions/submit",
      { method: "POST", redirect: "manual", headers: editorHeaders },
    );
    expect(submit.status).toBe(303);
    expect((await workflow.getDraft(testEnv.DB, "draft-studio-action"))?.status).toBe(
      "in_review",
    );

    const approve = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio-action/actions/approve",
      { method: "POST", redirect: "manual", headers: publisherHeaders },
    );
    expect(approve.status).toBe(303);
    expect((await workflow.getDraft(testEnv.DB, "draft-studio-action"))?.status).toBe(
      "approved",
    );

    const publish = await SELF.fetch(
      "https://example.test/studio/projects/draft-studio-action/actions/publish",
      { method: "POST", redirect: "manual", headers: publisherHeaders },
    );
    expect(publish.status).toBe(303);
    expect(
      (await workflow.getDraft(testEnv.DB, "draft-studio-action"))?.status,
    ).toBe("published");
    expect(
      (
        await SELF.fetch(
          "https://example.test/projects/project-studio-action",
        )
      ).status,
    ).toBe(200);
  });
});
