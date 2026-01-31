/**
 * Properties Repository - 房源仓储
 * 
 * 提供房源数据的 CRUD 操作，API 返回结构与原 MySQL 版本保持一致
 */

import * as store from '../file_store';

export interface Property {
  id: number;
  // 基本信息
  auction_time?: string;
  bidding_phase?: string;
  community_name: string;
  detail_address?: string;
  building_area?: string;
  house_type?: string;
  floor_info?: string;
  building_year?: string;
  decoration_status?: string;
  property_status?: string;
  holding_years?: string;
  property_type?: string;
  // 价格信息
  starting_price?: string;
  starting_unit_price?: string;
  auction_platform?: string;
  auction_deposit?: string;
  price_increment?: string;
  evaluation_total_price?: string;
  evaluation_unit_price?: string;
  // 贷款信息
  loan_70_percent?: string;
  loan_80_percent?: string;
  loan_90_percent?: string;
  // 市场信息
  market_total_price?: string;
  market_unit_price?: string;
  school_district?: string;
  business_circle?: string;
  profit_space?: string;
  // 授权与税费
  auth_code?: string;
  deed_tax_rate?: string;
  deed_tax_amount?: string;
  vat_rate?: string;
  vat_amount?: string;
  income_tax_rate?: string;
  income_tax_amount?: string;
  // 客户信息
  customer_name?: string;
  customer_phone?: string;
  customer_survey_brief?: string;
  assigned_salesman?: string;
  unionID?: string;
  openID?: string;
  // 商城字段
  price_cent?: number;
  cover_url?: string;
  images?: string;
  description?: string;
  status?: number;
  is_featured?: number;
  sort_order?: number;
  stock?: number;
  module_config?: string | object;
  category_id?: number;
  // 时间戳
  created_at?: string;
  updated_at?: string;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  communityName?: string;
  customerPhone?: string;
  authCode?: string;
  startAt?: string;
  endAt?: string;
  keyword?: string;
  categoryId?: number;
  status?: number;
}

/**
 * 获取房源列表（分页）
 */
