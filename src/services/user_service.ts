import { pool } from '../db/mysql';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

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
  const conn = await pool.getConnection();
  try {
    // Try to find existing user
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE openid = ? LIMIT 1',
      [params.openid]
    );

    if (rows.length > 0) {
      const user = rows[0] as User;
      
      // Update unionid/nickname/avatar if provided and different
      const updates: string[] = [];
      const values: any[] = [];
      
      if (params.unionid && params.unionid !== user.unionid) {
        updates.push('unionid = ?');
        values.push(params.unionid);
      }
      if (params.nickname && params.nickname !== user.nickname) {
        updates.push('nickname = ?');
        values.push(params.nickname);
      }
      if (params.avatar_url && params.avatar_url !== user.avatar_url) {
        updates.push('avatar_url = ?');
        values.push(params.avatar_url);
      }
      
      if (updates.length > 0) {
        values.push(user.id);
        await conn.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }
      
      return user;
    }

    // Create new user
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO users (openid, unionid, nickname, avatar_url) VALUES (?, ?, ?, ?)`,
      [params.openid, params.unionid || null, params.nickname || null, params.avatar_url || null]
    );

    const [newRows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return newRows[0] as User;
  } finally {
    conn.release();
  }
}

export async function getUserById(userId: number): Promise<User | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows.length > 0 ? (rows[0] as User) : null;
}

export async function getUserByOpenid(openid: string): Promise<User | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM users WHERE openid = ? LIMIT 1',
    [openid]
  );
  return rows.length > 0 ? (rows[0] as User) : null;
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
  const conn = await pool.getConnection();
  try {
    // 1. 先查 user_identities 是否已有该身份
    const [identityRows] = await conn.query<RowDataPacket[]>(
      'SELECT user_id FROM user_identities WHERE provider = ? AND openid = ? LIMIT 1',
      [params.provider, params.openid]
    );
    if (identityRows.length > 0) {
      const userId = identityRows[0].user_id;
      // 更新 session_key（如果有）
      if (params.session_key) {
        await conn.query(
          'UPDATE user_identities SET session_key = ? WHERE provider = ? AND openid = ?',
          [params.session_key, params.provider, params.openid]
        );
      }
      const user = await getUserById(userId);
      if (user) return user;
    }    // 2. 若有 UnionID，尝试通过 UnionID 找到已有用户（跨应用合并）
    let existingUserId: number | null = null;
    if (params.unionid) {
      const [unionRows] = await conn.query<RowDataPacket[]>(
        'SELECT user_id FROM user_identities WHERE unionid = ? LIMIT 1',
        [params.unionid]
      );
      if (unionRows.length > 0) {
        existingUserId = unionRows[0].user_id;
      }
    }    // 3. 若仍未找到，创建新用户
    if (!existingUserId) {
      const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO users (openid, unionid, nickname, avatar_url) VALUES (?, ?, ?, ?)',
        [params.openid, params.unionid || null, params.nickname || null, params.avatar_url || null]
      );
      existingUserId = result.insertId;
    }    // 4. 插入新身份记录（绑定到用户）
    await conn.query(
      `INSERT INTO user_identities (user_id, provider, openid, unionid, session_key)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE session_key = VALUES(session_key), unionid = COALESCE(VALUES(unionid), unionid)`,
      [existingUserId, params.provider, params.openid, params.unionid || null, params.session_key || null]
    );    const user = await getUserById(existingUserId);
    if (!user) throw new Error('Failed to create user');
    return user;
  } finally {
    conn.release();
  }
}/**
 * 获取用户的小程序身份（包括 session_key，用于解密手机号等）
 */
export async function getMiniIdentity(userId: number): Promise<{ openid: string; session_key: string | null } | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT openid, session_key FROM user_identities WHERE user_id = ? AND provider = ? LIMIT 1',
    [userId, 'wechat_mini']
  );
  if (rows.length === 0) return null;
  return { openid: rows[0].openid, session_key: rows[0].session_key };
}