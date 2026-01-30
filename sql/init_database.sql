-- 数据库初始化脚本
-- 创建时间：2026-01-27
-- 用途：创建新的房源管理系统数据库

-- 1. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `jtfp_property` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 2. 使用数据库
USE `jtfp_property`;

-- 3. 创建数据库用户（如果不存在）
-- 注意：如果用户已存在，这些语句会报错但不影响后续执行
CREATE USER IF NOT EXISTS 'jintaisql'@'localhost' IDENTIFIED BY 'xiaofusql';
CREATE USER IF NOT EXISTS 'jintaisql'@'127.0.0.1' IDENTIFIED BY 'xiaofusql';

-- 4. 授予权限
GRANT ALL PRIVILEGES ON `jtfp_property`.* TO 'jintaisql'@'localhost';
GRANT ALL PRIVILEGES ON `jtfp_property`.* TO 'jintaisql'@'127.0.0.1';

-- 5. 刷新权限
FLUSH PRIVILEGES;

-- 6. 创建房源表
CREATE TABLE IF NOT EXISTS `properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `auction_time` VARCHAR(100) COMMENT '开拍时间',
  `bidding_phase` VARCHAR(50) COMMENT '竞价阶段',
  `community_name` VARCHAR(200) NOT NULL COMMENT '小区名称',
  `detail_address` TEXT COMMENT '详细地址',
  `building_area` VARCHAR(50) COMMENT '建筑面积/㎡',
  `house_type` VARCHAR(50) COMMENT '房屋户型',
  `floor_info` VARCHAR(50) COMMENT '楼层',
  `building_year` VARCHAR(50) COMMENT '建筑年份',
  `decoration_status` VARCHAR(50) COMMENT '装修情况',
  `property_status` VARCHAR(100) COMMENT '物业现状',
  `holding_years` VARCHAR(50) COMMENT '持有年数',
  `property_type` VARCHAR(50) COMMENT '物业类型',
  `starting_price` VARCHAR(50) COMMENT '起拍价',
  `starting_unit_price` VARCHAR(50) COMMENT '起拍单价',
  `auction_platform` VARCHAR(100) COMMENT '竞拍平台',
  `auction_deposit` VARCHAR(50) COMMENT '竞拍保证金',
  `price_increment` VARCHAR(50) COMMENT '加价幅度',
  `evaluation_total_price` VARCHAR(50) COMMENT '评估总价',
  `evaluation_unit_price` VARCHAR(50) COMMENT '评估单价',
  `loan_70_percent` VARCHAR(50) COMMENT '7成可贷金额',
  `loan_80_percent` VARCHAR(50) COMMENT '8成可贷金额',
  `loan_90_percent` VARCHAR(50) COMMENT '9成可贷金额',
  `market_total_price` VARCHAR(50) COMMENT '市场参考总价',
  `market_unit_price` VARCHAR(50) COMMENT '市场参考单价',
  `school_district` VARCHAR(200) COMMENT '学区',
  `business_circle` VARCHAR(200) COMMENT '商圈',
  `profit_space` VARCHAR(50) COMMENT '捡漏空间',
  `auth_code` VARCHAR(100) COMMENT '授权码',
  `deed_tax_rate` VARCHAR(50) COMMENT '契税率',
  `deed_tax_amount` VARCHAR(50) COMMENT '契税金额',
  `vat_rate` VARCHAR(50) COMMENT '增值税率',
  `vat_amount` VARCHAR(50) COMMENT '增值税金额',
  `income_tax_rate` VARCHAR(50) COMMENT '个税率',
  `income_tax_amount` VARCHAR(50) COMMENT '个税金额',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(50) COMMENT '客户联系号码',
  `customer_survey_brief` TEXT COMMENT '客户尽调简介',
  `assigned_salesman` VARCHAR(100) COMMENT '归属业务员',
  `unionID` VARCHAR(100) COMMENT 'unionID',
  `openID` VARCHAR(100) COMMENT 'OpenID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_community_name` (`community_name`),
  INDEX `idx_customer_phone` (`customer_phone`),
  INDEX `idx_auth_code` (`auth_code`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房源信息表';

-- 7. 添加商城字段
ALTER TABLE `properties`
  ADD COLUMN IF NOT EXISTS `price_cent` INT DEFAULT 0 COMMENT '价格(分)',
  ADD COLUMN IF NOT EXISTS `cover_url` VARCHAR(500) COMMENT '封面图URL',
  ADD COLUMN IF NOT EXISTS `description` LONGTEXT COMMENT '富文本详情(HTML)',
  ADD COLUMN IF NOT EXISTS `status` TINYINT DEFAULT 0 COMMENT '上架状态 0=下架 1=上架',
  ADD COLUMN IF NOT EXISTS `is_featured` TINYINT DEFAULT 0 COMMENT '是否置顶推荐',
  ADD COLUMN IF NOT EXISTS `sort_order` INT DEFAULT 0 COMMENT '排序值(越大越靠前)',
  ADD COLUMN IF NOT EXISTS `stock` INT DEFAULT 1 COMMENT '库存数量',
  ADD COLUMN IF NOT EXISTS `images` TEXT COMMENT '图片集合(JSON数组)';

-- 8. 添加索引（如果不存在）
CREATE INDEX IF NOT EXISTS `idx_status` ON `properties` (`status`);
CREATE INDEX IF NOT EXISTS `idx_sort` ON `properties` (`is_featured`, `sort_order`);

-- 9. 添加模块配置字段
ALTER TABLE `properties` 
  ADD COLUMN IF NOT EXISTS `module_config` JSON DEFAULT NULL 
  COMMENT '模块配置：Tab显示/隐藏和排序，格式：{"tabs":[{"key":"property","name":"房源","visible":true,"order":1},...]}';

-- 10. 为现有房源设置默认模块配置（如果有数据）
UPDATE `properties` 
SET `module_config` = JSON_OBJECT(
  'tabs', JSON_ARRAY(
    JSON_OBJECT('key', 'property', 'name', '房源', 'visible', true, 'order', 1),
    JSON_OBJECT('key', 'auction', 'name', '拍卖', 'visible', true, 'order', 2),
    JSON_OBJECT('key', 'loan', 'name', '金融', 'visible', true, 'order', 3),
    JSON_OBJECT('key', 'tax', 'name', '税费', 'visible', true, 'order', 4)
  )
)
WHERE `module_config` IS NULL;

-- 完成提示
SELECT '数据库初始化完成！' AS message;
SELECT '数据库名: jtfp_property' AS info;
SELECT '用户名: jintaisql' AS info;
SELECT '密码: xiaofusql' AS info;
