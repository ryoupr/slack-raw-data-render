#!/bin/bash

# 画像を1280x800サイズに調整するツール
# 縦横比を保持して拡大/縮小し、余白を白で埋める

set -e

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

# 使用方法を表示
show_usage() {
    echo "画像を1280x800サイズに調整するツール"
    echo
    echo "使用方法:"
    echo "  $0 <入力画像ファイル> [出力ファイル名]"
    echo
    echo "例:"
    echo "  $0 input.jpg"
    echo "  $0 input.png output.png"
    echo "  $0 photo.jpg resized-photo.jpg"
    echo
    echo "機能:"
    echo "  - 縦横比を保持して1280x800に収まるようにリサイズ"
    echo "  - 余白は白色で埋める"
    echo "  - 元画像が大きい場合は縮小、小さい場合は拡大"
    echo
    echo "対応形式:"
    echo "  - 入力: JPG, PNG, GIF, BMP, TIFF等"
    echo "  - 出力: 入力ファイルと同じ形式（指定がない場合）"
    echo
    echo "注意:"
    echo "  - ImageMagickが必要です"
    echo "  - インストール: brew install imagemagick"
}

# 引数チェック
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"

# 入力ファイルの存在確認
if [ ! -f "$INPUT_FILE" ]; then
    print_error "ファイルが見つかりません: $INPUT_FILE"
    exit 1
fi

# ImageMagickの存在確認
if ! command -v convert &> /dev/null; then
    print_error "ImageMagickのconvertコマンドが見つかりません。"
    print_info "インストール方法:"
    print_info "  macOS: brew install imagemagick"
    print_info "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# 出力ファイル名の決定
if [ -z "$OUTPUT_FILE" ]; then
    # 拡張子を取得
    EXTENSION="${INPUT_FILE##*.}"
    BASENAME="${INPUT_FILE%.*}"
    OUTPUT_FILE="${BASENAME}_1280x800.${EXTENSION}"
fi

print_info "入力ファイル: $INPUT_FILE"
print_info "出力ファイル: $OUTPUT_FILE"

# 元画像の情報を取得
ORIGINAL_INFO=$(identify "$INPUT_FILE" 2>/dev/null)
if [ $? -eq 0 ]; then
    ORIGINAL_SIZE=$(echo "$ORIGINAL_INFO" | awk '{print $3}')
    print_info "元画像サイズ: $ORIGINAL_SIZE"
    
    # サイズを分解
    ORIGINAL_WIDTH=$(echo "$ORIGINAL_SIZE" | cut -d'x' -f1)
    ORIGINAL_HEIGHT=$(echo "$ORIGINAL_SIZE" | cut -d'x' -f2)
    
    # 元画像と目標サイズの比較
    if [ "$ORIGINAL_WIDTH" -gt 1280 ] || [ "$ORIGINAL_HEIGHT" -gt 800 ]; then
        print_info "処理: 縮小してリサイズ"
    elif [ "$ORIGINAL_WIDTH" -lt 1280 ] && [ "$ORIGINAL_HEIGHT" -lt 800 ]; then
        print_info "処理: 拡大してリサイズ"
    else
        print_info "処理: サイズ調整"
    fi
else
    print_warning "元画像の情報を取得できませんでした。"
fi

# 既存ファイルの確認
if [ -f "$OUTPUT_FILE" ]; then
    print_warning "既存ファイルを上書きします: $OUTPUT_FILE"
fi

print_info "画像を1280x800にリサイズ中..."

# ImageMagickで画像をリサイズ
# -resize 1280x800: 縦横比を保持して1280x800に収まるようにリサイズ
# -background white: 背景色を白に設定
# -gravity center: 中央配置
# -extent 1280x800: キャンバスサイズを1280x800に設定
if convert "$INPUT_FILE" \
    -resize 1280x800 \
    -background white \
    -gravity center \
    -extent 1280x800 \
    "$OUTPUT_FILE" 2>/dev/null; then
    
    print_success "✓ リサイズが完了しました: $OUTPUT_FILE"
    
    # 出力ファイルの情報を表示
    if command -v identify &> /dev/null; then
        OUTPUT_INFO=$(identify "$OUTPUT_FILE" 2>/dev/null)
        if [ $? -eq 0 ]; then
            OUTPUT_SIZE=$(echo "$OUTPUT_INFO" | awk '{print $3}')
            FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
            print_info "出力画像サイズ: $OUTPUT_SIZE"
            print_info "ファイルサイズ: $FILE_SIZE"
        fi
    fi
    
else
    print_error "✗ リサイズに失敗しました"
    exit 1
fi

echo
print_success "処理が完了しました！"
print_info "出力ファイル: $OUTPUT_FILE"