/**
 * Categories Repository - 分类仓储
 */

import * as store from '../file_store';

export interface Category {
  id: number;
  name: string;
  icon?: string | null;
  sort_order: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * 获取所有分类
 */
export function list(): Category[] {
  const rows = store.getTable<Category>('categories');
  // 排序：sort_order DESC, id ASC
  return rows.sort((a, b) => {
    if (b.sort_order !== a.sort_order) {
      return b.sort_order - a.sort_order;
    }
    return a.id - b.id;
  });
}

/**
 * 获取启用的分类（用于商城前端）
 */
export function listEnabled(): Pick<Category, 'id' | 'name' | 'icon'>[] {
  const rows = store.findAll<Category>('categories', r => r.status === 1);
  return rows
    .sort((a, b) => {
      if (b.sort_order !== a.sort_order) {
        return b.sort_order - a.sort_order;
      }
      return a.id - b.id;
    })
    .map(r => ({ id: r.id, name: r.name, icon: r.icon }));
}

/**
 * 根据 ID 获取分类
 */
export function findById(id: number): Category | null {
  return store.findById<Category>('categories', id);
}

/**
 * 创建分类
 */
export function create(data: { name: string; icon?: string; sort_order?: number; status?: number }): Category {
  return store.insert<Partial<Category>>('categories', {
    name: data.name,
    icon: data.icon || null,
    sort_order: data.sort_order || 0,
    status: data.status ?? 1,
  }) as Category;
}

/**
 * 更新分类
 */
export function update(id: number, data: Partial<Category>): boolean {
  // 将 null 转换为 undefined
  const cleanData: Partial<Category> = { ...data };
  if (cleanData.icon === null) cleanData.icon = undefined;
  return store.update('categories', id, cleanData);
}

/**
 * 删除分类
 */
export function remove(id: number): boolean {
  return store.remove('categories', id);
}
