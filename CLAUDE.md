# CLAUDE.md - Slack Markdown Renderer

Slack の RAW ファイルページ（`https://files.slack.com/files-pri/*`）で Markdown をレンダリングする Chrome 拡張機能。[WXT](https://wxt.dev/) ベースで、[develop-chrome-extension](https://github.com/ryoupr/develop-chrome-extension) テンプレートと同じ開発フローを採用している。

## 開発フロー・コード規約
**必ず `.kiro/steering/workflow.md` を読んでから作業を開始すること。**

## コマンド
- `npm run dev` - 開発サーバー（Chrome自動起動・ホットリロード）
- `npm run build` - `.output/chrome-mv3/` にビルド
- `npm run zip` - Chrome Web Store用ZIP作成
- `npm run compile` - 型チェック
- `npm test` - テスト（プロパティベーステスト・スタイリングテスト）
- `./script/generate-icons.sh <画像>` - アイコン一括生成（`public/icon/`）
- `./script/resize-to-1280x800.sh <画像>` - スクリーンショットリサイズ

## ファイル構成
`.kiro/steering/structure.md` を参照。
