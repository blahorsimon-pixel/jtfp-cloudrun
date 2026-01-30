import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 确保 data 目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'fl.db');
const db = new Database(dbPath);

// 启用 WAL 模式提升性能
db.pragma('journal_mode = WAL');

// 初始化表结构
export function initDB() {
  // 福利码表
  db.exec(`
    CREATE TABLE IF NOT EXISTS fl_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone CHAR(11) NOT NULL UNIQUE,
      code CHAR(6) NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS fl_config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // 预置默认配置
  const defaultConfigs = [
    { key: 'success_msg', value: '恭喜您，领取成功！' },
    { key: 'fail_msg', value: '抱歉，未找到您的福利码，请确认手机号是否正确。' },
    { key: 'usage_tip', value: '请在有效期内使用此码，复制码到指定页面兑换即可。' },
    { key: 'admin_password', value: 'admin123' },
    { key: 'page_title', value: '福利码领取' },
  ];

  const insertConfig = db.prepare(
    'INSERT OR IGNORE INTO fl_config (key, value) VALUES (?, ?)'
  );

  for (const config of defaultConfigs) {
    insertConfig.run(config.key, config.value);
  }

  console.log('Database initialized successfully');
}

// ==================== 福利码操作 ====================

export interface FlCode {
  id: number;
  phone: string;
  code: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// 根据手机号查询码
export function getCodeByPhone(phone: string): FlCode | undefined {
  return db.prepare('SELECT * FROM fl_codes WHERE phone = ?').get(phone) as FlCode | undefined;
}

// 获取所有码（分页）
export function getAllCodes(page: number = 1, pageSize: number = 20): { data: FlCode[]; total: number } {
  const offset = (page - 1) * pageSize;
  const data = db.prepare('SELECT * FROM fl_codes ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, offset) as FlCode[];
  const total = (db.prepare('SELECT COUNT(*) as count FROM fl_codes').get() as { count: number }).count;
  return { data, total };
}

// 搜索码
export function searchCodes(keyword: string, page: number = 1, pageSize: number = 20): { data: FlCode[]; total: number } {
  const offset = (page - 1) * pageSize;
  const like = `%${keyword}%`;
  const data = db.prepare(
    'SELECT * FROM fl_codes WHERE phone LIKE ? OR code LIKE ? OR note LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?'
  ).all(like, like, like, pageSize, offset) as FlCode[];
  const total = (db.prepare(
    'SELECT COUNT(*) as count FROM fl_codes WHERE phone LIKE ? OR code LIKE ? OR note LIKE ?'
  ).get(like, like, like) as { count: number }).count;
  return { data, total };
}

// 添加单个码
export function addCode(phone: string, code: string, note?: string): { success: boolean; message: string; id?: number } {
  try {
    const result = db.prepare(
      'INSERT INTO fl_codes (phone, code, note) VALUES (?, ?, ?)'
    ).run(phone, code, note || null);
    return { success: true, message: '添加成功', id: result.lastInsertRowid as number };
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, message: '该手机号已存在' };
    }
    return { success: false, message: e.message || '添加失败' };
  }
}

// 批量添加码
export function addCodesBatch(codes: Array<{ phone: string; code: string; note?: string }>): { 
  success: number; 
  failed: number; 
  errors: string[] 
} {
  const insert = db.prepare('INSERT INTO fl_codes (phone, code, note) VALUES (?, ?, ?)');
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  const transaction = db.transaction(() => {
    for (const item of codes) {
      try {
        insert.run(item.phone, item.code, item.note || null);
        success++;
      } catch (e: any) {
        failed++;
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          errors.push(`手机号 ${item.phone} 已存在`);
        } else {
          errors.push(`手机号 ${item.phone}: ${e.message}`);
        }
      }
    }
  });

  transaction();
  return { success, failed, errors };
}

// 更新码
export function updateCode(id: number, phone: string, code: string, note?: string): { success: boolean; message: string } {
  try {
    const result = db.prepare(
      'UPDATE fl_codes SET phone = ?, code = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(phone, code, note || null, id);
    if (result.changes === 0) {
      return { success: false, message: '记录不存在' };
    }
    return { success: true, message: '更新成功' };
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, message: '该手机号已存在' };
    }
    return { success: false, message: e.message || '更新失败' };
  }
}

// 删除码
export function deleteCode(id: number): { success: boolean; message: string } {
  const result = db.prepare('DELETE FROM fl_codes WHERE id = ?').run(id);
  if (result.changes === 0) {
    return { success: false, message: '记录不存在' };
  }
  return { success: true, message: '删除成功' };
}

// 清空所有码
export function clearAllCodes(): { success: boolean; message: string } {
  db.prepare('DELETE FROM fl_codes').run();
  return { success: true, message: '已清空所有数据' };
}

// ==================== 配置操作 ====================

// 获取配置
export function getConfig(key: string): string | null {
  const row = db.prepare('SELECT value FROM fl_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

// 获取所有配置
export function getAllConfig(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM fl_config').all() as Array<{ key: string; value: string }>;
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

// 设置配置
export function setConfig(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO fl_config (key, value) VALUES (?, ?)').run(key, value);
}

// 批量设置配置
export function setConfigs(configs: Record<string, string>): void {
  const insert = db.prepare('INSERT OR REPLACE INTO fl_config (key, value) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(configs)) {
      insert.run(key, value);
    }
  });
  transaction();
}

