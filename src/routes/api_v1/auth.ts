import { Router } from 'express';
import axios from 'axios';
import { config } from '../../config/index';
import { signJwt } from '../../utils/jwt';
import { findOrCreateUser } from '../../services/user_service';

const router = Router();

function getCookie(req: any, name: string): string | undefined {
  const cookie = (req.headers['cookie'] as string | undefined) || '';
  const m = cookie.match(new RegExp('(?:^|; )' + name.replace(/[-.]/g, '\\$&') + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function setCookie(res: any, name: string, value: string, maxAgeSec = 3600) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (config.env !== 'development') parts.push('Secure');
  if (maxAgeSec > 0) parts.push(`Max-Age=${maxAgeSec}`);
  res.append?.('Set-Cookie', parts.join('; ')) || res.setHeader('Set-Cookie', parts.join('; '));
}

router.get('/wechat/oauth-start', async (req, res) => {
  const appid = config.wechat.appId;
  const redirect = (req.query.redirect as string) || '/';
  const callback = encodeURIComponent(`${config.baseUrl}/api/v1/auth/wechat/oauth-callback`);
  // Persist redirect via cookie
  setCookie(res, 'oauth_redirect', redirect, 600);
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(appid)}&redirect_uri=${callback}&response_type=code&scope=snsapi_base#wechat_redirect`;
  res.redirect(302, url);
});

router.get('/wechat/oauth-callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('missing code');
    const appid = config.wechat.appId;
    const secret = config.wechat.mpSecret || '';
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const { data } = await axios.get(url, { timeout: 10000 });
    const openid = data.openid as string | undefined;
    const unionid = data.unionid as string | undefined;
    if (!openid) return res.status(400).send('oauth failed');

    // Find or create user in database
    const user = await findOrCreateUser({ openid, unionid });

    const jwt = signJwt({ sub: String(user.id), openid });
    setCookie(res, 'jwt', jwt, 7 * 24 * 3600);

    const redirect = getCookie(req, 'oauth_redirect') || '/';
    // clear helper cookie
    setCookie(res, 'oauth_redirect', '', -1);

    res.redirect(302, redirect);
  } catch (e) {
    res.status(500).send('oauth error');
  }
});

export default router;



