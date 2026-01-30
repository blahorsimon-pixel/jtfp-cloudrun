/**
 * order_items 表迁移验证脚本
 * 比对原始备份数据与迁移后数据，确保原有字段完整无损
 * 
 * 执行方式: npx ts-node scripts/verify_order_items_migration.ts
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'mall',
  password: process.env.DB_PASSWORD || 'V8JxsSWtR076t625j1NA',
  database: process.env.DB_NAME || 'h5mall',
};

async function main() {
  console.log('=== order_items 表迁移验证脚本 ===');
  console.log(`数据库: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  
  // 1. 查找最新的备份文件
  const backupsDir = path.resolve(__dirname, '../backups');
  const files = fs.readdirSync(backupsDir).filter(f => f.startsWith('order_items_sku_backup_') && f.endsWith('.json'));
  if (files.length === 0) {
    console.error('❌ 未找到备份文件！请先运行 backup_order_items_for_sku_code.ts');
    process.exit(1);
  }
  
  // 获取最新的备份文件
  files.sort().reverse();
  const latestBackupFile = path.resolve(backupsDir, files[0]);
  console.log(`\n使用备份文件: ${latestBackupFile}`);
  
  // 2. 读取备份数据
  const backupData = JSON.parse(fs.readFileSync(latestBackupFile, 'utf8'));
  const originalRecords = backupData.records as any[];
  console.log(`备份记录数: ${originalRecords.length}`);
  
  const conn = await mysql.createConnection(DB_CONFIG);
  
  try {
    // 3. 获取当前表的数据
    const [currentRows] = await conn.query<any[]>(
      `SELECT id, order_no, sku_id, sku_title, quantity, sale_price, total_price, sku_attrs, sku_code, created_at
       FROM order_items ORDER BY id ASC`
    );
    console.log(`当前记录数: ${currentRows.length}`);
    
    // 4. 验证记录数一致
    if (originalRecords.length !== currentRows.length) {
      console.error(`❌ 记录数不一致! 原始: ${originalRecords.length}, 当前: ${currentRows.length}`);
      process.exit(1);
    }
    console.log('✅ 记录数一致');
    
    // 5. 逐条比对原有字段（不包括新增的 sku_code）
    const errors: string[] = [];
    const skuCodeStats = {
      total: currentRows.length,
      withSkuCode: 0,
      withoutSkuCode: 0,
    };
    
    for (let i = 0; i < originalRecords.length; i++) {
      const orig = originalRecords[i];
      const curr = currentRows[i];
      
      // 比对原有字段
      const fieldsToCompare = ['id', 'order_no', 'sku_id', 'sku_title', 'quantity', 'sale_price', 'total_price'];
      
      for (const field of fieldsToCompare) {
        const origVal = orig[field];
        const currVal = curr[field];
        
        // 数值类型比较
        if (typeof origVal === 'number' || typeof currVal === 'number') {
          if (Number(origVal) !== Number(currVal)) {
            errors.push(`ID=${orig.id} 字段 ${field} 不匹配: 原始=${origVal}, 当前=${currVal}`);
          }
        } else if (String(origVal || '') !== String(currVal || '')) {
          errors.push(`ID=${orig.id} 字段 ${field} 不匹配: 原始=${origVal}, 当前=${currVal}`);
        }
      }
      
      // 比对 sku_attrs（JSON字段需要特殊处理）
      const origAttrs = typeof orig.sku_attrs === 'string' ? orig.sku_attrs : JSON.stringify(orig.sku_attrs);
      const currAttrs = typeof curr.sku_attrs === 'string' ? curr.sku_attrs : JSON.stringify(curr.sku_attrs);
      if (origAttrs !== currAttrs) {
        errors.push(`ID=${orig.id} 字段 sku_attrs 不匹配: 原始=${origAttrs}, 当前=${currAttrs}`);
      }
      
      // 统计 sku_code
      if (curr.sku_code && curr.sku_code !== '') {
        skuCodeStats.withSkuCode++;
      } else {
        skuCodeStats.withoutSkuCode++;
      }
    }
    
    // 6. 输出验证结果
    console.log('\n=== 验证结果 ===');
    
    if (errors.length > 0) {
      console.error(`❌ 发现 ${errors.length} 个字段不匹配:`);
      errors.slice(0, 10).forEach(e => console.error(`  - ${e}`));
      if (errors.length > 10) {
        console.error(`  ... 还有 ${errors.length - 10} 个错误`);
      }
      process.exit(1);
    }
    
    console.log('✅ 所有原有字段完整无损');
    console.log(`\nsku_code 字段统计:`);
    console.log(`  - 总记录数: ${skuCodeStats.total}`);
    console.log(`  - 有 sku_code: ${skuCodeStats.withSkuCode}`);
    console.log(`  - 无 sku_code: ${skuCodeStats.withoutSkuCode}`);
    
    // 7. 检查目标订单 O176595870590157928
    const [targetOrder] = await conn.query<any[]>(
      `SELECT oi.*, o.invite_code
       FROM order_items oi
       JOIN orders o ON o.order_no = oi.order_no
       WHERE o.order_no = 'O176595870590157928'`
    );
    
    if (targetOrder.length > 0) {
      console.log('\n=== 目标订单 O176595870590157928 验证 ===');
      targetOrder.forEach((item: any) => {
        console.log(`  - sku_id: ${item.sku_id}`);
        console.log(`  - sku_code: ${item.sku_code}`);
        console.log(`  - sku_title: ${item.sku_title}`);
        console.log(`  - quantity: ${item.quantity}`);
        console.log(`  - invite_code: ${item.invite_code}`);
      });
      
      if (targetOrder[0].sku_code) {
        console.log('✅ 目标订单已成功填充 sku_code');
      } else {
        console.error('❌ 目标订单 sku_code 仍为空');
      }
    }
    
    // 8. 生成验证报告
    const report = {
      timestamp: new Date().toISOString(),
      backupFile: files[0],
      originalCount: originalRecords.length,
      currentCount: currentRows.length,
      fieldsVerified: ['id', 'order_no', 'sku_id', 'sku_title', 'quantity', 'sale_price', 'total_price', 'sku_attrs'],
      errors: errors,
      skuCodeStats: skuCodeStats,
      targetOrderVerified: targetOrder.length > 0 && !!targetOrder[0].sku_code,
      status: errors.length === 0 ? 'SUCCESS' : 'FAILED',
    };
    
    const reportPath = path.resolve(backupsDir, `verify_migration_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n验证报告已保存到: ${reportPath}`);
    
    console.log('\n✅ 迁移验证完成!');
    
  } catch (err: any) {
    console.error(`\n❌ 验证失败: ${err.message}`);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();



















