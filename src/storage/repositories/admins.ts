/**
 * Admins Repository - 管理员仓储
 */

import * as store from '../file_store';

export interface Admin {
  id: number;
  username: string;
  password: string;
  token?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 根据用户名获取管理员
 */
export function findByUsername(username: string): Admin | null {
  return store.findOne<Admin>('admins', r => r.username === username);
}

/**
 * 根据 token 获取管理员
 */
export function findByToken(token: string): Admin | null {
  return store.findOne<Admin>('admins', r => r.token === token);
}

/**
 * 验证管理员登录
 */
export function validateLogin(username: string, password: string): Admin | null {
  const admin = findByUsername(username);
  if (!admin) return null;
  if (admin.password !== password) return null;
  return admin;
}

/**
 * 更新管理员 token
 */
export function updateToken(id: number, token: string): boolean {
  return store.update('admins', id, { token });
}

/**
 * 创建管理员
 */
export function create(data: { username: string; password: string; token?: string }): Admin {
  return store.insert<Partial<Admin>>('admins', data) as Admin;
}

/**
 * 更新管理员密码
 */
export function updatePassword(id: number, password: string): boolean {
  return store.update('admins', id, { password });
}
