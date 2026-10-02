# Contributing to Slack Markdown Renderer

開発フローとリリースの仕様をまとめたドキュメントです。

## ブランチ運用

- 作業は Feature ブランチで行い、`develop` へ Pull Request を作成してください。
- `develop` → `main` の Pull Request はリリース専用です（`version` を上げるのはここだけ）。
- `main` / `develop` への直接 push は行わないでください。
- 1つの Pull Request は1つの目的に絞ってください。

## 開発手順

```bash
npm ci   # package-lock.json どおりに依存を入れる（依存を追加するときは npm install <pkg>）

# 開発モード（ホットリロード付き）
npm run dev

# 型チェック・テスト
npm run compile
npm test

# プロダクションビルド
npm run build

# Chrome Web Store 用 ZIP 作成
npm run zip
```

コマンドの詳細は [README.md](README.md) の「開発」を参照してください。

## Pull Request とレビュー

- すべての変更はレビューを必須とします。セルフマージは行わないでください。
- Pull Request には変更内容と動作確認の結果を記載してください。

## リリース手順

1. `develop` から `main` へのリリース用 Pull Request を作成し、その中で `package.json` の `version` を上げて `main` にマージします（`npm version <patch|minor|major> --no-git-tag-version`）。
2. `main` へのマージ後、CI（`.github/workflows/release.yml`）がビルド → GitHub Release 作成 → Chrome Web Store への提出申請を自動で行います。
3. ストア審査中（`PENDING_REVIEW`）は `develop` → `main` の Pull Request をマージしないでください（`store-review-guard` が自動でブロックします）。

`package.json` を変えずにリリースしたいとき（例: CI 導入前に `main` へ入った版）は、GitHub の Actions タブから `release` ワークフローを `main` ブランチで手動実行（`workflow_dispatch`）します。

## CI の起動条件

CI の定義は [.github/workflows/ci.yml](.github/workflows/ci.yml) と [.github/workflows/release.yml](.github/workflows/release.yml) を正とします。概要は以下のとおりです。

- `ci.yml`: `develop` / `main` への Pull Request と `develop` への push で、ビルド検証（`npm ci` → `npm run compile` → `npm run zip`）だけを行います。リリースは行いません。
  - `npm test` は CI で実行していません。プロパティベーステスト（Property 3 / 7）が乱数の入力によって失敗することがあり、CI が不安定になるためです。テストを直したら `ci.yml` に追加してください。PR を出す前に手元で `npm test` を実行してください。
- `ci.yml` の `store-review-guard`: `main` への Pull Request のときだけ実行し、ストア審査中（`PENDING_REVIEW`）なら失敗させてマージをブロックします。マージを実際に止めるには、`main` のブランチ保護でこのジョブを required check に指定してください。
- `release.yml`: `main` への push のうち `package.json` または `wxt.config.ts` の変更を含むもの、または `main` での手動実行で起動します。
  - `package.json` の `version` に対応するタグ（`v{version}`）が既にある場合は、ビルド・Release 作成・ストア提出をすべてスキップします。
  - ストア提出の前に審査状態を確認し、審査中（`PENDING_REVIEW`）なら提出だけスキップします（GitHub Release の作成は続けます）。
  - 提出がスキップされた場合や失敗した場合も、タグ `v{version}` は作られるため、再実行してもストアには提出されません。GitHub Release に添付された ZIP を [Developer Dashboard](https://chrome.google.com/webstore/devconsole/) へ手動でアップロードしてください。
  - 同時に複数のリリースが走らないよう、`concurrency` で直列化しています。

## 必要な Secrets（名前のみ）

ストア提出に必要な Secrets の名前は以下のとおりです。値や ID の実値は記載・共有しないでください。

| Secret 名 | 用途 |
|-----------|------|
| `CWS_SERVICE_ACCOUNT_JSON` | Chrome Web Store API（v2）用サービスアカウントキー |
| `CHROME_PUBLISHER_ID` | Chrome Web Store のパブリッシャー ID |
| `CHROME_EXTENSION_ID` | Chrome Web Store の拡張機能 ID |

- 3つのどれかが未設定の場合は、ストア提出のステップだけスキップされます（GitHub Release は作成されます）。
- Secrets はジョブ全体の環境変数には置かず、使う step にだけ渡しています（依存パッケージのスクリプトやサードパーティ Action に鍵を渡さないため）。
- API の仕様: https://developer.chrome.com/docs/webstore/using-api
