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
├── wxt.config.ts                # WXT設定（manifest の name / permissions）
├── package.json                 # 名前・バージョン・説明・npmスクリプト
├── tsconfig.json
├── entrypoints/
│   ├── content/
│   │   ├── index.js             # コンテンツスクリプト（メインロジック）
│   │   └── style.css            # スタイル定義
│   └── popup/
│       ├── index.html           # ポップアップ（行間調整）
│       └── main.js
├── public/icon/                 # 拡張機能アイコン（WXT が自動検出）
├── assets/icon-source.png       # アイコンの元画像
├── screenshot/                  # ストア用スクリーンショット
├── script/
│   ├── generate-icons.sh        # アイコン生成（macOS）
│   └── resize-to-1280x800.sh    # スクリーンショットリサイズ
├── run-all-tests.cjs            # テストランナー
├── test-property-based.cjs      # プロパティベーステスト
├── test-styling.cjs             # スタイリングテスト
└── PRIVACY.md                   # プライバシーポリシー
```

## アセット

```bash
# アイコン生成 → public/icon/{16,32,48,128}.png
./script/generate-icons.sh assets/icon-source.png

# スクリーンショットを 1280x800 にリサイズ
./script/resize-to-1280x800.sh screenshot/001.png
```

## リリース

```bash
npm version patch   # minor / major
npm run zip         # .output/slack-markdown-renderer-{version}-chrome.zip
```

生成された ZIP を [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) にアップロードします。
