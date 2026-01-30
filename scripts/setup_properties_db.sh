#!/bin/bash
# 房源管理系统数据库初始化脚本
# 创建时间：2026-01-21

set -e

echo "开始初始化房源管理数据库..."

# 获取数据库配置
if [ -f ".env" ]; then
  source <(grep -E "^(DB_HOST|DB_USER|DB_PASSWORD|DB_NAME)=" .env | sed 's/^/export /')
else
  echo "错误：未找到 .env 文件"
  exit 1
fi

DB_HOST=${DB_HOST:-127.0.0.1}
DB_USER=${DB_USER:-root}
DB_NAME=${DB_NAME:-h5mall}

# 构建mysql命令
if [ -z "$DB_PASSWORD" ]; then
  MYSQL_CMD="mysql -h $DB_HOST -u $DB_USER $DB_NAME"
else
  MYSQL_CMD="mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME"
fi

echo "数据库配置："
echo "  主机: $DB_HOST"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo ""

# 创建表
echo "1. 创建 properties 表..."
$MYSQL_CMD < sql/create_properties_table.sql
echo "   ✓ 表创建成功"

# 询问是否插入示例数据
read -p "是否插入示例数据？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "2. 插入示例数据..."
  $MYSQL_CMD < sql/insert_sample_properties.sql
  echo "   ✓ 示例数据插入成功"
else
  echo "2. 跳过示例数据插入"
fi

echo ""
echo "✅ 数据库初始化完成！"
echo ""
echo "下一步："
echo "1. 重启服务: npx pm2 restart jtfp-server"
echo "2. 访问后台: https://www.jintai.cloud/JTFP/H5/admin/"
