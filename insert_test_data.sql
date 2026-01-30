-- 插入测试房源数据
USE h5mall;

INSERT INTO properties (
  community_name, house_type, building_area, floor_info,
  starting_price, price_cent, cover_url, description,
  status, is_featured, stock, detail_address, school_district, business_circle,
  decoration_status, property_type, building_year
) VALUES (
  '金泰花园', '3室2厅', '120', '中层/共26层',
  '200', 2000000, 
  'https://via.placeholder.com/400x300/4A90E2/ffffff?text=金泰花园',
  '<div style="padding:20px;"><h2 style="color:#333;margin-bottom:15px;">🏠 房源亮点</h2><ul style="line-height:1.8;"><li>✨ 精装修，拎包入住</li><li>🌞 南北通透，采光极佳</li><li>🚇 地铁口200米，交通便利</li><li>📚 重点学区房</li></ul><h3 style="color:#333;margin:20px 0 10px;">🏘️ 周边配套</h3><p style="line-height:1.6;">小区环境优美，绿化率高，配套设施齐全。周边有大型商场、医院、学校等。</p><img src="https://via.placeholder.com/600x400/E8F5E9/4CAF50?text=小区环境" style="width:100%;margin:15px 0;border-radius:8px;"/></div>',
  1, 1, 1, '北京市朝阳区建国路88号', '重点小学', '国贸商圈',
  '精装', '住宅', '2015'
) ON DUPLICATE KEY UPDATE status=1, is_featured=1;

INSERT INTO properties (
  community_name, house_type, building_area, floor_info,
  starting_price, price_cent, cover_url, description,
  status, is_featured, stock, detail_address, school_district, business_circle,
  decoration_status, property_type
) VALUES (
  '阳光新城', '2室1厅', '85', '高层',
  '150', 1500000,
  'https://via.placeholder.com/400x300/E74C3C/ffffff?text=阳光新城',
  '<div style="padding:20px;"><h2 style="color:#333;">🌟 温馨小户型</h2><p style="line-height:1.6;margin:10px 0;">适合小家庭居住，户型方正，空间利用率高。</p><ul style="line-height:1.8;"><li>交通便利</li><li>生活配套齐全</li><li>性价比高</li></ul></div>',
  1, 0, 1, '北京市海淀区中关村大街100号', '普通学区', '中关村商圈',
  '简装', '住宅'
) ON DUPLICATE KEY UPDATE status=1;

INSERT INTO properties (
  community_name, house_type, building_area, floor_info,
  starting_price, price_cent, cover_url, description,
  status, stock, detail_address, property_type
) VALUES (
  '江景豪庭', '4室2厅', '180', '顶层复式',
  '500', 5000000,
  'https://via.placeholder.com/400x300/9C27B0/ffffff?text=江景豪庭',
  '<div style="padding:20px;"><h2 style="color:#333;">🏰 豪华复式</h2><p style="line-height:1.6;">一线江景，270度观景阳台，尊享品质生活。</p></div>',
  1, 1, '北京市东城区滨江路1号', '别墅'
) ON DUPLICATE KEY UPDATE status=1;

SELECT '✓ 测试数据插入完成' as result;
SELECT COUNT(*) as total_properties, SUM(status=1) as online_properties FROM properties;
