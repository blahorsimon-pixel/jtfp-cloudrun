/**
 * WelfareCodes Repository - 福利码仓储
 */

import * as store from '../file_store';

export interface WelfareCode {
  id: number;
  code: string;
  name: string;
  description?: string;
  type: string;
  discount_type?: string;
  discount_value?: number;
  min_amount?: number;
  max_discount?: number;
  valid_from?: string;
  valid_to?: string;
  total_count: number;
  used_count: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface WelfareCodeItem {
  id: number;
  welfare_code_id: number;
  sku_code?: string;
  sku_title?: string;
  quantity?: number;
  created_at?: string;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: number;
  type?: string;
}

/**
 * 获取福利码列表
 */
export function list(query: ListQuery): { total: number; codes: WelfareCode[] } {
  let rows = store.getTable<WelfareCode>('welfare_codes');
  
  if (query.keyword) {
    const kw = query.keyword.toLowerCase();
    rows = rows.filter(r => 
      r.code?.toLowerCase().includes(kw) ||
      r.name?.toLowerCase().includes(kw)
    );
  }
  if (query.status !== undefined) {
    rows = rows.filter(r => r.status === query.status);
  }
  if (query.type) {
    rows = rows.filter(r => r.type === query.type);
  }
  
  const total = rows.length;
  
  rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  
  const page = query.page || 1;
  const pageSize = Math.min(query.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const paginated = rows.slice(offset, offset + pageSize);
  
  // 附加 SKU 信息
  const items = store.getTable<WelfareCodeItem>('welfare_code_items');
  const codesWithItems = paginated.map(wc => {
    const codeItems = items.filter(i => i.welfare_code_id === wc.id);
    return {
      ...wc,
      sku_codes: codeItems.map(i => i.sku_code).filter(Boolean).join(', '),
      sku_titles: codeItems.map(i => i.sku_title).filter(Boolean).join(', '),
    };
  });
  
  return { total, codes: codesWithItems as any };
}

/**
 * 根据 ID 获取福利码
 */
export function findById(id: number): WelfareCode | null {
  return store.findById<WelfareCode>('welfare_codes', id);
}

/**
 * 根据 code 获取福利码
 */
export function findByCode(code: string): WelfareCode | null {
  return store.findOne<WelfareCode>('welfare_codes', r => r.code === code);
}

/**
 * 创建福利码
 */
export function create(data: Partial<WelfareCode>): WelfareCode {
  return store.insert<Partial<WelfareCode>>('welfare_codes', {
    ...data,
    total_count: data.total_count ?? 0,
    used_count: data.used_count ?? 0,
    status: data.status ?? 1,
  }) as WelfareCode;
}

/**
 * 更新福利码
 */
export function update(id: number, data: Partial<WelfareCode>): boolean {
  return store.update('welfare_codes', id, data);
}

/**
 * 删除福利码
 */
export function remove(id: number): boolean {
  store.removeWhere<WelfareCodeItem>('welfare_code_items', r => r.welfare_code_id === id);
  return store.remove('welfare_codes', id);
}

/**
 * 使用福利码（增加使用计数）
 */
export function useCode(code: string): boolean {
  const wc = findByCode(code);
  if (!wc) return false;
  if (wc.used_count >= wc.total_count) return false;
  return store.update('welfare_codes', wc.id, { used_count: wc.used_count + 1 });
}

/**
 * 获取福利码关联的 SKU
 */
export function getItems(welfareCodeId: number): WelfareCodeItem[] {
  return store.findAll<WelfareCodeItem>('welfare_code_items', r => r.welfare_code_id === welfareCodeId);
}

/**
 * 添加福利码关联 SKU
 */
export function addItem(data: Partial<WelfareCodeItem>): WelfareCodeItem {
  return store.insert<Partial<WelfareCodeItem>>('welfare_code_items', data) as WelfareCodeItem;
}

/**
 * 删除福利码关联 SKU
 */
export function removeItem(id: number): boolean {
  return store.remove('welfare_code_items', id);
}

/**
 * 验证福利码是否可用
 */
export function validateCode(code: string): { valid: boolean; message?: string; welfareCode?: WelfareCode } {
  const wc = findByCode(code);
  
  if (!wc) {
    return { valid: false, message: '福利码不存在' };
  }
  
  if (wc.status !== 1) {
    return { valid: false, message: '福利码已禁用' };
  }
  
  if (wc.used_count >= wc.total_count) {
    return { valid: false, message: '福利码已用完' };
  }
  
  const now = new Date().toISOString();
  if (wc.valid_from && now < wc.valid_from) {
    return { valid: false, message: '福利码尚未生效' };
  }
  if (wc.valid_to && now > wc.valid_to) {
    return { valid: false, message: '福利码已过期' };
  }
  
  return { valid: true, welfareCode: wc };
}
