# Slack Markdown Renderer 開発ワークフロー

## ベースにしているテンプレート
- https://github.com/ryoupr/develop-chrome-extension
- フレームワーク: [WXT](https://wxt.dev/)（Vite ベース / Manifest V3）

## 開発フロー

### Phase 1: セットアップ
1. `git clone` してローカルに取得し、`npm install`（`postinstall` で `wxt prepare` が走り型定義が生成される）
2. 拡張機能の基本情報の置き場所:
   - `package.json`: `name`（ZIP名に使用。kebab-case）, `description`, `version`
   - `wxt.config.ts` の `manifest`: `name`（表示名）, `permissions`, `host_permissions` 等
   - `entrypoints/content/index.js` の `matches`: 対象URL（`https://files.slack.com/files-pri/*`）

### Phase 2: 実装
1. `entrypoints/content/index.js` の `main()` にメインロジックを実装
2. `entrypoints/content/style.css` にスタイルを実装
3. ポップアップは `entrypoints/popup/`（`index.html` + `main.js`）
4. 外部ライブラリは `npm install <pkg>` で追加し、`import` して使う（バンドルされる）
5. 他のエントリーポイントが必要なら `entrypoints/` に追加する（manifest には自動反映）
   - 詳細: https://wxt.dev/guide/essentials/entrypoints.html
6. 動作確認:
   - `npm run dev` → 拡張機能を読み込んだ Chrome が起動し、変更がホットリロードされる
   - ブラウザを自動起動できない環境では `npm run build` → `chrome://extensions/` → デベロッパーモード →「パッケージ化されていない拡張機能を読み込む」で `.output/chrome-mv3/` を選択
7. `npm run compile` で型チェック、`npm test` でテスト

### Phase 3: アセット準備
```bash
# アイコン生成（128px以上の正方形PNG画像を用意）→ public/icon/{16,32,48,128}.png
./script/generate-icons.sh assets/icon-source.png

# スクリーンショット撮影後、Chrome Web Store用にリサイズ
./script/resize-to-1280x800.sh screenshot/*.png
```
- `public/icon/` のアイコンは WXT が自動検出して manifest の `icons` に設定する

### Phase 4: ビルド & 公開
```bash
# Chrome Web Store用ZIPを作成 → .output/slack-markdown-renderer-{version}-chrome.zip
npm run zip
```
- 生成されたZIPを Chrome Web Store Developer Dashboard にアップロード
- URL: https://chrome.google.com/webstore/devconsole/

### Phase 5: バージョンアップ
1. `npm version patch`（または `minor` / `major`）で `package.json` の `version` をインクリメント
2. 変更を実装・テスト
3. `npm run zip` で再ビルド
4. Developer Dashboard で新バージョンをアップロード

## Agent向け指示

### 機能追加・修正を依頼された場合
以下を**確認を挟まず自律的に完了**まで進めること。

1. `npm install`（未実行の場合）
2. 要件に応じて `entrypoints/` のコードとスタイル、必要なら `wxt.config.ts`（`permissions` 等）を編集
3. 外部ライブラリが必要な場合は `npm install` で追加（パッケージ名を `npm view` で確認してから）
4. `npm run compile`・`npm run build`・`npm test` が通ることを確認
5. 実装完了後、動作確認手順（`npm run dev`、または `.output/chrome-mv3/` の読み込み）をユーザーに提示
6. リリース時は `npm version` → `npm run zip`

### 自律実行の判断基準
- **確認不要**: コード実装、スタイル実装、wxt.config.ts 編集、npm パッケージ追加 → そのまま進める
- **ユーザー待ち**: アイコン画像の提供、Chrome Web Storeへのアップロード → ユーザーに依頼
- **確認必要**: 要件が曖昧で複数の解釈がある場合、`permissions` / `host_permissions` を増やす場合（ストア審査とプライバシーポリシーに影響する）

### サブエージェントの活用
独立したタスクはサブエージェントで並列実行してよい。

**並列化の例:**
- content script と popup の独立した変更を同時に進める
- 複数ファイルのレビューを同時に実行する

**並列化してはいけない例:**
- `wxt.config.ts` の permissions やエントリーポイント間のメッセージ仕様（popup → content の `setLineHeight` など）に依存する実装
- `npm run build` / `npm run zip`（全ファイルが揃ってから）

### コード規約
- `npm run compile` と `npm test` でエラーが出ない状態を保つ
- エントリーポイントは `defineContentScript` / `defineBackground` 等でラップする（WXT が自動 import するため import 不要）
- 新規コードのブラウザ API は `chrome.*` ではなく `browser.*`（WXT 提供）を使う
- DOM操作は `MutationObserver` 等で遅延要素に対応する。content script の後始末が必要な処理は `main(ctx)` の `ctx`（`ctx.addEventListener`, `ctx.setInterval`, `ctx.onInvalidated`）を使う
- CSS クラス名にはプレフィックスを付けて Slack 側との衝突を防ぐ（既存: `slack-markdown-renderer-`）
- Markdown から生成した HTML は必ず `sanitizeHTML` を通してから DOM に挿入する
- `manifest.json` は直接作成しない（WXT が `wxt.config.ts` とエントリーポイントから生成する）
