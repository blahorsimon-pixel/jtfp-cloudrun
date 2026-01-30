-- 为 properties 表添加 module_config 字段
-- 用于存储每个房源的Tab模块显示配置和排序

ALTER TABLE properties 
ADD COLUMN module_config JSON DEFAULT NULL 
COMMENT '模块配置：Tab显示/隐藏和排序，格式：{"tabs":[{"key":"property","name":"房源","visible":true,"order":1},...]}';

-- 为现有房源设置默认配置（所有模块显示，默认顺序）
UPDATE properties 
SET module_config = JSON_OBJECT(
  'tabs', JSON_ARRAY(
    JSON_OBJECT('key', 'property', 'name', '房源', 'visible', true, 'order', 1),
    JSON_OBJECT('key', 'auction', 'name', '拍卖', 'visible', true, 'order', 2),
    JSON_OBJECT('key', 'loan', 'name', '金融', 'visible', true, 'order', 3),
    JSON_OBJECT('key', 'tax', 'name', '税费', 'visible', true, 'order', 4)
  )
)
WHERE module_config IS NULL;
