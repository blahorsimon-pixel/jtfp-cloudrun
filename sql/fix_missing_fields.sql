-- ================================================
-- 数据库字段修复脚本（安全版本）
-- 用于添加 properties 表缺失的字段
-- 创建时间：2026-01-30
-- ================================================
-- 使用方法：
-- 1. 在执行前，建议先运行 diagnose_missing_fields.sql 确认缺失字段
-- 2. 在数据库管理控制台或终端执行此脚本
-- 3. 脚本使用存储过程实现 IF NOT EXISTS 逻辑，兼容 MySQL 5.7+
-- 4. 可以重复执行，不会报错
-- ================================================

DELIMITER $$

-- 创建临时存储过程：安全添加字段
DROP PROCEDURE IF EXISTS add_column_if_not_exists$$
CREATE PROCEDURE add_column_if_not_exists(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_column_definition TEXT
)
BEGIN
  DECLARE column_exists INT DEFAULT 0;
  
  -- 检查字段是否存在
  SELECT COUNT(*) INTO column_exists
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table_name
    AND COLUMN_NAME = p_column_name;
  
  -- 如果不存在，则添加
  IF column_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN `', 
                      p_column_name, '` ', p_column_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('✓ 添加字段: ', p_column_name) AS result;
  ELSE
    SELECT CONCAT('○ 字段已存在: ', p_column_name) AS result;
  END IF;
END$$

-- 创建临时存储过程：安全添加索引
DROP PROCEDURE IF EXISTS add_index_if_not_exists$$
CREATE PROCEDURE add_index_if_not_exists(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_definition TEXT
)
BEGIN
  DECLARE index_exists INT DEFAULT 0;
  
  -- 检查索引是否存在
  SELECT COUNT(*) INTO index_exists
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table_name
    AND INDEX_NAME = p_index_name;
  
  -- 如果不存在，则添加
  IF index_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD INDEX `', 
                      p_index_name, '` ', p_index_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('✓ 添加索引: ', p_index_name) AS result;
  ELSE
    SELECT CONCAT('○ 索引已存在: ', p_index_name) AS result;
  END IF;
END$$

DELIMITER ;

-- ================================================
-- 开始修复字段
-- ================================================

-- 1. 添加基础房源字段（如果缺失会导致所有写入失败）
CALL add_column_if_not_exists('properties', 'holding_years', 
  "VARCHAR(50) COMMENT '持有年数'");

-- 2. 添加商城字段（如果缺失会导致带商品信息的房源保存失败）
CALL add_column_if_not_exists('properties', 'price_cent', 
  "INT DEFAULT 0 COMMENT '价格(分)'");

CALL add_column_if_not_exists('properties', 'cover_url', 
  "VARCHAR(500) COMMENT '封面图URL'");

CALL add_column_if_not_exists('properties', 'description', 
  "LONGTEXT COMMENT '富文本详情(HTML)'");

CALL add_column_if_not_exists('properties', 'status', 
  "TINYINT DEFAULT 0 COMMENT '上架状态 0=下架 1=上架'");

CALL add_column_if_not_exists('properties', 'is_featured', 
  "TINYINT DEFAULT 0 COMMENT '是否置顶推荐'");

CALL add_column_if_not_exists('properties', 'sort_order', 
  "INT DEFAULT 0 COMMENT '排序值(越大越靠前)'");

CALL add_column_if_not_exists('properties', 'stock', 
  "INT DEFAULT 1 COMMENT '库存数量'");

CALL add_column_if_not_exists('properties', 'images', 
  "TEXT COMMENT '图片集合(JSON数组)'");

-- 3. 添加扩展字段（可选但建议添加）
CALL add_column_if_not_exists('properties', 'module_config', 
  "JSON DEFAULT NULL COMMENT '模块配置：Tab显示/隐藏和排序'");

CALL add_column_if_not_exists('properties', 'category_id', 
  "INT DEFAULT NULL COMMENT '分类ID'");

-- 4. 添加索引（优化查询性能）
CALL add_index_if_not_exists('properties', 'idx_status', 
  "(`status`)");

CALL add_index_if_not_exists('properties', 'idx_is_featured', 
  "(`is_featured`)");

CALL add_index_if_not_exists('properties', 'idx_sort', 
  "(`is_featured`, `sort_order`)");

CALL add_index_if_not_exists('properties', 'idx_category_id', 
  "(`category_id`)");

-- ================================================
-- 清理临时存储过程
-- ================================================
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DROP PROCEDURE IF EXISTS add_index_if_not_exists;

-- ================================================
-- 验证修复结果
-- ================================================
SELECT '修复脚本执行完成！' AS message;

SELECT 
  COUNT(*) AS '当前字段总数',
  CASE 
    WHEN COUNT(*) >= 47 THEN '✓ 字段完整'
    ELSE '✗ 仍有字段缺失'
  END AS '状态'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties';

-- 显示最终的表结构（仅显示新增的关键字段）
SELECT 
  COLUMN_NAME AS '字段名',
  COLUMN_TYPE AS '类型',
  COLUMN_COMMENT AS '注释'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties'
  AND COLUMN_NAME IN (
    'holding_years', 'price_cent', 'cover_url', 'description', 
    'status', 'is_featured', 'sort_order', 'stock', 'images',
    'module_config', 'category_id'
  )
ORDER BY ORDINAL_POSITION;
