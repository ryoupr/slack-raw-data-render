# プロジェクト構造・組織

## ディレクトリ構造

```
/
├── manifest.json              # Chrome拡張機能設定ファイル
├── content-script.js          # メインロジック（Content Script）
├── styles.css                # Markdownレンダリング用CSS
├── package.json              # Node.js依存関係・スクリプト定義
├── README.md                 # プロジェクト概要・使用方法
│
├── lib/                      # 外部ライブラリ
│   ├── marked.min.js         # Markdownパーサー
│   ├── prism.min.js          # シンタックスハイライト（コア）
│   ├── prism-components.min.js # Prism追加コンポーネント
│   └── prism.min.css         # Prismスタイル
│
├── icons/                    # 拡張機能アイコン
│   ├── icon16.png            # ファビコン用
│   ├── icon19.png            # ツールバー用（旧版）
│   ├── icon32.png            # Windows表示用
│   ├── icon38.png            # ツールバー用（高解像度）
│   ├── icon48.png            # 拡張機能管理ページ用
│   └── icon128.png           # Chrome Web Store用
│
├── test-*.js                 # テストファイル群
├── run-all-tests.js          # テストスイート実行
├── build-chrome-extension.sh # パッケージング用スクリプト
└── generate-icons.sh         # アイコン生成スクリプト
```

## ファイル役割

### コア実装
- **content-script.js**: URL検出、Markdown解析、DOM操作の主要ロジック
- **styles.css**: GitHub風Markdownスタイル、レスポンシブ対応
- **manifest.json**: 権限設定、Content Scripts定義、アイコン指定

### 開発・ビルド
- **package.json**: npm scripts、依存関係管理
- **test-*.js**: 機能別テストファイル（コア、統合、プロパティベース等）
- **build-chrome-extension.sh**: Chrome Web Store用ZIP作成
- **generate-icons.sh**: 複数サイズアイコン自動生成

### 設計原則
- **単一責任**: 各ファイルは明確な役割を持つ
- **依存関係最小化**: 外部ライブラリは必要最小限
- **テスト可能性**: 全機能に対応するテストファイル
- **Chrome拡張機能ベストプラクティス**: Manifest V3準拠