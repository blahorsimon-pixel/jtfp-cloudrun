import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/index';

let cachedAccessToken: { token: string; exp: number } | null = null;
let cachedJsapiTicket: { ticket: string; exp: number } | null = null;

async function fetchAccessToken() {
  const appid = config.wechat.appId;
  const secret = config.wechat.mpSecret || '';
  if (!appid || !secret) throw new Error('WX_MP appId/secret not configured');
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  if (!data.access_token) throw new Error(`get access_token failed: ${JSON.stringify(data)}`);
  const ttl = Number(data.expires_in || 7200) - 120;
  cachedAccessToken = { token: data.access_token, exp: Date.now() + ttl * 1000 };
  return cachedAccessToken.token;
}

export async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.exp > Date.now()) return cachedAccessToken.token;
  return fetchAccessToken();
}

async function fetchJsapiTicket() {
  const at = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${encodeURIComponent(at)}&type=jsapi`;
  const { data } = await axios.get(url, { timeout: 10000 });
  if (!data.ticket) throw new Error(`get jsapi_ticket failed: ${JSON.stringify(data)}`);
  const ttl = Number(data.expires_in || 7200) - 120;
  cachedJsapiTicket = { ticket: data.ticket, exp: Date.now() + ttl * 1000 };
  return cachedJsapiTicket.ticket;
}

export async function getJsapiTicket(): Promise<string> {
  if (cachedJsapiTicket && cachedJsapiTicket.exp > Date.now()) return cachedJsapiTicket.ticket;
  return fetchJsapiTicket();
}

export async function signJsSdk(url: string) {
  const ticket = await getJsapiTicket();
  const noncestr = crypto.randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const toSign = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  return { appId: config.wechat.appId, timestamp, nonceStr: noncestr, signature };
}



