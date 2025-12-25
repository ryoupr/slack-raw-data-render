# Slack Markdown Renderer

Chrome拡張機能として、SlackのRAWファイルページでMarkdownコンテンツを自動的にレンダリングします。

## 機能

- SlackのRAWファイルURL（`https://files.slack.com/files-pri/*`）を自動検出
- Markdownコンテンツの自動レンダリング
- RAWテキストとレンダリング結果の切り替え機能
- 適切なスタイリングとシンタックスハイライト

## インストール

1. このリポジトリをクローンまたはダウンロード
2. Chrome拡張機能の開発者モードを有効化
3. 「パッケージ化されていない拡張機能を読み込む」でこのディレクトリを選択

## 技術仕様

- Manifest V3
- Content Scripts
- Marked.js（Markdownパーサー）
- プロパティベーステスト

## ディレクトリ構造

```
/
├── manifest.json          # 拡張機能の設定
├── content-script.js      # メインロジック
├── styles.css            # スタイル定義
├── lib/                  # 外部ライブラリ
│   └── marked.min.js     # Markdownパーサー
└── icons/                # 拡張機能アイコン
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 開発状況

このプロジェクトは段階的に実装されています。現在の実装状況については `.kiro/specs/slack-markdown-renderer/tasks.md` を参照してください。