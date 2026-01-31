/**
 * Users Repository - 用户仓储
 * 
 * 实现用户和身份管理，与原 MySQL 版本接口保持一致
 */

import * as store from '../file_store';

export interface User {
  id: number;
  openid: string;
  unionid: string | null;
  phone: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserIdentity {
  id: number;
  user_id: number;
  provider: 'wechat_mp' | 'wechat_mini' | 'wechat_app' | 'phone';
  openid: string;
  unionid?: string | null;
  session_key?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * 通过 openid 查找或创建用户
 */
export function findOrCreateUser(params: {
  openid: string;
  unionid?: string;
  nickname?: string;
  avatar_url?: string;
}): User {
  // 查找现有用户
  let user = store.findOne<User>('users', r => r.openid === params.openid);
  
  if (user) {
    // 更新 unionid/nickname/avatar 如果提供且不同
    const updates: Partial<User> = {};
    if (params.unionid && params.unionid !== user.unionid) {
      updates.unionid = params.unionid;
    }
    if (params.nickname && params.nickname !== user.nickname) {
      updates.nickname = params.nickname;
    }
    if (params.avatar_url && params.avatar_url !== user.avatar_url) {
      updates.avatar_url = params.avatar_url;
    }
    
    if (Object.keys(updates).length > 0) {
      store.update('users', user.id, updates);
      user = { ...user, ...updates };
    }
    
    return user;
  }
  
  // 创建新用户
  return store.insert<Partial<User>>('users', {
    openid: params.openid,
    unionid: params.unionid || null,
    nickname: params.nickname || null,
    avatar_url: params.avatar_url || null,
    phone: null,
  }) as User;
}

/**
 * 通过身份标识查找或创建用户（支持 UnionID 合并）
 */
export function findOrCreateUserByIdentity(params: {
  provider: 'wechat_mp' | 'wechat_mini' | 'wechat_app' | 'phone';
  openid: string;
  unionid?: string;
  session_key?: string;
  nickname?: string;
  avatar_url?: string;
}): User {
  // 1. 先查 user_identities 是否已有该身份
  const identity = store.findOne<UserIdentity>('user_identities', 
    r => r.provider === params.provider && r.openid === params.openid
  );
  
  if (identity) {
    // 更新 session_key
    if (params.session_key) {
      store.update('user_identities', identity.id, { session_key: params.session_key });
    }
    const user = store.findById<User>('users', identity.user_id);
    if (user) return user;
  }
  
  // 2. 若有 UnionID，尝试通过 UnionID 找到已有用户
  let existingUserId: number | null = null;
  if (params.unionid) {
    const unionIdentity = store.findOne<UserIdentity>('user_identities', 
      r => r.unionid === params.unionid
    );
    if (unionIdentity) {
      existingUserId = unionIdentity.user_id;
    }
  }
  
  // 3. 若仍未找到，创建新用户
  if (!existingUserId) {
    const newUser = store.insert<Partial<User>>('users', {
      openid: params.openid,
      unionid: params.unionid || null,
      nickname: params.nickname || null,
      avatar_url: params.avatar_url || null,
      phone: null,
    }) as User;
    existingUserId = newUser.id;
  }
  
  // 4. 插入新身份记录
  const existingIdentity = store.findOne<UserIdentity>('user_identities',
    r => r.provider === params.provider && r.openid === params.openid
  );
  
  if (existingIdentity) {
    store.update('user_identities', existingIdentity.id, {
      session_key: params.session_key || existingIdentity.session_key,
      unionid: params.unionid || existingIdentity.unionid,
    });
  } else {
    store.insert<Partial<UserIdentity>>('user_identities', {
      user_id: existingUserId,
      provider: params.provider,
      openid: params.openid,
      unionid: params.unionid || null,
      session_key: params.session_key || null,
    });
  }
  
  store.flushNow();
  
  const user = store.findById<User>('users', existingUserId);
  if (!user) throw new Error('Failed to create user');
  return user;
}

/**
 * 通过 ID 获取用户
 */
export function getUserById(userId: number): User | null {
  return store.findById<User>('users', userId);
}

/**
 * 通过 openid 获取用户
 */
export function getUserByOpenid(openid: string): User | null {
  return store.findOne<User>('users', r => r.openid === openid);
}

/**
 * 获取用户的小程序身份
 */
export function getMiniIdentity(userId: number): { openid: string; session_key: string | null } | null {
  const identity = store.findOne<UserIdentity>('user_identities',
    r => r.user_id === userId && r.provider === 'wechat_mini'
  );
  if (!identity) return null;
  return { openid: identity.openid, session_key: identity.session_key || null };
}

/**
 * 更新用户信息
 */
export function updateUser(userId: number, data: Partial<User>): boolean {
  return store.update('users', userId, data);
}
