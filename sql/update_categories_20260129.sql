-- 创建房源分类表
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `icon` VARCHAR(255) DEFAULT NULL COMMENT '图标URL',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房源分类表';

-- 为 properties 表增加 category_id 字段
ALTER TABLE `properties` ADD COLUMN `category_id` INT DEFAULT NULL COMMENT '分类ID' AFTER `id`;
ALTER TABLE `properties` ADD INDEX `idx_category_id` (`category_id`);

-- 初始化分类数据
INSERT INTO `categories` (`name`, `sort_order`) VALUES 
('香蜜湖', 10),
('深圳湾', 9),
('招商', 8),
('粤海', 7),
('后海', 6),
('前海', 5),
('沙河', 4),
('华侨城', 3);
