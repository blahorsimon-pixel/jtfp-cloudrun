import http from 'http';
import { app } from './server';
import { config } from './config/index';

/**
 * 数据库字段定义映射
 * 用于自动修复缺失的字段
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
 * 检查数据库表结构是否完整
 * 用于在启动时诊断可能的数据库迁移问题
 * 
 * 在云托管环境下，如果检测到字段缺失，会自动执行修复
 */
async function checkDatabaseSchema(): Promise<void> {
  try {
    const { pool } = await import('./db/mysql');
    
    // 必需字段列表（如果缺失会导致写入失败）
    const requiredFields = [
      'holding_years',      // 基础房源字段
      'price_cent',         // 商城字段
      'cover_url',          // 商城字段
      'description',        // 商城字段
      'status',             // 商城字段
      'is_featured',        // 商城字段
      'sort_order',         // 商城字段
      'stock',              // 商城字段
      'images',             // 商城字段
      'module_config',      // 扩展字段
      'category_id',        // 扩展字段
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
      
      // 仅在云托管环境自动修复
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
            
            // 使用 IF NOT EXISTS 确保幂等性（MySQL 5.7.6+ 支持）
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
          console.warn('⚠️  请检查数据库权限或手动执行修复脚本：');
          console.warn('   sql/fix_missing_fields_simple.sql');
        }
      } else {
        // 本地环境：只警告，不自动修复
        console.warn('⚠️  这可能导致房源保存和批量导入失败！');
        console.warn('⚠️  请运行数据库迁移脚本修复：');
        console.warn('   npm run migrate:diagnose  # 诊断问题');
        console.warn('   npm run migrate:fix       # 执行修复');
        console.warn('');
      }
    } else {
      console.log('✓ 数据库表结构检查通过');
    }
  } catch (error: any) {
    console.warn('⚠️  数据库表结构检查失败:', error.message);
    console.warn('   如果是首次启动，请先执行数据库初始化脚本');
  }
}

const server = http.createServer(app);

// 在服务器启动前检查数据库表结构
checkDatabaseSchema().then(() => {
  server.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`H5 Mall server listening on http://0.0.0.0:${config.port}`);
    // PM2 cluster 模式：通知 ready 后才开始接流量（零停机 reload）
    if (typeof process.send === 'function') {
      process.send('ready');
    }
  });
}).catch((error) => {
  console.error('启动失败:', error);
  process.exit(1);
});

