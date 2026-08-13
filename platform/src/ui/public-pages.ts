import {
  SECTION_KEYS,
  type ProjectPublication,
  type PublicationSection,
  type SectionKey,
} from "../domain/project";
import type { ProjectSearchResult, SearchInput } from "../services/search";
import type {
  CreatorDetail,
  CreatorProfile,
  ProjectRole,
} from "../storage/creators";
import { escapeHtml, renderLayout, type AdDisplay } from "./layout";

const SECTION_LABELS: Record<SectionKey, string> = {
  overview: "项目概览",
  problem_and_positioning: "问题与定位",
  background_and_history: "背景与历史",
  creators_and_organization: "人物与组织",
  design_philosophy: "设计理念",
  architecture_and_technology: "架构与技术",
  core_capabilities: "核心能力",
  installation_and_usage: "安装与使用",
  limitations_and_risks: "限制与风险",
  maintenance_and_releases: "维护与发布",
  ecosystem_and_interoperability: "生态与互操作",
  alternatives_and_selection: "替代与选择",
  community_and_channels: "社区与渠道",
  editorial_assessment: "编辑部评估",
};

function selected(values: string[] | undefined, value: string): string {
  return values?.includes(value) ? " selected" : "";
}

function tagHref(facet: string, label: string): string {
  return `/?${encodeURIComponent(facet)}=${encodeURIComponent(label)}`;
}

