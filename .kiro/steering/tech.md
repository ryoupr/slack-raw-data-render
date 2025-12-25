# 技術スタック・ビルドシステム

## 技術スタック

### フロントエンド
- **Chrome Extension Manifest V3**: 最新のChrome拡張機能仕様
- **Content Scripts**: Slackページへの自動注入
- **Vanilla JavaScript**: フレームワークなしの軽量実装

### ライブラリ
- **Marked.js v17.0.1**: Markdownパーサー（`lib/marked.min.js`）
- **Prism.js**: シンタックスハイライト（`lib/prism.min.js`, `lib/prism-components.min.js`）

### 開発・テスト環境
- **Node.js**: テスト実行環境
- **JSDOM v23.0.0**: DOM環境シミュレーション
- **fast-check v4.5.2**: プロパティベーステスト

## 共通コマンド

### テスト実行
```bash
# 全テスト実行
npm test

# 個別テスト実行
npm run test:core        # コア機能テスト
npm run test:integration # 統合テスト
npm run test:manifest    # マニフェスト検証
npm run test:property    # プロパティベーステスト
```

### ビルド・パッケージング
```bash
# Chrome Web Store用ZIPファイル作成
./build-chrome-extension.sh

# アイコン生成（macOS sipsコマンド使用）
./generate-icons.sh <入力PNGファイル>
```

### 開発時の注意点
- **テスト駆動**: 実装前にテストを作成・実行
- **プロパティベーステスト**: fast-checkを使用した堅牢性検証
- **マニフェスト検証**: Chrome拡張機能の仕様準拠確認
- **クロスブラウザ対応**: Chrome拡張機能APIの適切な使用