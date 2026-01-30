#!/bin/bash

# 测试进销存导出 API
# 需要设置 ADMIN_TOKEN 环境变量

ADMIN_TOKEN="${ADMIN_TOKEN:-LLJKLJAFJKLK87987289739skjkwhhh}"
BASE_URL="http://localhost:3100/api/v1/admin"

echo "=========================================="
echo "测试进销存模块导出 API"
echo "=========================================="
echo ""

# 测试进货管理导出
echo "1. 测试进货管理导出 API"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o /tmp/purchase-test.xlsx \
  "$BASE_URL/purchase/export"
if [ -f /tmp/purchase-test.xlsx ]; then
  file_size=$(stat -f%z /tmp/purchase-test.xlsx 2>/dev/null || stat -c%s /tmp/purchase-test.xlsx 2>/dev/null)
  echo "✓ 进货导出成功，文件大小: ${file_size} bytes"
else
  echo "✗ 进货导出失败"
fi
echo ""

# 测试销售管理导出
echo "2. 测试销售管理导出 API"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o /tmp/sales-test.xlsx \
  "$BASE_URL/sales/export"
if [ -f /tmp/sales-test.xlsx ]; then
  file_size=$(stat -f%z /tmp/sales-test.xlsx 2>/dev/null || stat -c%s /tmp/sales-test.xlsx 2>/dev/null)
  echo "✓ 销售导出成功，文件大小: ${file_size} bytes"
else
  echo "✗ 销售导出失败"
fi
echo ""

# 测试库存管理导出
echo "3. 测试库存管理导出 API"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o /tmp/inventory-test.xlsx \
  "$BASE_URL/inventory-stats/export"
if [ -f /tmp/inventory-test.xlsx ]; then
  file_size=$(stat -f%z /tmp/inventory-test.xlsx 2>/dev/null || stat -c%s /tmp/inventory-test.xlsx 2>/dev/null)
  echo "✓ 库存导出成功，文件大小: ${file_size} bytes"
else
  echo "✗ 库存导出失败"
fi
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "导出的测试文件："
ls -lh /tmp/*-test.xlsx 2>/dev/null || echo "未找到导出文件"

