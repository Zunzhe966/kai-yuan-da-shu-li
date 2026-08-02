import { SECTION_KEYS, type SectionKey } from "../domain/project";
import type { ActorContext } from "../domain/scopes";
import type { EditableProjectGroup } from "../services/publish";
import type { StoredChangeReport } from "../services/change-reports";
import type { StudioActor } from "../services/actors";
import type { StoredDraft } from "../storage/workflow";
import { escapeHtml, renderLayout } from "./layout";

const WORKSPACE_TABS = [
  ["基本资料", "identity"],
  ["仓库来源", "repositories"],
  ["作者与组织", "creators"],
  ["搜索与筛选", "discovery"],
  ["卡片", "card"],
  ["固定正文栏目", "sections"],
  ["证据", "evidence"],
  ["变化报告", "reports"],
  ["版本差异", "diff"],
  ["公开预览", "preview"],
  ["审核与发布", "review"],
] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number][1];

const GROUP_BY_TAB: Partial<Record<WorkspaceTab, EditableProjectGroup>> = {
  identity: "identity",
  repositories: "repository_sources",
  creators: "attribution",
  discovery: "discovery",
  card: "card",
  evidence: "evidence",
};

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

function statusLabel(status: StoredDraft["status"]): string {
  const labels: Record<StoredDraft["status"], string> = {
    draft: "草稿",
    in_review: "审核中",
    changes_requested: "需修改",
    approved: "已批准",
    published: "已发布",
    stale: "待更新",
    archived: "已归档",
  };
  return labels[status];
}

export function renderStudioQueue(
  drafts: StoredDraft[],
  actor: ActorContext,
): string {
  const content = `<main class="studio-page" id="main-content">
    <header class="studio-heading">
      <div><p class="section-kicker">内部控制面</p><h1>智能体编辑台</h1><p>当前身份：${escapeHtml(actor.actorId)}</p></div>
      ${actor.scopes.has("draft:create") ? `<a class="primary-button" href="/studio/projects/new">新建项目</a>` : ""}
    </header>
    <section class="studio-queue" aria-labelledby="queue-heading">
      <div class="results-heading"><h2 id="queue-heading">编辑任务</h2><span>${drafts.length} 项</span></div>
      <div class="studio-table" role="table" aria-label="草稿队列">
        <div class="studio-table-row studio-table-header" role="row"><span>项目</span><span>草稿</span><span>状态</span><span>最后修改</span></div>
        ${drafts.map((draft) => `<a class="studio-table-row" role="row" href="/studio/projects/${encodeURIComponent(draft.draftId)}"><strong>${escapeHtml(draft.document.card.chinese_name || draft.document.card.name)}</strong><code>${escapeHtml(draft.draftId)}</code><span class="status-chip">${escapeHtml(draft.status)} · ${statusLabel(draft.status)}</span><time>${escapeHtml(draft.updatedAt)}</time></a>`).join("")}
      </div>
    </section>
  </main>`;
  return renderLayout({
    title: "智能体编辑台",
    description: "开源大梳理内部草稿、审核与发布控制台。",
    content,
    scripts: ["/assets/studio.js"],
    bodyClass: "studio-body",
  });
}