function renderBookCard(project: ProjectPublication): string {
  const card = project.card;
  const source = project.repository_sources.find((item) => item.role === "primary");
  const tags = [
    ...project.discovery.capabilities.slice(0, 3).map((tag) => ({ label: tag, facet: "capability" })),
    ...project.discovery.domains.slice(0, 1).map((tag) => ({ label: tag, facet: "domain" })),
  ];
  const coverMark = (card.chinese_name || card.name).trim().slice(0, 1).toUpperCase();
  return `<article class="book-card">
    <a class="book-cover-lg" href="/projects/${encodeURIComponent(project.project_id)}" aria-hidden="true" tabindex="-1"><span>${escapeHtml(coverMark)}</span></a>
    <div class="book-card-body">
      <h3><a href="/projects/${encodeURIComponent(project.project_id)}">${escapeHtml(card.chinese_name || card.name)}</a></h3>
      ${card.chinese_name ? `<span class="original-name">${escapeHtml(card.name)}</span>` : ""}
      <p class="book-summary">${escapeHtml(card.summary)}</p>
      ${tags.length ? `<ul class="tag-list">${tags.map((tag) => `<li><a href="${tagHref(tag.facet, tag.label)}" rel="nofollow">${escapeHtml(tag.label)}</a></li>`).join("")}</ul>` : ""}
      <div class="book-meta">
        <span>${escapeHtml(card.primary_category)}</span>
        ${card.primary_language ? `<span>${escapeHtml(card.primary_language)}</span>` : ""}
        ${card.license ? `<span>${escapeHtml(card.license)}</span>` : ""}
        <span class="status status-${escapeHtml(card.maintenance_status)}">${escapeHtml(card.maintenance_status)}</span>
        ${source ? `<a class="source-link" href="${safeExternalUrl(source.canonical_url) ?? "#"}" rel="noopener noreferrer">${escapeHtml(source.platform)}</a>` : ""}
      </div>
    </div>
  </article>`;
}

const ROLE_LABELS: Record<ProjectRole["role"], string> = {
  creator: "创建者",
  current_owner: "当前所有者",
  maintainer: "维护者",
  organization: "所属组织",
  foundation: "基金会",
  sponsor_of_upstream: "上游赞助方",
};

function renderCreatorCard(creator: CreatorProfile): string {
  return `<article class="creator-card">
    <div>
      <p class="section-kicker">${creator.type === "person" ? "人物" : "组织"}</p>
      <h2><a href="/creators/${encodeURIComponent(creator.creatorId)}">${escapeHtml(creator.displayName)}</a></h2>
      ${creator.displayName !== creator.name ? `<p class="creator-original">${escapeHtml(creator.name)}</p>` : ""}
      <p>${escapeHtml(creator.biography || "资料仍在核验中。")}</p>
    </div>
    <span class="creator-type">${creator.type === "person" ? "人物" : "组织"}</span>
  </article>`;
}

export const DOMAIN_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "ai-agents", label: "AI 与智能体" },
  { id: "devtools", label: "开发者工具" },
  { id: "devops", label: "云服务与 DevOps" },
  { id: "web-frontend", label: "网站与前端" },
  { id: "data-ml", label: "数据与机器学习" },
  { id: "backend", label: "后端与 API" },
  { id: "databases", label: "数据库与搜索" },
  { id: "security", label: "安全" },
  { id: "networking", label: "网络与边缘" },
  { id: "observability", label: "可观测性" },
];

/** 渲染筛选条第一行：领域 chip + 计数 */
function renderDomainChips(
  input: SearchInput,
  facets: Record<string, Record<string, number>> | undefined,
): string {
  const active = input.domain?.[0] ?? "";
  const allCount = facets?.domain
    ? Object.values(facets.domain).reduce((a, b) => a + b, 0)
    : null;
  const chips = DOMAIN_CATEGORIES.map((item) => {
    const count = facets?.domain?.[item.id];
    const isActive = active === item.id;
    return `<a class="domain-chip${isActive ? " active" : ""}" href="/?domain=${encodeURIComponent(item.id)}">${escapeHtml(item.label)}${count !== undefined ? `<span class="chip-count">${count}</span>` : ""}</a>`;
  }).join("");
  return `<div class="domain-chips" role="list" aria-label="按领域筛选">
    <a class="domain-chip${active === "" ? " active" : ""}" href="/">全部${allCount !== null ? `<span class="chip-count">${allCount}</span>` : ""}</a>
    ${chips}
  </div>`;
}

/** 渲染筛选条第二行：各维度下拉 */
function renderFilterRow(input: SearchInput): string {
  return `<div class="filter-row">
    <label class="filter-select-wrap">
      <span>语言</span>
      <select name="language" onchange="this.form.submit()">
        <option value="">全部</option>
        ${["Python","TypeScript","Go","Rust","Java","C++","C#","Ruby","Swift","Kotlin"].map((lang) => `<option value="${lang}"${selected(input.language, lang)}>${lang}</option>`).join("")}
      </select>
    </label>
    <label class="filter-select-wrap">
      <span>许可证</span>
      <select name="license" onchange="this.form.submit()">
        <option value="">全部</option>
        ${["MIT","Apache-2.0","GPL-3.0","BSD-3-Clause","AGPL-3.0","MPL-2.0","LGPL-2.1","CC-BY-4.0"].map((lic) => `<option value="${lic}"${selected(input.license, lic)}>${lic}</option>`).join("")}
      </select>
    </label>
    <label class="filter-select-wrap">
      <span>维护状态</span>
      <select name="status" onchange="this.form.submit()">
        <option value="">全部</option>
        <option value="active"${selected(input.status, "active")}>活跃维护</option>
        <option value="maintenance"${selected(input.status, "maintenance")}>仅维护</option>
        <option value="archived"${selected(input.status, "archived")}>已归档</option>
      </select>
    </label>
    <label class="filter-select-wrap">
      <span>项目类型</span>
      <select name="project_type" onchange="this.form.submit()">
        <option value="">全部</option>
        ${["library","cli","framework","gui","saas","docker","plugin","sdk"].map((t) => `<option value="${t}"${selected(input.projectType, t)}>${t}</option>`).join("")}
      </select>
    </label>
    <label class="filter-select-wrap">
      <span>交付方式</span>
      <select name="delivery" onchange="this.form.submit()">
        <option value="">全部</option>
        ${["library","cli","api","gui","docker","saas","plugin","browser-extension"].map((d) => `<option value="${d}"${selected(input.delivery, d)}>${d}</option>`).join("")}
      </select>
    </label>
    <label class="filter-select-wrap">
      <span>中文支持</span>
      <select name="capability" onchange="this.form.submit()">
        <option value="">全部</option>
        <option value="chinese"${selected(input.capability, "chinese")}>支持中文</option>
        <option value="multilingual"${selected(input.capability, "multilingual")}>多语言</option>
      </select>
    </label>
    <label class="filter-select-wrap">
      <span>排序</span>
      <select name="sort" onchange="this.form.submit()">
        <option value="relevance"${input.sort === "relevance" ? " selected" : ""}>综合匹配</option>
        <option value="updated"${input.sort === "updated" ? " selected" : ""}>最近更新</option>
        <option value="name"${input.sort === "name" ? " selected" : ""}>名称</option>
      </select>
    </label>
  </div>`;
}

/** 渲染已选条件 chips（非默认值时显示） */
function renderActiveFilters(input: SearchInput): string {
  const chips: string[] = [];
  const addChip = (label: string, clearParam: string) => {
    chips.push(`<a class="active-chip" href="/?${clearParam}" aria-label="清除筛选：${label}">✕ ${escapeHtml(label)}</a>`);
  };
  if (input.language?.length) addChip(`语言: ${input.language[0]}`, `domain=${encodeURIComponent(input.domain?.[0] ?? "")}`);
  if (input.license?.length) addChip(`许可证: ${input.license[0]}`, "");
  if (input.status?.length) addChip(`状态: ${input.status[0]}`, "");
  if (input.projectType?.length) addChip(`类型: ${input.projectType[0]}`, "");
  if (input.delivery?.length) addChip(`交付: ${input.delivery[0]}`, "");
  if (!chips.length) return "";
  return `<div class="active-filters">${chips.join("")}<a class="clear-all" href="/">清空全部</a></div>`;
}

export function renderCatalogPage(
  result: ProjectSearchResult,
  input: SearchInput,
  creatorResults: CreatorProfile[] = [],
  ads?: Record<string, AdDisplay>,
): string {
  const query = input.query ?? "";
  const activeDomain = input.domain?.[0] ?? "";
  const hasFilters = !!(input.language?.length || input.license?.length || input.status?.length || input.projectType?.length || input.delivery?.length);
  const content = `<main class="catalog-page" id="main-content">
    <form class="catalog-form" method="get" action="/">
      <div class="catalog-search-bar">
        <div class="entity-tabs" aria-label="搜索类型">
          <label><input type="radio" name="entity" value="all"${input.entityType === "all" || !input.entityType ? " checked" : ""}> 全部</label>
          <label><input type="radio" name="entity" value="project"${input.entityType === "project" ? " checked" : ""}> 项目</label>
          <label><input type="radio" name="entity" value="creator"${input.entityType === "creator" ? " checked" : ""}> 作者与组织</label>
        </div>
      </div>
      ${renderDomainChips(input, result.facets)}
      ${renderFilterRow(input)}
      ${hasFilters ? renderActiveFilters(input) : ""}
      <section class="results" aria-labelledby="result-heading">
        ${input.entityType !== "project" && creatorResults.length ? `<section class="creator-results" aria-labelledby="creator-result-heading"><div class="results-heading"><h2 id="creator-result-heading">找到 ${creatorResults.length} 位作者与组织</h2></div><div class="creator-list">${creatorResults.map(renderCreatorCard).join("")}</div></section>` : ""}
        ${input.entityType === "creator" ? "" : `
        <div class="results-heading">
          <h2 id="result-heading">书架 · 找到 ${result.total} 个项目</h2>
          ${query ? `<span>关键词：${escapeHtml(query)}</span>` : ""}
        </div>
        <div class="book-shelf">
          ${result.items.length ? result.items.map(renderBookCard).join("") : `<div class="empty-state"><h3>没有匹配项目</h3><p>放宽一个筛选条件后再试。</p></div>`}
        </div>
        ${result.nextCursor ? `<a class="load-more" href="/?${new URLSearchParams({ ...(query ? { q: query } : {}), cursor: result.nextCursor }).toString()}">下一页</a>` : ""}
        `}
      </section>
    </form>
  </main>`;
  return renderLayout({
    title: "开源大梳理",
    description: "像逛书架一样筛选开源项目，点进详情看适不适合自己。",
    content,
    scripts: ["/assets/catalog.js"],
    bodyClass: "catalog-body",
    humanAdSlots: true,
    adTop: true,
    categories: DOMAIN_CATEGORIES,
    activeCategory: activeDomain,
    ads,
  });
}

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function renderCreatorPage(
  creator: CreatorDetail,
  ads?: Record<string, AdDisplay>,
): string {
  const officialLinks = [
    ...creator.officialSites.map((url) => ({ label: "官方网站", url: safeExternalUrl(url) })),
    ...creator.socialProfiles.map((profile) => ({
      label: profile.handle || profile.platform,
      url: safeExternalUrl(profile.url),
    })),
  ].filter((link) => link.url !== null) as Array<{ label: string; url: string }>;
  const unreviewedLinks = creator.unreviewedRepositories.map((repository) => ({
    fullName: repository.fullName,
    url: safeExternalUrl(repository.canonicalUrl),
    summary: repository.summary,
    platform: repository.platform,
    observedAt: repository.observedAt,
  })).filter((item) => item.url !== null) as Array<{
    fullName: string; url: string; summary: string; platform: string; observedAt: string;
  }>;
  const content = `<main class="creator-page" id="main-content">
    <nav class="breadcrumbs" aria-label="面包屑"><a href="/?entity=creator">作者与组织</a><span>/</span><span>${escapeHtml(creator.displayName)}</span></nav>
    <header class="creator-hero">
      <div>
        <p class="section-kicker">${creator.type === "person" ? "人物" : "组织"}</p>
        <h1>${escapeHtml(creator.displayName)}</h1>
        ${creator.displayName !== creator.name ? `<p class="project-original">${escapeHtml(creator.name)}</p>` : ""}
        <p class="project-deck">${escapeHtml(creator.biography || "本站正在核验该作者或组织的公开资料。")}</p>
      </div>
      ${officialLinks.length ? `<div class="project-actions">${officialLinks.map((link) => `<a class="secondary-button" href="${escapeHtml(link.url)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("")}</div>` : ""}
    </header>
    ${creator.codeHostIdentities.length ? `<section class="creator-identities" aria-labelledby="identity-heading"><h2 id="identity-heading">已核验代码托管身份</h2><ul>${creator.codeHostIdentities.map((identity) => `<li>${escapeHtml(identity)}</li>`).join("")}</ul></section>` : ""}
    <section class="creator-projects" aria-labelledby="curated-heading">
      <div class="section-heading"><h2 id="curated-heading">本站精选项目</h2><span>${creator.projects.length} 个</span></div>
      <div class="creator-project-list">${creator.projects.length ? creator.projects.map((item) => `<article class="creator-project-item"><span class="role-label">${ROLE_LABELS[item.role]}</span>${renderProjectCard(item.project)}</article>`).join("") : `<div class="empty-state"><p>暂无已完成深度整理的项目。</p></div>`}</div>
    </section>
    <section class="creator-repositories" aria-labelledby="unreviewed-heading">
      <div class="section-heading"><h2 id="unreviewed-heading">其他公开仓库，尚未深度整理</h2><span>${unreviewedLinks.length} 个</span></div>
      ${unreviewedLinks.length ? `<ul>${unreviewedLinks.map((repository) => `<li><a href="${escapeHtml(repository.url)}" rel="noopener noreferrer">${escapeHtml(repository.fullName)}</a>${repository.summary ? `<p>${escapeHtml(repository.summary)}</p>` : ""}<small>${escapeHtml(repository.platform)} · 观察于 ${escapeHtml(repository.observedAt)}</small></li>`).join("")}</ul>` : `<div class="empty-state"><p>暂未发现可核验的其他公开仓库。</p></div>`}
    </section>
  </main>`;
  return renderLayout({
    title: creator.displayName,
    description: creator.biography || `${creator.displayName} 的项目与公开身份资料。`,
    content,
    canonicalPath: `/creators/${encodeURIComponent(creator.creatorId)}`,
    bodyClass: "creator-body",
    categories: DOMAIN_CATEGORIES,
    ads,
  });
}

function renderProjectCard(project: ProjectPublication): string {
  const card = project.card;
  const source = project.repository_sources.find((item) => item.role === "primary");
  const tags = [
    ...project.discovery.domains.slice(0, 2).map((tag) => ({ label: tag, facet: "domain" })),
    ...project.discovery.capabilities.slice(0, 3).map((tag) => ({ label: tag, facet: "capability" })),
  ];
  const coverMark = (card.chinese_name || card.name).trim().slice(0, 1).toUpperCase();
  return `<article class="project-card">
    <a class="book-cover" href="/projects/${encodeURIComponent(project.project_id)}" aria-hidden="true" tabindex="-1"><span>${escapeHtml(coverMark)}</span></a>
    <div class="project-card-main">
      <div class="project-title-row">
        <h2><a href="/projects/${encodeURIComponent(project.project_id)}">${escapeHtml(card.chinese_name || card.name)}</a></h2>
        ${card.chinese_name ? `<span class="original-name">${escapeHtml(card.name)}</span>` : ""}
      </div>
      <p class="project-summary">${escapeHtml(card.summary)}</p>
      ${tags.length ? `<ul class="tag-list">${tags.slice(0, 5).map((tag) => `<li><a href="${tagHref(tag.facet, tag.label)}" rel="nofollow">${escapeHtml(tag.label)}</a></li>`).join("")}</ul>` : ""}
      <dl class="decision-grid">
        <div><dt>适合</dt><dd>${escapeHtml(card.use_when)}</dd></div>
        <div><dt>不适合</dt><dd>${escapeHtml(card.avoid_when)}</dd></div>
      </dl>
    </div>
    <div class="project-meta">
      <span>${escapeHtml(card.primary_category)}</span>
      ${card.primary_language ? `<span>${escapeHtml(card.primary_language)}</span>` : ""}
      ${card.license ? `<span>${escapeHtml(card.license)}</span>` : ""}
      <span class="status status-${escapeHtml(card.maintenance_status)}">${escapeHtml(card.maintenance_status)}</span>
      ${source ? `<a class="source-link" href="${safeExternalUrl(source.canonical_url) ?? "#"}" rel="noopener noreferrer">${escapeHtml(source.platform)}</a>` : ""}
    </div>
  </article>`;
}

function stateLabel(section: PublicationSection): string {
  const labels: Record<PublicationSection["state"], string> = {
    verified: "已核验",
    inferred: "编辑推断",
    unknown: "待深度核验",
    conflicting: "信息冲突",
    stale: "需要更新",
    not_applicable: "不适用",
  };
  return labels[section.state];
}

function renderSection(key: SectionKey, section: PublicationSection): string {
  const body = section.body
    ? `<div class="section-body">${escapeHtml(section.body).replaceAll("\n", "<br>")}</div>`
    : "";
  return `<section class="project-section section-${section.state}" id="${key}" data-section="${key}">
    <div class="section-heading"><h2>${SECTION_LABELS[key]}</h2><span>${stateLabel(section)}</span></div>
    <p class="section-summary">${escapeHtml(section.summary)}</p>
    ${body}
    ${section.key_points.length ? `<ul>${section.key_points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}
  </section>`;
}

function renderChapterNav(
  project: ProjectPublication,
  activeKey: SectionKey | "evidence" | null,
): string {
  const tabs = [
    ...SECTION_KEYS.map((key) => ({ id: key, label: SECTION_LABELS[key] })),
    { id: "evidence" as const, label: "证据来源" },
  ];
  return `<nav class="section-tabs chapter-tabs" aria-label="章节导航">
    ${tabs.map((tab) => {
      const href = tab.id === "evidence"
        ? `/projects/${encodeURIComponent(project.project_id)}/sections/evidence`
        : `/projects/${encodeURIComponent(project.project_id)}/sections/${tab.id}`;
      return `<a class="section-tab${activeKey === tab.id ? " active" : ""}" href="${href}">${escapeHtml(tab.label)}</a>`;
    }).join("")}
  </nav>`;
}

function renderProjectHero(
  project: ProjectPublication,
  options: { studioBackUrl?: string },
): string {
  const card = project.card;
  const primary = project.repository_sources.find((item) => item.role === "primary");
  return `<header class="project-hero">
      <div>
        <p class="section-kicker">${escapeHtml(card.primary_category)}</p>
        <h1>${escapeHtml(card.chinese_name || card.name)}</h1>
        ${card.chinese_name ? `<p class="project-original">${escapeHtml(card.name)}</p>` : ""}
        <p class="project-deck">${escapeHtml(card.summary)}</p>
      </div>
      <div class="project-actions">
        ${primary ? `<a class="primary-button" href="${safeExternalUrl(primary.canonical_url) ?? "#"}" rel="noopener noreferrer">上游仓库</a>` : ""}
        ${project.identity.documentation_url ? `<a class="secondary-button" href="${safeExternalUrl(project.identity.documentation_url) ?? "#"}" rel="noopener noreferrer">官方文档</a>` : ""}
      </div>
    </header>
    <dl class="fact-strip">
      <div><dt>来源地址</dt><dd>${primary ? `<a href="${safeExternalUrl(primary.canonical_url) ?? "#"}" rel="noopener noreferrer">${escapeHtml(primary.full_name)}</a>` : "待核验"}</dd></div>
      <div><dt>适合</dt><dd>${escapeHtml(card.use_when)}</dd></div>
      <div><dt>不适合</dt><dd>${escapeHtml(card.avoid_when)}</dd></div>
      <div><dt>语言</dt><dd>${escapeHtml(card.primary_language || "未知")}</dd></div>
      <div><dt>许可证</dt><dd>${escapeHtml(card.license || "待核验")}</dd></div>
      <div><dt>维护状态</dt><dd>${escapeHtml(card.maintenance_status)}</dd></div>
    </dl>`;
}

function renderProjectAttribution(
  project: ProjectPublication,
  knownCreatorIds: ReadonlySet<string> | undefined,
): string {
  const attribution = project.attribution
    .filter((item) => !knownCreatorIds || knownCreatorIds.has(item.creator_id))
    .map((item) => ({ roleLabel: ROLE_LABELS[item.role], creatorId: item.creator_id }));
  if (!attribution.length) return "";
  return `<section class="project-attribution" aria-labelledby="attribution-heading"><h2 id="attribution-heading">作者与组织</h2><ul class="tag-list attribution-list">${attribution.map((item) => `<li><span class="role-label">${escapeHtml(item.roleLabel)}</span><a href="/creators/${encodeURIComponent(item.creatorId)}">${escapeHtml(item.creatorId)}</a></li>`).join("")}</ul></section>`;
}

function renderProjectTags(project: ProjectPublication): string {
  const tags = [
    ...project.discovery.domains.map((tag) => ({ label: tag, facet: "domain" })),
    ...project.discovery.capabilities.map((tag) => ({ label: tag, facet: "capability" })),
    ...project.discovery.project_types.map((tag) => ({ label: tag, facet: "project_type" })),
    ...project.discovery.languages.map((tag) => ({ label: tag, facet: "language" })),
    ...project.discovery.licenses.map((tag) => ({ label: tag, facet: "license" })),
  ].filter((tag, index, all) => all.findIndex((item) => item.label === tag.label) === index);
  if (!tags.length) return "";
  return `<section class="project-tags" aria-labelledby="tags-heading"><h2 id="tags-heading">标签</h2><ul class="tag-list">${tags.slice(0, 18).map((tag) => `<li><a href="${tagHref(tag.facet, tag.label)}" rel="nofollow">${escapeHtml(tag.label)}</a></li>`).join("")}</ul></section>`;
}

export function renderProjectPage(
  project: ProjectPublication,
  options: { studioBackUrl?: string; knownCreatorIds?: ReadonlySet<string>; ads?: Record<string, AdDisplay> } = {},
): string {
  const card = project.card;
  const primary = project.repository_sources.find((item) => item.role === "primary");
  const chapterItems = SECTION_KEYS.map((key, index) => {
    const section = project.sections[key];
    return `<li class="chapter-item">
      <a href="/projects/${encodeURIComponent(project.project_id)}/sections/${key}">
        <span class="chapter-index">${String(index + 1).padStart(2, "0")}</span>
        <span><strong class="chapter-title">${escapeHtml(SECTION_LABELS[key])}</strong><small class="chapter-summary">${escapeHtml(section.summary)}</small></span>
        <span class="chapter-state">${stateLabel(section)}</span>
      </a>
    </li>`;
  }).join("");
  const evidenceItem = `<li class="chapter-item">
    <a href="/projects/${encodeURIComponent(project.project_id)}/sections/evidence">
      <span class="chapter-index">15</span>
      <span><strong class="chapter-title">证据与来源</strong><small class="chapter-summary">${project.evidence.length} 条可核验来源</small></span>
      <span class="chapter-state">来源</span>
    </a>
  </li>`;
  const content = `<main class="project-page" id="main-content">
    <nav class="breadcrumbs" aria-label="面包屑"><a href="${options.studioBackUrl ? escapeHtml(options.studioBackUrl) : "/"}">${options.studioBackUrl ? "返回编辑工作区" : "项目目录"}</a><span>/</span><span>${escapeHtml(card.name)}</span></nav>
    ${renderProjectHero(project, options)}
    ${renderProjectAttribution(project, options.knownCreatorIds)}
    ${renderProjectTags(project)}
    <section class="project-chapters" aria-labelledby="chapters-heading">
      <div class="results-heading"><h2 id="chapters-heading">全部章节</h2><span>14 章 + 证据</span></div>
      <ol class="chapter-list">${chapterItems}${evidenceItem}</ol>
    </section>
  </main>`;
  return renderLayout({
    title: card.chinese_name || card.name,
    description: card.summary,
    content,
    canonicalPath: `/projects/${encodeURIComponent(project.project_id)}`,
    bodyClass: "project-body",
    scripts: ["/assets/catalog.js"],
    humanAdSlots: true,
    adTop: true,
    categories: DOMAIN_CATEGORIES,
    activeCategory: project.discovery.domains[0] ?? "",
    ads: options.ads,
  });
}

export function renderProjectSectionPage(
  project: ProjectPublication,
  sectionKey: SectionKey | "evidence",
  options: { studioBackUrl?: string; knownCreatorIds?: ReadonlySet<string>; ads?: Record<string, AdDisplay> } = {},
): string {
  const card = project.card;
  const label = sectionKey === "evidence" ? "证据与来源" : SECTION_LABELS[sectionKey];
  const prevNext = (() => {
    if (sectionKey === "evidence") {
      const prev = SECTION_KEYS.at(-1)!;
      return { prev: { key: prev, label: SECTION_LABELS[prev] } as const, next: null };
    }
    const index = SECTION_KEYS.indexOf(sectionKey);
    const prev = index > 0 ? SECTION_KEYS[index - 1]! : null;
    const next = index < SECTION_KEYS.length - 1 ? SECTION_KEYS[index + 1]! : null;
    return {
      prev: prev ? { key: prev, label: SECTION_LABELS[prev] } as const : null,
      next: next ? { key: next, label: SECTION_LABELS[next] } as const : { key: "evidence" as const, label: "证据与来源" },
    };
  })();
  const sectionBody = sectionKey === "evidence"
    ? `<section class="evidence-section" id="evidence" data-section="evidence">
        <div class="section-heading"><h2>证据与来源</h2><span>${project.evidence.length} 条</span></div>
        <ol>${project.evidence.map((item) => `<li><a href="${safeExternalUrl(item.url) ?? "#"}" rel="noopener noreferrer">${escapeHtml(item.fact_summary)}</a><small>${escapeHtml(item.source_type)} · ${escapeHtml(item.retrieved_at)}</small></li>`).join("")}</ol>
      </section>`
    : renderSection(sectionKey, project.sections[sectionKey]);
  const pager = `<nav class="chapter-pager" aria-label="上一章与下一章">
    ${prevNext.prev ? `<a class="prev" href="/projects/${encodeURIComponent(project.project_id)}/sections/${prevNext.prev.key}"><small>上一章</small><strong>${escapeHtml(prevNext.prev.label)}</strong></a>` : `<span></span>`}
    ${prevNext.next ? `<a class="next" href="/projects/${encodeURIComponent(project.project_id)}/sections/${prevNext.next.key}"><small>下一章</small><strong>${escapeHtml(prevNext.next.label)}</strong></a>` : ""}
  </nav>`;
  const content = `<main class="project-page" id="main-content">
    <nav class="breadcrumbs" aria-label="面包屑"><a href="/">项目目录</a><span>/</span><a href="/projects/${encodeURIComponent(project.project_id)}">${escapeHtml(card.chinese_name || card.name)}</a><span>/</span><span>${escapeHtml(label)}</span></nav>
    <header class="chapter-hero">
      <p class="section-kicker">${escapeHtml(label)}</p>
      <h1>${escapeHtml(card.chinese_name || card.name)}</h1>
      <p class="project-deck">${escapeHtml(card.summary)}</p>
    </header>
    ${renderChapterNav(project, sectionKey)}
    <article class="chapter-article">${sectionBody}</article>
    ${pager}
  </main>`;
  return renderLayout({
    title: `${card.chinese_name || card.name} · ${label}`,
    description: card.summary,
    content,
    canonicalPath: `/projects/${encodeURIComponent(project.project_id)}/sections/${sectionKey}`,
    bodyClass: "project-body",
    scripts: ["/assets/catalog.js"],
    humanAdSlots: true,
    adTop: true,
    categories: DOMAIN_CATEGORIES,
    activeCategory: project.discovery.domains[0] ?? "",
    ads: options.ads,
  });
}
