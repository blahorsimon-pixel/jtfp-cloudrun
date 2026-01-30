import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index';

export function requireWeChatUA(req: Request, res: Response, next: NextFunction) {
  if (!config.wechat.enabled) {
    return res.status(403).json({ code: 'WECHAT_PAY_DISABLED', message: 'WeChat Pay is disabled' });
  }
  const ua = (req.headers['user-agent'] || '').toString();
  if (!/MicroMessenger/i.test(ua)) {
    return res.status(400).json({ code: 'NOT_WECHAT_ENV', message: 'Please open in WeChat' });
  }
  next();
}

export function requirePayAuthDir(req: Request, res: Response, next: NextFunction) {
  const referer = (req.headers['referer'] || req.headers['referrer'] || '').toString();
  const dir = config.wechat.payAuthDir;
  if (referer) {
    try {
      const u = new URL(referer);
      if (!u.pathname.startsWith(dir)) {
        return res.status(400).json({ code: 'PAY_DIR_NOT_ALLOWED', message: 'Payment must be initiated from authorized directory' });
      }
    } catch {
      // if referer not a valid URL, ignore to avoid false negatives
    }
  }
  next();
}