function renderSectionEditor(draft: StoredDraft, sectionKey: SectionKey): string {
  const section = draft.document.sections[sectionKey];
  return `<section class="studio-editor" aria-labelledby="section-editor-heading">
    <div class="studio-panel-heading"><div><p class="section-kicker">固定正文栏目</p><h2 id="section-editor-heading">${SECTION_LABELS[sectionKey]}</h2></div><span>${escapeHtml(section.state)}</span></div>
    <form method="post" action="/studio/projects/${encodeURIComponent(draft.draftId)}/sections/${sectionKey}" data-studio-form>
      <input type="hidden" name="base_revision" value="${draft.baseRevision}">
      <div class="studio-form-grid">
        <label>状态<select name="state">${["verified", "inferred", "unknown", "conflicting", "stale", "not_applicable"].map((value) => `<option value="${value}"${section.state === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>
        <label>置信度<select name="confidence">${["high", "medium", "low"].map((value) => `<option value="${value}"${section.confidence === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>
      </div>
      <label>栏目摘要<input name="summary" maxlength="600" required value="${escapeHtml(section.summary)}"></label>
      <label>正文<textarea name="body" maxlength="30000" rows="12">${escapeHtml(section.body)}</textarea></label>
      <label>要点（每行一项）<textarea name="key_points" rows="5">${escapeHtml(section.key_points.join("\n"))}</textarea></label>
      <label>证据 ID（每行一项）<textarea name="evidence_ids" rows="3">${escapeHtml(section.evidence_ids.join("\n"))}</textarea></label>
      <div class="studio-savebar"><span data-save-state>未修改</span><button class="primary-button" type="submit">保存栏目</button></div>
    </form>
  </section>`;
}

function renderGroupEditor(
  draft: StoredDraft,
  tab: WorkspaceTab,
  editable: boolean,
): string {
  const group = GROUP_BY_TAB[tab];
  const label = WORKSPACE_TABS.find(([, key]) => key === tab)?.[0] ?? tab;
  if (!group) {
    return "";
  }
  const value = draft.document[group];
  return `<section class="studio-editor" aria-labelledby="group-editor-heading">
    <div class="studio-panel-heading"><div><p class="section-kicker">严格模板分组</p><h2 id="group-editor-heading">${label}</h2></div><span>${group}</span></div>
    ${editable ? `<form method="post" action="/studio/projects/${encodeURIComponent(draft.draftId)}/tabs/${tab}" data-studio-form>
      <input type="hidden" name="base_revision" value="${draft.baseRevision}">
      <label>${label}<textarea class="json-editor" name="value_json" rows="28" spellcheck="false" required>${escapeHtml(JSON.stringify(value, null, 2))}</textarea></label>
      <div class="studio-savebar"><span data-save-state>未修改</span><button class="primary-button" type="submit">保存${label}</button></div>
    </form>` : `<pre class="json-preview">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`}
  </section>`;
}

function renderWorkspacePanel(
  draft: StoredDraft,
  actor: ActorContext,
  tab: WorkspaceTab,
  sectionKey: SectionKey,
  reports: StoredChangeReport[],
): string {
  const editable =
    (draft.status === "draft" || draft.status === "changes_requested") &&
    actor.scopes.has("draft:update");
  if (tab === "sections") {
    return `<div class="workspace-shell">
      <aside class="section-list" aria-label="固定正文栏目">${SECTION_KEYS.map((key) => `<a href="/studio/projects/${encodeURIComponent(draft.draftId)}/sections/${key}"${key === sectionKey ? ` aria-current="page"` : ""}>${SECTION_LABELS[key]}</a>`).join("")}</aside>
      ${editable ? renderSectionEditor(draft, sectionKey) : `<section class="studio-editor"><h2>${SECTION_LABELS[sectionKey]}</h2><p>${escapeHtml(draft.document.sections[sectionKey].summary)}</p></section>`}
    </div>`;
  }
  const groupEditor = renderGroupEditor(draft, tab, editable);
  if (groupEditor) {
    return `<div class="workspace-single">${groupEditor}</div>`;
  }
  if (tab === "reports") {
    return `<div class="workspace-single"><section class="studio-editor"><div class="studio-panel-heading"><div><p class="section-kicker">隔离队列</p><h2>变化报告</h2></div><span>${reports.length} 项</span></div>${reports.length ? renderReportTable(reports) : `<div class="empty-state"><p>当前项目没有待处理变化报告。</p></div>`}</section></div>`;
  }
  if (tab === "diff") {
    return `<div class="workspace-single"><section class="studio-editor"><div class="studio-panel-heading"><div><p class="section-kicker">不可变修订</p><h2>版本差异</h2></div><span>base v${draft.baseRevision}</span></div><dl class="diff-summary"><div><dt>正式基线</dt><dd>v${draft.baseRevision}</dd></div><div><dt>草稿修订</dt><dd>v${draft.document.publication.revision}</dd></div><div><dt>最后编辑</dt><dd>${escapeHtml(draft.updatedByActorId)}</dd></div></dl></section></div>`;
  }
  if (tab === "review") {
    const submit = editable
      ? `<form method="post" action="/studio/projects/${encodeURIComponent(draft.draftId)}/actions/submit"><button class="primary-button" type="submit">提交独立审核</button></form>`
      : "";
    const approve =
      draft.status === "in_review" && actor.scopes.has("review:approve")
        ? `<form method="post" action="/studio/projects/${encodeURIComponent(draft.draftId)}/actions/approve"><button class="primary-button" type="submit">批准草稿</button></form>`
        : "";
    const publish =
      draft.status === "approved" && actor.scopes.has("publish")
        ? `<form method="post" action="/studio/projects/${encodeURIComponent(draft.draftId)}/actions/publish"><button class="primary-button" type="submit" data-action="publish">发布正式修订</button></form>`
        : "";
    return `<div class="workspace-single"><section class="studio-editor"><div class="studio-panel-heading"><div><p class="section-kicker">${statusLabel(draft.status)}</p><h2>审核与发布</h2></div><span>${escapeHtml(draft.status)}</span></div><dl class="diff-summary"><div><dt>基础修订</dt><dd>v${draft.baseRevision}</dd></div><div><dt>创建身份</dt><dd>${escapeHtml(draft.createdByActorId)}</dd></div><div><dt>最后编辑</dt><dd>${escapeHtml(draft.updatedByActorId)}</dd></div></dl><div class="review-actions">${submit}${approve}${publish}</div></section></div>`;
  }
  return "";
}

export function renderStudioWorkspace(
  draft: StoredDraft,
  actor: ActorContext,
  sectionKey: SectionKey = "overview",
  activeTab: WorkspaceTab = "sections",
  reports: StoredChangeReport[] = [],
): string {
  const content = `<main class="studio-page studio-workspace" id="main-content">
    <nav class="breadcrumbs" aria-label="面包屑"><a href="/studio">编辑任务</a><span>/</span><span>${escapeHtml(draft.draftId)}</span></nav>
    <header class="workspace-heading">
      <div><p class="section-kicker">${escapeHtml(draft.status)}</p><h1>${escapeHtml(draft.document.card.chinese_name || draft.document.card.name)}</h1><p><code>${escapeHtml(draft.draftId)}</code> · base revision ${draft.baseRevision} · ${escapeHtml(draft.updatedByActorId)}</p></div>
      <div class="project-actions"><a class="secondary-button" href="/studio/projects/${encodeURIComponent(draft.draftId)}/preview">预览草稿</a>${actor.scopes.has("publish") && draft.status === "approved" ? `<a class="primary-button" href="/studio/projects/${encodeURIComponent(draft.draftId)}/tabs/review" data-action="publish">发布批准稿</a>` : ""}</div>
    </header>
    <nav class="workspace-tabs" aria-label="项目工作区">${WORKSPACE_TABS.map(([label, key]) => {
      const href = key === "sections"
        ? `/studio/projects/${encodeURIComponent(draft.draftId)}/sections/${sectionKey}`
        : key === "preview"
          ? `/studio/projects/${encodeURIComponent(draft.draftId)}/preview`
          : `/studio/projects/${encodeURIComponent(draft.draftId)}/tabs/${key}`;
      return `<a href="${href}"${key === activeTab ? ` aria-current="page"` : ""}>${label}</a>`;
    }).join("")}</nav>
    ${renderWorkspacePanel(draft, actor, activeTab, sectionKey, reports)}
  </main>`;
  return renderLayout({
    title: `${draft.document.card.name} 编辑工作区`,
    description: "固定模板项目草稿工作区。",
    content,
    scripts: ["/assets/studio.js"],
    bodyClass: "studio-body",
  });
}

export function renderStudioNewProject(): string {
  return renderLayout({
    title: "新建项目草稿",
    description: "先查重并取得创建票据，再建立完整项目草稿。",
    content: `<main class="studio-page" id="main-content"><nav class="breadcrumbs"><a href="/studio">编辑任务</a><span>/</span><span>新建项目</span></nav><header class="studio-heading"><div><p class="section-kicker">强制查重</p><h1>新建项目草稿</h1></div></header><section class="studio-editor"><form method="post" action="/studio/projects/new" data-studio-form><div class="studio-form-grid"><label>仓库地址<input type="url" name="repository_url" required placeholder="https://github.com/owner/repository"></label><label>项目 ID<input name="project_id" required minlength="2" maxlength="80" pattern="[a-z0-9][a-z0-9-]+"></label><label>项目名称<input name="name" required maxlength="200"></label><label>中文名称<input name="chinese_name" maxlength="200"></label><label>主分类<input name="primary_category" required maxlength="200"></label><label>领域<input name="domain" maxlength="100"></label></div><label>卡片摘要<textarea name="summary" required maxlength="80" rows="3"></textarea></label><label>适合场景<textarea name="use_when" required maxlength="500" rows="3"></textarea></label><label>不适合场景<textarea name="avoid_when" required maxlength="500" rows="3"></textarea></label><div class="studio-savebar"><span data-save-state>未提交</span><button class="primary-button" type="submit">查重并创建草稿</button></div></form></section></main>`,
    bodyClass: "studio-body",
  });
}

export function renderStudioReports(reports: StoredChangeReport[]): string {
  const content = `<main class="studio-page" id="main-content"><nav class="breadcrumbs"><a href="/studio">编辑任务</a><span>/</span><span>变化报告</span></nav><header class="studio-heading"><div><p class="section-kicker">核验队列</p><h1>变化报告</h1></div><span>${reports.length} 项</span></header><section class="studio-queue" aria-label="变化报告队列">${renderReportTable(reports)}</section></main>`;
  return renderLayout({
    title: "变化报告",
    description: "上游变化核验与人工审核队列。",
    content,
    bodyClass: "studio-body",
  });
}

function renderReportTable(reports: StoredChangeReport[]): string {
  return `<div class="studio-table" role="table" aria-label="变化报告"><div class="studio-table-row studio-table-header" role="row"><span>项目</span><span>报告</span><span>类型</span><span>状态</span></div>${reports.map((report) => `<a class="studio-table-row" role="row" href="${escapeHtml(report.evidenceUrl)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(report.projectId)}</strong><code>${escapeHtml(report.reportId)}</code><span>${escapeHtml(report.reportType)}</span><span class="status-chip">${escapeHtml(report.status)}</span></a>`).join("")}</div>`;
}

export function renderStudioActors(actors: StudioActor[]): string {
  const content = `<main class="studio-page" id="main-content"><nav class="breadcrumbs"><a href="/studio">编辑任务</a><span>/</span><span>智能体身份</span></nav><header class="studio-heading"><div><p class="section-kicker">最小权限</p><h1>智能体身份</h1></div><span>${actors.length} 项</span></header><section class="studio-queue" aria-label="智能体身份"><div class="studio-table actor-table" role="table" aria-label="智能体身份"><div class="studio-table-row studio-table-header" role="row"><span>身份</span><span>类型</span><span>状态</span><span>权限</span></div>${actors.map((actor) => `<div class="studio-table-row" role="row"><strong>${escapeHtml(actor.displayName)}</strong><code>${escapeHtml(actor.actorType)}</code><span class="status-chip">${escapeHtml(actor.status)} · ${actor.activeCredentialCount} 凭证</span><span>${actor.scopes.length ? actor.scopes.map((scope) => `<code>${escapeHtml(scope)}</code>`).join(" ") : "无有效权限"}</span></div>`).join("")}</div></section></main>`;
  return renderLayout({
    title: "智能体身份",
    description: "内部编辑身份状态与最小权限元数据。",
    content,
    bodyClass: "studio-body",
  });
}
