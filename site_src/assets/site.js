// === repo-scout 影视站点式全条件筛选引擎 ===

const $ = id => document.getElementById(id);
const norm = v => String(v || '').toLowerCase().trim();

let allItems = [];
let currentFilters = {};

// ---- 加载数据 ----
async function loadData() {
  const resp = await fetch('/api/v1/catalog.jsonl', {cache: 'no-cache'});
  if (!resp.ok) throw new Error(`catalog ${resp.status}`);
  const text = await resp.text();
  return text.trim().split('\n').map(line => JSON.parse(line));
}

// ---- 提取筛选面 ----
function buildFacets(items) {
  const facets = {domains: {}, languages: {}, licenses: {}, statuses: {}};
  for (const item of items) {
    const d = item.domain;
    if (d) facets.domains[d] = (facets.domains[d] || 0) + 1;
    const l = item.language;
    if (l) facets.languages[l] = (facets.languages[l] || 0) + 1;
    const li = item.license;
    if (li) facets.licenses[li] = (facets.licenses[li] || 0) + 1;
    const s = item.status;
    if (s) facets.statuses[s] = (facets.statuses[s] || 0) + 1;
  }
  return facets;
}

// ---- 排序 ----
function sortItems(items, sortBy) {
  const sorted = [...items];
  if (sortBy === 'name') {
    sorted.sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  } else if (sortBy === 'domain') {
    sorted.sort((a, b) => norm(a.domain).localeCompare(norm(b.domain)));
  }
  return sorted;
}

// ---- 过滤 ----
function filterItems(items, f) {
  return items.filter(item => {
    if (f.keyword) {
      const txt = norm([item.name, item.summary, item.use_when, item.avoid_when, ...(item.tags || [])].join(' '));
      if (!txt.includes(norm(f.keyword))) return false;
    }
    if (f.domains && f.domains.size > 0 && !f.domains.has(item.domain)) return false;
    if (f.languages && f.languages.size > 0 && !f.languages.has(item.language)) return false;
    if (f.licenses && f.licenses.size > 0 && !f.licenses.has(item.license)) return false;
    if (f.status && item.status !== f.status) return false;
    return true;
  });
}

// ---- 转义 ----
function esc(s) {
  const el = document.createElement('span');
  el.textContent = String(s || '');
  return el.innerHTML;
}

// ---- 领域标签 ----
const DOMAIN_LABELS = {
  'ai-agents': 'AI与智能体', 'backend': '后端与API', 'blockchain': '区块链与Web3',
  'cms-docs': '内容与文档', 'data-ml': '数据与机器学习', 'databases': '数据库与搜索',
  'desktop': '桌面应用', 'devops': '云服务与DevOps', 'devtools': '开发者工具',
  'finance': '金融与记账', 'gamedev': '游戏开发', 'gis': '地理空间',
  'iot': '物联网与嵌入式', 'media': '音视频与媒体', 'mobile': '移动开发',
  'networking': '网络与边缘', 'observability': '监控与可观测', 'security': '安全与供应链',
  'web-frontend': '网站与前端'
};

function labelDomain(d) { return DOMAIN_LABELS[d] || d; }

// ---- 筛选面渲染 ----
function renderFacetTags(facets, currentKeys, key, labelFn) {
  const keys = Object.keys(facets).sort((a, b) => facets[b] - facets[a]);
  return keys.map(k => {
    const active = currentKeys.size === 0 || currentKeys.has(k);
    const count = facets[k];
    return `<button class="ftag ${currentKeys.has(k) ? 'on' : ''}" data-fkey="${key}" data-fval="${esc(k)}">${esc(labelFn ? labelFn(k) : k)} <b>${count}</b></button>`;
  }).join('');
}

function renderStatusOptions(facets, currentStatus) {
  const keys = Object.keys(facets).sort();
  let html = `<button class="ftag ${!currentStatus ? 'on' : ''}" data-fkey="status" data-fval="">全部 <b>${Object.values(facets).reduce((a,b)=>a+b,0)}</b></button>`;
  for (const k of keys) {
    const label = k === 'active' ? '活跃' : k === 'maintenance' ? '维护' : k === 'archived' ? '停更' : k;
    html += `<button class="ftag ${currentStatus === k ? 'on' : ''}" data-fkey="status" data-fval="${esc(k)}">${label} <b>${facets[k]}</b></button>`;
  }
  return html;
}

