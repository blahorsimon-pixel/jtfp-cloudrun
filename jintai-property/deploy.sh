#!/bin/bash

# 金泰资产严选房源系统 - 一键部署脚本

set -e

echo "======================================"
echo "金泰资产严选房源系统 - 部署脚本"
echo "======================================"

# 检查是否在正确的目录
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 1. 构建后端
echo ""
echo "📦 [1/4] 构建后端服务..."
cd server
npm run build
cd ..
echo "✅ 后端构建完成"

# 2. 构建管理后台
echo ""
echo "📦 [2/4] 构建管理后台..."
cd admin
npm run build
cd ..
echo "✅ 管理后台构建完成"

# 3. 构建H5商城
echo ""
echo "📦 [3/4] 构建H5商城..."
cd h5
npm run build
cd ..
echo "✅ H5商城构建完成"

# 4. 创建日志目录
mkdir -p server/logs admin/logs h5/logs

# 5. 部署到PM2
echo ""
echo "🚀 [4/4] 部署到PM2..."

# 检查PM2是否已安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2未安装，正在安装..."
    npm install -g pm2
fi

# 停止旧服务
pm2 delete jintai-server jintai-admin jintai-h5 2>/dev/null || true

# 启动新服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup

echo ""
echo "======================================"
echo "✅ 部署完成！"
echo "======================================"
echo ""
echo "服务状态："
pm2 status
echo ""
echo "访问地址："
echo "  - 后端API:    https://www.jintai.cloud/JTFP/api/"
echo "  - 管理后台:   https://www.jintai.cloud/JTFP/admin/"
echo "  - H5商城:     https://www.jintai.cloud/JTFP/h5/"
echo ""
echo "常用命令："
echo "  - 查看日志:   pm2 logs"
echo "  - 重启服务:   pm2 restart ecosystem.config.js"
echo "  - 停止服务:   pm2 stop ecosystem.config.js"
echo ""
