# Slack Markdown Renderer

Chrome拡張機能として、SlackのRAWファイルページでMarkdownコンテンツを自動的にレンダリングします。

## 機能

- SlackのRAWファイルURL（`https://files.slack.com/files-pri/*`）を自動検出
- Markdownコンテンツの自動レンダリング
- RAWテキストとレンダリング結果の切り替え機能
- シンタックスハイライト（Prism.js）
- テーマ切り替え（white / light-gray / warm-white / paper）
- アクセシビリティ対応（高コントラスト、モーション軽減、キーボード操作）

## インストール

1. このリポジトリをクローンまたはダウンロード
2. Chrome拡張機能の開発者モードを有効化
3. 「パッケージ化されていない拡張機能を読み込む」でこのディレクトリを選択

## 技術仕様

- Manifest V3
- Content Scripts（`document_idle`で実行）
- Marked.js（Markdownパーサー）
- Prism.js（シンタックスハイライト）
- プロパティベーステスト（fast-check）

## ディレクトリ構造

```
/
├── manifest.json              # 拡張機能の設定
├── content-script.js          # メインロジック
├── styles.css                 # スタイル定義
├── package.json               # 開発用設定
├── lib/                       # 外部ライブラリ（バンドル済み）
│   ├── marked.min.js          # Markdownパーサー
│   ├── prism.min.js           # シンタックスハイライト
│   ├── prism-components.min.js
│   └── prism.min.css
├── icons/                     # 拡張機能アイコン
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── test-property-based.js     # プロパティベーステスト
├── test-styling.js            # スタイリングテスト
├── run-all-tests.js           # テストランナー
├── build-chrome-extension.sh  # Chrome Web Store用ビルド
├── generate-icons.sh          # アイコン生成（macOS）
└── resize-to-1280x800.sh     # スクリーンショットリサイズ
```

## 開発

```bash
# テスト実行
npm install
npm test
```

## ビルド

```bash
# Chrome Web Store用ZIPを生成
./build-chrome-extension.sh
```
