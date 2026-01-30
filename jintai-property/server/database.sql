-- 金泰资产严选房源系统 - 数据库表结构
-- 创建时间：2026-01-21

CREATE DATABASE IF NOT EXISTS `jintai_property` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `jintai_property`;

-- 房源信息表（40字段 + 商城展示字段）
CREATE TABLE IF NOT EXISTS `properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '房源ID',
  
  -- 基本信息（40字段）
  `auction_time` VARCHAR(100) COMMENT '开拍时间',
  `bidding_phase` VARCHAR(50) COMMENT '竞价阶段',
  `community_name` VARCHAR(200) NOT NULL COMMENT '小区名称',
  `detail_address` TEXT COMMENT '详细地址',
  `building_area` VARCHAR(50) COMMENT '建筑面积/㎡',
  `house_type` VARCHAR(50) COMMENT '房屋户型',
  `floor_info` VARCHAR(50) COMMENT '楼层',
  `building_year` VARCHAR(50) COMMENT '建筑年份',
  `decoration_status` VARCHAR(50) COMMENT '装修情况',
  `property_status` VARCHAR(100) COMMENT '物业现状：租赁、空置、住人',
  `holding_years` VARCHAR(50) COMMENT '持有年数',
  `property_type` VARCHAR(50) COMMENT '物业类型',
  
  -- 价格信息
  `starting_price` VARCHAR(50) COMMENT '起拍价',
  `starting_unit_price` VARCHAR(50) COMMENT '起拍单价',
  `auction_platform` VARCHAR(100) COMMENT '竞拍平台',
  `auction_deposit` VARCHAR(50) COMMENT '竞拍保证金',
  `price_increment` VARCHAR(50) COMMENT '加价幅度',
  `evaluation_total_price` VARCHAR(50) COMMENT '评估总价',
  `evaluation_unit_price` VARCHAR(50) COMMENT '评估单价',
  
  -- 贷款信息
  `loan_70_percent` VARCHAR(50) COMMENT '7成可贷金额',
  `loan_80_percent` VARCHAR(50) COMMENT '8成可贷金额',
  `loan_90_percent` VARCHAR(50) COMMENT '9成可贷金额',
  
  -- 市场信息
  `market_total_price` VARCHAR(50) COMMENT '市场参考总价',
  `market_unit_price` VARCHAR(50) COMMENT '市场参考单价',
  `school_district` VARCHAR(200) COMMENT '学区',
  `business_circle` VARCHAR(200) COMMENT '商圈',
  `profit_space` VARCHAR(50) COMMENT '捡漏空间',
  
  -- 授权与税费
  `auth_code` VARCHAR(100) COMMENT '授权码',
  `deed_tax_rate` VARCHAR(50) COMMENT '契税率',
  `deed_tax_amount` VARCHAR(50) COMMENT '契税金额',
  `vat_rate` VARCHAR(50) COMMENT '增值税率',
  `vat_amount` VARCHAR(50) COMMENT '增值税金额',
  `income_tax_rate` VARCHAR(50) COMMENT '个税率',
  `income_tax_amount` VARCHAR(50) COMMENT '个税金额',
  
  -- 客户信息
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(50) COMMENT '客户联系号码',
  `customer_survey_brief` TEXT COMMENT '客户尽调简介',
  `assigned_salesman` VARCHAR(100) COMMENT '归属业务员',
  `unionID` VARCHAR(100) COMMENT 'unionID',
  `openID` VARCHAR(100) COMMENT 'OpenID',
  
  -- 商城展示字段
  `status` TINYINT DEFAULT 0 COMMENT '上架状态：0-下架 1-上架',
  `is_featured` TINYINT DEFAULT 0 COMMENT '是否推荐：0-否 1-是',
  `cover_url` VARCHAR(500) COMMENT '封面图片URL',
  `images` TEXT COMMENT '图片集合，JSON数组格式',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重，数值越大越靠前',
  `module_config` JSON DEFAULT NULL COMMENT '模块配置：Tab显示/隐藏和排序，格式：{"tabs":[{"key":"property","name":"房源","visible":true,"order":1},...]}',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX `idx_community_name` (`community_name`),
  INDEX `idx_customer_phone` (`customer_phone`),
  INDEX `idx_auth_code` (`auth_code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_featured` (`is_featured`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房源信息表';

-- 管理员表（简单实现）
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（实际应加密）',
  `token` VARCHAR(100) COMMENT '当前token',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 插入默认管理员（密码：admin123）
INSERT INTO `admins` (`username`, `password`, `token`) VALUES 
('admin', 'admin123', 'jintai_admin_2026')
ON DUPLICATE KEY UPDATE `token` = 'jintai_admin_2026';