export function list(query: ListQuery): { total: number; properties: Property[] } {
  let rows = store.getTable<Property>('properties');
  
  // 筛选条件
  if (query.communityName) {
    const kw = query.communityName.toLowerCase();
    rows = rows.filter(r => r.community_name?.toLowerCase().includes(kw));
  }
  if (query.customerPhone) {
    const kw = query.customerPhone;
    rows = rows.filter(r => r.customer_phone?.includes(kw));
  }
  if (query.authCode) {
    const kw = query.authCode;
    rows = rows.filter(r => r.auth_code?.includes(kw));
  }
  if (query.startAt) {
    rows = rows.filter(r => r.created_at && r.created_at >= query.startAt!);
  }
  if (query.endAt) {
    rows = rows.filter(r => r.created_at && r.created_at <= query.endAt!);
  }
  if (query.keyword) {
    const kw = query.keyword.toLowerCase();
    rows = rows.filter(r => 
      r.community_name?.toLowerCase().includes(kw) ||
      r.detail_address?.toLowerCase().includes(kw)
    );
  }
  if (query.categoryId && query.categoryId > 0) {
    rows = rows.filter(r => r.category_id === query.categoryId);
  }
  if (query.status !== undefined) {
    rows = rows.filter(r => r.status === query.status);
  }
  
  const total = rows.length;
  
  // 排序：is_featured DESC, sort_order DESC, created_at DESC
  rows.sort((a, b) => {
    if ((b.is_featured || 0) !== (a.is_featured || 0)) {
      return (b.is_featured || 0) - (a.is_featured || 0);
    }
    if ((b.sort_order || 0) !== (a.sort_order || 0)) {
      return (b.sort_order || 0) - (a.sort_order || 0);
    }
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
  
  // 分页
  const page = query.page || 1;
  const pageSize = Math.min(query.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const paginated = rows.slice(offset, offset + pageSize);
  
  return { total, properties: paginated };
}

/**
 * 获取商城房源列表（只显示上架的）
 */
export function listMall(query: ListQuery): { total: number; list: any[] } {
  const result = list({ ...query, status: 1 });
  
  // 组装商品数据
  const listData = result.properties.map(row => ({
    id: row.id,
    title: `${row.community_name || ''} ${row.house_type || ''}`.trim() || '房源',
    community_name: row.community_name,
    subtitle: row.detail_address || '',
    price_cent: Number(row.price_cent || 0),
    cover_url: row.cover_url,
    building_area: row.building_area,
    floor_info: row.floor_info,
    house_type: row.house_type,
    starting_price: row.starting_price,
    evaluation_total_price: row.evaluation_total_price,
    school_district: row.school_district,
    business_circle: row.business_circle,
    auction_time: row.auction_time,
    bidding_phase: row.bidding_phase,
    profit_space: row.profit_space,
    stock: Number(row.stock || 1),
    is_featured: Number(row.is_featured || 0),
    created_at: row.created_at,
  }));
  
  return { total: result.total, list: listData };
}

/**
 * 根据 ID 获取房源
 */
export function findById(id: number): Property | null {
  return store.findById<Property>('properties', id);
}

/**
 * 获取商城房源详情（只返回上架的）
 */
export function findMallById(id: number): any | null {
  const row = store.findOne<Property>('properties', r => r.id === id && r.status === 1);
  if (!row) return null;
  
  // 处理 images 字段
  let images: string[] = [];
  if (row.images) {
    if (typeof row.images === 'string') {
      try {
        images = JSON.parse(row.images);
      } catch {
        images = row.images.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }
  
  // 处理 module_config
  let moduleConfig = {
    tabs: [
      { key: 'property', name: '房源', visible: true, order: 1 },
      { key: 'auction', name: '拍卖', visible: true, order: 2 },
      { key: 'loan', name: '金融', visible: true, order: 3 },
      { key: 'tax', name: '税费', visible: true, order: 4 }
    ]
  };
  if (row.module_config) {
    try {
      moduleConfig = typeof row.module_config === 'string' 
        ? JSON.parse(row.module_config) 
        : row.module_config;
    } catch {}
  }
  
  return {
    id: row.id,
    title: `${row.community_name || ''} ${row.house_type || ''}`.trim() || '房源',
    price_cent: Number(row.price_cent || 0),
    cover_url: row.cover_url,
    images,
    description: row.description,
    stock: Number(row.stock || 1),
    community_name: row.community_name,
    house_type: row.house_type,
    building_area: row.building_area,
    floor_info: row.floor_info,
    building_year: row.building_year,
    decoration_status: row.decoration_status,
    property_status: row.property_status,
    property_type: row.property_type,
    detail_address: row.detail_address,
    school_district: row.school_district,
    business_circle: row.business_circle,
    starting_price: row.starting_price,
    starting_unit_price: row.starting_unit_price,
    evaluation_total_price: row.evaluation_total_price,
    evaluation_unit_price: row.evaluation_unit_price,
    market_total_price: row.market_total_price,
    market_unit_price: row.market_unit_price,
    loan_70_percent: row.loan_70_percent,
    loan_80_percent: row.loan_80_percent,
    loan_90_percent: row.loan_90_percent,
    profit_space: row.profit_space,
    auction_time: row.auction_time,
    bidding_phase: row.bidding_phase,
    auction_platform: row.auction_platform,
    auction_deposit: row.auction_deposit,
    deed_tax_rate: row.deed_tax_rate,
    deed_tax_amount: row.deed_tax_amount,
    vat_rate: row.vat_rate,
    vat_amount: row.vat_amount,
    income_tax_rate: row.income_tax_rate,
    income_tax_amount: row.income_tax_amount,
    module_config: moduleConfig,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * 创建房源
 */
export function create(data: Partial<Property>): Property {
  return store.insert<Partial<Property>>('properties', {
    ...data,
    status: data.status ?? 0,
    is_featured: data.is_featured ?? 0,
    sort_order: data.sort_order ?? 0,
    stock: data.stock ?? 1,
    price_cent: data.price_cent ?? 0,
  }) as Property;
}

/**
 * 更新房源
 */
export function update(id: number, data: Partial<Property>): boolean {
  return store.update('properties', id, data);
}

/**
 * 删除房源
 */
export function remove(id: number): boolean {
  return store.remove('properties', id);
}

/**
 * 批量插入（用于导入）
 */
export function bulkInsert(rows: Partial<Property>[]): number {
  let count = 0;
  for (const row of rows) {
    create(row);
    count++;
  }
  store.flushNow();
  return count;
}

/**
 * 获取所有小区名称（用于自动补全）
 */
export function getCommunityNames(): string[] {
  const rows = store.getTable<Property>('properties');
  const names = new Set<string>();
  rows.forEach(r => {
    if (r.community_name) names.add(r.community_name);
  });
  return Array.from(names).sort();
}

/**
 * 根据分类 ID 检查是否有房源
 */
export function existsByCategoryId(categoryId: number): boolean {
  return store.findOne<Property>('properties', r => r.category_id === categoryId) !== null;
}
