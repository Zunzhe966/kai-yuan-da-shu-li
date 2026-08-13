const forms = document.querySelectorAll("[data-studio-form]");

for (const form of forms) {
  const state = form.querySelector("[data-save-state]");
  form.addEventListener("input", () => {
    if (state) state.textContent = "有未保存修改";
  });
  form.addEventListener("submit", () => {
    if (state) state.textContent = "正在保存";
  });
}
