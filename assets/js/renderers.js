import { CATEGORY_CONFIG, SITE_META } from "./config.js";
import {
  escapeHtml,
  formatDate,
  getCategoryFilters,
  getPreferredViewMode,
  highlightHashTarget,
  loadJson,
  renderPageHeader,
  setPreferredViewMode
} from "./common.js";

function renderCardField(label, value) {
  if (!value) {
    return "";
  }
  return `
    <div>
      <dt class="field-label">${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function quickTableSummary(quickTable) {
  if (!quickTable || !quickTable.headers || !quickTable.headers.length || !quickTable.rows || !quickTable.rows.length) {
    return "";
  }

  return quickTable.rows.map((row) => (
    `${row.label}: ${row.values.join(" / ")}`
  )).join(" | ");
}

function renderQuickTable(quickTable) {
  if (!quickTable || !quickTable.headers || !quickTable.headers.length || !quickTable.rows || !quickTable.rows.length) {
    return "";
  }

  return `
    <div class="mini-table-wrap">
      <table class="mini-table">
        <thead>
          <tr>
            <th>${escapeHtml(quickTable.cornerLabel || "区分")}</th>
            ${quickTable.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${quickTable.rows.map((row) => `
            <tr>
              <th scope="row">${escapeHtml(row.label)}</th>
              ${row.values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTable(columns, items, rowRenderer) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${items.map((item) => rowRenderer(item)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function createViewSection(title) {
  return `
    <section class="section-card">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>スマホではカード、PC では表を初期表示にしています。</p>
        </div>
        <div class="view-switch" data-view-switch>
          <button class="view-button" type="button" data-view-mode="card">カード</button>
          <button class="view-button" type="button" data-view-mode="table">表</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="filter-row" data-filter-row></div>
      </div>
      <div data-card-mount></div>
      <div data-table-mount></div>
    </section>
  `;
}

function bindViewSwitch(section) {
  const buttons = section.querySelectorAll("[data-view-mode]");
  const cardMount = section.querySelector("[data-card-mount]");
  const tableMount = section.querySelector("[data-table-mount]");

  const applyMode = (mode) => {
    buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.viewMode === mode));
    cardMount.classList.toggle("hidden", mode !== "card");
    tableMount.classList.toggle("hidden", mode !== "table");
    setPreferredViewMode(mode);
    highlightHashTarget();
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => applyMode(button.dataset.viewMode));
  });

  applyMode(getPreferredViewMode());
}

function bindFilters(section, items, renderFiltered, category) {
  const filterRow = section.querySelector("[data-filter-row]");
  const filters = getCategoryFilters(category, items);
  if (!filters.length) {
    filterRow.innerHTML = `<span class="muted-text">フィルタなし</span>`;
    renderFiltered(items);
    return;
  }

  let active = "all";

  const draw = () => {
    const filteredItems = active === "all"
      ? items
      : items.filter((item) => item[category.filterField] === active);

    filterRow.innerHTML = [
      `<button class="filter-chip ${active === "all" ? "is-active" : ""}" type="button" data-filter-value="all">すべて</button>`,
      ...filters.map((filter) => (
        `<button class="filter-chip ${active === filter ? "is-active" : ""}" type="button" data-filter-value="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`
      ))
    ].join("");

    filterRow.querySelectorAll("[data-filter-value]").forEach((button) => {
      button.addEventListener("click", () => {
        active = button.dataset.filterValue;
        draw();
      });
    });

    renderFiltered(filteredItems);
  };

  draw();
}

function hasCalculatorFields(item) {
  return Number.isFinite(item.dosageMgPerKgMin)
    && Number.isFinite(item.dosageMgPerKgMax)
    && Number.isFinite(item.dosesPerDay)
    && item.dosesPerDay > 0;
}

function hasGramStrength(item) {
  return Number.isFinite(item.strengthMgPerGram) && item.strengthMgPerGram > 0;
}

function hasMlStrength(item) {
  return Number.isFinite(item.strengthMgPerMl) && item.strengthMgPerMl > 0;
}

function formatDoseNumber(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  if (value >= 100) {
    return String(Math.round(value));
  }

  return String(Math.round(value * 10) / 10);
}

function formatDoseRange(minValue, maxValue) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return "-";
  }

  const minText = formatDoseNumber(minValue);
  const maxText = formatDoseNumber(maxValue);
  return minText === maxText ? `${minText}mg` : `${minText}〜${maxText}mg`;
}

function formatGramNumber(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  if (value >= 10) {
    return String(Math.round(value * 10) / 10);
  }

  if (value >= 1) {
    return String(Math.round(value * 100) / 100);
  }

  return String(Math.round(value * 1000) / 1000);
}

function formatGramRange(minValue, maxValue) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return "g換算なし";
  }

  const minText = formatGramNumber(minValue);
  const maxText = formatGramNumber(maxValue);
  return minText === maxText ? `${minText}g` : `${minText}〜${maxText}g`;
}

function formatMlRange(minValue, maxValue) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return "mL換算なし";
  }

  const minText = formatGramNumber(minValue);
  const maxText = formatGramNumber(maxValue);
  return minText === maxText ? `${minText}mL` : `${minText}〜${maxText}mL`;
}

