import crypto from 'crypto';
import { config } from '../config/index';

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function signJwt(payload: Record<string, any>, expiresInSec = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSec, ...payload };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sig}`;
}

export function verifyJwt(token: string): { valid: boolean; payload?: any } {
  try {
    const [h, p, s] = token.split('.') as [string, string, string];
    if (!h || !p || !s) return { valid: false };
    const data = `${h}.${p}`;
    const expected = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (expected !== s) return { valid: false };
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return { valid: false };
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export function extractJwtFromReq(req: any): { token?: string; payload?: any } {
  const auth = req.headers['authorization'] as string | undefined;
  const cookie = (req.headers['cookie'] as string | undefined) || '';
  let token = undefined;
  if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
  if (!token) {
    const m = cookie.match(/(?:^|; )jwt=([^;]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }
  if (!token) return {};
  const { valid, payload } = verifyJwt(token);
  if (!valid) return {};
  return { token, payload };
}



