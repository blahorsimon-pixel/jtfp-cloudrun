#!/usr/bin/env ts-node

/**
 * 数据库迁移工具
 * 用于自动执行数据库字段修复脚本
 * 
 * 使用方法：
 * 1. 确保已设置环境变量（或使用 .env 文件）
 * 2. npm run migrate:diagnose  - 诊断缺失字段
 * 3. npm run migrate:fix       - 修复缺失字段
 * 4. 或直接运行：ts-node scripts/migrate_production_db.ts [diagnose|fix]
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 数据库配置
interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function getDbConfig(): DbConfig {
  // 优先使用微信云托管环境变量（自动注入，无需手动配置）
  if (process.env.MYSQL_ADDRESS) {
    const [host, port] = process.env.MYSQL_ADDRESS.split(':');
    return {
      host,
      port: parseInt(port || '3306'),
      user: process.env.MYSQL_USERNAME || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.DB_NAME || 'jtfp_property',
    };
  }

  // 使用标准环境变量（本地开发或传统部署）
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jtfp_property',
  };
}

async function executeSqlFile(sqlFilePath: string): Promise<void> {
  const config = getDbConfig();
  
  console.log('\n================================');
  console.log('📊 数据库迁移工具');
  console.log('================================');
  console.log(`🔌 连接到: ${config.host}:${config.port}`);
  console.log(`📁 数据库: ${config.database}`);
  console.log(`📄 脚本: ${sqlFilePath}`);
  console.log('================================\n');

  let connection;
  
  try {
    // 读取 SQL 文件
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');
    
    // 创建数据库连接
    connection = await createConnection({
      ...config,
      multipleStatements: true, // 允许多条 SQL 语句
    });

    console.log('✓ 数据库连接成功\n');

    // 执行 SQL
    console.log('⏳ 执行 SQL 脚本...\n');
    const [results] = await connection.query(sqlContent);
    
    // 显示结果
    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        if (result && typeof result === 'object') {
          // 美化输出结果集
          if (Array.isArray(result)) {
            console.log(`\n📋 结果集 ${index + 1}:`);
            console.table(result);
          }
        }
      });
    }

    console.log('\n✅ SQL 脚本执行成功！\n');

  } catch (error: any) {
    console.error('\n❌ 执行失败：', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql.substring(0, 200) + '...');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭\n');
    }
  }
}

async function diagnose(): Promise<void> {
  const sqlPath = join(__dirname, '../sql/diagnose_missing_fields.sql');
  console.log('🔍 开始诊断数据库字段...');
  await executeSqlFile(sqlPath);
}

async function fix(): Promise<void> {
  const sqlPath = join(__dirname, '../sql/fix_missing_fields.sql');
  console.log('🔧 开始修复数据库字段...');
  
  // 确认操作
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_MIGRATE) {
    console.log('\n⚠️  警告：检测到生产环境！');
    console.log('⚠️  此操作将修改数据库表结构。');
    console.log('⚠️  如需继续，请设置环境变量：FORCE_MIGRATE=true\n');
    process.exit(1);
  }
  
  await executeSqlFile(sqlPath);
  
  console.log('🎉 修复完成！建议执行以下操作：');
  console.log('1. 重启应用服务');
  console.log('2. 测试新建房源功能');
  console.log('3. 测试批量导入功能\n');
}

async function testConnection(): Promise<void> {
  const config = getDbConfig();
  
  console.log('\n================================');
  console.log('🔌 测试数据库连接');
  console.log('================================');
  console.log(`主机: ${config.host}:${config.port}`);
  console.log(`用户: ${config.user}`);
  console.log(`数据库: ${config.database}`);
  console.log('================================\n');

  let connection;
  
  try {
    connection = await createConnection(config);
    console.log('✅ 数据库连接成功！\n');
    
    // 测试查询
    const [result] = await connection.query('SELECT VERSION() as version, DATABASE() as db');
    console.log('📊 数据库信息:');
    console.table(result);
    
  } catch (error: any) {
    console.error('❌ 连接失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 主函数
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'diagnose':
    case 'check':
      await diagnose();
      break;
      
    case 'fix':
    case 'migrate':
      await fix();
      break;
      
    case 'test':
    case 'test-connection':
      await testConnection();
      break;
      
    default:
      console.log(`
📚 数据库迁移工具使用说明

用法：
  npm run migrate:diagnose   - 诊断缺失字段
  npm run migrate:fix        - 修复缺失字段
  npm run migrate:test       - 测试数据库连接

或直接运行：
  ts-node scripts/migrate_production_db.ts [command]

命令：
  diagnose, check          - 诊断数据库，检查缺失字段
  fix, migrate            - 执行修复脚本，添加缺失字段
  test, test-connection   - 测试数据库连接

环境变量：
  MYSQL_ADDRESS, MYSQL_USERNAME, MYSQL_PASSWORD (微信云托管，自动注入)
  或
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (本地开发)

生产环境保护：
  在生产环境执行 fix 命令时，需要设置：FORCE_MIGRATE=true
      `);
      process.exit(0);
  }
}

// 运行主函数
main().catch((error) => {
  console.error('❌ 未知错误:', error);
  process.exit(1);
});
