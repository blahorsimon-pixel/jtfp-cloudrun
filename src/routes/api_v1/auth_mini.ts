/**
 * 小程序登录路由
 * POST /api/v1/auth/mini/login
 */
import { Router } from 'express';
import { z } from 'zod';
import { code2session } from '../../services/wechat_mini';
import { findOrCreateUserByIdentity } from '../../services/user_service';
import { signJwt } from '../../utils/jwt';

const router = Router();

const LoginReq = z.object({
  code: z.string().min(1, 'code is required'),
});

/**
 * POST /api/v1/auth/mini/login
 * 小程序登录：使用 wx.login() 返回的 code 换取 openid，生成 JWT
 */
router.post('/login', async (req, res, next) => {
  try {
    const { code } = LoginReq.parse(req.body);

    // 调用微信 code2session
    const sessionResult = await code2session(code);
    const { openid, session_key, unionid } = sessionResult;

    // 查找或创建用户（支持 UnionID 打通）
    const user = await findOrCreateUserByIdentity({
      provider: 'wechat_mini',
      openid,
      unionid,
      session_key,
    });

    // 签发 JWT（7 天有效）
    const token = signJwt({ sub: String(user.id), openid, provider: 'wechat_mini' }, 7 * 24 * 3600);

    return res.json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone,
      },
    });
  } catch (e: any) {
    // 区分业务错误和系统错误
    if (e?.message?.includes('code2session failed')) {
      return res.status(400).json({ code: 'WECHAT_LOGIN_FAILED', message: e.message });
    }
    if (e?.message?.includes('not configured')) {
      return res.status(500).json({ code: 'MINI_NOT_CONFIGURED', message: '小程序未配置' });
    }
    next(e);
  }
});

export default router;
