/**
 * User Service - 用户服务
 * 
 * 使用 FileStore 实现，API 与原 MySQL 版本保持一致
 */

import { storage } from '../storage';

export interface User {
  id: number;
  openid: string;
  unionid: string | null;
  phone: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Find or create user by openid
 * Updates unionid if provided and differs from existing
 */
export async function findOrCreateUser(params: {
  openid: string;
  unionid?: string;
  nickname?: string;
  avatar_url?: string;
}): Promise<User> {
  const user = storage.users.findOrCreateUser(params);
  return {
    ...user,
    created_at: new Date(user.created_at),
    updated_at: new Date(user.updated_at),
  } as User;
}

export async function getUserById(userId: number): Promise<User | null> {
  const user = storage.users.getUserById(userId);
  if (!user) return null;
  return {
    ...user,
    created_at: new Date(user.created_at),
    updated_at: new Date(user.updated_at),
  } as User;
}

export async function getUserByOpenid(openid: string): Promise<User | null> {
  const user = storage.users.getUserByOpenid(openid);
  if (!user) return null;
  return {
    ...user,
    created_at: new Date(user.created_at),
    updated_at: new Date(user.updated_at),
  } as User;
}

/**
 * 通过身份标识（provider + openid）查找或创建用户
 * 支持 UnionID 自动合并（同一开放平台下多应用打通）
 */
export async function findOrCreateUserByIdentity(params: {
  provider: 'wechat_mp' | 'wechat_mini' | 'wechat_app' | 'phone';
  openid: string;
  unionid?: string;
  session_key?: string;
  nickname?: string;
  avatar_url?: string;
}): Promise<User> {
  const user = storage.users.findOrCreateUserByIdentity(params);
  return {
    ...user,
    created_at: new Date(user.created_at),
    updated_at: new Date(user.updated_at),
  } as User;
}

/**
 * 获取用户的小程序身份（包括 session_key，用于解密手机号等）
 */
export async function getMiniIdentity(userId: number): Promise<{ openid: string; session_key: string | null } | null> {
  return storage.users.getMiniIdentity(userId);
}
