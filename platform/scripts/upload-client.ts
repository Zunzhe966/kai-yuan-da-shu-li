#!/usr/bin/env node
/**
 * 独立上传客户端（作家助手式 · CLI）
 *
 * 智能体通过本客户端直接操控平台 MCP 面完成"上传投稿"，
 * 不需要网页自动化去点网站。命令：
 *
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> list
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> check --url <repoUrl> --id <platformRepositoryId>
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> create --url <repoUrl> --id <platformRepositoryId> --draft <draftId> --name ... --chinese-name ... --summary ... --use-when ... --avoid-when ... --category ... [--domain ...]
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> set-fields <draftId> --base <n> --group <group> --value '<json>'
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> set-section <draftId> --base <n> --key <sectionKey> --value '<json>'
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> submit <draftId> --base <n> [--risk low|high]
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> approve <submissionId>
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> publish <draftId>
 *
 * 依赖平台 MCP 工具：check_repository / create_project_draft / update_project_fields
 *   / upsert_project_section / submit_project_for_review
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { normalizeGithubRepository } from "../src/services/repositories";
import { SECTION_KEYS, type ProjectPublication } from "../src/domain/project";

function usage(exitCode: number): never {
  console.error(`用法:
  ${process.argv[1]} <mcp-url> <api-key> list
  ${process.argv[1]} <mcp-url> <api-key> check --url <repoUrl> --id <platformRepositoryId>
  ${process.argv[1]} <mcp-url> <api-key> create --url <repoUrl> --id <platformRepositoryId> --draft <draftId> --name ... --chinese-name ... --summary ... --use-when ... --avoid-when ... --category ... [--domain ...]
  ${process.argv[1]} <mcp-url> <api-key> set-fields <draftId> --base <n> --group <group> --value '<json>'
  ${process.argv[1]} <mcp-url> <api-key> set-section <draftId> --base <n> --key <sectionKey> --value '<json>'
  ${process.argv[1]} <mcp-url> <api-key> submit <draftId> --base <n> [--risk low|high]
  ${process.argv[1]} <mcp-url> <api-key> approve <submissionId>
  ${process.argv[1]} <mcp-url> <api-key> publish <draftId>`);
  process.exit(exitCode);
}

function flags(args: string[]): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i]?.startsWith("--")) {
      const key = args[i]!.slice(2);
      const values: string[] = [];
      while (i + 1 < args.length && !args[i + 1]!.startsWith("--")) {
        values.push(args[++i]!);
      }
      out[key] = values.length === 1 ? values[0]! : values;
    }
  }
  return out;
}

function flagValue(flags: Record<string, string | string[]>, key: string): string {
  const value = flags[key];
  if (typeof value !== "string") {
    throw new Error(`missing --${key}`);
  }
  return value;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length < 3) usage(1);
  const [mcpUrl, apiKey, command, ...rest] = argv as [
    string,
    string,
    string,
    ...string[],
  ];

  const client = new Client({ name: "upload-client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  await client.connect(transport);

  const call = async (
    tool: string,
    args: Record<string, unknown>,
  ): Promise<void> => {
    const res = await client.callTool({ name: tool, arguments: args });
    console.log(JSON.stringify(res.content, null, 2));
  };

  switch (command) {
    case "list": {
      const tools = await client.listTools();
      for (const t of tools.tools) {
        console.log(`- ${t.name}: ${t.description ?? ""}`);
      }
      break;
    }
    case "check": {
      const f = flags(rest);
      if (!f.url || !f.id) usage(1);
      await call("check_repository", {
        repository_url: f.url,
        platform_repository_id: f.id,
      });
      break;
    }
    case "create": {
      const f = flags(rest);
      if (!f.url || !f.id || !f.draft || !f.name || !f.summary) usage(1);
      const normalized = normalizeGithubRepository(f.url as string);
      const checked = await client.callTool({
        name: "check_repository",
        arguments: {
          repository_url: normalized.canonicalUrl,
          platform_repository_id: f.id as string,
        },
      });
      const content = checked.content as Array<{ type?: string; text?: string }>;
      const checkedJson = JSON.parse(
        String(content.find((item) => item.type === "text")?.text ?? "{}"),
      ) as { status?: string; creation_ticket?: string; existing_draft_id?: string };
      if (checkedJson.status !== "new_repository" || !checkedJson.creation_ticket) {
        throw new Error(
          `repository is not new: ${checkedJson.status ?? "unknown"}${checkedJson.existing_draft_id ? ` draft=${checkedJson.existing_draft_id}` : ""}`,
        );
      }
      const now = new Date().toISOString();
      const evidenceId = `github-repository-${f.id as string}`;
      const unknownSection = () => ({
        state: "unknown" as const,
        summary: "尚未完成该栏目研究，等待智能体补充证据与正文。",
        body: "",
        key_points: [] as string[],
        evidence_ids: [] as string[],
        confidence: "low" as const,
        updated_at: now,
      });
      const document: ProjectPublication = {
        schema_version: "project-publication-v1",
        project_id: f.draft as string,
        record_state: "draft",
        repository_sources: [
          {
            platform: "github",
            platform_repository_id: f.id as string,
            canonical_url: normalized.canonicalUrl,
            full_name: normalized.fullName,
            role: "primary",
            visibility: "public",
            default_branch: null,
            observed_oid: null,
            created_at: null,
            updated_at: null,
            pushed_at: null,
            observed_at: now,
            is_fork: false,
            mirror_url: null,
            archived: false,
            disabled: false,
            evidence_ids: [evidenceId],
          },
        ],
        identity: {
          name: f.name as string,
          chinese_name: (f["chinese-name"] as string) || null,
          aliases: [],
          former_names: [],
          objective_definition: f.summary as string,
          website_url: null,
          documentation_url: null,
          demo_url: null,
          download_url: null,
          first_published_at: null,
          lifecycle: "unknown",
          visual: {
            url: null,
            kind: "none",
            source_url: null,
            usage_basis: "not_provided",
          },
        },
        attribution: [],
        discovery: {
          domains: f.domain ? [f.domain as string] : [],
          subcategories: [],
          tasks: [],
          capabilities: [],
          project_types: [],
          languages: [],
          frameworks: [],
          runtimes: [],
          protocols: [],
          delivery_methods: ["source"],
          package_formats: [],
          operating_systems: [],
          runtime_targets: [],
          hardware_requirements: [],
          natural_languages: [],
          open_source_nature: "open_source",
          licenses: [],
          maturity: "unknown",
          maintenance_status: "unknown",
          latest_activity_at: null,
          search_aliases: [],
          canonical_keywords: [],
        },
        card: {
          name: f.name as string,
          chinese_name: (f["chinese-name"] as string) || null,
          summary: f.summary as string,
          use_when: (f["use-when"] as string) || "",
          avoid_when: (f["avoid-when"] as string) || "",
          primary_category: (f.category as string) || "未分类",
          primary_language: null,
          license: null,
          maintenance_status: "unknown",
          primary_creator: null,
          verification_status: "inferred",
          verified_at: null,
        },
        sections: Object.fromEntries(
          SECTION_KEYS.map((key) => [key, unknownSection()]),
        ) as ProjectPublication["sections"],
        evidence: [
          {
            evidence_id: evidenceId,
            url: normalized.canonicalUrl,
            source_type: "repository_readme",
            retrieved_at: now,
            supports: ["repository_sources"],
            fact_summary: "GitHub public repository identity.",
            applicable_version: null,
            content_hash: null,
          },
        ],
        field_states: {
          repository_sources: "verified",
          "identity.objective_definition": "inferred",
          card: "inferred",
          discovery: "inferred",
        },
        editorial: {
          researcher_actor_ids: ["local-editor"],
          editor_actor_ids: ["local-editor"],
          reviewer_actor_ids: [],
          work_notes: "由上传客户端建立，等待逐栏目研究。",
          internal_notes: "",
        },
        publication: {
          base_revision: 0,
          revision: 1,
          status: "draft",
          review_decision: null,
          published_at: null,
          withdrawn_reason: null,
          superseded_by_revision: null,
          migration_status: "native",
        },
      };
      await call("create_project_draft", {
        draft_id: f.draft,
        creation_ticket: checkedJson.creation_ticket,
        document,
      });
      console.log(`created draft ${f.draft}`);
      break;
    }
    case "set-fields": {
      const draftId = rest[0];
      const f = flags(rest.slice(1));
      if (!draftId || !f.base || !f.group || !f.value) usage(1);
      await call("update_project_fields", {
        draft_id: draftId,
        base_revision: Number(f.base),
        group: f.group,
        value: JSON.parse(f.value as string),
      });
      break;
    }
    case "set-section": {
      const draftId = rest[0];
      const f = flags(rest.slice(1));
      if (!draftId || !f.base || !f.key || !f.value) usage(1);
      await call("upsert_project_section", {
        draft_id: draftId,
        base_revision: Number(f.base),
        section_key: f.key,
        section: JSON.parse(f.value as string),
      });
      break;
    }
    case "submit": {
      const draftId = rest[0];
      const f = flags(rest.slice(1));
      if (!draftId || !f.base) usage(1);
      await call("submit_project_for_review", {
        draft_id: draftId,
        base_revision: Number(f.base),
        risk_level: f.risk === "low" ? "low" : "high",
      });
      break;
    }
    case "approve":
    case "publish": {
      const id = rest[0];
      if (!id) usage(1);
      const result = await client.callTool({
        name: command === "approve" ? "approve_submission" : "publish_approved_draft",
        arguments: command === "approve" ? { submission_id: id } : { draft_id: id },
      });
      console.log(JSON.stringify(result.content, null, 2));
      break;
    }
    case "list-submissions": {
      await call("list_submissions", {});
      break;
    }
    default:
      usage(1);
  }

  await client.close();
}

main().catch((err) => {
  console.error("上传客户端出错：", err);
  process.exit(1);
});