// ---- 渲染结果卡片 ----
function renderCard(item) {
  const tags = (item.tags || []).slice(0, 4).map(t => `<span>${esc(t)}</span>`).join('');
  const useWhen = item.use_when ? `<div class="use">🟢 ${esc(item.use_when)}</div>` : '';
  const avoidWhen = item.avoid_when ? `<div class="avoid">🔴 ${esc(item.avoid_when)}</div>` : '';
  
  return `<article class="card">
    <div class="card-top">
      <div class="card-title">
        <a href="/projects/${encodeURIComponent(item.id)}/">${esc(item.name)}</a>
        <small>${esc(labelDomain(item.domain))}</small>
      </div>
      ${useWhen}
      ${avoidWhen}
      <p class="card-summary">${esc(item.summary)}</p>
      <div class="tags">${tags}</div>
    </div>
    <dl class="card-meta">
      <div><dt>语言</dt><dd>${esc(item.language || '未标注')}</dd></div>
      <div><dt>许可证</dt><dd>${esc(item.license || '未标注')}</dd></div>
      <div><dt>状态</dt><dd>${esc(item.status || '未标注')}</dd></div>
    </dl>
  </article>`;
}

// ---- 主入口 ----
async function startApp() {
  try {
    allItems = await loadData();
  } catch (e) {
    const c = $('result-count');
    if (c) c.textContent = '数据加载失败，请稍后再试';
    return;
  }

  currentFilters = {
    keyword: '',
    domains: new Set(),
    languages: new Set(),
    licenses: new Set(),
    status: ''
  };

  const panel = $('filter-panel');
  const results = $('project-results');
  const countEl = $('result-count');
  const keyword = $('keyword-filter');
  const sortSel = $('sort-filter');
  let page = 1;
  const pageSize = 20;

  function renderPanel(found) {
    const facets = buildFacets(found.length ? found : allItems);
    panel.innerHTML = `
      <div class="fgroup">
        <h3>📂 领域</h3>
        <div class="ftags">${renderFacetTags(facets.domains, currentFilters.domains, 'domains', labelDomain)}</div>
      </div>
      <div class="fgroup">
        <h3>🈯 编程语言</h3>
        <div class="ftags">${renderFacetTags(facets.languages, currentFilters.languages, 'languages')}</div>
      </div>
      <div class="fgroup">
        <h3>📜 许可证</h3>
        <div class="ftags">${renderFacetTags(facets.licenses, currentFilters.licenses, 'licenses')}</div>
      </div>
      <div class="fgroup">
        <h3>🔄 维护状态</h3>
        <div class="ftags">${renderStatusOptions(facets.statuses, currentFilters.status)}</div>
      </div>
    `;
  }

  function renderResults(found) {
    const sortBy = sortSel ? sortSel.value : 'domain';
    const sorted = sortItems(found, sortBy);
    const pageItems = sorted.slice(0, page * pageSize);
    results.innerHTML = pageItems.map(renderCard).join('') || '<p class="notice">没有符合全部条件的项目，请减少筛选条件。</p>';
    countEl.textContent = `找到 ${found.length} 个，显示 ${Math.min(page * pageSize, found.length)} 个`;
    const moreBtn = $('load-more');
    if (moreBtn) moreBtn.hidden = page * pageSize >= found.length;
  }

  function update() {
    currentFilters.keyword = keyword ? norm(keyword.value) : '';
    let found = filterItems(allItems, currentFilters);
    page = 1;
    renderPanel(found);
    renderResults(found);
  }

  // 面板事件委托
  panel.addEventListener('click', e => {
    const btn = e.target.closest('.ftag');
    if (!btn) return;
    e.preventDefault();
    const key = btn.dataset.fkey;
    const val = btn.dataset.fval;
    
    if (key === 'status') {
      currentFilters.status = val || '';
    } else {
      const set = currentFilters[key];
      if (!set) return;
      if (set.has(val)) {
        set.delete(val);
      } else {
        set.add(val);
      }
    }
    update();
  });

  // 关键词输入
  if (keyword) {
    let timer;
    keyword.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(update, 200);
    });
  }

  // 排序切换
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      page = 1;
      const found = filterItems(allItems, currentFilters);
      renderResults(found);
    });
  }

  // 加载更多
  const moreBtn = $('load-more');
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      page++;
      const found = filterItems(allItems, currentFilters);
      const sortBy = sortSel ? sortSel.value : 'domain';
      const sorted = sortItems(found, sortBy);
      const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);
      results.insertAdjacentHTML('beforeend', pageItems.map(renderCard).join(''));
      countEl.textContent = `找到 ${found.length} 个，显示 ${Math.min(page * pageSize, found.length)} 个`;
      if (page * pageSize >= found.length) moreBtn.hidden = true;
    });
  }

  // 首屏渲染
  renderPanel(allItems);
  renderResults(allItems);
}

document.addEventListener('DOMContentLoaded', startApp);
