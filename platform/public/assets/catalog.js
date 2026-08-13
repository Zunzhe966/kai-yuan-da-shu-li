// 领域 chip 在移动端：左右键盘可横向滚动
const domainChips = document.querySelector(".domain-chips");
if (domainChips) {
  domainChips.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const links = [...domainChips.querySelectorAll("a")];
      const idx = links.indexOf(document.activeElement);
      if (idx === -1) return;
      const next = links[idx + (e.key === "ArrowRight" ? 1 : -1)];
      if (next) { e.preventDefault(); next.focus(); }
    }
  });
}

// 章节标签栏：高亮当前可见章节
const sectionTabs = document.getElementById("section-tabs");
if (sectionTabs) {
  const sections = [...document.querySelectorAll("[data-section]")];
  const tabs = [...sectionTabs.querySelectorAll(".section-tab")];

  function setActive(id) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === id;
      tab.classList.toggle("active", isActive);
      if (isActive) {
        // 将活动标签滚动到标签栏可见区域
        tab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }
    });
  }

  // 初始化：激活第一个标签
  if (tabs.length) setActive(tabs[0].dataset.tab);

  const observer = new IntersectionObserver(
    (entries) => {
      // 找到最靠近顶部的可见 section
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) setActive(visible[0].target.dataset.section);
    },
    {
      rootMargin: "-168px 0px -40% 0px",
      threshold: 0,
    },
  );

  sections.forEach((section) => observer.observe(section));

  // 点击标签时同步高亮（无需等 IntersectionObserver 触发）
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActive(tab.dataset.tab));
  });
}
