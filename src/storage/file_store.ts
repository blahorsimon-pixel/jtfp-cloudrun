/**
 * FileStore - 基于本地 JSON 文件的轻量存储
 * 
 * 特点：
 * - 原子写入（先写 tmp 再 rename）
 * - 自增 ID 管理
 * - 简易事务支持
 * - 内存缓存 + 延迟落盘
 */

import fs from 'fs';
import path from 'path';

// 数据文件路径（云托管 /tmp 可写）
const DATA_FILE = process.env.FILE_STORE_PATH || '/tmp/jtfp_store.json';

// 数据结构定义
export interface StoreData {
  _meta: {
    nextIds: Record<string, number>;
    createdAt: string;
    updatedAt: string;
  };
  properties: Record<string, any>[];
  categories: Record<string, any>[];
  users: Record<string, any>[];
  user_identities: Record<string, any>[];
  orders: Record<string, any>[];
  order_items: Record<string, any>[];
  order_change_logs: Record<string, any>[];
  products: Record<string, any>[];
  product_skus: Record<string, any>[];
  reviews: Record<string, any>[];
  welfare_codes: Record<string, any>[];
  welfare_code_items: Record<string, any>[];
  admins: Record<string, any>[];
}

// 默认空数据
const DEFAULT_DATA: StoreData = {
  _meta: {
    nextIds: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  properties: [],
  categories: [],
  users: [],
  user_identities: [],
  orders: [],
  order_items: [],
  order_change_logs: [],
  products: [],
  product_skus: [],
  reviews: [],
  welfare_codes: [],
  welfare_code_items: [],
  admins: [],
};

// 内存中的数据缓存
let _cache: StoreData | null = null;
let _dirty = false;
let _flushTimer: NodeJS.Timeout | null = null;

// 延迟落盘时间（ms）
const FLUSH_DELAY = 100;

/**
 * 加载数据（从文件或创建默认）
 */
function loadData(): StoreData {
  if (_cache) return _cache;
  
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      _cache = JSON.parse(content);
      // 确保所有表都存在
      for (const key of Object.keys(DEFAULT_DATA)) {
        if (!(key in _cache!)) {
          (_cache as any)[key] = (DEFAULT_DATA as any)[key];
        }
      }
    } else {
      _cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
      saveDataSync();
    }
  } catch (e) {
    console.warn('[FileStore] 加载数据失败，使用默认空数据:', e);
    _cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  
  return _cache!;
}

/**
 * 同步保存数据（原子写入）
 */
