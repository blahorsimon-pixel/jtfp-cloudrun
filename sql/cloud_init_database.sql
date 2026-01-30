-- ================================================
-- 微信云托管数据库初始化脚本
-- 金泰资产严选房源系统
-- 创建时间：2026-01-30
-- ================================================
-- 使用方法：
-- 1. 在微信云托管控制台打开数据库管理
-- 2. 创建数据库 jtfp_property（或使用云托管默认数据库）
-- 3. 执行此脚本
-- ================================================

-- 如果使用云托管默认数据库，可以注释掉下面两行
-- CREATE DATABASE IF NOT EXISTS `jtfp_property` 
--   DEFAULT CHARACTER SET utf8mb4 
--   DEFAULT COLLATE utf8mb4_unicode_ci;
-- USE `jtfp_property`;

-- ========== 1. 房源表 ==========
CREATE TABLE IF NOT EXISTS `properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 基本信息
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
  
  -- 商城字段
  `price_cent` INT DEFAULT 0 COMMENT '价格(分)',
  `cover_url` VARCHAR(500) COMMENT '封面图URL',
  `images` TEXT COMMENT '图片集合(JSON数组)',
  `description` LONGTEXT COMMENT '富文本详情(HTML)',
  `status` TINYINT DEFAULT 0 COMMENT '上架状态 0=下架 1=上架',
  `is_featured` TINYINT DEFAULT 0 COMMENT '是否置顶推荐',
  `sort_order` INT DEFAULT 0 COMMENT '排序值(越大越靠前)',
  `stock` INT DEFAULT 1 COMMENT '库存数量',
  `module_config` JSON DEFAULT NULL COMMENT '模块配置JSON',
  `category_id` INT DEFAULT NULL COMMENT '分类ID',
  
  -- 时间戳
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX `idx_community_name` (`community_name`),
  INDEX `idx_customer_phone` (`customer_phone`),
  INDEX `idx_auth_code` (`auth_code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_featured` (`is_featured`),
  INDEX `idx_sort` (`is_featured`, `sort_order`),
  INDEX `idx_category_id` (`category_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房源信息表';

-- ========== 2. 分类表 ==========
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
  `icon` VARCHAR(200) COMMENT '分类图标URL',
  `sort_order` INT DEFAULT 0 COMMENT '排序值',
  `status` TINYINT DEFAULT 1 COMMENT '状态 0=禁用 1=启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sort` (`sort_order`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类表';

-- 插入默认分类
INSERT INTO `categories` (`name`, `sort_order`, `status`) VALUES
('住宅', 100, 1),
('公寓', 90, 1),
('别墅', 80, 1),
('商铺', 70, 1),
('写字楼', 60, 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- ========== 3. 管理员表 ==========
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `token` VARCHAR(100) COMMENT '当前token',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 插入默认管理员（密码：admin123，建议部署后修改）
INSERT INTO `admins` (`username`, `password`, `token`) VALUES 
('admin', 'admin123', 'jintai_admin_2026')
ON DUPLICATE KEY UPDATE `token` = 'jintai_admin_2026';

-- ========== 4. 用户表（微信小程序/公众号） ==========
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `openid` VARCHAR(100) NOT NULL COMMENT '微信OpenID',
  `unionid` VARCHAR(100) COMMENT '微信UnionID',
  `nickname` VARCHAR(100) COMMENT '昵称',
  `avatar_url` VARCHAR(500) COMMENT '头像URL',
  `phone` VARCHAR(20) COMMENT '手机号',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_openid` (`openid`),
  INDEX `idx_unionid` (`unionid`),
  INDEX `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ========== 5. 订单表 ==========
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `user_id` INT COMMENT '用户ID',
  `property_id` INT COMMENT '房源ID',
  `amount_cent` INT NOT NULL DEFAULT 0 COMMENT '订单金额(分)',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态',
  `payment_method` VARCHAR(20) COMMENT '支付方式',
  `paid_at` TIMESTAMP NULL COMMENT '支付时间',
  `contact_name` VARCHAR(50) COMMENT '联系人姓名',
  `contact_phone` VARCHAR(20) COMMENT '联系人电话',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_property_id` (`property_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- ========== 完成 ==========
SELECT '云托管数据库初始化完成！' AS message;
