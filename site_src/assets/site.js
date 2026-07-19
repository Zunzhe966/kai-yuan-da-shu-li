const normalize = value => String(value || "").toLowerCase().trim();

async function loadIndex() {
  const response = await fetch("/api/v1/search-index.json", { cache: "no-cache" });
  if (!response.ok) throw new Error(`search index ${response.status}`);
  return response.json();
}

function matches(item, filters) {
  const text = normalize([item.name, item.summary, item.language, ...(item.tags || [])].join(" "));
  return (!filters.query || text.includes(normalize(filters.query)))
    && (!filters.domain || item.domain === filters.domain)
    && (!filters.language || item.language === filters.language)
    && (!filters.status || item.status === filters.status)
    && (!filters.tag || (item.tags || []).includes(filters.tag));
}

function escapeHTML(value) {
  const node = document.createElement("span");
  node.textContent = String(value || "");
  return node.innerHTML;
}

function renderItem(item) {
  const tags = (item.tags || []).slice(0, 4).map(tag => `<span>${escapeHTML(tag)}</span>`).join("");
  return `<article class="project-row"><div class="project-main"><div class="project-title"><a href="/projects/${encodeURIComponent(item.id)}/">${escapeHTML(item.name)}</a><small>${escapeHTML(item.domain)}</small></div><p>${escapeHTML(item.summary)}</p><div class="tags">${tags}</div></div><dl class="project-meta"><div><dt>语言</dt><dd>${escapeHTML(item.language || "未标注")}</dd></div><div><dt>状态</dt><dd>${escapeHTML(item.status || "未标注")}</dd></div></dl></article>`;
}

async function startCatalog() {
  const form = document.querySelector("#filters");
  const results = document.querySelector("#project-results");
  const count = document.querySelector("#result-count");
  const more = document.querySelector("#load-more");
  if (!form || !results || !count || !more) return;

  let index;
  try {
    index = await loadIndex();
  } catch (error) {
    count.textContent = "搜索索引暂时不可用，可从领域目录浏览";
    return;
  }

  const field = id => form.querySelector(`#${id}`);
  const pageSize = Number(more.dataset.pageSize) || 20;
  let visible = pageSize;
  let found = [];

  const render = () => {
    results.innerHTML = found.slice(0, visible).map(renderItem).join("") || '<p class="notice">没有符合全部条件的项目，请减少一个条件。</p>';
    count.textContent = `找到 ${found.length} 个，当前显示 ${Math.min(visible, found.length)} 个`;
    more.hidden = visible >= found.length;
  };

  const update = () => {
    const filters = {
      query: field("query-filter").value,
      domain: field("domain-filter").value,
      language: field("language-filter").value,
      status: field("status-filter").value,
      tag: field("tag-filter").value,
    };
    found = index.filter(item => matches(item, filters));
    const sort = field("sort-filter").value;
    found.sort((a, b) => normalize(a[sort]).localeCompare(normalize(b[sort]), "zh-CN"));
    visible = pageSize;
    render();
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("reset", () => requestAnimationFrame(update));
  more.addEventListener("click", () => {
    visible += pageSize;
    render();
  });
  update();
}

window.AtlasSearch = { loadIndex, matches };
document.addEventListener("DOMContentLoaded", startCatalog);
