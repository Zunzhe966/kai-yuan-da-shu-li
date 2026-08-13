#!/usr/bin/env node
/**
 * 独立上传客户端 · 本地分页表单界面（作家助手式）
 *
 * 启动一个本地 HTTP 服务（默认 http://127.0.0.1:8788），渲染 6 页分页上传表单。
 * 表单通过平台 MCP 面（StreamableHTTP）提交，智能体也可以直接用
 * scripts/upload-client.ts 的 CLI 走同一条 MCP 通道。
 *
 * 用法：
 *   tsx scripts/upload-form.ts <mcp-url> <api-key> [port]
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createServer } from "node:http";

const SECTION_KEYS = [
  "overview",
  "problem_and_positioning",
  "background_and_history",
  "creators_and_organization",
  "design_philosophy",
  "architecture_and_technology",
  "core_capabilities",
  "installation_and_usage",
  "limitations_and_risks",
  "maintenance_and_releases",
  "ecosystem_and_interoperability",
  "alternatives_and_selection",
  "community_and_channels",
  "editorial_assessment",
] as const;

function layout(body: string): string {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>上传客户端 · 开源大梳理</title>
<style>
  :root { --ink:#17201d; --muted:#65706b; --line:#d8dfdc; --accent:#126b55; --warm:#ad5a18; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:system-ui,-apple-system,sans-serif; color:var(--ink); background:#f4f7f6; line-height:1.55; }
  .wrap { max-width:760px; margin:0 auto; padding:24px 20px 72px; }
  header { display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding:8px 0 20px; }
  header h1 { margin:0; font-size:22px; }
  header a { color:var(--accent); font-size:13px; text-decoration:none; }
  .steps { display:flex; gap:6px; flex-wrap:wrap; margin:0 0 22px; }
  .steps a { flex:1; min-width:80px; text-align:center; padding:8px 6px; border:1px solid var(--line); border-radius:6px; background:#fff; color:var(--muted); font-size:12px; text-decoration:none; }
  .steps a.active { border-color:var(--accent); color:var(--accent); font-weight:700; background:#edf7f3; }
  form { display:grid; gap:16px; }
  label { display:grid; gap:6px; font-size:13px; font-weight:700; }
  input, textarea, select { width:100%; border:1px solid #aeb9b4; border-radius:5px; padding:9px 11px; font:inherit; }
  textarea { min-height:110px; resize:vertical; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .actions { display:flex; justify-content:space-between; gap:10px; padding-top:10px; }
  button { min-height:42px; padding:0 18px; border-radius:6px; border:1px solid var(--accent); background:var(--accent); color:#fff; font-weight:700; cursor:pointer; }
  button.secondary { border-color:#aeb9b4; background:#fff; color:var(--ink); }
  .notice { padding:12px 14px; border:1px solid var(--line); border-radius:6px; background:#fff; font-size:12px; color:var(--muted); white-space:pre-wrap; }
  @media (max-width:560px){ .grid{grid-template-columns:1fr;} }
</style></head><body><div class="wrap">${body}</div></body></html>`;
}

const PAGES = [
  { key: "basic", label: "1 基本信息" },
  { key: "card", label: "2 卡片" },
  { key: "discovery", label: "3 发现" },
  { key: "sections", label: "4 栏目正文" },
  { key: "evidence", label: "5 证据" },
  { key: "submit", label: "6 作者+发布" },
] as const;

function steps(active: string): string {
  return `<nav class="steps" aria-label="分页">${PAGES.map((p) => `<a href="/${p.key}" class="${p.key === active ? "active" : ""}">${p.label}</a>`).join("")}</nav>`;
}

function field(label: string, name: string, value = "", type = "text"): string {
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}"></label>`;
}

function textarea(label: string, name: string, value = ""): string {
  return `<label>${label}<textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formShell(
  active: string,
  notice: string,
  inner: string,
  nextLabel: string,
): string {
  return layout(`<header><h1>上传客户端 · 开源大梳理</h1><a href="https://github.com/Zunzhe966/kai-yuan-da-shu-li" target="_blank" rel="noopener">平台说明</a></header>
${steps(active)}
${notice ? `<div class="notice">${notice}</div>` : ""}
<form method="post" action="/${active}">${inner}
<div class="actions">
  <button class="secondary" type="submit" name="action" value="save">保存本页</button>
  <button type="submit" name="action" value="next">${nextLabel}</button>
</div></form>`);
}

function sectionOptions(value?: string): string {
  return `<label>栏目<select name="section_key">${SECTION_KEYS.map((k) => `<option value="${k}"${k === value ? " selected" : ""}>${k}</option>`).join("")}</select></label>`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error("用法：tsx scripts/upload-form.ts <mcp-url> <api-key> [port]");
    process.exit(1);
  }
  const [mcpUrl, apiKey] = argv as [string, string];
  const port = Number(argv[2]) || 8788;

  const client = new Client({ name: "upload-form", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  await client.connect(transport);
  console.error(`已连接平台 MCP：${mcpUrl}`);
  console.error(`本地分页表单：http://127.0.0.1:${port}`);

  const call = async (tool: string, args: Record<string, unknown>) => {
    const res = await client.callTool({ name: tool, arguments: args });
    console.error(`${tool} →`, JSON.stringify(res.content));
  };

  // 简单的内存草稿存储（真实持久化走平台 MCP，这里仅暂存表单）
  const draft: Record<string, string> = {};

  createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const page = PAGES.find((p) => p.key === url.pathname.slice(1))?.key ?? "basic";
    const respond = (html: string) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    };

    if (req.method === "POST") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const params = new URLSearchParams(raw);
      for (const [k, v] of params.entries()) draft[k] = v;
      const action = params.get("action");
      try {
        if (draft.repository_url && draft.platform_repository_id && !draft.project_id) {
          await call("check_repository", {
            repository_url: draft.repository_url,
            platform_repository_id: draft.platform_repository_id,
          });
        }
      } catch (err) {
        console.error("查重失败：", err);
      }
      const next =
        action === "next"
          ? PAGES[Math.min(PAGES.findIndex((p) => p.key === page) + 1, PAGES.length - 1)]!.key
          : page;
      res.writeHead(302, { Location: `/${next}` });
      res.end();
      return;
    }

    let body = "";
    let notice = "";
    switch (page) {
      case "basic":
        body = `<div class="grid">${field("仓库地址", "repository_url", draft.repository_url)}${field("平台仓库 ID", "platform_repository_id", draft.platform_repository_id)}</div>
${field("项目类型", "project_type", draft.project_type)}
${field("中文名称", "chinese_name", draft.chinese_name)}`;
        notice = "填写仓库地址后，平台会先查重并签发创建票据。";
        break;
      case "card":
        body = `${field("英文名", "name", draft.name)}${field("摘要", "summary", draft.summary)}<div class="grid">${field("主要语言", "primary_language", draft.primary_language)}${field("许可证", "license", draft.license)}</div>${textarea("适合场景 use_when", "use_when", draft.use_when)}${textarea("不适合场景 avoid_when", "avoid_when", draft.avoid_when)}`;
        break;
      case "discovery":
        body = `<div class="grid">${field("领域 domains（逗号分隔）", "domains", draft.domains)}${field("能力 capabilities（逗号分隔）", "capabilities", draft.capabilities)}</div>
${field("任务 tasks（逗号分隔）", "tasks", draft.tasks)}${field("框架 frameworks（逗号分隔）", "frameworks", draft.frameworks)}`;
        break;
      case "sections":
        body = `${field("项目 ID", "project_id", draft.project_id)}${sectionOptions(draft.section_key)}${textarea("栏目摘要", "section_summary", draft.section_summary)}${textarea("栏目正文", "section_body", draft.section_body)}`;
        notice = "选择 14 个固定栏目之一填写摘要与正文。";
        break;
      case "evidence":
        body = `${field("项目 ID", "project_id", draft.project_id)}<div class="grid">${field("证据 URL", "evidence_url", draft.evidence_url)}${field("证据类型", "evidence_type", draft.evidence_type)}</div>${textarea("事实摘要", "evidence_summary", draft.evidence_summary)}`;
        break;
      case "submit":
        body = `${field("项目 ID", "project_id", draft.project_id)}${field("作者 ID", "creator_id", draft.creator_id)}${field("角色 role", "role", draft.role)}<label>风险<select name="risk"><option value="low">low</option><option value="high">high</option></select></label>`;
        notice = "填写作者并提交独立审核。高风险内容由另一名独立审核者复核。";
        break;
    }
    respond(formShell(page, notice, body, page === "submit" ? "提交审核" : "下一页"));
  }).listen(port);
}

main().catch((err) => {
  console.error("上传客户端失败：", err);
  process.exit(1);
});
