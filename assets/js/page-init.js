import { getCategoryConfig } from "./config.js";
import { highlightHashTarget, initGlobalSearch, initShell } from "./common.js";
import { renderCategoryPage, renderHomePage } from "./renderers.js";

async function init() {
  initShell();
  initGlobalSearch();

  const page = document.body.dataset.page;
  if (page === "home") {
    await renderHomePage();
    return;
  }

  if (page === "about") {
    highlightHashTarget();
    return;
  }

  const category = getCategoryConfig(page);
  if (category) {
    await renderCategoryPage(category);
  }
}

init().catch((error) => {
  const container = document.querySelector("[data-page-content]") || document.querySelector(".page-main");
  if (container) {
    container.innerHTML = `
      <section class="notice-panel">
        <h2>表示エラー</h2>
        <ul class="note-list warning-list">
          <li>データの読み込みに失敗しました。</li>
          <li>ローカル確認時は `python3 -m http.server` などのサーバー経由で開いてください。</li>
          <li>${error.message}</li>
        </ul>
      </section>
    `;
  }
});
