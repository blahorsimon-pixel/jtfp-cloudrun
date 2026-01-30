-- 房源商城化改造 - 数据库迁移脚本
-- 创建时间：2026-01-21
-- 用途：为 properties 表添加商品相关字段，使房源可作为商品在H5商城展示

-- 添加商品字段（如果字段已存在，执行时会报错但不影响）
ALTER TABLE `properties`
  ADD COLUMN `price_cent` INT DEFAULT 0 COMMENT '价格(分)',
  ADD COLUMN `cover_url` VARCHAR(500) COMMENT '封面图URL',
  ADD COLUMN `description` LONGTEXT COMMENT '富文本详情(HTML)',
  ADD COLUMN `status` TINYINT DEFAULT 0 COMMENT '上架状态 0=下架 1=上架',
  ADD COLUMN `is_featured` TINYINT DEFAULT 0 COMMENT '是否置顶推荐',
  ADD COLUMN `sort_order` INT DEFAULT 0 COMMENT '排序值(越大越靠前)',
  ADD COLUMN `stock` INT DEFAULT 1 COMMENT '库存数量',
  ADD INDEX `idx_status` (`status`),
  ADD INDEX `idx_sort` (`is_featured`, `sort_order`);

-- 注释：
-- price_cent: 房源售价，单位为分（与商品系统保持一致）
-- cover_url: 房源封面图，用于列表和详情页展示
-- description: 富文本详情，支持HTML格式，用于展示房源详细介绍
-- status: 0=下架（仅管理后台可见），1=上架（H5商城可见）
-- is_featured: 是否置顶推荐，1=置顶
-- sort_order: 排序值，越大越靠前
-- stock: 库存数量，默认1（房源通常为唯一）
