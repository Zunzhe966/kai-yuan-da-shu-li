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
});
