import { CATEGORY_CONFIG, SITE_META } from "./config.js";

const dataCache = new Map();

export function getBasePath() {
  return document.body.dataset.base || ".";
}

export function buildPath(path) {
  return `${getBasePath()}/${path}`.replace(/\/{2,}/g, "/").replace(":/", "://");
}

export async function loadJson(path) {
  const resolved = buildPath(path);
  if (dataCache.has(resolved)) {
    return dataCache.get(resolved);
  }

  const response = await fetch(resolved);
  if (!response.ok) {
    throw new Error(`Failed to load ${resolved}`);
  }

  const json = await response.json();
  dataCache.set(resolved, json);
  return json;
}

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(value) {
  if (!value) {
    return "未設定";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function getPreferredViewMode() {
  const stored = localStorage.getItem("pharmacy-tool:view-mode");
  if (stored === "table" || stored === "card") {
    return stored;
  }

  return window.matchMedia("(min-width: 960px)").matches ? "table" : "card";
}

export function setPreferredViewMode(mode) {
  localStorage.setItem("pharmacy-tool:view-mode", mode);
}

export function initShell() {
  renderQuickNav();
  renderFooter();
  markActiveNav();
}

function renderQuickNav() {
  const nav = document.querySelector("[data-quick-nav]");
  if (!nav) {
    return;
  }

  nav.innerHTML = CATEGORY_CONFIG.map((category) => {
    const href = buildPath(category.path);
    return `<a href="${href}" data-nav-id="${category.id}">${escapeHtml(category.shortTitle)}</a>`;
  }).join("");
}

function renderFooter() {
  const footer = document.querySelector("[data-site-footer]");
  if (!footer) {
    return;
  }

  footer.innerHTML = `
    <div>薬局業務メモサイト | ${escapeHtml(SITE_META.description)}</div>
    <div>最終更新: ${escapeHtml(formatDate(SITE_META.siteUpdatedAt))}</div>
    <div>最終確認は添付文書・最新資料・施設ルールを優先してください。</div>
  `;
}

function markActiveNav() {
  const currentPage = document.body.dataset.page;
  document.querySelectorAll("[data-nav-id]").forEach((link) => {
    if (link.dataset.navId === currentPage) {
      link.classList.add("is-active");
    }
  });
}

function collectText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => collectText(item)).join(" ");
  }
  if (value && typeof value === "object") {
    return Object.values(value).map((item) => collectText(item)).join(" ");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function getSearchText(category, item) {
  const base = category.searchFields
    .map((field) => collectText(item[field]))
    .join(" ");
  return `${category.title} ${category.shortTitle} ${base}`.toLowerCase();
}

function getItemLabel(category, item) {
  switch (category.type) {
    case "pediatric":
      return item.name;
    case "antibiotics":
      return `${item.genericName} / ${item.brandName || "商品名未記載"}`;
    case "steroid":
      return `${item.brandName} / ${item.genericName}`;
    case "probiotics":
      return `${item.name}${item.brand ? ` / ${item.brand}` : ""}`;
    case "billing":
      return item.title;
    case "checklist":
      return item.task;
    default:
      return item.name || item.title || item.task || "項目";
  }
}

function getItemSummary(category, item) {
  switch (category.type) {
    case "pediatric":
      return `${item.category} | ${item.dosage} | ${item.frequency}`;
    case "antibiotics":
      return `${item.class}${item.note ? ` | ${item.note}` : ""}`;
    case "steroid":
      return `${item.rank} | ${item.form}${item.note ? ` | ${item.note}` : ""}`;
    case "probiotics":
      return item.note || item.brand || "整腸剤メモ";
    case "billing":
      return Array.isArray(item.content) ? item.content.join(" / ") : "";
    case "checklist":
      return item.note || "日次チェック項目";
    default:
      return item.note || "";
  }
}

async function buildSearchIndex() {
  const groups = await Promise.all(CATEGORY_CONFIG.map(async (category) => {
    const items = await loadJson(category.dataFile);
    return items.map((item) => ({
      category,
      item,
      searchText: getSearchText(category, item)
    }));
  }));

  return [].concat(...groups);
}

let searchIndexPromise;

async function getSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = buildSearchIndex();
  }
  return searchIndexPromise;
}

