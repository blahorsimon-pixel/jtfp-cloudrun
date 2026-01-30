import ExcelJS from 'exceljs';
import path from 'path';

// 与后端 properties.ts 中 HEADER_MAP 保持一致的表头定义
const HEADER_MAP: Record<string, string> = {
  '开拍时间': 'auction_time',
  '竞价阶段': 'bidding_phase',
  '小区名称': 'community_name',
  '详细地址': 'detail_address',
  '建筑面积/㎡': 'building_area',
  '房屋户型': 'house_type',
  '楼层': 'floor_info',
  '建筑年份': 'building_year',
  '装修情况': 'decoration_status',
  '物业现状': 'property_status',
  '持有年数': 'holding_years',
  '物业类型': 'property_type',
  '起拍价': 'starting_price',
  '起拍单价': 'starting_unit_price',
  '竞拍平台': 'auction_platform',
  '竞拍保证金': 'auction_deposit',
  '加价幅度': 'price_increment',
  '评估总价': 'evaluation_total_price',
  '评估单价': 'evaluation_unit_price',
  '7成可贷金额': 'loan_70_percent',
  '8成可贷金额': 'loan_80_percent',
  '9成可贷金额': 'loan_90_percent',
  '市场参考总价': 'market_total_price',
  '市场参考单价': 'market_unit_price',
  '学区': 'school_district',
  '商圈': 'business_circle',
  '捡漏空间': 'profit_space',
  '授权码': 'auth_code',
  '契税率': 'deed_tax_rate',
  '契税金额': 'deed_tax_amount',
  '增值税率': 'vat_rate',
  '增值税金额': 'vat_amount',
  '个税率': 'income_tax_rate',
  '个税金额': 'income_tax_amount',
  '客户姓名': 'customer_name',
  '客户联系号码': 'customer_phone',
  '客户尽调简介': 'customer_survey_brief',
  '归属业务员': 'assigned_salesman',
  'unionID': 'unionID',
  'OpenID': 'openID'
};

async function generateTemplate() {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('房源导入模板');

    // 设置表头
    const headers = Object.keys(HEADER_MAP);
    const headerRow = worksheet.addRow(headers);
    
    // 设置表头样式
    headerRow.font = { bold: true, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // 设置列宽
    worksheet.columns.forEach((column, index) => {
      column.width = 15;
    });

    // 添加示例数据
    worksheet.addRow([
      '2026-02-01 10:00', '一拍', '示例小区', 'XX市XX区XX路XX号', '89.5', '3室2厅', '12/26', '2010', '精装', '空置', 
      '5年', '住宅', '200', '2.2', '京东司法拍卖', '20', '1', '300', '3.3', '210', 
      '240', '270', '320', '3.5', 'XX小学', '市中心', '20', 'AUTH123', '1%', '3', 
      '5%', '15', '1%', '3', '张三', '13800138000', '客户诚意度高', '业务员A', 'UID123', 'OID123'
    ]);

    // 保存文件到 public/templates/ 目录
    const outputPath = path.join(__dirname, '..', 'public', 'templates', 'property_import_template.xlsx');
    await workbook.xlsx.writeFile(outputPath);
    
    console.log('✅ 房源导入模板生成成功！');
    console.log(`📁 文件路径: ${outputPath}`);
    console.log(`📊 包含字段数: ${headers.length}`);
  } catch (error) {
    console.error('❌ 生成模板失败:', error);
    process.exit(1);
  }
}

generateTemplate();
