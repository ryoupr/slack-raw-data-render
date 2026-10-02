# プロジェクト構造

## ディレクトリ構成

```
.
├── README.md                    # プロジェクト概要
├── CLAUDE.md                    # エージェント向け指示
├── PRIVACY.md                   # プライバシーポリシー（Chrome Web Store 用）
├── CONTRIBUTING.md              # ブランチ運用・リリース手順・必要な Secrets
├── .github/workflows/           # ci.yml（ビルド検証）/ release.yml（リリース・ストア提出）
├── .gitignore                   # Git除外設定
├── package.json                 # 拡張機能名・バージョン・説明・npmスクリプト
├── wxt.config.ts                # WXT設定（manifest の name / description / default_locale / permissions）
├── tsconfig.json                # .wxt/tsconfig.json を継承
├── entrypoints/                 # エントリーポイント（manifest に自動反映）
│   ├── content/
│   │   ├── index.js             # コンテンツスクリプト（メインロジック）
│   │   └── style.css            # コンテンツスクリプト用スタイル
│   └── popup/
│       ├── index.html           # ポップアップ（<title> が action.default_title になる）
│       └── main.js              # 行間調整ロジック
├── public/                      # そのまま出力にコピーされる静的ファイル
│   └── icon/                    # アイコン（{16,19,32,38,48,128}.png を自動検出）
├── assets/
│   └── icon-source.png          # アイコンの元画像（ビルドには含まれない）
├── screenshot/                  # スクリーンショット格納
├── script/                      # アセット用スクリプト
│   ├── generate-icons.sh
│   └── resize-to-1280x800.sh
├── run-all-tests.cjs            # テストランナー
├── test-property-based.cjs      # プロパティベーステスト（fast-check）
└── test-styling.cjs             # スタイリングテスト
```

### 生成物（Git管理外）
- `.wxt/` - `wxt prepare` が生成する型定義・tsconfig
- `.output/chrome-mv3/` - ビルド結果（`chrome://extensions/` で読み込むディレクトリ）
- `node_modules/`

## ファイル命名規則

### エントリーポイント
- `entrypoints/content/index.js` - コンテンツスクリプト
- `entrypoints/popup/index.html` - ポップアップ
- `entrypoints/background.ts` / `options/index.html` など - 必要になったら追加
- 詳細: https://wxt.dev/guide/essentials/entrypoints.html

### アイコンファイル
- `public/icon/<サイズ>.png` を WXT が自動検出し、manifest の `icons` に設定する
- 検出ルール: https://wxt.dev/guide/essentials/config/manifest.html
- `./script/generate-icons.sh` は 16 / 32 / 48 / 128 を生成する（19 / 38 は既存ファイルを維持）

### 出力ファイル
- `.output/{package.jsonのname}-{version}-chrome.zip` - Chrome Web Store用パッケージ
- `{ファイル名}_1280x800.png` - リサイズ済みスクリーンショット

## 注意事項
- 開発ワークフローの詳細は `workflow.md` を参照
- `manifest.json` は直接置かない（WXT が生成する）
- テストは CommonJS のため拡張子 `.cjs`（`package.json` が `"type": "module"` のため）
- アセット用スクリプトはmacOS環境での実行を前提
