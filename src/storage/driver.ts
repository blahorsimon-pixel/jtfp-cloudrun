/**
 * Storage Driver - 存储驱动选择器
 * 
 * 根据环境变量 STORAGE_DRIVER 选择存储后端：
 * - file（默认）：使用本地 JSON 文件存储
 * - mysql：使用 MySQL 数据库（回滚用）
 */

import * as fileStore from './file_store';

// 驱动类型
export type StorageDriver = 'file' | 'mysql';

// 当前驱动
export const currentDriver: StorageDriver = 
  (process.env.STORAGE_DRIVER as StorageDriver) || 'file';

// 是否使用文件存储
export const useFileStore = currentDriver === 'file';

// 是否使用 MySQL
export const useMysql = currentDriver === 'mysql';

console.log(`[Storage] 使用存储驱动: ${currentDriver}`);

// 导出 FileStore（供各仓储使用）
export { fileStore };

// 初始化存储
export function initStorage(): void {
  if (useFileStore) {
    fileStore.initDefaultData();
  }
}
