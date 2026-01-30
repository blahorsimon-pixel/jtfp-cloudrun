#!/bin/bash
# 吉祥物图片上传脚本
# 使用方法: ./upload-mascot.sh /path/to/your/mascot.png

IMAGE_PATH=$1
TARGET_DIR="/www/wwwroot/H5/public/images"
TARGET_FILE="$TARGET_DIR/mascot.png"

if [ -z "$IMAGE_PATH" ]; then
    echo "❌ 请提供图片路径"
    echo "用法: ./upload-mascot.sh /path/to/mascot.png"
    exit 1
fi

if [ ! -f "$IMAGE_PATH" ]; then
    echo "❌ 图片文件不存在: $IMAGE_PATH"
    exit 1
fi

# 确保目录存在
mkdir -p "$TARGET_DIR"

# 复制图片
cp "$IMAGE_PATH" "$TARGET_FILE"

if [ $? -eq 0 ]; then
    echo "✅ 吉祥物图片上传成功!"
    echo "📍 位置: $TARGET_FILE"
    echo "🌐 URL: https://www.jintai.cloud/images/mascot.png"
    
    # 设置权限
    chmod 644 "$TARGET_FILE"
    
    # 显示文件信息
    ls -la "$TARGET_FILE"
else
    echo "❌ 上传失败"
    exit 1
fi
