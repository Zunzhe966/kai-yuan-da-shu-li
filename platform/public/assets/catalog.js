const filterToggle = document.querySelector("[data-filter-toggle]");
const filters = document.querySelector("#catalog-filters");

if (filterToggle && filters) {
  filterToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("filters-open");
    filterToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      filters.querySelector("select, input")?.focus();
    }
  });
}
