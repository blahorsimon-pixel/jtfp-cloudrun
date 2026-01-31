import http from 'http';
import { app } from './server';
import { config } from './config/index';
import { currentDriver, useFileStore, initStorage } from './storage';

/**
 * 数据库字段定义映射（仅 MySQL 模式使用）
 */
const FIELD_DEFINITIONS: Record<string, string> = {
  holding_years: "VARCHAR(50) COMMENT '持有年数'",
  price_cent: "INT DEFAULT 0 COMMENT '价格(分)'",
  cover_url: "VARCHAR(500) COMMENT '封面图URL'",
  images: "TEXT COMMENT '图片集合(JSON数组)'",
  description: "LONGTEXT COMMENT '富文本详情(HTML)'",
  status: "TINYINT DEFAULT 0 COMMENT '上架状态 0=下架 1=上架'",
  is_featured: "TINYINT DEFAULT 0 COMMENT '是否置顶推荐'",
  sort_order: "INT DEFAULT 0 COMMENT '排序值(越大越靠前)'",
  stock: "INT DEFAULT 1 COMMENT '库存数量'",
  module_config: "JSON DEFAULT NULL COMMENT '模块配置JSON'",
  category_id: "INT DEFAULT NULL COMMENT '分类ID'",
};

/**
 * 检查数据库表结构是否完整（仅 MySQL 模式）
 */
async function checkDatabaseSchema(): Promise<void> {
  // FileStore 模式：跳过 MySQL 检查
  if (useFileStore) {
    console.log('[Storage] FileStore 模式，跳过 MySQL schema 检查');
    return;
  }

  // MySQL 模式：执行原有的 schema 检查
  try {
    const { pool } = await import('./db/mysql');
    
    const requiredFields = [
      'holding_years',
      'price_cent',
      'cover_url',
      'description',
      'status',
      'is_featured',
      'sort_order',
      'stock',
      'images',
      'module_config',
      'category_id',
    ];

    const [columns] = await pool.query<any[]>(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'properties'`,
      [config.db.database]
    );

    const existingFields = new Set(columns.map((col: any) => col.COLUMN_NAME));
    const missingFields = requiredFields.filter(field => !existingFields.has(field));

    if (missingFields.length > 0) {
      console.warn('⚠️  检测到 properties 表缺失以下字段：');
      missingFields.forEach(field => console.warn(`   - ${field}`));
      
      if (config.isWxCloudRun) {
        console.log('🔧 云托管环境：自动修复缺失字段...');
        
        let successCount = 0;
        let failCount = 0;
        
        for (const field of missingFields) {
          try {
            const definition = FIELD_DEFINITIONS[field];
            if (!definition) {
              console.warn(`   ⚠️  跳过字段 ${field}：未定义字段定义`);
              failCount++;
              continue;
            }
            
            await pool.query(
              `ALTER TABLE properties ADD COLUMN IF NOT EXISTS \`${field}\` ${definition}`
            );
            
            console.log(`   ✓ 已添加字段: ${field}`);
            successCount++;
          } catch (error: any) {
            console.error(`   ✗ 添加字段 ${field} 失败:`, error.message);
            failCount++;
          }
        }
        
        if (failCount === 0) {
          console.log(`✓ 字段修复完成！成功添加 ${successCount} 个字段`);
        } else {
          console.warn(`⚠️  字段修复部分失败：成功 ${successCount} 个，失败 ${failCount} 个`);
        }
      } else {
        console.warn('⚠️  这可能导致房源保存和批量导入失败！');
        console.warn('⚠️  请运行数据库迁移脚本修复：');
        console.warn('   npm run migrate:diagnose  # 诊断问题');
        console.warn('   npm run migrate:fix       # 执行修复');
      }
    } else {
      console.log('✓ 数据库表结构检查通过');
    }
  } catch (error: any) {
    console.warn('⚠️  数据库表结构检查失败:', error.message);
  }
}

const server = http.createServer(app);

// 启动流程
async function start() {
  console.log('========================================');
  console.log(`存储驱动: ${currentDriver}`);
  console.log(`环境: ${config.env}`);
  console.log(`端口: ${config.port}`);
  console.log('========================================');

  // 初始化存储
  if (useFileStore) {
    initStorage();
    console.log('✓ FileStore 初始化完成');
  } else {
    await checkDatabaseSchema();
  }

  // 启动服务器
  server.listen(config.port, () => {
    console.log(`✓ H5 Mall server listening on http://0.0.0.0:${config.port}`);
    // PM2 cluster 模式：通知 ready 后才开始接流量
    if (typeof process.send === 'function') {
      process.send('ready');
    }
  });
}

start().catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
});