function calculatorDrugLabel(item) {
  if (item.brandName && item.brandName !== item.name) {
    return `${item.name} / ${item.brandName}`;
  }

  return item.name;
}

function normalizeDoseText(value) {
  return String(value || "")
    .replace(/ｍ/g, "m")
    .replace(/Ｍ/g, "M")
    .replace(/μ/g, "u")
    .replace(/〜/g, "~")
    .replace(/－/g, "-")
    .replace(/–/g, "-")
    .replace(/／/g, "/")
    .replace(/\s+/g, "");
}

function parseAdultDailyLimitMg(item) {
  const adultText = item && item.ageDoseGuide ? item.ageDoseGuide.adult : "";
  const normalizedText = normalizeDoseText(adultText).toLowerCase();
  if (!normalizedText || normalizedText === "-" || normalizedText === "—") {
    return null;
  }

  const numbers = normalizedText.match(/\d+(?:\.\d+)?/g);
  if (!numbers || !numbers.length) {
    return null;
  }

  const maxValue = Math.max.apply(null, numbers.map((value) => Number(value)));
  if (!Number.isFinite(maxValue)) {
    return null;
  }

  if (normalizedText.includes("mg")) {
    return { sourceText: adultText, maxMg: maxValue };
  }

  if (normalizedText.includes("ml") && hasMlStrength(item)) {
    return { sourceText: adultText, maxMg: maxValue * item.strengthMgPerMl };
  }

  if (normalizedText.includes("g")) {
    if (hasGramStrength(item)) {
      return { sourceText: adultText, maxMg: maxValue * item.strengthMgPerGram };
    }

    return { sourceText: adultText, maxMg: maxValue * 1000 };
  }

  return null;
}

function renderAdultLimitWarning(item, minDailyDose, maxDailyDose) {
  const adultLimit = parseAdultDailyLimitMg(item);
  if (!adultLimit || !Number.isFinite(maxDailyDose) || maxDailyDose <= adultLimit.maxMg) {
    return "";
  }

  const message = minDailyDose > adultLimit.maxMg
    ? `成人量目安（${adultLimit.sourceText}）を超えています。再確認してください。`
    : `上限側が成人量目安（${adultLimit.sourceText}）を超える可能性があります。再確認してください。`;

  return `<p class="calculator-warning">${escapeHtml(message)}</p>`;
}

function renderPediatricCalculator(items) {
  const calculableItems = items.filter(hasCalculatorFields);
  const gramItems = calculableItems.filter(hasGramStrength);
  const mlItems = calculableItems.filter(hasMlStrength);

  return `
    <section class="section-card calculator-card">
      <div class="section-head">
        <div>
          <h2>小児用量計算機</h2>
          <p>体重から 1日量を出す計算と、1日量の g / mL から体重を逆算する計算をまとめています。</p>
        </div>
      </div>
      <div class="calculator-panels">
        <form class="calculator-form" data-pediatric-calculator>
          <div class="calculator-block-title">
            <h3>体重から計算</h3>
            <p>1日量の mg と、規格ベースの g / mL を確認します。</p>
          </div>
          <div class="calculator-grid">
            <label class="calculator-field">
              <span class="field-label">体重（kg）</span>
              <input type="number" inputmode="decimal" min="0.1" step="0.1" name="weight" placeholder="例: 15">
            </label>
            <label class="calculator-field">
              <span class="field-label">薬剤</span>
              <select name="drug">
                <option value="">薬剤を選択</option>
                ${calculableItems.map((item) => (
                  `<option value="${escapeHtml(item.id)}">${escapeHtml(calculatorDrugLabel(item))}</option>`
                )).join("")}
              </select>
            </label>
            <div class="calculator-actions">
              <button class="primary-button" type="submit">計算する</button>
            </div>
          </div>
          <div class="calculator-result" data-calculator-result>
            <p class="calculator-placeholder">体重と薬剤を入力すると、ここに計算結果が表示されます。</p>
          </div>
        </form>

        <form class="calculator-form" data-pediatric-reverse-calculator>
          <div class="calculator-block-title">
            <h3>g から体重を逆算</h3>
            <p>散・顆粒など g 換算できる薬のみ対象です。</p>
          </div>
          <div class="calculator-grid">
            <label class="calculator-field">
              <span class="field-label">1日量（g）</span>
              <input type="number" inputmode="decimal" min="0.01" step="0.01" name="dailyGram" placeholder="例: 1.2">
            </label>
            <label class="calculator-field">
              <span class="field-label">薬剤</span>
              <select name="drug">
                <option value="">薬剤を選択</option>
                ${gramItems.map((item) => (
                  `<option value="${escapeHtml(item.id)}">${escapeHtml(calculatorDrugLabel(item))}</option>`
                )).join("")}
              </select>
            </label>
            <div class="calculator-actions">
              <button class="primary-button" type="submit">逆算する</button>
            </div>
          </div>
          <div class="calculator-result" data-reverse-calculator-result>
            <p class="calculator-placeholder">1日量 g と薬剤を入力すると、推定体重が表示されます。</p>
          </div>
        </form>

        <form class="calculator-form" data-pediatric-ml-reverse-calculator>
          <div class="calculator-block-title">
            <h3>mL から体重を逆算</h3>
            <p>シロップ・液剤など mL 換算できる薬のみ対象です。</p>
          </div>
          <div class="calculator-grid">
            <label class="calculator-field">
              <span class="field-label">1日量（mL）</span>
              <input type="number" inputmode="decimal" min="0.1" step="0.1" name="dailyMl" placeholder="例: 6">
            </label>
            <label class="calculator-field">
              <span class="field-label">薬剤</span>
              <select name="drug">
                <option value="">薬剤を選択</option>
                ${mlItems.map((item) => (
                  `<option value="${escapeHtml(item.id)}">${escapeHtml(calculatorDrugLabel(item))}</option>`
                )).join("")}
              </select>
            </label>
            <div class="calculator-actions">
              <button class="primary-button" type="submit">逆算する</button>
            </div>
          </div>
          <div class="calculator-result" data-ml-reverse-calculator-result>
            <p class="calculator-placeholder">1日量 mL と薬剤を入力すると、推定体重が表示されます。</p>
          </div>
        </form>
      </div>
      <ul class="note-list warning-list calculator-notes">
        <li>実際の投与量は添付文書・医師指示を優先してください。</li>
        <li>腎機能・年齢・適応により調整が必要です。</li>
      </ul>
    </section>
  `;
}

