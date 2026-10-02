# Slack Markdown Renderer

Chrome拡張機能として、SlackのRAWファイルページでMarkdownコンテンツを自動的にレンダリングします。

## 機能

- SlackのRAWファイルURL（`https://files.slack.com/files-pri/*`）を自動検出
- Markdownコンテンツの自動レンダリング
- RAWテキストとレンダリング結果の切り替え機能
- シンタックスハイライト（Prism.js）
- 目次サイドバー
- テーマ切り替え（white / light-gray / warm-white / paper）
- ポップアップでの行間調整
- アクセシビリティ対応（高コントラスト、モーション軽減、キーボード操作）
- 多言語対応（ブラウザの表示言語に合わせて UI 文言を切り替え）

## 対応言語

英語（デフォルト）、日本語、スペイン語、ポルトガル語（ブラジル）、ロシア語、中国語（簡体字）、アラビア語、ヒンディー語、ベンガル語の9言語。ブラウザの表示言語に対応する翻訳が無い場合は英語で表示されます。

UI 文言は `public/_locales/<locale>/messages.json`（[chrome.i18n](https://developer.chrome.com/docs/extensions/reference/api/i18n)）で管理しています。

- 文言を追加・変更するときは、全言語の `messages.json` に同じキーを追加する
- 言語を追加するときは、`public/_locales/` に `en/messages.json` を複製したディレクトリ（例: `fr`、`zh_TW`）を作り、`message` を翻訳する
- `extDescription` は Chrome の制限で132文字以内にする

## 技術仕様

- [WXT](https://wxt.dev/)（Vite ベースの拡張機能フレームワーク。manifest は自動生成）
- Manifest V3
- Content Scripts（`document_idle`で実行）
- Marked.js（Markdownパーサー）
- Prism.js（シンタックスハイライト）
- プロパティベーステスト（fast-check）

開発フローは [develop-chrome-extension](https://github.com/ryoupr/develop-chrome-extension) テンプレートに準拠しています（詳細は `.kiro/steering/workflow.md`）。

## 必要な環境

- **Node.js 22 以上**
- アセット用スクリプトを使う場合: macOS（`sips`）と ImageMagick（`brew install imagemagick`）

## セットアップ

```bash
npm install   # postinstall で wxt prepare も実行される
```

## 開発

| コマンド | 内容 |
|---|---|
| `npm run dev` | 拡張機能を読み込んだ Chrome を起動し、変更をホットリロード |
| `npm run build` | `.output/chrome-mv3/` に本番ビルド |
| `npm run zip` | Chrome Web Store 用ZIPを `.output/` に作成 |
| `npm run compile` | TypeScript の型チェック |
| `npm test` | テスト（プロパティベーステスト・スタイリングテスト） |

ブラウザの自動起動を使わない場合は、`npm run build` の後、`chrome://extensions/` で「デベロッパーモード」を有効にし、`.output/chrome-mv3/` を「パッケージ化されていない拡張機能を読み込む」で読み込みます。

## ディレクトリ構造

```
.
├── wxt.config.ts                # WXT設定（manifest の name / description / default_locale / permissions）
├── package.json                 # 名前・バージョン・説明・npmスクリプト
├── tsconfig.json
├── entrypoints/
│   ├── content/
│   │   ├── index.js             # コンテンツスクリプト（メインロジック）
│   │   └── style.css            # スタイル定義
│   └── popup/
│       ├── index.html           # ポップアップ（行間調整）
│       └── main.js
├── public/
│   ├── _locales/<locale>/messages.json  # UI 文言（9言語）
│   └── icon/                    # 拡張機能アイコン（WXT が自動検出）
├── assets/icon-source.png       # アイコンの元画像
├── screenshot/                  # ストア用スクリーンショット
├── script/
│   ├── generate-icons.sh        # アイコン生成（macOS）
│   └── resize-to-1280x800.sh    # スクリーンショットリサイズ
├── run-all-tests.cjs            # テストランナー
├── test-property-based.cjs      # プロパティベーステスト
├── test-styling.cjs             # スタイリングテスト
├── .github/workflows/
│   ├── ci.yml                   # PR・develop push のビルド検証、ストア審査中ガード
│   └── release.yml              # main push / 手動実行でリリースとストア提出
├── CONTRIBUTING.md              # ブランチ運用・リリース手順・必要な Secrets
└── PRIVACY.md                   # プライバシーポリシー
```

## アセット

```bash
# アイコン生成 → public/icon/{16,32,48,128}.png
./script/generate-icons.sh assets/icon-source.png

# スクリーンショットを 1280x800 にリサイズ
./script/resize-to-1280x800.sh screenshot/001.png
```

## ブランチ運用

- `feature/*` → `develop`: PR で結合・ビルド検証（`ci.yml` のみ、リリースなし）
- `develop` → `main`: リリース PR（`version` を上げるのはここだけ）
- `main` への push: `release.yml` がビルド → GitHub Release 作成 → Chrome Web Store への提出を行う
- ストア審査中（`PENDING_REVIEW`）は、`develop` → `main` の PR をマージできない（`store-review-guard` がブロック）

## リリース

`develop` → `main` のリリース PR で `package.json` の `version` を上げてマージすると、GitHub Release の作成と Chrome Web Store への提出が自動で行われます。`package.json` を変えずにリリースしたいときは、Actions の `release` ワークフローを main で手動実行します。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

手動でリリースする場合は、`npm run zip` で作った `.output/slack-markdown-renderer-{version}-chrome.zip` を [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) にアップロードします。
