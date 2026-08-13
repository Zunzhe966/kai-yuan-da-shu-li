export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface CategoryItem {
  id: string;
  label: string;
}

export interface AdDisplay {
  title: string;
  landingUrl: string;
  imageUrl: string | null;
  scriptHtml: string;
  body: string;
}

export interface LayoutOptions {
  title: string;
  description: string;
  content: string;
  canonicalPath?: string;
  scripts?: string[];
  bodyClass?: string;
  /** 是否包含广告 rail（桌面宽屏左右两列） */
  humanAdSlots?: boolean;
  /** 顶部全宽横幅广告位（页面最顶上、头部与分类条上方） */
  adTop?: boolean;
  /** 手机底部广告位（保留兼容，目前隐藏） */
  adMobile?: boolean;
  categories?: CategoryItem[];
  activeCategory?: string;
  /** 已发布广告：slotKey -> 内容。缺省坑位显示占位，位置与数量始终固定。 */
  ads?: Record<string, AdDisplay>;
}

function renderAdSlot(ad: AdDisplay | undefined): string {
  if (!ad) {
    return `<div class="ad-slot">
    <span class="ad-label">广告</span>
    <p>广告位 · 暂未启用</p>
  </div>`;
  }
  if (ad.scriptHtml.trim()) {
    return `<div class="ad-slot ad-slot-script" data-slot-script>${ad.scriptHtml}</div>`;
  }
  const image = ad.imageUrl
    ? `<img class="ad-slot-img" src="${escapeHtml(ad.imageUrl)}" alt="" loading="lazy">`
    : "";
  const body = ad.body ? `<p class="ad-slot-body">${escapeHtml(ad.body)}</p>` : "";
  return `<a class="ad-slot ad-slot-filled" href="${escapeHtml(ad.landingUrl)}" rel="noopener noreferrer sponsored">
    <span class="ad-label">广告</span>
    ${image}
    <span class="ad-slot-title">${escapeHtml(ad.title)}</span>
    ${body}
  </a>`;
}

function adRail(side: "left" | "right", ads: Record<string, AdDisplay> | undefined): string {
  // 固定坑位：竖向堆叠多个广告槽，位置与数量固定，窄屏自动收起。
  // 坑位数量不随广告内容变化；ads 只填充已发布内容，空槽显示占位。
  const slots = [1, 2, 3, 4]
    .map(
      (n) => {
        const slotKey = `${side}-${n}`;
        return `<div class="ad-slot-wrap" data-ad-slot="${slotKey}" aria-label="广告位 ${slotKey}">${renderAdSlot(ads?.[slotKey])}</div>`;
      },
    )
    .join("");
  return `<aside class="ad-rail ad-rail-${side}" aria-label="广告位">
  <div class="ad-rail-inner">${slots}</div>
</aside>`;
}

function renderBannerEnd(ads: Record<string, AdDisplay> | undefined): string {
  const ad = ads?.["banner-end"];
  if (!ad) {
    return `<div class="ad-banner-end"><span class="ad-label">广告</span><p>广告位 · 暂未启用</p></div>`;
  }
  if (ad.scriptHtml.trim()) {
    return `<div class="ad-banner-end ad-banner-end-filled" data-slot-script>${ad.scriptHtml}</div>`;
  }
  const image = ad.imageUrl
    ? `<img class="ad-slot-img" src="${escapeHtml(ad.imageUrl)}" alt="" loading="lazy">`
    : "";
  return `<a class="ad-banner-end ad-banner-end-filled" href="${escapeHtml(ad.landingUrl)}" rel="noopener noreferrer sponsored">
    <span class="ad-label">广告</span>
    ${image}
    <span class="ad-slot-title">${escapeHtml(ad.title)}</span>
  </a>`;
}

function renderBannerTop(ads: Record<string, AdDisplay> | undefined): string {
  const ad = ads?.["banner-top"];
  if (!ad) {
    return `<div class="ad-banner-top ad-banner-top-full"><span class="ad-label">广告</span><p>广告位 · 暂未启用</p></div>`;
  }
  if (ad.scriptHtml.trim()) {
    return `<div class="ad-banner-top ad-banner-top-full ad-banner-top-filled" data-slot-script>${ad.scriptHtml}</div>`;
  }
  const image = ad.imageUrl
    ? `<img class="ad-slot-img" src="${escapeHtml(ad.imageUrl)}" alt="" loading="lazy">`
    : "";
  return `<a class="ad-banner-top ad-banner-top-full ad-banner-top-filled" href="${escapeHtml(ad.landingUrl)}" rel="noopener noreferrer sponsored">
    <span class="ad-label">广告</span>
    ${image}
    <span class="ad-slot-title">${escapeHtml(ad.title)}</span>
  </a>`;
}

export function renderLayout(options: LayoutOptions): string {
  const title =
    options.title === "开源大梳理"
      ? options.title
      : `${options.title} | 开源大梳理`;
  const scripts = (options.scripts ?? [])
    .map((source) => `<script src="${escapeHtml(source)}" defer></script>`)
    .join("");
  const categoryBar = options.categories?.length
    ? `<nav class="category-bar" aria-label="分类导航"><div class="category-inner">${
        options.categories
          .map(
            (item) =>
              `<a href="/?domain=${encodeURIComponent(item.id)}" class="${options.activeCategory === item.id ? "active" : ""}">${escapeHtml(item.label)}</a>`,
          )
          .join("")
      }</div></nav>`
    : "";
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
  ${options.adTop ? renderBannerTop(options.ads) : ""}
  <header class="site-header">
    <a class="brand" href="/" aria-label="开源大梳理首页">
      <span class="brand-mark" aria-hidden="true">开</span>
      <span>开源大梳理</span>
    </a>
    <form class="header-search" role="search" method="get" action="/">
      <input name="q" type="search" placeholder="搜索项目、作者、用途或能力" aria-label="搜索">
    </form>
    <nav class="site-nav" aria-label="主导航">
      <a href="/">项目</a>
      <a href="/?entity=creator">作者</a>
      <a href="/llms.txt">智能体入口</a>
    </nav>
  </header>
  ${categoryBar}
  <div class="page-grid${options.humanAdSlots ? " page-grid-ads" : ""}">
    ${options.humanAdSlots ? adRail("left", options.ads) : ""}
    <div class="page-content">
      ${options.content}
      ${options.adTop ? renderBannerEnd(options.ads) : ""}
    </div>
    ${options.humanAdSlots ? adRail("right", options.ads) : ""}
  </div>
  <footer class="site-footer">
    <span>开源项目检索与编辑平台</span>
    <nav aria-label="页脚导航"><a href="/openapi.json">API</a><a href="/llms.txt">LLMs</a></nav>
  </footer>
  ${scripts}
</body>
</html>`;
}
