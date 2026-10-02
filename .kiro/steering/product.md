# プロダクト概要

## Slack Markdown Renderer

Slack の RAW ファイルページ（`https://files.slack.com/files-pri/*`）に表示される Markdown ファイルを、自動でレンダリングして読みやすく表示する Chrome 拡張機能。

### 主な機能
- Slack の RAW ファイル URL を検出し、Markdown コンテンツを自動レンダリング
- RAW テキストとレンダリング結果の切り替え
- シンタックスハイライト（Prism.js）
- 目次サイドバー
- テーマ切り替え（white / light-gray / warm-white / paper）
- ポップアップでの行間（line-height）調整（`storage` に保存）
- アクセシビリティ対応（高コントラスト、モーション軽減、キーボード操作）

### 対象ユーザー
- Slack で共有された Markdown ファイルをブラウザで読む人

### 特徴
- Manifest V3 / WXT
- 外部へのデータ送信なし（`PRIVACY.md` 参照）
- Chrome Web Store で公開
