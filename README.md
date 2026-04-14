# 薬局業務用・個人メモサイト

GitHub Pages でそのまま公開できる、静的な日本語 UI の薬局業務メモサイトです。  
スマホではカード中心、PC では表中心で見やすくし、トップ固定の検索からカテゴリや項目へ 3 タップ以内で到達しやすい構成にしています。

## サイト概要

- 目的: 薬局業務で頻繁に参照するメモを、紙や画像ではなく検索しやすい形で整理する
- 対象: 個人利用中心。ただし第三者に見せても分かる程度に整った UI
- 方式: 素の HTML / CSS / JavaScript のみ
- 公開先想定: GitHub Pages
- 注意: 医療判断や診療判断を行うサイトではなく、業務補助用メモ

## ローカルでの確認方法

静的ファイルだけで構成されていますが、`fetch()` で JSON を読むため、ローカルサーバー経由で確認してください。

```bash
cd /Users/racto/PycharmProjects/pharmacy-tool
python3 -m http.server 8000
```

ブラウザで以下を開きます。

- `http://localhost:8000/`

## GitHub Pages での公開方法

1. このリポジトリを GitHub に push します。
2. GitHub の `Settings` を開きます。
3. `Pages` を開きます。
4. `Build and deployment` の `Source` で `Deploy from a branch` を選びます。
5. Branch は `main`、Folder は `/ (root)` を選びます。
6. 保存後、数分待つと公開 URL が発行されます。

この実装はビルド不要です。`index.html` を含むルート構成のまま公開できます。

## データ追加方法

各カテゴリのデータは `data/` 配下の JSON です。

- 小児用量: [data/pediatric-doses.json](/Users/racto/PycharmProjects/pharmacy-tool/data/pediatric-doses.json)
- 抗菌薬一覧: [data/antibiotics.json](/Users/racto/PycharmProjects/pharmacy-tool/data/antibiotics.json)
- ステロイド外用薬ランク: [data/steroid-ranks.json](/Users/racto/PycharmProjects/pharmacy-tool/data/steroid-ranks.json)
- 整腸剤・乳酸菌製剤: [data/probiotics.json](/Users/racto/PycharmProjects/pharmacy-tool/data/probiotics.json)
- 調剤管理・加算メモ: [data/billing-notes.json](/Users/racto/PycharmProjects/pharmacy-tool/data/billing-notes.json)
- 業務チェックリスト: [data/checklist.json](/Users/racto/PycharmProjects/pharmacy-tool/data/checklist.json)

基本ルール:

- 既存オブジェクトを参考に 1 件ずつ追加してください
- `id` は英数字とハイフンで重複しないようにしてください
- 検索用の別表記は `aliases` に追加してください
- 元メモの補足や表記揺れは `note` に残してください
- 日付管理したい項目は `updatedAt` を `YYYY-MM-DD` で入れてください

例:

```json
{
  "id": "example-item",
  "name": "サンプル薬剤",
  "aliases": ["別名", "略称"],
  "category": "抗菌薬",
  "dosage": "10mg/kg/日",
  "frequency": "分2",
  "ageCondition": "必要時のみ追記",
  "note": "元メモの補足をここに書く",
  "updatedAt": "2026-04-14"
}
```

## ファイル構成

```text
/
├─ index.html
├─ about.html
├─ categories/
│  ├─ pediatric.html
│  ├─ antibiotics.html
│  ├─ steroid-rank.html
│  ├─ probiotics.html
│  ├─ billing.html
│  └─ checklist.html
├─ assets/
│  ├─ css/
│  │  └─ styles.css
│  ├─ js/
│  │  ├─ config.js
│  │  ├─ common.js
│  │  ├─ renderers.js
│  │  └─ page-init.js
│  └─ images/
├─ data/
│  ├─ pediatric-doses.json
│  ├─ antibiotics.json
│  ├─ steroid-ranks.json
│  ├─ probiotics.json
│  ├─ billing-notes.json
│  └─ checklist.json
└─ README.md
```

役割:

- `index.html`: トップページ。カテゴリ導線、全体検索、よく使う項目、注意書き
- `about.html`: このサイトの位置づけ、使い方、注意事項
- `categories/*.html`: 各カテゴリの一覧ページ
- `assets/css/styles.css`: 全ページ共通のスタイル
- `assets/js/config.js`: サイト設定、カテゴリ定義、よく使う項目定義
- `assets/js/common.js`: 共通処理。パス解決、検索、ナビ、表示切替の共通処理
- `assets/js/renderers.js`: トップページとカテゴリページの描画ロジック
- `assets/js/page-init.js`: ページ起動時の初期化
- `data/*.json`: 追記しやすい業務メモデータ本体

## 実装時に置いた仮定

- 指定された用量や業務メモは「初期サンプルとして整理した値」とし、最終確認は添付文書・施設ルール・最新資料を優先する前提にしています。
- 画像メモ由来の表記ゆれに対応するため、`aliases` と `note` を追加しています。
- 業務チェックリストは日次運用を想定し、`localStorage` を日付単位キーで保存する実装にしています。
- ステロイドランク名は国際的な表記ではなく、指定の `strongest / very strong / strong / medium / weak` を内部キーとして統一しています。
- GitHub Pages のサブディレクトリ公開でも動くよう、各ページは相対パスで JSON とアセットを読み込みます。

## 保守のコツ

- 見た目を調整したい場合は [assets/css/styles.css](/Users/racto/PycharmProjects/pharmacy-tool/assets/css/styles.css) を編集します。
- カテゴリの増減やトップの導線変更は [assets/js/config.js](/Users/racto/PycharmProjects/pharmacy-tool/assets/js/config.js) を編集します。
- ページごとの表示項目やテーブル列を変えたい場合は [assets/js/renderers.js](/Users/racto/PycharmProjects/pharmacy-tool/assets/js/renderers.js) を編集します。