function renderSearchResults(resultsContainer, results, query) {
  if (!query) {
    resultsContainer.hidden = true;
    resultsContainer.innerHTML = "";
    return;
  }

  if (!results.length) {
    resultsContainer.hidden = false;
    resultsContainer.innerHTML = `<div class="search-empty">「${escapeHtml(query)}」に一致する項目は見つかりませんでした。</div>`;
    return;
  }

  resultsContainer.hidden = false;
  resultsContainer.innerHTML = results.map(({ category, item }) => {
    const href = `${buildPath(category.path)}?item=${encodeURIComponent(item.id)}`;
    return `
      <a class="search-result" href="${href}">
        <div class="result-meta">
          <span class="result-tag">${escapeHtml(category.shortTitle)}</span>
          <small>${escapeHtml(category.title)}</small>
        </div>
        <strong>${escapeHtml(getItemLabel(category, item))}</strong>
        <small>${escapeHtml(getItemSummary(category, item))}</small>
      </a>
    `;
  }).join("");
}

export function initGlobalSearch() {
  const forms = document.querySelectorAll("[data-global-search]");
  if (!forms.length) {
    return;
  }

  forms.forEach((form) => {
    const input = form.querySelector('input[name="q"]');
    const resultsContainer = form.parentElement.querySelector("[data-search-results]");
    if (!input || !resultsContainer) {
      return;
    }

    const search = async () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        renderSearchResults(resultsContainer, [], "");
        return;
      }

      const index = await getSearchIndex();
      const results = index
        .filter((entry) => entry.searchText.includes(query))
        .slice(0, 18);
      renderSearchResults(resultsContainer, results, input.value.trim());
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await search();
    });

    input.addEventListener("input", () => {
      window.clearTimeout(form._searchTimer);
      form._searchTimer = window.setTimeout(search, 120);
    });

    document.addEventListener("click", (event) => {
      if (!form.parentElement.contains(event.target)) {
        resultsContainer.hidden = true;
      }
    });
  });
}

export function renderPageHeader(container, category, count, extraMeta = "") {
  container.innerHTML = `
    <section class="page-hero">
      <div class="page-hero-top">
        <div>
          <div class="eyebrow">${escapeHtml(category.shortTitle)}</div>
          <h1>${escapeHtml(category.title)}</h1>
          <p class="lead">${escapeHtml(category.description)}</p>
        </div>
        <div class="status-row">
          <span class="status-chip">${escapeHtml(`${count}件`)}</span>
          ${extraMeta ? `<span class="status-chip">${escapeHtml(extraMeta)}</span>` : ""}
        </div>
      </div>
      <p class="page-meta">カード表示と表表示を切り替えできます。検索は上部固定です。</p>
    </section>
  `;
}

export function highlightHashTarget() {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("item");
  const escapedItemId = itemId
    ? String(itemId).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
    : "";
  const targets = itemId
    ? document.querySelectorAll(`[data-item-id="${escapedItemId}"]`)
    : [];

  let target = [...targets].find((node) => !node.closest(".hidden"));
  if (!target && targets.length) {
    target = targets[0];
  }

  if (!target && window.location.hash) {
    target = document.querySelector(decodeURIComponent(window.location.hash));
  }

  if (!target) {
    return;
  }

  target.classList.add("is-highlighted");
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => target.classList.remove("is-highlighted"), 2400);
}

export function getCategoryFilters(category, items) {
  if (!category.filterField) {
    return [];
  }

  return [...new Set(items.map((item) => item[category.filterField]).filter(Boolean))];
}
