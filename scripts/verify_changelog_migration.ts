/**
 * 订单变更日志升级后的验证脚本
 * 检查表结构并对比备份数据，确保升级过程中没有数据损坏
 * 
 * 执行方式: npx ts-node scripts/verify_changelog_migration.ts [备份文件路径]
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
  user: 'mall',
  password: 'V8JxsSWtR076t625j1NA',
  database: 'h5mall',
};

async function main() {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error('请提供备份文件路径作为参数');
    process.exit(1);
  }

  console.log('=== 订单变更日志升级后验证脚本 ===');
  console.log(`备份文件: ${backupFile}`);
  
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const conn = await mysql.createConnection(DB_CONFIG);
  
  try {
    // 1. 验证表结构
    console.log('\n正在验证表结构...');
    const [tables] = await conn.query<any[]>('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    if (!tableNames.includes('order_change_log')) {
      throw new Error('缺失 order_change_log 表');
    }
    console.log('✅ order_change_log 表存在');
    
    const [itemCols] = await conn.query<any[]>('DESCRIBE order_items');
    if (!itemCols.some(c => c.Field === 'updated_at')) {
      throw new Error('order_items 表缺失 updated_at 字段');
    }
    console.log('✅ order_items.updated_at 字段存在');

    // 2. 验证 orders 数据完整性
    console.log('\n正在验证 orders 数据完整性...');
    const [[ordersCountResult]] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM orders');
    const currentOrdersCount = Number(ordersCountResult.cnt);
    
    if (currentOrdersCount !== backupData.counts.orders) {
      throw new Error(`orders 记录数不匹配! 备份: ${backupData.counts.orders}, 当前: ${currentOrdersCount}`);
    }
    console.log(`✅ orders 记录数匹配: ${currentOrdersCount}`);

    // 3. 验证 order_items 数据完整性
    console.log('\n正在验证 order_items 数据完整性...');
    const [[itemsCountResult]] = await conn.query<any[]>('SELECT COUNT(*) as cnt FROM order_items');
    const currentItemsCount = Number(itemsCountResult.cnt);
    
    if (currentItemsCount !== backupData.counts.items) {
      throw new Error(`order_items 记录数不匹配! 备份: ${backupData.counts.items}, 当前: ${currentItemsCount}`);
    }
    console.log(`✅ order_items 记录数匹配: ${currentItemsCount}`);

    // 4. 抽样验证数据细节
    console.log('\n正在抽样验证数据细节...');
    const [currentItems] = await conn.query<any[]>('SELECT * FROM order_items ORDER BY id ASC LIMIT 100');
    const backupItems = backupData.items.slice(0, 100);
    
    let mismatchCount = 0;
    for (let i = 0; i < Math.min(currentItems.length, backupItems.length); i++) {
      const cur = currentItems[i];
      const bak = backupItems[i];
      
      if (cur.id !== bak.id || cur.order_no !== bak.order_no || cur.sku_id !== bak.sku_id) {
        mismatchCount++;
        console.error(`不匹配: ID=${cur.id}`);
      }
    }
    
    if (mismatchCount > 0) {
      throw new Error(`抽样校验失败! 有 ${mismatchCount} 条记录不匹配`);
    }
    console.log('✅ 抽样校验通过');
    
    console.log('\n✅ 所有验证通过！数据完整性良好。');
    
  } catch (err: any) {
    console.error(`\n❌ 验证失败: ${err.message}`);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();