function bindPediatricCalculator(section, items) {
  const form = section.querySelector("[data-pediatric-calculator]");
  if (!form) {
    return;
  }

  const weightInput = form.querySelector('input[name="weight"]');
  const drugSelect = form.querySelector('select[name="drug"]');
  const result = form.querySelector("[data-calculator-result]");
  const reverseForm = section.querySelector("[data-pediatric-reverse-calculator]");
  const reverseGramInput = reverseForm ? reverseForm.querySelector('input[name="dailyGram"]') : null;
  const reverseDrugSelect = reverseForm ? reverseForm.querySelector('select[name="drug"]') : null;
  const reverseResult = reverseForm ? reverseForm.querySelector("[data-reverse-calculator-result]") : null;
  const mlReverseForm = section.querySelector("[data-pediatric-ml-reverse-calculator]");
  const reverseMlInput = mlReverseForm ? mlReverseForm.querySelector('input[name="dailyMl"]') : null;
  const reverseMlDrugSelect = mlReverseForm ? mlReverseForm.querySelector('select[name="drug"]') : null;
  const reverseMlResult = mlReverseForm ? mlReverseForm.querySelector("[data-ml-reverse-calculator-result]") : null;

  function renderMessage(message, isError) {
    result.innerHTML = `<p class="${isError ? "calculator-error" : "calculator-placeholder"}">${escapeHtml(message)}</p>`;
  }

  function renderReverseMessage(message, isError) {
    if (reverseResult) {
      reverseResult.innerHTML = `<p class="${isError ? "calculator-error" : "calculator-placeholder"}">${escapeHtml(message)}</p>`;
    }
  }

  function renderMlReverseMessage(message, isError) {
    if (reverseMlResult) {
      reverseMlResult.innerHTML = `<p class="${isError ? "calculator-error" : "calculator-placeholder"}">${escapeHtml(message)}</p>`;
    }
  }

  // 体重と mg/kg/day から 1 日量の目安を計算する。
  function calculateDose(item, weight) {
    const minDailyDose = weight * item.dosageMgPerKgMin;
    const maxDailyDose = weight * item.dosageMgPerKgMax;
    const minDailyGram = hasGramStrength(item) ? minDailyDose / item.strengthMgPerGram : NaN;
    const maxDailyGram = hasGramStrength(item) ? maxDailyDose / item.strengthMgPerGram : NaN;
    const minDailyMl = hasMlStrength(item) ? minDailyDose / item.strengthMgPerMl : NaN;
    const maxDailyMl = hasMlStrength(item) ? maxDailyDose / item.strengthMgPerMl : NaN;

    return {
      minDailyDose,
      maxDailyDose,
      minDailyGram,
      maxDailyGram,
      minDailyMl,
      maxDailyMl
    };
  }

  // 1日量 g を規格から mg/day に換算し、体重を逆算する。
  function reverseWeightFromGram(item, dailyGram) {
    const dailyMg = dailyGram * item.strengthMgPerGram;
    const minWeight = dailyMg / item.dosageMgPerKgMax;
    const maxWeight = dailyMg / item.dosageMgPerKgMin;

    return {
      dailyMg,
      minWeight,
      maxWeight
    };
  }

  // 1日量 mL を規格から mg/day に換算し、体重を逆算する。
  function reverseWeightFromMl(item, dailyMl) {
    const dailyMg = dailyMl * item.strengthMgPerMl;
    const minWeight = dailyMg / item.dosageMgPerKgMax;
    const maxWeight = dailyMg / item.dosageMgPerKgMin;

    return {
      dailyMg,
      minWeight,
      maxWeight
    };
  }

  function updateResult() {
    const weight = Number(weightInput.value);
    const selectedId = drugSelect.value;
    const item = items.find((entry) => entry.id === selectedId);

    if (!selectedId) {
      renderMessage("薬剤を選択してください。", true);
      return;
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      renderMessage("体重を入力してください。", true);
      return;
    }

    if (!item || !hasCalculatorFields(item)) {
      renderMessage("この薬剤は計算用データが未設定です。", true);
      return;
    }

    const calculated = calculateDose(item, weight);
    result.innerHTML = `
      <div class="calculator-summary">
        <p class="calculator-drug">${escapeHtml(item.name)} / ${escapeHtml(formatDoseNumber(weight))}kg</p>
        <div class="calculator-metrics">
          <article class="calculator-metric">
            <span class="calculator-label">1日量</span>
            <strong>${escapeHtml(formatDoseRange(calculated.minDailyDose, calculated.maxDailyDose))}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">1日量（g換算）</span>
            <strong>${escapeHtml(formatGramRange(calculated.minDailyGram, calculated.maxDailyGram))}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">1日量（mL換算）</span>
            <strong>${escapeHtml(formatMlRange(calculated.minDailyMl, calculated.maxDailyMl))}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">投与回数</span>
            <strong>1日${escapeHtml(String(item.dosesPerDay))}回</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">用量範囲</span>
            <strong>${escapeHtml(`${item.dosageMgPerKgMin}〜${item.dosageMgPerKgMax}mg/kg/日`)}</strong>
          </article>
        </div>
        <p class="calculator-caption">1日量: ${escapeHtml(formatDoseRange(calculated.minDailyDose, calculated.maxDailyDose))} / ${escapeHtml(formatGramRange(calculated.minDailyGram, calculated.maxDailyGram))} / ${escapeHtml(formatMlRange(calculated.minDailyMl, calculated.maxDailyMl))}</p>
        ${renderAdultLimitWarning(item, calculated.minDailyDose, calculated.maxDailyDose)}
        ${hasGramStrength(item) ? `<p class="muted-text calculator-note">${escapeHtml(`g換算は ${item.strengthMgPerGram}mg/g 基準です。`)}</p>` : `<p class="muted-text calculator-note">この薬剤は g 換算できる規格データがありません。</p>`}
        ${hasMlStrength(item) ? `<p class="muted-text calculator-note">${escapeHtml(`mL換算は ${item.strengthMgPerMl}mg/mL 基準です。`)}</p>` : `<p class="muted-text calculator-note">この薬剤は mL 換算できる規格データがありません。</p>`}
        ${item.note ? `<p class="muted-text calculator-note">${escapeHtml(item.note)}</p>` : ""}
      </div>
    `;
  }

  function updateReverseResult() {
    if (!reverseForm || !reverseGramInput || !reverseDrugSelect || !reverseResult) {
      return;
    }

    const dailyGram = Number(reverseGramInput.value);
    const selectedId = reverseDrugSelect.value;
    const item = items.find((entry) => entry.id === selectedId);

    if (!selectedId) {
      renderReverseMessage("薬剤を選択してください。", true);
      return;
    }

    if (!Number.isFinite(dailyGram) || dailyGram <= 0) {
      renderReverseMessage("1日量（g）を入力してください。", true);
      return;
    }

    if (!item || !hasCalculatorFields(item) || !hasGramStrength(item)) {
      renderReverseMessage("この薬剤は g から逆算できません。", true);
      return;
    }

    const reversed = reverseWeightFromGram(item, dailyGram);
    reverseResult.innerHTML = `
      <div class="calculator-summary">
        <p class="calculator-drug">${escapeHtml(item.name)} / ${escapeHtml(formatGramNumber(dailyGram))}g/日</p>
        <div class="calculator-metrics">
          <article class="calculator-metric">
            <span class="calculator-label">推定体重</span>
            <strong>${escapeHtml(`${formatDoseNumber(reversed.minWeight)}〜${formatDoseNumber(reversed.maxWeight)}kg`)}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">1日量換算</span>
            <strong>${escapeHtml(`${formatDoseNumber(reversed.dailyMg)}mg/日`)}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">規格</span>
            <strong>${escapeHtml(item.spec || `${item.strengthMgPerGram}mg/g`)}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">用量範囲</span>
            <strong>${escapeHtml(`${item.dosageMgPerKgMin}〜${item.dosageMgPerKgMax}mg/kg/日`)}</strong>
          </article>
        </div>
        <p class="calculator-caption">推定体重: ${escapeHtml(`${formatDoseNumber(reversed.minWeight)}〜${formatDoseNumber(reversed.maxWeight)}kg`)}</p>
        ${renderAdultLimitWarning(item, reversed.dailyMg, reversed.dailyMg)}
        <p class="muted-text calculator-note">${escapeHtml(`逆算は ${item.strengthMgPerGram}mg/g 基準です。`)}</p>
        ${item.note ? `<p class="muted-text calculator-note">${escapeHtml(item.note)}</p>` : ""}
      </div>
    `;
  }

  function updateMlReverseResult() {
    if (!mlReverseForm || !reverseMlInput || !reverseMlDrugSelect || !reverseMlResult) {
      return;
    }

    const dailyMl = Number(reverseMlInput.value);
    const selectedId = reverseMlDrugSelect.value;
    const item = items.find((entry) => entry.id === selectedId);

    if (!selectedId) {
      renderMlReverseMessage("薬剤を選択してください。", true);
      return;
    }

    if (!Number.isFinite(dailyMl) || dailyMl <= 0) {
      renderMlReverseMessage("1日量（mL）を入力してください。", true);
      return;
    }

    if (!item || !hasCalculatorFields(item) || !hasMlStrength(item)) {
      renderMlReverseMessage("この薬剤は mL から逆算できません。", true);
      return;
    }

    const reversed = reverseWeightFromMl(item, dailyMl);
    reverseMlResult.innerHTML = `
      <div class="calculator-summary">
        <p class="calculator-drug">${escapeHtml(item.name)} / ${escapeHtml(formatGramNumber(dailyMl))}mL/日</p>
        <div class="calculator-metrics">
          <article class="calculator-metric">
            <span class="calculator-label">推定体重</span>
            <strong>${escapeHtml(`${formatDoseNumber(reversed.minWeight)}〜${formatDoseNumber(reversed.maxWeight)}kg`)}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">1日量換算</span>
            <strong>${escapeHtml(`${formatDoseNumber(reversed.dailyMg)}mg/日`)}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">規格</span>
            <strong>${escapeHtml(item.spec || `${item.strengthMgPerMl}mg/mL`)}</strong>
          </article>
          <article class="calculator-metric">
            <span class="calculator-label">用量範囲</span>
            <strong>${escapeHtml(`${item.dosageMgPerKgMin}〜${item.dosageMgPerKgMax}mg/kg/日`)}</strong>
          </article>
        </div>
        <p class="calculator-caption">推定体重: ${escapeHtml(`${formatDoseNumber(reversed.minWeight)}〜${formatDoseNumber(reversed.maxWeight)}kg`)}</p>
        ${renderAdultLimitWarning(item, reversed.dailyMg, reversed.dailyMg)}
        <p class="muted-text calculator-note">${escapeHtml(`逆算は ${item.strengthMgPerMl}mg/mL 基準です。`)}</p>
        ${item.note ? `<p class="muted-text calculator-note">${escapeHtml(item.note)}</p>` : ""}
      </div>
    `;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateResult();
  });

  weightInput.addEventListener("input", updateResult);
  drugSelect.addEventListener("change", updateResult);

  if (reverseForm) {
    reverseForm.addEventListener("submit", (event) => {
      event.preventDefault();
      updateReverseResult();
    });
  }

  if (reverseGramInput) {
    reverseGramInput.addEventListener("input", updateReverseResult);
  }

  if (reverseDrugSelect) {
    reverseDrugSelect.addEventListener("change", updateReverseResult);
  }

  if (mlReverseForm) {
    mlReverseForm.addEventListener("submit", (event) => {
      event.preventDefault();
      updateMlReverseResult();
    });
  }

  if (reverseMlInput) {
    reverseMlInput.addEventListener("input", updateMlReverseResult);
  }

  if (reverseMlDrugSelect) {
    reverseMlDrugSelect.addEventListener("change", updateMlReverseResult);
  }
}

