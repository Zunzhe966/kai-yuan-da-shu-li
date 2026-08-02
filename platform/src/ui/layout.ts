export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface LayoutOptions {
  title: string;
  description: string;
  content: string;
  canonicalPath?: string;
  scripts?: string[];
  bodyClass?: string;
}

export function renderLayout(options: LayoutOptions): string {
  const title =
    options.title === "开源大梳理"
      ? options.title
      : `${options.title} | 开源大梳理`;
  const scripts = (options.scripts ?? [])
    .map((source) => `<script src="${escapeHtml(source)}" defer></script>`)
    .join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(options.description)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/app.css">
  ${options.canonicalPath ? `<link rel="canonical" href="${escapeHtml(options.canonicalPath)}">` : ""}
</head>
<body class="${escapeHtml(options.bodyClass ?? "")}">
  <header class="site-header">
    <a class="brand" href="/" aria-label="开源大梳理首页">
      <span class="brand-mark" aria-hidden="true">开</span>
      <span>开源大梳理</span>
    </a>
    <nav class="site-nav" aria-label="主导航">
      <a href="/">项目</a>
      <a href="/?entity=creator">作者</a>
      <a href="/llms.txt">智能体入口</a>
    </nav>
  </header>
  ${options.content}
  <footer class="site-footer">
    <span>开源项目检索与编辑平台</span>
    <nav aria-label="页脚导航"><a href="/openapi.json">API</a><a href="/llms.txt">LLMs</a></nav>
  </footer>
  ${scripts}
</body>
</html>`;
}
