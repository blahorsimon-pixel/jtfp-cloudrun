USE jtfp_property;

-- 删除旧表
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS categories;

-- 1. 分类表
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
  `icon` VARCHAR(200) COMMENT '分类图标',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` TINYINT DEFAULT 1 COMMENT '状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`name`, `icon`, `sort_order`, `status`) VALUES
('住宅', NULL, 100, 1),
('公寓', NULL, 90, 1),
('别墅', NULL, 80, 1),
('商铺', NULL, 70, 1),
('写字楼', NULL, 60, 1);

-- 2. 房源表（完整字段）
CREATE TABLE `properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `community_name` VARCHAR(200) NOT NULL COMMENT '小区名称',
  `detail_address` TEXT COMMENT '详细地址',
  `building_area` VARCHAR(50) COMMENT '建筑面积',
  `house_type` VARCHAR(50) COMMENT '房屋户型',
  `floor_info` VARCHAR(100) COMMENT '楼层信息',
  `building_year` VARCHAR(20) COMMENT '建筑年代',
  `decoration_status` VARCHAR(50) COMMENT '装修状况',
  `property_status` VARCHAR(50) COMMENT '房屋现状',
  `property_type` VARCHAR(50) COMMENT '产权类型',
  `starting_price` VARCHAR(50) COMMENT '起拍价',
  `starting_unit_price` VARCHAR(50) COMMENT '起拍单价',
  `price_cent` INT DEFAULT 0 COMMENT '价格(分)',
  `cover_url` VARCHAR(500) COMMENT '封面图URL',
  `images` TEXT COMMENT '图片集合(JSON数组)',
  `description` LONGTEXT COMMENT '富文本详情',
  `status` TINYINT DEFAULT 0 COMMENT '上架状态',
  `category_id` INT DEFAULT NULL COMMENT '分类ID',
  `stock` INT DEFAULT 1 COMMENT '库存',
  `is_featured` TINYINT DEFAULT 0 COMMENT '是否精选',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `school_district` VARCHAR(200) COMMENT '学区信息',
  `business_circle` VARCHAR(200) COMMENT '商圈',
  `auction_time` VARCHAR(100) COMMENT '拍卖时间',
  `bidding_phase` VARCHAR(50) COMMENT '出价阶段',
  `auction_platform` VARCHAR(100) COMMENT '拍卖平台',
  `auction_deposit` VARCHAR(50) COMMENT '保证金',
  `evaluation_total_price` VARCHAR(50) COMMENT '评估总价',
  `evaluation_unit_price` VARCHAR(50) COMMENT '评估单价',
  `market_total_price` VARCHAR(50) COMMENT '市场总价',
  `market_unit_price` VARCHAR(50) COMMENT '市场单价',
  `loan_70_percent` VARCHAR(50) COMMENT '7成贷款',
  `loan_80_percent` VARCHAR(50) COMMENT '8成贷款',
  `loan_90_percent` VARCHAR(50) COMMENT '9成贷款',
  `deed_tax_rate` VARCHAR(20) COMMENT '契税税率',
  `deed_tax_amount` VARCHAR(50) COMMENT '契税金额',
  `vat_rate` VARCHAR(20) COMMENT '增值税率',
  `vat_amount` VARCHAR(50) COMMENT '增值税金额',
  `income_tax_rate` VARCHAR(20) COMMENT '个税税率',
  `income_tax_amount` VARCHAR(50) COMMENT '个税金额',
  `profit_space` VARCHAR(50) COMMENT '盈利空间',
  `module_config` TEXT COMMENT '模块配置JSON',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 管理员表
CREATE TABLE `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `token` VARCHAR(100) COMMENT '令牌',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admins` (`username`, `password`, `token`) VALUES 
('admin', 'admin123', 'jintai_admin_2026');

-- 4. 用户表
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `openid` VARCHAR(100) NOT NULL COMMENT '微信openid',
  `nickname` VARCHAR(100) COMMENT '昵称',
  `phone` VARCHAR(20) COMMENT '手机号',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 订单表
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `user_id` INT COMMENT '用户ID',
  `property_id` INT COMMENT '房源ID',
  `amount_cent` INT NOT NULL DEFAULT 0 COMMENT '金额(分)',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ 数据库初始化完成！' AS message;
