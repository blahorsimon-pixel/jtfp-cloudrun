/**
 * 福利码数据迁移脚本 - 将旧福利码迁移到多SKU模式
 * 
 * 核心原则：旧福利码原有字段全部保持不变，只做增量操作
 * - code, price_cent, note, status, consumed_order_no, consumed_at: 不动
 * - 新增：为每个旧福利码在welfare_code_items表新增一条关联记录
 * - 新增：为welfare_codes表的original_price_cent字段赋值（= 现有price_cent）
 * 
 * 执行方式: DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=mall DB_PASSWORD=xxx DB_NAME=h5mall npx ts-node scripts/migrate_welfare_codes_to_multi_sku.ts
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'mall',
  password: process.env.DB_PASSWORD || 'V8JxsSWtR076t625j1NA',
  database: process.env.DB_NAME || 'h5mall',
};

// 默认SKU配置（用于旧福利码迁移）
const DEFAULT_SKU_CODE = 'WELFARE_DEFAULT';
const DEFAULT_SKU_TITLE = '福利商品（默认）';

async function main() {
  console.log('=== 福利码数据迁移脚本 ===');
  console.log(`数据库: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);

  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. 检查是否存在默认SKU，如果不存在则创建
    console.log('\n1. 检查/创建默认SKU...');
    const [skuRows]: any = await conn.query(
      `SELECT id, sku_code FROM sku_library WHERE sku_code = ? LIMIT 1`,
      [DEFAULT_SKU_CODE]
    );
    
    let defaultSkuLibraryId: number;
    if (skuRows.length === 0) {
      // 创建默认SKU
      const [insertResult]: any = await conn.query(
        `INSERT INTO sku_library (sku_code, sku_title, attrs_text, price_cent, status, cover_url)
         VALUES (?, ?, '福利码默认商品', 0, 1, NULL)`,
        [DEFAULT_SKU_CODE, DEFAULT_SKU_TITLE]
      );
      defaultSkuLibraryId = insertResult.insertId;
      console.log(`   已创建默认SKU: id=${defaultSkuLibraryId}, code=${DEFAULT_SKU_CODE}`);
    } else {
      defaultSkuLibraryId = skuRows[0].id;
      console.log(`   默认SKU已存在: id=${defaultSkuLibraryId}, code=${DEFAULT_SKU_CODE}`);
    }

    // 2. 查询所有需要迁移的福利码（没有关联welfare_code_items的）
    console.log('\n2. 查询需要迁移的福利码...');
    const [wcRows]: any = await conn.query(
      `SELECT wc.id, wc.code, wc.price_cent, wc.original_price_cent
       FROM welfare_codes wc
       LEFT JOIN welfare_code_items wci ON wci.welfare_code_id = wc.id
       WHERE wci.id IS NULL`
    );
    console.log(`   找到 ${wcRows.length} 条需要迁移的福利码`);

    if (wcRows.length === 0) {
      console.log('\n✅ 无需迁移，所有福利码已有关联SKU');
      return;
    }

    // 3. 开始迁移
    console.log('\n3. 开始迁移...');
    await conn.beginTransaction();

    let migratedCount = 0;
    let updatedOriginalPrice = 0;

    for (const wc of wcRows) {
      const wcId = wc.id;
      const priceCent = Number(wc.price_cent || 0);
      const existingOriginalPrice = Number(wc.original_price_cent || 0);

      // 3.1 插入welfare_code_items记录（关联到默认SKU）
      await conn.query(
        `INSERT INTO welfare_code_items (welfare_code_id, sku_library_id, sku_code, sku_title, quantity, price_cent)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [wcId, defaultSkuLibraryId, DEFAULT_SKU_CODE, DEFAULT_SKU_TITLE, priceCent]
      );
      migratedCount++;

      // 3.2 更新original_price_cent（仅当为0或NULL时）
      if (existingOriginalPrice === 0) {
        await conn.query(
          `UPDATE welfare_codes SET original_price_cent = ? WHERE id = ?`,
          [priceCent, wcId]
        );
        updatedOriginalPrice++;
      }
    }

    await conn.commit();

    console.log(`\n✅ 迁移完成!`);
    console.log(`   - 新增 welfare_code_items 记录: ${migratedCount} 条`);
    console.log(`   - 更新 original_price_cent 字段: ${updatedOriginalPrice} 条`);
    console.log(`\n旧福利码的以下字段保持不变：code, price_cent, note, status, consumed_order_no, consumed_at`);

  } catch (err: any) {
    await conn.rollback();
    console.error(`\n❌ 迁移失败: ${err.message}`);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();



















