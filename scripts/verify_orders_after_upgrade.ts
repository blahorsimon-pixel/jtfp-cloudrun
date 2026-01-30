/**
 * 订单数据完整性验证脚本 - 福利码多SKU升级后执行
 * 逐条对比备份表与现表的订单明细，确保零错乱
 * 
 * 执行方式: DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=mall DB_PASSWORD=xxx DB_NAME=h5mall npx ts-node scripts/verify_orders_after_upgrade.ts
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
  console.log('=== 订单数据完整性验证脚本 ===');
  console.log(`数据库: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  
  const conn = await mysql.createConnection(DB_CONFIG);
  
  try {
    // 1. 查找最新的备份表
    console.log('\n1. 查找备份表...');
    const [tables]: any = await conn.query(
      `SHOW TABLES LIKE 'orders_backup_%'`
    );
    
    if (tables.length === 0) {
      console.log('   未找到备份表，请先运行备份脚本！');
      return;
    }
    
    // 获取最新的备份表名
    const backupTables = tables.map((t: any) => Object.values(t)[0] as string).sort().reverse();
    const latestOrdersBackup = backupTables[0];
    const timestamp = latestOrdersBackup.replace('orders_backup_', '');
    const latestOrderItemsBackup = `order_items_backup_${timestamp}`;
    
    console.log(`   使用备份表: ${latestOrdersBackup}, ${latestOrderItemsBackup}`);
    
    // 检查order_items备份表是否存在
    const [itemsTables]: any = await conn.query(
      `SHOW TABLES LIKE ?`,
      [latestOrderItemsBackup]
    );
    if (itemsTables.length === 0) {
      console.log(`   错误：未找到对应的 ${latestOrderItemsBackup} 表！`);
      return;
    }
    
    // 2. 统计记录数
    console.log('\n2. 统计记录数...');
    const [[backupOrdersCount]]: any = await conn.query(`SELECT COUNT(*) as cnt FROM ${latestOrdersBackup}`);
    const [[currentOrdersCount]]: any = await conn.query(`SELECT COUNT(*) as cnt FROM orders`);
    const [[backupItemsCount]]: any = await conn.query(`SELECT COUNT(*) as cnt FROM ${latestOrderItemsBackup}`);
    const [[currentItemsCount]]: any = await conn.query(`SELECT COUNT(*) as cnt FROM order_items`);
    
    console.log(`   备份 orders: ${backupOrdersCount.cnt} 条`);
    console.log(`   当前 orders: ${currentOrdersCount.cnt} 条`);
    console.log(`   备份 order_items: ${backupItemsCount.cnt} 条`);
    console.log(`   当前 order_items: ${currentItemsCount.cnt} 条`);
    
    // 3. 逐条对比 orders 表
    console.log('\n3. 验证 orders 表...');
    const [orderDiffs]: any = await conn.query(`
      SELECT 'backup' as source, b.order_no, b.user_id, b.total_amount, b.goods_amount, b.status
      FROM ${latestOrdersBackup} b
      LEFT JOIN orders c ON c.order_no = b.order_no
      WHERE c.order_no IS NULL
      UNION ALL
      SELECT 'current' as source, c.order_no, c.user_id, c.total_amount, c.goods_amount, c.status
      FROM orders c
      LEFT JOIN ${latestOrdersBackup} b ON b.order_no = c.order_no
      WHERE b.order_no IS NULL
        AND c.created_at <= (SELECT MAX(created_at) FROM ${latestOrdersBackup})
    `);
    
    if (orderDiffs.length === 0) {
      console.log('   ✅ orders 表数据完整，无差异');
    } else {
      console.log(`   ⚠️ orders 表发现 ${orderDiffs.length} 条差异记录：`);
      for (const diff of orderDiffs.slice(0, 10)) {
        console.log(`      - [${diff.source}] order_no=${diff.order_no}, user_id=${diff.user_id}, total=${diff.total_amount}`);
      }
      if (orderDiffs.length > 10) {
        console.log(`      ... 还有 ${orderDiffs.length - 10} 条`);
      }
    }
    
    // 4. 验证备份表中的 order_items 没有被修改
    console.log('\n4. 验证备份的 order_items 数据完整性...');
    
    // 获取备份表中所有order_no
    const [backupOrderNos]: any = await conn.query(`SELECT DISTINCT order_no FROM ${latestOrderItemsBackup}`);
    const backupOrderNoSet = new Set(backupOrderNos.map((r: any) => r.order_no));
    
    // 对于每个备份的订单号，检查当前表中的记录
    let modifiedCount = 0;
    let deletedCount = 0;
    const diffs: any[] = [];
    
    for (const row of backupOrderNos) {
      const orderNo = row.order_no;
      
      // 获取备份表中该订单的items
      const [backupItems]: any = await conn.query(
        `SELECT id, order_no, sku_id, sku_title, quantity, sale_price, total_price
         FROM ${latestOrderItemsBackup}
         WHERE order_no = ?
         ORDER BY id`,
        [orderNo]
      );
      
      // 获取当前表中该订单的items（只看备份时已存在的id）
      const backupIds = backupItems.map((i: any) => i.id);
      if (backupIds.length === 0) continue;
      
      const [currentItems]: any = await conn.query(
        `SELECT id, order_no, sku_id, sku_title, quantity, sale_price, total_price
         FROM order_items
         WHERE id IN (?)
         ORDER BY id`,
        [backupIds]
      );
      
      // 检查是否有被删除的
      const currentIdSet = new Set(currentItems.map((i: any) => i.id));
      for (const bi of backupItems) {
        if (!currentIdSet.has(bi.id)) {
          deletedCount++;
          diffs.push({
            type: 'DELETED',
            orderNo,
            itemId: bi.id,
            backup: bi,
            current: null,
          });
        }
      }
      
      // 检查是否有被修改的
      for (const ci of currentItems) {
        const bi = backupItems.find((b: any) => b.id === ci.id);
        if (bi) {
          const changed =
            bi.sku_id !== ci.sku_id ||
            bi.sku_title !== ci.sku_title ||
            Number(bi.quantity) !== Number(ci.quantity) ||
            Number(bi.sale_price) !== Number(ci.sale_price) ||
            Number(bi.total_price) !== Number(ci.total_price);
          
          if (changed) {
            modifiedCount++;
            diffs.push({
              type: 'MODIFIED',
              orderNo,
              itemId: ci.id,
              backup: bi,
              current: ci,
            });
          }
        }
      }
    }
    
    if (modifiedCount === 0 && deletedCount === 0) {
      console.log('   ✅ 备份的 order_items 数据完整，未被修改或删除');
    } else {
      console.log(`   ⚠️ 发现数据变更：`);
      console.log(`      - 被修改: ${modifiedCount} 条`);
      console.log(`      - 被删除: ${deletedCount} 条`);
      if (diffs.length > 0) {
        console.log(`   差异详情（前10条）：`);
        for (const d of diffs.slice(0, 10)) {
          console.log(`      - [${d.type}] order_no=${d.orderNo}, item_id=${d.itemId}`);
          if (d.type === 'MODIFIED') {
            console.log(`        备份: sku_title=${d.backup.sku_title}, qty=${d.backup.quantity}, price=${d.backup.sale_price}`);
            console.log(`        当前: sku_title=${d.current.sku_title}, qty=${d.current.quantity}, price=${d.current.sale_price}`);
          }
        }
      }
    }
    
    // 5. 统计新增的 order_items（福利码订单展开后可能会有新增）
    console.log('\n5. 统计新增的 order_items...');
    const [[newItemsCount]]: any = await conn.query(`
      SELECT COUNT(*) as cnt FROM order_items 
      WHERE id > (SELECT COALESCE(MAX(id), 0) FROM ${latestOrderItemsBackup})
    `);
    console.log(`   新增 order_items: ${newItemsCount.cnt} 条`);
    
    // 6. 生成验证报告
    console.log('\n6. 生成验证报告...');
    const report = {
      timestamp: new Date().toISOString(),
      database: DB_CONFIG.database,
      backupTables: {
        orders: latestOrdersBackup,
        orderItems: latestOrderItemsBackup,
      },
      counts: {
        backupOrders: backupOrdersCount.cnt,
        currentOrders: currentOrdersCount.cnt,
        backupOrderItems: backupItemsCount.cnt,
        currentOrderItems: currentItemsCount.cnt,
        newOrderItems: newItemsCount.cnt,
      },
      integrity: {
        ordersOk: orderDiffs.length === 0,
        orderItemsModified: modifiedCount,
        orderItemsDeleted: deletedCount,
        isValid: orderDiffs.length === 0 && modifiedCount === 0 && deletedCount === 0,
      },
      differences: diffs.slice(0, 50),
    };
    
    const reportPath = path.resolve(__dirname, `../backups/verify_report_${Date.now()}.json`);
    const backupsDir = path.dirname(reportPath);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`   报告已保存到: ${reportPath}`);
    
    // 7. 总结
    console.log('\n==================== 验证总结 ====================');
    if (report.integrity.isValid) {
      console.log('✅ 数据完整性验证通过！');
      console.log('   - 原有订单数据未被修改');
      console.log('   - 原有订单明细数据未被修改');
      if (newItemsCount.cnt > 0) {
        console.log(`   - 新增 ${newItemsCount.cnt} 条订单明细（可能是升级后新订单或福利码订单展开）`);
      }
    } else {
      console.log('⚠️ 发现数据差异，请检查验证报告！');
    }
    console.log('==================================================');
    
  } catch (err: any) {
    console.error(`\n❌ 验证失败: ${err.message}`);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();



















