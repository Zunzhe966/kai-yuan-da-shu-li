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
import { escapeHtml, renderLayout } from "./layout";

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

function renderProjectCard(project: ProjectPublication): string {
  const card = project.card;
  const source = project.repository_sources.find((item) => item.role === "primary");
  return `<article class="project-card">
    <div class="project-card-main">
      <div class="project-title-row">
        <h2><a href="/projects/${encodeURIComponent(project.project_id)}">${escapeHtml(card.chinese_name || card.name)}</a></h2>
        ${card.chinese_name ? `<span class="original-name">${escapeHtml(card.name)}</span>` : ""}
      </div>
      <p class="project-summary">${escapeHtml(card.summary)}</p>
      <dl class="decision-grid">
        <div><dt>适合</dt><dd>${escapeHtml(card.use_when)}</dd></div>
        <div><dt>不适合</dt><dd>${escapeHtml(card.avoid_when)}</dd></div>
      </dl>
    </div>
    <div class="project-meta" aria-label="项目摘要信息">
      <span>${escapeHtml(card.primary_category)}</span>
      ${card.primary_language ? `<span>${escapeHtml(card.primary_language)}</span>` : ""}
      ${card.license ? `<span>${escapeHtml(card.license)}</span>` : ""}
      <span class="status status-${escapeHtml(card.maintenance_status)}">${escapeHtml(card.maintenance_status)}</span>
      ${source ? `<span>${escapeHtml(source.platform)}</span>` : ""}
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

export function renderCatalogPage(
  result: ProjectSearchResult,
  input: SearchInput,
  creatorResults: CreatorProfile[] = [],
): string {
  const query = input.query ?? "";
  const content = `<main class="catalog-page" id="main-content">
    <section class="catalog-intro" aria-labelledby="catalog-title">
      <p class="section-kicker">项目目录</p>
      <h1 id="catalog-title">开源大梳理</h1>
      <p>先用条件缩小范围，再进入项目正文判断是否适合。</p>
      <form class="catalog-form" role="search" method="get" action="/">
        <div class="search-row">
          <label class="sr-only" for="catalog-query">搜索项目</label>
          <input id="catalog-query" name="q" type="search" value="${escapeHtml(query)}" placeholder="搜索项目、用途、能力或技术" autocomplete="off">
          <button type="submit" class="primary-button">搜索</button>
          <button type="button" class="filter-toggle" data-filter-toggle aria-expanded="false" aria-controls="catalog-filters">筛选</button>
        </div>
        <div class="entity-tabs" aria-label="搜索类型">
          <label><input type="radio" name="entity" value="all"${input.entityType === "all" ? " checked" : ""}> 全部</label>
          <label><input type="radio" name="entity" value="project"${input.entityType === "project" ? " checked" : ""}> 项目</label>
          <label><input type="radio" name="entity" value="creator"${input.entityType === "creator" ? " checked" : ""}> 作者与组织</label>
        </div>
        <div class="catalog-shell">
          <aside class="filters" id="catalog-filters" aria-label="项目筛选">
            <div class="filter-heading"><h2>缩小范围</h2><a href="/">清空</a></div>
            <label>领域<select name="domain"><option value="">全部领域</option><option value="ai-agents"${selected(input.domain, "ai-agents")}>AI 与智能体</option><option value="devtools"${selected(input.domain, "devtools")}>开发者工具</option><option value="devops"${selected(input.domain, "devops")}>云服务与 DevOps</option><option value="web-frontend"${selected(input.domain, "web-frontend")}>网站与前端</option><option value="data-ml"${selected(input.domain, "data-ml")}>数据与机器学习</option></select></label>
            <label>语言<input name="language" value="${escapeHtml(input.language?.[0] ?? "")}" placeholder="例如 Python"></label>
            <label>许可证<input name="license" value="${escapeHtml(input.license?.[0] ?? "")}" placeholder="例如 MIT"></label>
            <label>维护状态<select name="status"><option value="">全部状态</option><option value="active"${selected(input.status, "active")}>活跃</option><option value="maintenance"${selected(input.status, "maintenance")}>维护中</option><option value="archived"${selected(input.status, "archived")}>已归档</option></select></label>
            <label>项目类型<input name="project_type" value="${escapeHtml(input.projectType?.[0] ?? "")}" placeholder="例如 cli"></label>
            <label>代码平台<select name="platform"><option value="">全部平台</option><option value="github"${selected(input.platform, "github")}>GitHub</option><option value="gitlab"${selected(input.platform, "gitlab")}>GitLab</option><option value="gitee"${selected(input.platform, "gitee")}>Gitee</option><option value="codeberg"${selected(input.platform, "codeberg")}>Codeberg</option></select></label>
            <label>排序<select name="sort"><option value="relevance"${input.sort === "relevance" ? " selected" : ""}>综合匹配</option><option value="updated"${input.sort === "updated" ? " selected" : ""}>最近更新</option><option value="name"${input.sort === "name" ? " selected" : ""}>名称</option></select></label>
            <button class="secondary-button" type="submit">应用条件</button>
          </aside>
          <section class="results" aria-labelledby="result-heading">
            ${input.entityType !== "project" && creatorResults.length ? `<section class="creator-results" aria-labelledby="creator-result-heading"><div class="results-heading"><h2 id="creator-result-heading">找到 ${creatorResults.length} 位作者与组织</h2></div><div class="creator-list">${creatorResults.map(renderCreatorCard).join("")}</div></section>` : ""}
            ${input.entityType === "creator" ? "" : `
            <div class="results-heading">
              <h2 id="result-heading">找到 ${result.total} 个项目</h2>
              ${query ? `<span>关键词：${escapeHtml(query)}</span>` : ""}
            </div>
            <div class="project-list">
              ${result.items.length ? result.items.map(renderProjectCard).join("") : `<div class="empty-state"><h3>没有匹配项目</h3><p>放宽一个筛选条件后再试。</p></div>`}
            </div>
            ${result.nextCursor ? `<a class="load-more" href="/?${new URLSearchParams({ ...(query ? { q: query } : {}), cursor: result.nextCursor }).toString()}">下一页</a>` : ""}
            `}
          </section>
        </div>
      </form>
    </section>
  </main>`;
  return renderLayout({
    title: "开源大梳理",
    description: "按用途、能力、语言、许可证和维护状态筛选开源项目。",
    content,
    scripts: ["/assets/catalog.js"],
    bodyClass: "catalog-body",
  });
}

export function renderCreatorPage(creator: CreatorDetail): string {
  const officialLinks = [
    ...creator.officialSites.map((url) => ({ label: "官方网站", url })),
    ...creator.socialProfiles.map((profile) => ({
      label: profile.handle || profile.platform,
      url: profile.url,
    })),
  ];
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
      <div class="section-heading"><h2 id="unreviewed-heading">其他公开仓库，尚未深度整理</h2><span>${creator.unreviewedRepositories.length} 个</span></div>
      ${creator.unreviewedRepositories.length ? `<ul>${creator.unreviewedRepositories.map((repository) => `<li><a href="${escapeHtml(repository.canonicalUrl)}" rel="noopener noreferrer">${escapeHtml(repository.fullName)}</a>${repository.summary ? `<p>${escapeHtml(repository.summary)}</p>` : ""}<small>${escapeHtml(repository.platform)} · 观察于 ${escapeHtml(repository.observedAt)}</small></li>`).join("")}</ul>` : `<div class="empty-state"><p>暂未发现可核验的其他公开仓库。</p></div>`}
    </section>
  </main>`;
  return renderLayout({
    title: creator.displayName,
    description: creator.biography || `${creator.displayName} 的项目与公开身份资料。`,
    content,
    canonicalPath: `/creators/${encodeURIComponent(creator.creatorId)}`,
    bodyClass: "creator-body",
  });
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

export function renderProjectPage(
  project: ProjectPublication,
  options: { studioBackUrl?: string } = {},
): string {
  const card = project.card;
  const primary = project.repository_sources.find((item) => item.role === "primary");
  const content = `<main class="project-page" id="main-content">
    <nav class="breadcrumbs" aria-label="面包屑"><a href="${options.studioBackUrl ? escapeHtml(options.studioBackUrl) : "/"}">${options.studioBackUrl ? "返回编辑工作区" : "项目目录"}</a><span>/</span><span>${escapeHtml(card.name)}</span></nav>
    <header class="project-hero">
      <div>
        <p class="section-kicker">${escapeHtml(card.primary_category)}</p>
        <h1>${escapeHtml(card.chinese_name || card.name)}</h1>
        ${card.chinese_name ? `<p class="project-original">${escapeHtml(card.name)}</p>` : ""}
        <p class="project-deck">${escapeHtml(card.summary)}</p>
      </div>
      <div class="project-actions">
        ${primary ? `<a class="primary-button" href="${escapeHtml(primary.canonical_url)}" rel="noopener noreferrer">上游仓库</a>` : ""}
        ${project.identity.documentation_url ? `<a class="secondary-button" href="${escapeHtml(project.identity.documentation_url)}" rel="noopener noreferrer">官方文档</a>` : ""}
      </div>
    </header>
    <dl class="fact-strip">
      <div><dt>适合</dt><dd>${escapeHtml(card.use_when)}</dd></div>
      <div><dt>不适合</dt><dd>${escapeHtml(card.avoid_when)}</dd></div>
      <div><dt>语言</dt><dd>${escapeHtml(card.primary_language || "未知")}</dd></div>
      <div><dt>许可证</dt><dd>${escapeHtml(card.license || "待核验")}</dd></div>
      <div><dt>维护状态</dt><dd>${escapeHtml(card.maintenance_status)}</dd></div>
      <div><dt>当前修订</dt><dd>v${project.publication.revision}</dd></div>
    </dl>
    <div class="project-content-shell">
      <aside class="section-nav" aria-label="正文目录"><h2>正文目录</h2><nav>${SECTION_KEYS.map((key) => `<a href="#${key}">${SECTION_LABELS[key]}</a>`).join("")}</nav></aside>
      <article class="project-article">
        ${SECTION_KEYS.map((key) => renderSection(key, project.sections[key])).join("")}
        <section class="evidence-section" id="evidence">
          <div class="section-heading"><h2>证据与来源</h2><span>${project.evidence.length} 条</span></div>
          <ol>${project.evidence.map((item) => `<li><a href="${escapeHtml(item.url)}" rel="noopener noreferrer">${escapeHtml(item.fact_summary)}</a><small>${escapeHtml(item.source_type)} · ${escapeHtml(item.retrieved_at)}</small></li>`).join("")}</ol>
        </section>
      </article>
    </div>
  </main>`;
  return renderLayout({
    title: card.chinese_name || card.name,
    description: card.summary,
    content,
    canonicalPath: `/projects/${encodeURIComponent(project.project_id)}`,
    bodyClass: "project-body",
  });
}
