# Product Overview

## Slack Markdown Renderer

Chrome拡張機能として、SlackのRAWファイルページでMarkdownコンテンツを自動的にレンダリングします。

### 主要機能

- **自動検出**: SlackのRAWファイルURL（`https://files.slack.com/files-pri/*`）を自動検出
- **Markdownレンダリング**: Markdownコンテンツの自動レンダリング
- **表示切り替え**: RAWテキストとレンダリング結果の切り替え機能
- **スタイリング**: 適切なスタイリングとシンタックスハイライト

### ターゲット環境

- Chrome拡張機能（Manifest V3）
- Slackのファイル共有機能を使用するユーザー
- Markdownドキュメントを頻繁に共有するチーム

### 技術的特徴

- Content Scriptsによる自動実行
- Marked.jsライブラリによるMarkdownパース
- Prism.jsによるシンタックスハイライト
- GitHub風のMarkdownスタイリング