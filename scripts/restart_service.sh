#!/bin/bash
# 房源商城服务重启脚本

set -e

echo "=== 房源商城服务重启 ==="
echo "时间: $(date)"

# 1. 停止旧服务
echo "1. 停止旧服务..."
pkill -f "node /www/wwwroot/JTFP/dist/index.js" 2>/dev/null || true
pkill -f "node dist/index.js" 2>/dev/null || true
lsof -ti:3100 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2

# 2. 检查数据库连接
echo "2. 检查数据库..."
mysql -u root h5mall -e "SELECT COUNT(*) as total FROM properties" 2>&1 | grep -q "total" && echo "✓ 数据库连接正常" || echo "✗ 数据库连接失败"

# 3. 插入测试数据（如果没有）
echo "3. 准备测试数据..."
mysql -u root h5mall <<EOF
INSERT INTO properties (
  community_name, house_type, building_area, floor_info,
  starting_price, price_cent, cover_url, description,
  status, is_featured, stock, detail_address, school_district, business_circle
) VALUES (
  '金泰花园', '3室2厅', '120', '中层/共26层',
  '200', 2000000, 
  'https://via.placeholder.com/400x300/4A90E2/ffffff?text=金泰花园',
  '<h2>房源亮点</h2><ul><li>精装修，拎包入住</li><li>南北通透，采光极佳</li><li>地铁口200米</li><li>学区房</li></ul><h3>周边配套</h3><p>小区环境优美，配套设施齐全。</p>',
  1, 1, 1, '北京市朝阳区建国路88号', '重点小学', '国贸商圈'
) ON DUPLICATE KEY UPDATE status=1;

INSERT INTO properties (
  community_name, house_type, building_area, floor_info,
  starting_price, price_cent, cover_url, description,
  status, is_featured, stock, detail_address
) VALUES (
  '阳光新城', '2室1厅', '85', '高层',
  '150', 1500000,
  'https://via.placeholder.com/400x300/E74C3C/ffffff?text=阳光新城',
  '<h2>温馨小户型</h2><p>适合小家庭居住，交通便利。</p>',
  1, 0, 1, '北京市海淀区中关村大街100号'
) ON DUPLICATE KEY UPDATE status=1;
EOF

echo "✓ 测试数据准备完成"

# 4. 编译代码
echo "4. 编译后端代码..."
cd /www/wwwroot/JTFP
npm run build 2>&1 | tail -5

# 5. 启动服务
echo "5. 启动服务..."
cd /www/wwwroot/JTFP
mkdir -p logs
nohup node dist/index.js > logs/server.log 2>&1 &
SERVICE_PID=$!
echo "服务已启动，PID: $SERVICE_PID"

# 6. 等待服务启动
echo "6. 等待服务启动..."
sleep 5

# 7. 测试API
echo "7. 测试API..."
echo "- 健康检查:"
curl -s http://localhost:3100/health | head -50
echo ""

echo "- 房源商城API:"
curl -s "http://localhost:3100/api/v1/properties/mall?pageSize=2" | head -100
echo ""

echo "=== 服务重启完成 ==="
echo "后台管理: https://www.jintai.cloud/JTFP/H5/admin/"
echo "H5商城: https://www.jintai.cloud/h5/#/properties"
echo "API文档: http://localhost:3100/api/v1/properties/mall"
