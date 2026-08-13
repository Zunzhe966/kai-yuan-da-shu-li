import {
  applyD1Migrations,
  env,
  SELF,
  type D1Migration,
} from "cloudflare:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
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

async function seedEditor(): Promise<void> {
  await testEnv.DB.prepare(
    `INSERT INTO actors (actor_id, actor_type, display_name)
     VALUES ('actor-mcp-editor', 'agent', 'MCP Editor')`,
  ).run();
  await testEnv.DB.prepare(
    `INSERT INTO api_credentials (
      credential_id, actor_id, token_hash, scopes_json, created_at
    ) VALUES ('credential-mcp-editor', 'actor-mcp-editor', ?, ?, ?)`,
  )
    .bind(
      await hashBearerToken("mcp-editor-token"),
      JSON.stringify(["draft:create", "draft:update", "evidence:add"]),
      TEST_NOW,
    )
    .run();
}

async function connectClient(token?: string): Promise<Client> {
  const client = new Client({ name: "platform-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL("https://example.test/mcp"),
    {
      requestInit: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
      fetch: (input, init) => SELF.fetch(new Request(input, init)),
    },
  );
  await client.connect(transport);
  return client;
}

function structured<T>(result: unknown): T {
  return (result as { structuredContent?: unknown }).structuredContent as T;
}

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
  await seedEditor();
  await projects.insertRevision(
    testEnv.DB,
    projectFixture({
      projectId: "project-mcp-published",
      repositoryId: "repository-mcp-published",
      status: "published",
    }),
  );
});