const PEDIATRIC_MONITOR_COLUMNS = [
  { id: "1m4kg", label: "1M", weight: "4kg" },
  { id: "3m6kg", label: "3M", weight: "6kg" },
  { id: "6m8kg", label: "6M", weight: "8kg" },
  { id: "1to3", label: "1〜3歳", weight: "10〜15kg" },
  { id: "3to6", label: "3〜6歳", weight: "15〜20kg" },
  { id: "6to8", label: "6〜8歳", weight: "20〜25kg" },
  { id: "8to10", label: "8〜10歳", weight: "25〜30kg" },
  { id: "adult", label: "成人量", weight: "" }
];

function pediatricValueOrDash(value) {
  return value || "—";
}

function hasPediatricGuide(item) {
  return item.ageDoseGuide && PEDIATRIC_MONITOR_COLUMNS.some((column) => item.ageDoseGuide[column.id]);
}

function renderPediatricGuideTable(item) {
  if (hasPediatricGuide(item)) {
    return `
      <div class="mini-table-wrap">
        <table class="mini-table">
          <thead>
            <tr>
              ${PEDIATRIC_MONITOR_COLUMNS.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${PEDIATRIC_MONITOR_COLUMNS.map((column) => `<td>${escapeHtml(pediatricValueOrDash(item.ageDoseGuide[column.id]))}</td>`).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  return renderQuickTable(item.quickTable);
}

function groupPediatricItems(items) {
  const orderedGroups = [];

  items.forEach((item) => {
    const groupName = item.formGroup || "補足メモ";
    let group = orderedGroups.find((entry) => entry.groupName === groupName);
    if (!group) {
      group = { groupName, items: [] };
      orderedGroups.push(group);
    }
    group.items.push(item);
  });

  // 小児表は各グループ内を日本語の五十音順で揃える。
  orderedGroups.forEach((group) => {
    group.items.sort((left, right) => (
      String(left.name || "").localeCompare(String(right.name || ""), "ja")
      || String(left.brandName || "").localeCompare(String(right.brandName || ""), "ja")
    ));
  });

  return orderedGroups;
}

function renderPediatricItems(items) {
  const cards = `
    ${groupPediatricItems(items).map((group) => `
      <section class="pediatric-group-block">
        <div class="section-head pediatric-group-head">
          <div>
            <h3>${escapeHtml(group.groupName)}</h3>
            <p>PDF の監査表をもとに見出しを揃えています。</p>
          </div>
        </div>
        <div class="card-grid">
          ${group.items.map((item) => `
            <article class="data-card" data-item-id="${escapeHtml(item.id)}">
              <div class="card-title-row">
                <h3>${escapeHtml(item.name)}</h3>
                <span class="mini-chip">${escapeHtml(item.formGroup || item.category)}</span>
              </div>
              <dl>
                ${renderCardField("規格", item.spec)}
                ${renderCardField("投与量", item.dosage)}
                ${renderCardField("最大用量", item.maxDose || item.ageCondition)}
                ${renderCardField("回数", item.frequency)}
                ${renderCardField("別名", Array.isArray(item.aliases) ? item.aliases.join(" / ") : "")}
                ${renderCardField("補足", item.note)}
              </dl>
              ${renderPediatricGuideTable(item)}
            </article>
          `).join("")}
        </div>
      </section>
    `).join("")}
  `;

  const table = groupPediatricItems(items).map((group) => `
    <section class="pediatric-group-block">
      <div class="section-head pediatric-group-head">
        <div>
          <h3>${escapeHtml(group.groupName)}</h3>
          <p>薬品名 / 規格 / 投与量 / 最大用量 / 回数 / 年齢体重 / 成人量</p>
        </div>
      </div>
      <div class="table-wrap pediatric-table-wrap">
        <table class="pediatric-matrix-table">
          <thead>
            <tr>
              <th class="pediatric-name-col" rowspan="2">薬品名</th>
              <th rowspan="2">規格</th>
              <th rowspan="2">投与量</th>
              <th rowspan="2">最大用量</th>
              <th rowspan="2">回数</th>
              <th colspan="7">年齢 / 体重</th>
              <th rowspan="2">成人量</th>
              <th rowspan="2">補足</th>
            </tr>
            <tr>
              ${PEDIATRIC_MONITOR_COLUMNS.slice(0, 7).map((column) => `<th><span>${escapeHtml(column.label)}</span><small>${escapeHtml(column.weight)}</small></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${group.items.map((item) => `
              <tr data-item-id="${escapeHtml(item.id)}">
                <td class="pediatric-name-col">
                  <strong>${escapeHtml(item.name)}</strong>
                  ${item.brandName ? `<small class="muted-text">${escapeHtml(item.brandName)}</small>` : ""}
                </td>
                <td>${escapeHtml(pediatricValueOrDash(item.spec))}</td>
                <td>${escapeHtml(item.dosage)}</td>
                <td>${escapeHtml(pediatricValueOrDash(item.maxDose || item.ageCondition))}</td>
                <td>${escapeHtml(item.frequency)}</td>
                ${PEDIATRIC_MONITOR_COLUMNS.slice(0, 7).map((column) => `<td>${escapeHtml(pediatricValueOrDash(item.ageDoseGuide && item.ageDoseGuide[column.id]))}</td>`).join("")}
                <td>${escapeHtml(pediatricValueOrDash(item.ageDoseGuide && item.ageDoseGuide.adult))}</td>
                <td>${escapeHtml(item.note || (item.aliases || []).join(" / "))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `).join("");

  return { cards, table };
}

function renderAntibioticsItems(items) {
  const cards = `
    <div class="card-grid">
      ${items.map((item) => `
        <article class="data-card" data-item-id="${escapeHtml(item.id)}">
          <div class="card-title-row">
            <h3>${escapeHtml(item.genericName)}</h3>
            <span class="mini-chip">${escapeHtml(item.class)}</span>
          </div>
          <dl>
            ${renderCardField("商品名", item.brandName)}
            ${renderCardField("別名", Array.isArray(item.aliases) ? item.aliases.join(" / ") : "")}
            ${renderCardField("補足", item.note)}
          </dl>
        </article>
      `).join("")}
    </div>
  `;

  const table = renderTable(
    ["一般名", "商品名", "系統", "備考"],
    items,
    (item) => `
      <tr data-item-id="${escapeHtml(item.id)}">
        <td>${escapeHtml(item.genericName)}</td>
        <td>${escapeHtml(item.brandName)}</td>
        <td>${escapeHtml(item.class)}</td>
        <td>${escapeHtml(item.note || (item.aliases || []).join(" / "))}</td>
      </tr>
    `
  );

  return { cards, table };
}

function rankLabel(rank) {
  switch (rank) {
    case "strongest":
      return "strongest";
    case "very strong":
      return "very strong";
    case "strong":
      return "strong";
    case "medium":
      return "medium";
    case "weak":
      return "weak";
    default:
      return rank;
  }
}

function rankClassName(rank) {
  return String(rank || "").split(" ").join("-");
}

function renderSteroidItems(items) {
  const cards = `
    <div class="card-grid">
      ${items.map((item) => `
        <article class="data-card" data-item-id="${escapeHtml(item.id)}">
          <div class="card-title-row">
            <h3>${escapeHtml(item.brandName)}</h3>
            <span class="rank-badge rank-${escapeHtml(rankClassName(item.rank))}">${escapeHtml(rankLabel(item.rank))}</span>
          </div>
          <dl>
            ${renderCardField("一般名", item.genericName)}
            ${renderCardField("剤形", item.form)}
            ${renderCardField("補足", item.note)}
          </dl>
        </article>
      `).join("")}
    </div>
  `;

  const table = renderTable(
    ["商品名", "一般名", "ランク", "剤形", "備考"],
    items,
    (item) => `
      <tr data-item-id="${escapeHtml(item.id)}">
        <td>${escapeHtml(item.brandName)}</td>
        <td>${escapeHtml(item.genericName)}</td>
        <td><span class="rank-badge rank-${escapeHtml(rankClassName(item.rank))}">${escapeHtml(rankLabel(item.rank))}</span></td>
        <td>${escapeHtml(item.form)}</td>
        <td>${escapeHtml(item.note || (item.aliases || []).join(" / "))}</td>
      </tr>
    `
  );

  return { cards, table };
}

function renderProbioticsItems(items) {
  const cards = `
    <div class="card-grid">
      ${items.map((item) => `
        <article class="data-card" data-item-id="${escapeHtml(item.id)}">
          <h3>${escapeHtml(item.name)}</h3>
          <dl>
            ${renderCardField("商品名", item.brand)}
            ${renderCardField("別名", Array.isArray(item.aliases) ? item.aliases.join(" / ") : "")}
            ${renderCardField("補足", item.note)}
          </dl>
        </article>
      `).join("")}
    </div>
  `;

  const table = renderTable(
    ["製剤名", "商品名", "備考"],
    items,
    (item) => `
      <tr data-item-id="${escapeHtml(item.id)}">
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.brand)}</td>
        <td>${escapeHtml(item.note || (item.aliases || []).join(" / "))}</td>
      </tr>
    `
  );

  return { cards, table };
}

function renderBillingItems(items) {
  const cards = `
    <div class="billing-grid">
      ${items.map((item) => `
        <article class="billing-card" data-item-id="${escapeHtml(item.id)}">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.note || "算定時の着眼点を短くまとめたメモです。")}</p>
          <ul>
            ${item.content.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
          </ul>
        </article>
      `).join("")}
    </div>
  `;

  const table = renderTable(
    ["項目", "内容", "補足"],
    items,
    (item) => `
      <tr data-item-id="${escapeHtml(item.id)}">
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.content.join(" / "))}</td>
        <td>${escapeHtml(item.note || "")}</td>
      </tr>
    `
  );

  return { cards, table };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadChecklistState(items) {
  const key = `pharmacy-tool:checklist:${todayKey()}`;
  const saved = JSON.parse(localStorage.getItem(key) || "{}");
  return {
    key,
    items: items.map((item) => ({
      ...item,
      done: Boolean(Object.prototype.hasOwnProperty.call(saved, item.id) ? saved[item.id] : item.done)
    }))
  };
}

function saveChecklistState(storageKey, items) {
  const payload = {};
  items.forEach((item) => {
    payload[item.id] = item.done;
  });
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

function renderChecklistSection(section, items, storageKey) {
  const render = () => {
    const completed = items.filter((item) => item.done).length;
    const rate = items.length ? Math.round((completed / items.length) * 100) : 0;

    section.innerHTML = `
      <section class="section-card">
        <div class="section-head">
          <div>
            <h2>今日のチェック</h2>
            <p>${escapeHtml(formatDate(todayKey()))} の状態をローカル保存します。</p>
          </div>
          <div class="completion-meter">
            <div class="meter-bar"><span style="width: ${rate}%"></span></div>
            <strong>${completed} / ${items.length}</strong>
          </div>
        </div>
        <div class="action-row">
          <button class="action-button" type="button" data-check-all>すべてチェック</button>
          <button class="action-button" type="button" data-uncheck-all>すべて解除</button>
        </div>
        <div class="view-switch" data-view-switch>
          <button class="view-button" type="button" data-view-mode="card">カード</button>
          <button class="view-button" type="button" data-view-mode="table">表</button>
        </div>
        <div data-card-mount>
          <div class="card-grid">
            ${items.map((item) => `
              <label class="check-card data-card" data-item-id="${escapeHtml(item.id)}">
                <input type="checkbox" data-check-id="${escapeHtml(item.id)}" ${item.done ? "checked" : ""}>
                <span>
                  <strong>${escapeHtml(item.task)}</strong>
                  <small class="muted-text">${escapeHtml(item.note || "")}</small>
                </span>
              </label>
            `).join("")}
          </div>
        </div>
        <div data-table-mount>
          ${renderTable(
            ["完了", "チェック項目", "補足"],
            items,
            (item) => `
              <tr data-item-id="${escapeHtml(item.id)}">
                <td>
                  <label class="check-table-label">
                    <input type="checkbox" data-check-id="${escapeHtml(item.id)}" ${item.done ? "checked" : ""}>
                    <span>${item.done ? "済" : "未"}</span>
                  </label>
                </td>
                <td>${escapeHtml(item.task)}</td>
                <td>${escapeHtml(item.note || "")}</td>
              </tr>
            `
          )}
        </div>
      </section>
    `;

    bindViewSwitch(section.querySelector(".section-card"));
    bindChecklistActions();
  };

  const bindChecklistActions = () => {
    section.querySelectorAll("[data-check-id]").forEach((input) => {
      input.addEventListener("change", () => {
        const target = items.find((item) => item.id === input.dataset.checkId);
        if (target) {
          target.done = input.checked;
          saveChecklistState(storageKey, items);
          render();
        }
      });
    });

    section.querySelector("[data-check-all]").addEventListener("click", () => {
      items.forEach((item) => {
        item.done = true;
      });
      saveChecklistState(storageKey, items);
      render();
    });

    section.querySelector("[data-uncheck-all]").addEventListener("click", () => {
      items.forEach((item) => {
        item.done = false;
      });
      saveChecklistState(storageKey, items);
      render();
    });
  };

  render();
}

function getRenderer(type) {
  switch (type) {
    case "pediatric":
      return renderPediatricItems;
    case "antibiotics":
      return renderAntibioticsItems;
    case "steroid":
      return renderSteroidItems;
    case "probiotics":
      return renderProbioticsItems;
    case "billing":
      return renderBillingItems;
    default:
      return null;
  }
}

export async function renderHomePage() {
  const categoryGrid = document.querySelector("[data-category-grid]");
  const favoriteGrid = document.querySelector("[data-favorite-grid]");
  const updated = document.querySelector("[data-site-updated-at]");
  if (!categoryGrid || !favoriteGrid || !updated) {
    return;
  }

  const allCategoryData = await Promise.all(
    CATEGORY_CONFIG.map(async (category) => ({
      category,
      items: await loadJson(category.dataFile)
    }))
  );

  categoryGrid.innerHTML = allCategoryData.map(({ category, items }) => `
    <a class="category-card" href="${category.path}">
      <div class="meta-row">
        <span class="result-tag">${escapeHtml(category.shortTitle)}</span>
        <span class="metric">${items.length}件</span>
      </div>
      <h3>${escapeHtml(category.title)}</h3>
      <p>${escapeHtml(category.description)}</p>
      <div class="category-link-row">
        <span class="metric">すぐ見る</span>
        <strong>→</strong>
      </div>
    </a>
  `).join("");

  const favoriteItems = SITE_META.favorites.map((favorite) => {
    const categoryData = allCategoryData.find((entry) => entry.category.id === favorite.categoryId);
    const item = categoryData && categoryData.items.find((entry) => entry.id === favorite.itemId);
    return item ? { category: categoryData.category, item } : null;
  }).filter(Boolean);

  favoriteGrid.innerHTML = favoriteItems.map(({ category, item }) => `
    <a class="favorite-card" href="${category.path}?item=${encodeURIComponent(item.id)}">
      <div class="meta-row">
        <span class="result-tag">${escapeHtml(category.shortTitle)}</span>
        <span class="metric">頻出</span>
      </div>
      <h3>${escapeHtml(item.name || item.genericName || item.title || item.task || item.brandName)}</h3>
      <p>${escapeHtml(item.note || item.dosage || item.brandName || (item.content ? item.content.join(" / ") : ""))}</p>
    </a>
  `).join("");

  updated.textContent = formatDate(SITE_META.siteUpdatedAt);
}

export async function renderCategoryPage(category) {
  const container = document.querySelector("[data-page-content]");
  if (!container) {
    return;
  }

  const items = await loadJson(category.dataFile);
  renderPageHeader(container, category, items.length);

  if (category.type === "checklist") {
    const checklistMount = document.createElement("div");
    const state = loadChecklistState(items);
    container.appendChild(checklistMount);
    renderChecklistSection(checklistMount, state.items, state.key);
    highlightHashTarget();
    return;
  }

  if (category.type === "pediatric") {
    const calculatorMount = document.createElement("div");
    calculatorMount.innerHTML = renderPediatricCalculator(items);
    container.appendChild(calculatorMount.firstElementChild);
    bindPediatricCalculator(container, items);
  }

  const section = document.createElement("div");
  section.innerHTML = createViewSection("一覧");
  const viewSection = section.firstElementChild;
  const renderer = getRenderer(category.type);
  if (!renderer || !viewSection) {
    return;
  }

  container.appendChild(viewSection);

  const renderFiltered = (filteredItems) => {
    const rendered = renderer(filteredItems);
    viewSection.querySelector("[data-card-mount]").innerHTML = rendered.cards;
    viewSection.querySelector("[data-table-mount]").innerHTML = rendered.table;
  };

  bindFilters(viewSection, items, renderFiltered, category);
  bindViewSwitch(viewSection);

  if (category.type === "billing") {
    const note = document.createElement("section");
    note.className = "notice-panel";
    note.innerHTML = `
      <h2>注意</h2>
      <ul class="note-list warning-list">
        <li>算定要件は改定や施設運用で変わるため、正式資料を優先してください。</li>
        <li>残薬調整、ハイリスク薬、供給不安薬などは算定条件の再確認が必要です。</li>
      </ul>
    `;
    container.appendChild(note);
  }
}
