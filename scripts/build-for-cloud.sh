#!/bin/bash
# 微信云托管一键构建脚本
# 用法: ./scripts/build-for-cloud.sh

set -e

echo "=========================================="
echo "  微信云托管构建脚本 - 金泰资产严选房源"
echo "=========================================="

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "[1/5] 清理旧构建产物..."
rm -rf dist
rm -rf public/admin
rm -rf public/h5
rm -rf jintai-property/admin/dist
rm -rf jintai-property/h5/dist

echo ""
echo "[2/5] 构建后端 TypeScript..."
npm run build

echo ""
echo "[3/5] 构建 Admin 管理后台..."
cd jintai-property/admin
export CLOUD_RUN=true
npm run build
cd "$PROJECT_ROOT"

echo ""
echo "[4/5] 构建 H5 商城..."
cd jintai-property/h5
export CLOUD_RUN=true
npm run build
cd "$PROJECT_ROOT"

echo ""
echo "[5/5] 复制前端产物到 public 目录..."
mkdir -p public/admin
mkdir -p public/h5
cp -r jintai-property/admin/dist/* public/admin/
cp -r jintai-property/h5/dist/* public/h5/

echo ""
echo "=========================================="
echo "  构建完成!"
echo "=========================================="
echo ""
echo "产物目录结构:"
echo "  dist/           - 后端编译产物"
echo "  public/admin/   - Admin 前端"
echo "  public/h5/      - H5 前端"
echo ""
echo "下一步:"
echo "  1. 提交代码到 Git 仓库"
echo "  2. 在微信云托管控制台配置 Git 仓库"
echo "  3. 触发自动部署"
echo ""
echo "或本地测试 Docker 构建:"
echo "  docker build -t jtfp-server ."
echo "  docker run -p 80:80 jtfp-server"
echo ""
