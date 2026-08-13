#!/usr/bin/env node
/**
 * 独立上传客户端（作家助手式 · CLI）
 *
 * 智能体通过本客户端直接操控平台 MCP 面完成"上传投稿"，
 * 不需要网页自动化去点网站。命令：
 *
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> list
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> check --url <repoUrl> --id <platformRepositoryId>
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> create --url <repoUrl> --id <platformRepositoryId> --category <project_type>
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> set-fields <projectId> --k name=... --k summary=... [--k k=v ...]
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> set-section <projectId> <sectionKey> --summary ... --body ... [--id evidenceId...]
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> add-evidence <projectId> --url ... --type ... --summary ...
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> link-creator <projectId> <creatorId> <role> [evidenceId...]
 *   tsx scripts/upload-client.ts <mcp-url> <api-key> submit <projectId> <risk:low|high>
 *
 * 依赖平台 MCP 工具：check_repository / create_project_draft / update_project_fields
 *   / upsert_project_section / add_evidence / link_creator / submit_project_for_review
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function usage(exitCode: number): never {
  console.error(`用法:
  ${process.argv[1]} <mcp-url> <api-key> list
  ${process.argv[1]} <mcp-url> <api-key> check --url <repoUrl> --id <platformRepositoryId>
  ${process.argv[1]} <mcp-url> <api-key> create --url <repoUrl> --id <platformRepositoryId> --category <project_type>
  ${process.argv[1]} <mcp-url> <api-key> set-fields <projectId> --k name=... [--k k=v ...]
  ${process.argv[1]} <mcp-url> <api-key> set-section <projectId> <sectionKey> --summary ... --body ...
  ${process.argv[1]} <mcp-url> <api-key> add-evidence <projectId> --url ... --type ... --summary ...
  ${process.argv[1]} <mcp-url> <api-key> link-creator <projectId> <creatorId> <role>
  ${process.argv[1]} <mcp-url> <api-key> submit <projectId> <risk:low|high>`);
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
      if (!f.url || !f.id) usage(1);
      await call("create_project_draft", {
        repository_url: f.url,
        platform_repository_id: f.id,
        project_type: f.category ?? null,
      });
      break;
    }
    case "set-fields": {
      const projectId = rest[0];
      const f = flags(rest.slice(1));
      if (!projectId || typeof f.k !== "object") usage(1);
      await call("update_project_fields", {
        project_id: projectId,
        fields: Object.fromEntries((f.k as string[]).map((kv) => {
          const [k, ...v] = kv.split("=");
          return [k, v.join("=")];
        })),
      });
      break;
    }
    case "set-section": {
      const [projectId, sectionKey, ...sectionRest] = rest;
      const f = flags(sectionRest);
      if (!projectId || !sectionKey) usage(1);
      await call("upsert_project_section", {
        project_id: projectId,
        section_key: sectionKey,
        summary: f.summary ?? "",
        body: f.body ?? "",
        evidence_ids: typeof f.id === "string" ? [f.id] : (f.id ?? []),
      });
      break;
    }
    case "add-evidence": {
      const [projectId, ...evidenceRest] = rest;
      const f = flags(evidenceRest);
      if (!projectId || !f.url || !f.type || !f.summary) usage(1);
      await call("add_evidence", {
        project_id: projectId,
        evidence: {
          url: f.url,
          source_type: f.type,
          supports: f.supports ?? null,
          fact_summary: f.summary,
        },
      });
      break;
    }
    case "link-creator": {
      const [projectId, creatorId, role, ...ids] = rest;
      if (!projectId || !creatorId || !role) usage(1);
      await call("link_creator", {
        project_id: projectId,
        creator_id: creatorId,
        role,
        evidence_ids: ids.length ? ids : undefined,
      });
      break;
    }
    case "submit": {
      const [projectId, risk] = rest;
      if (!projectId || (risk !== "low" && risk !== "high")) usage(1);
      await call("submit_project_for_review", {
        project_id: projectId,
        risk: risk,
      });
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
