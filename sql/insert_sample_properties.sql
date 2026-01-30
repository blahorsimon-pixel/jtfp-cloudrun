-- 示例房源数据
-- 用于测试房源管理系统

INSERT INTO `properties` (
  `auction_time`, `bidding_phase`, `community_name`, `detail_address`,
  `building_area`, `house_type`, `floor_info`, `building_year`,
  `starting_price`, `starting_unit_price`, `market_total_price`, `market_unit_price`,
  `school_district`, `business_circle`, `auth_code`
) VALUES
(
  '2026-02-15 10:00', '一拍', '阳光花园', '北京市朝阳区阳光花园3号楼2单元1201',
  '89.5', '3室2厅', '12/26', '2015',
  '350', '39106', '420', '46927',
  '朝阳实验小学', '国贸商圈', 'TEST001'
),
(
  '2026-02-20 14:00', '一拍', '碧水豪庭', '上海市浦东新区碧水豪庭5栋1楼102',
  '120.3', '4室2厅', '1/18', '2018',
  '580', '48212', '680', '56525',
  '浦东外国语小学', '陆家嘴商圈', 'TEST002'
),
(
  '2026-03-01 10:00', '一拍', '翠湖名苑', '深圳市南山区翠湖名苑7号楼15层1502',
  '95.8', '3室2厅2卫', '15/30', '2019',
  '450', '46972', '550', '57412',
  '南山实验学校', '科技园', 'TEST003'
);