describe("remote MCP capabilities", () => {
  it("initializes and exposes public discovery tools", async () => {
    const client = await connectClient();
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "get_capabilities",
        "get_catalog_meta",
        "search_projects",
        "get_project",
        "search_creators",
        "get_creator",
        "find_similar_projects",
        "check_repository",
        "report_project_change",
        "get_public_report_status",
      ]),
    );
    expect(tools.tools.map((tool) => tool.name)).not.toContain(
      "create_project_draft",
    );

    const capabilities = structured<{
      actor_id: string;
      scopes: string[];
      schema_version: string;
    }>(await client.callTool({ name: "get_capabilities", arguments: {} }));
    expect(capabilities).toMatchObject({
      actor_id: "public",
      scopes: [],
      schema_version: "project-publication-v1",
    });
    await client.close();
  });

  it("searches and reads the same published project as the public API", async () => {
    const client = await connectClient();
    const search = structured<{ items: Array<{ project_id: string }> }>(
      await client.callTool({
        name: "search_projects",
        arguments: { query: "Aider" },
      }),
    );
    const project = structured<{ project_id: string }>(
      await client.callTool({
        name: "get_project",
        arguments: { project_id: "project-mcp-published" },
      }),
    );

    expect(search.items[0]?.project_id).toBe("project-mcp-published");
    expect(project.project_id).toBe("project-mcp-published");
    await client.close();
  });

  it("does not allow a public session to call hidden write tools", async () => {
    const client = await connectClient();
    const denied = await client.callTool({
      name: "create_project_draft",
      arguments: {},
    });
    expect(denied).toMatchObject({ isError: true });
    expect(JSON.stringify(denied)).toContain("Tool create_project_draft not found");
    await client.close();
  });

  it("submits and reads an isolated change report as a public session", async () => {
    const client = await connectClient();
    const submitted = structured<{ report_id: string; status: string }>(
      await client.callTool({
        name: "report_project_change",
        arguments: {
          project_id: "project-mcp-published",
          baseline_revision: 1,
          report_type: "repository_redirected",
          upstream_fingerprint: "redirect:new-owner",
          evidence_url: "https://github.com/new-owner/project",
          observed_value: { canonical_url: "https://github.com/new-owner/project" },
          observed_at: TEST_NOW,
        },
      }),
    );
    const status = structured<{ report_id: string; status: string }>(
      await client.callTool({
        name: "get_public_report_status",
        arguments: { report_id: submitted.report_id },
      }),
    );

    expect(submitted.status).toBe("received");
    expect(status).toMatchObject({
      report_id: submitted.report_id,
      status: "received",
    });
    await client.close();
  });

  it("checks a repository, creates a draft and edits one fixed section", async () => {
    const client = await connectClient("mcp-editor-token");
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "create_project_draft",
        "open_project_workspace",
        "update_project_fields",
        "upsert_project_section",
        "link_creator",
        "add_evidence",
        "preview_project",
        "submit_project_for_review",
        "revise_project_draft",
        "get_project_history",
      ]),
    );

    const checked = structured<{
      status: string;
      creation_ticket: string;
    }>(
      await client.callTool({
        name: "check_repository",
        arguments: {
          repository_url: "https://github.com/example/mcp-new",
          platform_repository_id: "repository-mcp-new",
        },
      }),
    );
    expect(checked.status).toBe("new_repository");
    expect(checked.creation_ticket).toBeTruthy();

    const document = projectFixture({
      projectId: "project-mcp-new",
      repositoryId: "repository-mcp-new",
    });
    document.repository_sources[0]!.canonical_url =
      "https://github.com/example/mcp-new";
    document.repository_sources[0]!.full_name = "example/mcp-new";
    await client.callTool({
      name: "create_project_draft",
      arguments: {
        draft_id: "draft-mcp-new",
        creation_ticket: checked.creation_ticket,
        document,
      },
    });
    await client.callTool({
      name: "upsert_project_section",
      arguments: {
        draft_id: "draft-mcp-new",
        base_revision: 0,
        section_key: "overview",
        section: {
          ...document.sections.overview,
          state: "inferred",
          summary: "由远程 MCP 更新的项目概览",
          evidence_ids: [],
          confidence: "medium",
        },
      },
    });

    expect(
      (await workflow.getDraft(testEnv.DB, "draft-mcp-new"))?.document.sections
        .overview.summary,
    ).toBe("由远程 MCP 更新的项目概览");
    await client.close();
  });

  it("runs the full check→create→section→creator→evidence→submit pipeline", async () => {
    const client = await connectClient("mcp-editor-token");

    // 1. 查重 → 拿到创建票据
    const checked = structured<{ status: string; creation_ticket: string }>(
      await client.callTool({
        name: "check_repository",
        arguments: {
          repository_url: "https://github.com/example/mcp-pipeline",
          platform_repository_id: "repository-mcp-pipeline",
        },
      }),
    );
    expect(checked.status).toBe("new_repository");
    expect(checked.creation_ticket).toBeTruthy();

    // 2. 建草稿
    const document = projectFixture({
      projectId: "project-mcp-pipeline",
      repositoryId: "repository-mcp-pipeline",
    });
    document.repository_sources[0]!.canonical_url =
      "https://github.com/example/mcp-pipeline";
    document.repository_sources[0]!.full_name = "example/mcp-pipeline";
    await client.callTool({
      name: "create_project_draft",
      arguments: {
        draft_id: "draft-mcp-pipeline",
        creation_ticket: checked.creation_ticket,
        document,
      },
    });

    const currentRev = async () =>
      (await workflow.getDraft(testEnv.DB, "draft-mcp-pipeline"))?.baseRevision ??
      0;

    // 3. 填栏目正文
    await client.callTool({
      name: "upsert_project_section",
      arguments: {
        draft_id: "draft-mcp-pipeline",
        base_revision: await currentRev(),
        section_key: "overview",
        section: {
          ...document.sections.overview,
          state: "inferred",
          summary: "一条龙项目概览",
          evidence_ids: ["repo-readme"],
          confidence: "medium",
        },
      },
    });

    // 4. 关联作者
    await client.callTool({
      name: "link_creator",
      arguments: {
        draft_id: "draft-mcp-pipeline",
        base_revision: await currentRev(),
        creator_id: "creator-pipeline",
        role: "maintainer",
        evidence_ids: ["repo-readme"],
      },
    });

    // 5. 加证据
    await client.callTool({
      name: "add_evidence",
      arguments: {
        draft_id: "draft-mcp-pipeline",
        base_revision: await currentRev(),
        evidence: {
          evidence_id: "release-notes",
          url: "https://github.com/example/mcp-pipeline/releases",
          source_type: "release_notes",
          retrieved_at: TEST_NOW,
          supports: ["card.summary"],
          fact_summary: "发布说明",
          applicable_version: null,
          content_hash: null,
        },
      },
    });

    // 6. 提交审核
    const submitted = structured<{ draft_id: string; status: string }>(
      await client.callTool({
        name: "submit_project_for_review",
        arguments: {
          draft_id: "draft-mcp-pipeline",
          base_revision: await currentRev(),
          risk_level: "low",
        },
      }),
    );
    expect(submitted).toMatchObject({
      draft_id: "draft-mcp-pipeline",
      status: "in_review",
    });

    const draft = await workflow.getDraft(testEnv.DB, "draft-mcp-pipeline");
    expect(draft?.status).toBe("in_review");
    expect(draft?.document.attribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ creator_id: "creator-pipeline", role: "maintainer" }),
      ]),
    );
    expect(draft?.document.evidence.map((e) => e.evidence_id)).toContain(
      "release-notes",
    );
    await client.close();
  });
});
