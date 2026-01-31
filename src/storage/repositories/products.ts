/**
 * Products Repository - 商品仓储
 */

import * as store from '../file_store';

export interface Product {
  id: number;
  title: string;
  subtitle?: string;
  cover_url?: string;
  images?: string;
  description?: string;
  price_cent: number;
  original_price_cent?: number;
  status: number;
  is_featured: number;
  sort_order: number;
  stock: number;
  sales: number;
  category_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductSku {
  id: number;
  product_id: number;
  sku_code: string;
  title: string;
  cover_url?: string;
  spec?: string;
  price_cent: number;
  original_price_cent?: number;
  stock: number;
  status: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: number;
  status?: number;
}

/**
 * 获取商品列表
 */
export function list(query: ListQuery): { total: number; products: Product[] } {
  let rows = store.getTable<Product>('products');
  
  if (query.keyword) {
    const kw = query.keyword.toLowerCase();
    rows = rows.filter(r => r.title?.toLowerCase().includes(kw));
  }
  if (query.categoryId && query.categoryId > 0) {
    rows = rows.filter(r => r.category_id === query.categoryId);
  }
  if (query.status !== undefined) {
    rows = rows.filter(r => r.status === query.status);
  }
  
  const total = rows.length;
  
  rows.sort((a, b) => {
    if (b.is_featured !== a.is_featured) return b.is_featured - a.is_featured;
    if (b.sort_order !== a.sort_order) return b.sort_order - a.sort_order;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
  
  const page = query.page || 1;
  const pageSize = Math.min(query.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const paginated = rows.slice(offset, offset + pageSize);
  
  return { total, products: paginated };
}

/**
 * 获取上架商品列表（商城前端）
 */
export function listEnabled(query: ListQuery): { total: number; list: Product[] } {
  const result = list({ ...query, status: 1 });
  return { total: result.total, list: result.products };
}

/**
 * 根据 ID 获取商品
 */
export function findById(id: number): Product | null {
  return store.findById<Product>('products', id);
}

/**
 * 创建商品
 */
export function create(data: Partial<Product>): Product {
  return store.insert<Partial<Product>>('products', {
    ...data,
    status: data.status ?? 0,
    is_featured: data.is_featured ?? 0,
    sort_order: data.sort_order ?? 0,
    stock: data.stock ?? 0,
    sales: data.sales ?? 0,
    price_cent: data.price_cent ?? 0,
  }) as Product;
}

/**
 * 更新商品
 */
export function update(id: number, data: Partial<Product>): boolean {
  return store.update('products', id, data);
}

/**
 * 删除商品
 */
export function remove(id: number): boolean {
  // 同时删除 SKU
  store.removeWhere<ProductSku>('product_skus', r => r.product_id === id);
  return store.remove('products', id);
}

/**
 * 获取商品 SKU 列表
 */
export function getSkus(productId: number): ProductSku[] {
  return store.findAll<ProductSku>('product_skus', r => r.product_id === productId)
    .sort((a, b) => b.sort_order - a.sort_order);
}

/**
 * 根据 SKU ID 获取 SKU
 */
export function findSkuById(skuId: number): ProductSku | null {
  return store.findById<ProductSku>('product_skus', skuId);
}

/**
 * 根据 SKU Code 获取 SKU
 */
export function findSkuByCode(skuCode: string): ProductSku | null {
  return store.findOne<ProductSku>('product_skus', r => r.sku_code === skuCode);
}

/**
 * 添加 SKU
 */
export function addSku(data: Partial<ProductSku>): ProductSku {
  return store.insert<Partial<ProductSku>>('product_skus', {
    ...data,
    status: data.status ?? 1,
    sort_order: data.sort_order ?? 0,
    stock: data.stock ?? 0,
    price_cent: data.price_cent ?? 0,
  }) as ProductSku;
}

/**
 * 更新 SKU
 */
export function updateSku(skuId: number, data: Partial<ProductSku>): boolean {
  return store.update('product_skus', skuId, data);
}

/**
 * 删除 SKU
 */
export function removeSku(skuId: number): boolean {
  return store.remove('product_skus', skuId);
}

/**
 * 扣减库存
 */
export function decreaseStock(skuId: number, quantity: number): boolean {
  const sku = findSkuById(skuId);
  if (!sku || sku.stock < quantity) return false;
  return store.update('product_skus', skuId, { stock: sku.stock - quantity });
}

/**
 * 恢复库存
 */
export function increaseStock(skuId: number, quantity: number): boolean {
  const sku = findSkuById(skuId);
  if (!sku) return false;
  return store.update('product_skus', skuId, { stock: sku.stock + quantity });
}
