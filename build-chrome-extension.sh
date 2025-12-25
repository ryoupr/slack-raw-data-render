#!/bin/bash

# Chrome Web Store用のZIPファイルを作成するスクリプト
# Slack Markdown Renderer Chrome Extension

set -e  # エラーが発生したら即座に終了

# 色付きの出力用関数
print_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# manifest.jsonからバージョン情報を取得
if [ ! -f "manifest.json" ]; then
    print_error "manifest.json が見つかりません。"
    exit 1
fi

VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' manifest.json | sed 's/.*"\([^"]*\)".*/\1/')
NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' manifest.json | sed 's/.*"\([^"]*\)".*/\1/')

if [ -z "$VERSION" ] || [ -z "$NAME" ]; then
    print_error "manifest.jsonからバージョンまたは名前を取得できませんでした。"
    exit 1
fi

print_info "拡張機能名: $NAME"
print_info "バージョン: $VERSION"

# 出力ファイル名を生成（スペースをハイフンに置換）
SAFE_NAME=$(echo "$NAME" | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]')
OUTPUT_ZIP="${SAFE_NAME}-v${VERSION}.zip"

# 一時ディレクトリを作成
TEMP_DIR="temp-chrome-extension"
if [ -d "$TEMP_DIR" ]; then
    print_info "既存の一時ディレクトリを削除中..."
    rm -rf "$TEMP_DIR"
fi

print_info "一時ディレクトリを作成中: $TEMP_DIR"
mkdir "$TEMP_DIR"

# 必要なファイルをコピー
print_info "必要なファイルをコピー中..."

# 必須ファイル
cp manifest.json "$TEMP_DIR/"
cp content-script.js "$TEMP_DIR/"
cp styles.css "$TEMP_DIR/"

# ディレクトリをコピー
if [ -d "icons" ]; then
    cp -r icons "$TEMP_DIR/"
    print_info "✓ icons/ ディレクトリをコピーしました"
else
    print_warning "icons/ ディレクトリが見つかりません"
fi

if [ -d "lib" ]; then
    cp -r lib "$TEMP_DIR/"
    print_info "✓ lib/ ディレクトリをコピーしました"
else
    print_warning "lib/ ディレクトリが見つかりません"
fi

# .gitkeep ファイルを削除（不要なファイル）
find "$TEMP_DIR" -name ".gitkeep" -delete 2>/dev/null || true

print_info "コピーされたファイル一覧:"
find "$TEMP_DIR" -type f | sort

# ZIPファイルを作成
print_info "ZIPファイルを作成中: $OUTPUT_ZIP"
cd "$TEMP_DIR"
zip -r "../$OUTPUT_ZIP" . -x "*.DS_Store" "*/.*"
cd ..

# 一時ディレクトリを削除
print_info "一時ディレクトリを削除中..."
rm -rf "$TEMP_DIR"

# 結果を表示
if [ -f "$OUTPUT_ZIP" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT_ZIP" | awk '{print $5}')
    print_success "Chrome Web Store用のZIPファイルが作成されました!"
    print_success "ファイル名: $OUTPUT_ZIP"
    print_success "ファイルサイズ: $FILE_SIZE"
    echo
    print_info "このZIPファイルをChrome Web Store Developer Dashboardにアップロードできます。"
    print_info "URL: https://chrome.google.com/webstore/devconsole/"
else
    print_error "ZIPファイルの作成に失敗しました。"
    exit 1
fi