function saveDataSync(): void {
  if (!_cache) return;
  
  _cache._meta.updatedAt = new Date().toISOString();
  
  const tmpFile = DATA_FILE + '.tmp';
  const dir = path.dirname(DATA_FILE);
  
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 原子写入：先写 tmp 再 rename
  fs.writeFileSync(tmpFile, JSON.stringify(_cache, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DATA_FILE);
  
  _dirty = false;
}

/**
 * 标记数据已修改，延迟落盘
 */
function markDirty(): void {
  _dirty = true;
  
  if (_flushTimer) {
    clearTimeout(_flushTimer);
  }
  
  _flushTimer = setTimeout(() => {
    if (_dirty) {
      saveDataSync();
    }
  }, FLUSH_DELAY);
}

/**
 * 立即落盘（用于事务提交等场景）
 */
export function flushNow(): void {
  if (_flushTimer) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  if (_dirty) {
    saveDataSync();
  }
}

/**
 * 获取下一个自增 ID
 */
export function nextId(table: string): number {
  const data = loadData();
  const current = data._meta.nextIds[table] || 1;
  data._meta.nextIds[table] = current + 1;
  markDirty();
  return current;
}

/**
 * 获取指定表的数据
 */
export function getTable<T = any>(table: keyof Omit<StoreData, '_meta'>): T[] {
  const data = loadData();
  return (data[table] as T[]) || [];
}

/**
 * 设置指定表的数据
 */
export function setTable<T = any>(table: keyof Omit<StoreData, '_meta'>, rows: T[]): void {
  const data = loadData();
  (data as any)[table] = rows;
  markDirty();
}

/**
 * 插入一条记录
 */
export function insert<T = any>(table: keyof Omit<StoreData, '_meta'>, row: T): T & { id: number } {
  const data = loadData();
  const id = nextId(table);
  const now = new Date().toISOString();
  const newRow = {
    ...row,
    id,
    created_at: (row as any).created_at || now,
    updated_at: (row as any).updated_at || now,
  };
  (data[table] as any[]).push(newRow);
  markDirty();
  return newRow as T & { id: number };
}

/**
 * 根据 ID 查找记录
 */
export function findById<T = any>(table: keyof Omit<StoreData, '_meta'>, id: number): T | null {
  const rows = getTable<T>(table);
  return rows.find((r: any) => r.id === id) || null;
}

/**
 * 根据条件查找记录
 */
export function findOne<T = any>(table: keyof Omit<StoreData, '_meta'>, predicate: (row: T) => boolean): T | null {
  const rows = getTable<T>(table);
  return rows.find(predicate) || null;
}

/**
 * 根据条件查找所有记录
 */
export function findAll<T = any>(table: keyof Omit<StoreData, '_meta'>, predicate?: (row: T) => boolean): T[] {
  const rows = getTable<T>(table);
  return predicate ? rows.filter(predicate) : rows;
}

/**
 * 更新记录
 */
export function update<T = any>(table: keyof Omit<StoreData, '_meta'>, id: number, updates: Partial<T>): boolean {
  const data = loadData();
  const rows = data[table] as any[];
  const index = rows.findIndex((r: any) => r.id === id);
  
  if (index === -1) return false;
  
  rows[index] = {
    ...rows[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  markDirty();
  return true;
}

/**
 * 根据条件更新记录
 */
export function updateWhere<T = any>(
  table: keyof Omit<StoreData, '_meta'>,
  predicate: (row: T) => boolean,
  updates: Partial<T>
): number {
  const data = loadData();
  const rows = data[table] as any[];
  let count = 0;
  
  for (let i = 0; i < rows.length; i++) {
    if (predicate(rows[i])) {
      rows[i] = {
        ...rows[i],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      count++;
    }
  }
  
  if (count > 0) markDirty();
  return count;
}

/**
 * 删除记录
 */
export function remove(table: keyof Omit<StoreData, '_meta'>, id: number): boolean {
  const data = loadData();
  const rows = data[table] as any[];
  const index = rows.findIndex((r: any) => r.id === id);
  
  if (index === -1) return false;
  
  rows.splice(index, 1);
  markDirty();
  return true;
}

/**
 * 根据条件删除记录
 */
export function removeWhere<T = any>(table: keyof Omit<StoreData, '_meta'>, predicate: (row: T) => boolean): number {
  const data = loadData();
  const rows = data[table] as any[];
  const originalLength = rows.length;
  
  (data as any)[table] = rows.filter((r: any) => !predicate(r));
  
  const removed = originalLength - (data[table] as any[]).length;
  if (removed > 0) markDirty();
  return removed;
}

/**
 * 计数
 */
export function count<T = any>(table: keyof Omit<StoreData, '_meta'>, predicate?: (row: T) => boolean): number {
  const rows = getTable<T>(table);
  return predicate ? rows.filter(predicate).length : rows.length;
}

/**
 * 简易事务支持
 * 在内存副本上执行，成功则提交，失败则回滚
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  // 创建快照
  const snapshot = JSON.stringify(_cache || loadData());
  
  try {
    const result = await fn();
    // 成功，立即落盘
    flushNow();
    return result;
  } catch (e) {
    // 失败，回滚到快照
    _cache = JSON.parse(snapshot);
    _dirty = false;
    throw e;
  }
}

/**
 * 清空所有数据（用于测试）
 */
export function clearAll(): void {
  _cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
  saveDataSync();
}

/**
 * 初始化默认数据（分类、管理员等）
 */
export function initDefaultData(): void {
  const data = loadData();
  
  // 初始化默认分类
  if (data.categories.length === 0) {
    const defaultCategories = [
      { name: '住宅', sort_order: 100, status: 1 },
      { name: '公寓', sort_order: 90, status: 1 },
      { name: '别墅', sort_order: 80, status: 1 },
      { name: '商铺', sort_order: 70, status: 1 },
      { name: '写字楼', sort_order: 60, status: 1 },
    ];
    defaultCategories.forEach(cat => insert('categories', cat));
  }
  
  // 初始化默认管理员
  if (data.admins.length === 0) {
    insert('admins', {
      username: 'admin',
      password: 'admin123',
      token: 'jintai_admin_2026',
    });
  }
  
  flushNow();
  console.log('[FileStore] 数据初始化完成，文件路径:', DATA_FILE);
}

// 导出数据文件路径（用于调试）
export const dataFilePath = DATA_FILE;
