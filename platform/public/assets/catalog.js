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
