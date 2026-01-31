-- ================================================
-- 数据库字段诊断脚本
-- 用于检查 properties 表是否缺少必需字段
-- 创建时间：2026-01-30
-- ================================================
-- 使用方法：
-- 在数据库管理控制台或终端执行此脚本
-- 对比输出结果与标准字段列表，找出缺失字段
-- ================================================

-- 1. 显示当前 properties 表的所有字段
SELECT 
  COLUMN_NAME AS '字段名',
  COLUMN_TYPE AS '类型',
  IS_NULLABLE AS '允许NULL',
  COLUMN_DEFAULT AS '默认值',
  COLUMN_COMMENT AS '注释'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
ORDER BY ORDINAL_POSITION;

-- 2. 检查标准字段列表中的必需字段是否存在
SELECT 
  '基础字段检查' AS '检查类型',
  'holding_years' AS '字段名',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END AS '状态'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'holding_years'

UNION ALL

SELECT 
  '商城字段检查' AS '检查类型',
  'price_cent' AS '字段名',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END AS '状态'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'price_cent'

UNION ALL

SELECT 
  '商城字段检查',
  'cover_url',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'cover_url'

UNION ALL

SELECT 
  '商城字段检查',
  'description',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'description'

UNION ALL

SELECT 
  '商城字段检查',
  'status',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'status'

UNION ALL

SELECT 
  '商城字段检查',
  'is_featured',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'is_featured'

UNION ALL

SELECT 
  '商城字段检查',
  'sort_order',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'sort_order'

UNION ALL

SELECT 
  '商城字段检查',
  'stock',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'stock'

UNION ALL

SELECT 
  '商城字段检查',
  'images',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'images'

UNION ALL

SELECT 
  '扩展字段检查',
  'module_config',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'module_config'

UNION ALL

SELECT 
  '扩展字段检查',
  'category_id',
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 缺失' END
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME = 'category_id';

-- 3. 统计缺失字段数量
SELECT 
  COUNT(*) AS '当前字段总数'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties';

-- 预期字段总数应该是：47个字段（含id, created_at, updated_at）
-- 如果少于47个，说明有字段缺失
