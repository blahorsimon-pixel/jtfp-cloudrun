-- ================================================
-- 数据库字段快速修复脚本（简化版）
-- 用于在云托管控制台直接执行
-- 创建时间：2026-01-30
-- ================================================
-- 此脚本添加 properties 表缺失的11个字段 + 4个索引
-- 可以直接复制到云托管数据库控制台的 SQL 窗口执行
-- ================================================

-- 设置字符集
SET NAMES utf8mb4;

-- 1. 基础字段：holding_years
ALTER TABLE `properties` 
ADD COLUMN IF NOT EXISTS `holding_years` VARCHAR(50) COMMENT '持有年数';

-- 2. 商城字段（8个）
ALTER TABLE `properties` 
ADD COLUMN IF NOT EXISTS `price_cent` INT DEFAULT 0 COMMENT '价格(分)',
ADD COLUMN IF NOT EXISTS `cover_url` VARCHAR(500) COMMENT '封面图URL',
ADD COLUMN IF NOT EXISTS `description` LONGTEXT COMMENT '富文本详情(HTML)',
ADD COLUMN IF NOT EXISTS `status` TINYINT DEFAULT 0 COMMENT '上架状态 0=下架 1=上架',
ADD COLUMN IF NOT EXISTS `is_featured` TINYINT DEFAULT 0 COMMENT '是否置顶推荐',
ADD COLUMN IF NOT EXISTS `sort_order` INT DEFAULT 0 COMMENT '排序值(越大越靠前)',
ADD COLUMN IF NOT EXISTS `stock` INT DEFAULT 1 COMMENT '库存数量',
ADD COLUMN IF NOT EXISTS `images` TEXT COMMENT '图片集合(JSON数组)';

-- 3. 扩展字段（2个）
ALTER TABLE `properties` 
ADD COLUMN IF NOT EXISTS `module_config` JSON DEFAULT NULL COMMENT '模块配置：Tab显示/隐藏和排序';

ALTER TABLE `properties` 
ADD COLUMN IF NOT EXISTS `category_id` INT DEFAULT NULL COMMENT '分类ID';

-- 4. 添加索引（如果不存在）
ALTER TABLE `properties` 
ADD INDEX IF NOT EXISTS `idx_status` (`status`);

ALTER TABLE `properties` 
ADD INDEX IF NOT EXISTS `idx_is_featured` (`is_featured`);

ALTER TABLE `properties` 
ADD INDEX IF NOT EXISTS `idx_sort` (`is_featured`, `sort_order`);

ALTER TABLE `properties` 
ADD INDEX IF NOT EXISTS `idx_category_id` (`category_id`);

-- 验证结果
SELECT '✓ 修复完成！' AS message;

SELECT 
  COUNT(*) AS '当前字段总数',
  CASE 
    WHEN COUNT(*) >= 47 THEN '✓ 字段完整'
    ELSE CONCAT('⚠️  仍有字段缺失，当前只有 ', COUNT(*), ' 个字段，预期 47 个')
  END AS '状态'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties';
