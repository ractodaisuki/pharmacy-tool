export const SITE_META = {
  title: "薬局業務メモ",
  description: "仕事中に 3 タップ以内で必要な情報へ到達しやすい、薬局業務向けの早見表サイトです。",
  siteUpdatedAt: "2026-04-14",
  disclaimer: [
    "業務補助用メモです。",
    "最終判断は添付文書・最新資料・施設ルールを優先してください。",
    "小児用量は体重・年齢・適応を再確認してください。"
  ],
  favorites: [
    { categoryId: "pediatric", itemId: "amoxicillin" },
    { categoryId: "pediatric", itemId: "oseltamivir" },
    { categoryId: "antibiotics", itemId: "cefditoren" },
    { categoryId: "steroid-rank", itemId: "clobetasol-propionate" },
    { categoryId: "billing", itemId: "specific-drug-management" },
    { categoryId: "checklist", itemId: "psychotropic-key" }
  ]
};

export const CATEGORY_CONFIG = [
  {
    id: "pediatric",
    title: "小児用量・シロップ早見表",
    shortTitle: "小児用量",
    description: "体重換算や回数の確認を急ぐ場面向けに、よく使う小児処方メモを整理。",
    path: "categories/pediatric.html",
    dataFile: "data/pediatric-doses.json",
    type: "pediatric",
    searchFields: ["name", "brandName", "category", "dosage", "frequency", "ageCondition", "note", "aliases"],
    filterField: "category"
  },
  {
    id: "antibiotics",
    title: "抗菌薬一覧（一般名 / 商品名）",
    shortTitle: "抗菌薬一覧",
    description: "一般名と商品名、系統をまとめた一覧。一般名検索と商品名検索の両方を想定。",
    path: "categories/antibiotics.html",
    dataFile: "data/antibiotics.json",
    type: "antibiotics",
    searchFields: ["genericName", "brandName", "class", "note", "aliases"],
    filterField: "class"
  },
  {
    id: "steroid-rank",
    title: "ステロイド外用薬ランク表",
    shortTitle: "ステロイド",
    description: "ランク別に視覚的に区別しやすい一覧。スマホでは色付きカード表示。",
    path: "categories/steroid-rank.html",
    dataFile: "data/steroid-ranks.json",
    type: "steroid",
    searchFields: ["genericName", "brandName", "rank", "form", "note", "aliases"],
    filterField: "rank"
  },
  {
    id: "probiotics",
    title: "整腸剤・乳酸菌製剤メモ",
    shortTitle: "整腸剤",
    description: "採用品や濃度違いを見分けやすく、別名検索にも対応したメモ。",
    path: "categories/probiotics.html",
    dataFile: "data/probiotics.json",
    type: "probiotics",
    searchFields: ["name", "brand", "note", "aliases"]
  },
  {
    id: "billing",
    title: "調剤管理・加算メモ",
    shortTitle: "加算メモ",
    description: "算定時の注意と実務上の補足を、箇条書きと表の両方で確認しやすく整理。",
    path: "categories/billing.html",
    dataFile: "data/billing-notes.json",
    type: "billing",
    searchFields: ["title", "content", "note", "aliases"]
  },
  {
    id: "checklist",
    title: "業務チェックリスト",
    shortTitle: "チェック",
    description: "閉局前などの日次確認をその場でチェックできるローカル保存付きリスト。",
    path: "categories/checklist.html",
    dataFile: "data/checklist.json",
    type: "checklist",
    searchFields: ["task", "note", "aliases"]
  }
];

export function getCategoryConfig(pageId) {
  return CATEGORY_CONFIG.find((category) => category.id === pageId);
}
