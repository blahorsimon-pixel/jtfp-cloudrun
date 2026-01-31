/**
 * Reviews Repository - 评论仓储
 */

import * as store from '../file_store';

export interface Review {
  id: number;
  product_id?: number;
  order_no?: string;
  user_id?: number;
  rating: number;
  content?: string;
  images?: string;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  productId?: number;
  userId?: number;
  status?: number;
}

/**
 * 获取评论列表
 */
export function list(query: ListQuery): { total: number; reviews: Review[] } {
  let rows = store.getTable<Review>('reviews');
  
  if (query.productId) {
    rows = rows.filter(r => r.product_id === query.productId);
  }
  if (query.userId) {
    rows = rows.filter(r => r.user_id === query.userId);
  }
  if (query.status !== undefined) {
    rows = rows.filter(r => r.status === query.status);
  }
  
  const total = rows.length;
  
  rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  
  const page = query.page || 1;
  const pageSize = Math.min(query.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const paginated = rows.slice(offset, offset + pageSize);
  
  return { total, reviews: paginated };
}

/**
 * 根据 ID 获取评论
 */
export function findById(id: number): Review | null {
  return store.findById<Review>('reviews', id);
}

/**
 * 创建评论
 */
export function create(data: Partial<Review>): Review {
  return store.insert<Partial<Review>>('reviews', {
    ...data,
    rating: data.rating ?? 5,
    status: data.status ?? 1,
  }) as Review;
}

/**
 * 更新评论
 */
export function update(id: number, data: Partial<Review>): boolean {
  return store.update('reviews', id, data);
}

/**
 * 删除评论
 */
export function remove(id: number): boolean {
  return store.remove('reviews', id);
}

/**
 * 获取商品平均评分
 */
export function getAverageRating(productId: number): number {
  const reviews = store.findAll<Review>('reviews', r => r.product_id === productId && r.status === 1);
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/**
 * 获取商品评论数
 */
export function getReviewCount(productId: number): number {
  return store.count<Review>('reviews', r => r.product_id === productId && r.status === 1);
}
