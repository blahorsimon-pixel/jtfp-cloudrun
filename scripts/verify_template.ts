import ExcelJS from 'exceljs';
import path from 'path';

async function verifyTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'public', 'templates', 'property_import_template.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.error('❌ 工作表不存在');
      return;
    }
    
    // 读取表头
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers.push(cell.value?.toString() || '');
    });
    
    console.log('✅ 模板验证成功！');
    console.log(`📊 表头字段数: ${headers.length}`);
    console.log('📋 表头字段列表:');
    headers.forEach((header, index) => {
      console.log(`  ${index + 1}. ${header}`);
    });
    
    // 验证示例数据行
    const exampleRow = worksheet.getRow(2);
    const exampleData: any[] = [];
    exampleRow.eachCell((cell, colNumber) => {
      exampleData.push(cell.value);
    });
    console.log(`\n📝 示例数据行: ${exampleData.length} 个字段`);
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

verifyTemplate();
