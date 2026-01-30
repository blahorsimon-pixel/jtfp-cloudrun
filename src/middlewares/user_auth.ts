import type { Request, Response, NextFunction } from 'express';
import { extractJwtFromReq } from '../utils/jwt';

export type AuthedUser = {
  userId: number;
  openid?: string;
  jwtPayload: any;
};

declare global {
  // eslint-disable-next-line no-var
  var __xhgjUserAuthTypes: never;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthedUser;
  }
}

/**
 * 用户鉴权：从 Authorization Bearer 或 cookie(jwt) 提取 payload
 * - 成功：req.user.userId / req.user.openid
 * - 失败：401 NEED_WECHAT_OAUTH（与支付预下单行为保持一致）
 */
export function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  const { payload } = extractJwtFromReq(req);
  const sub = payload?.sub;
  const userId = Number(sub);
  if (!payload || !Number.isFinite(userId) || userId <= 0) {
    return res.status(401).json({ code: 'NEED_WECHAT_OAUTH', message: '请先在微信内完成登录授权' });
  }
  req.user = { userId, openid: payload?.openid, jwtPayload: payload };
  return next();
}





