import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import { config } from '../config/index';

export type PrepayScene = 'JSAPI' | 'MWEB';

function urlPath(u: string) {
  const i = u.indexOf('://');
  if (i >= 0) {
    const p = u.slice(i + 3);
    const slash = p.indexOf('/');
    return slash >= 0 ? '/' + p.slice(slash + 0) : '/';
  }
  return u;
}

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function isWxConfigured() {
  return !!(config.wechat.mchId && config.wechat.apiV3Key && config.wechat.certSerialNo && config.wechat.privateKeyPath);
}

function getMerchantPrivateKey(): string {
  const p = required(config.wechat.privateKeyPath, 'WX_PRIVATE_KEY_PATH');
  return fs.readFileSync(p, 'utf8');
}

function buildAuthToken(method: string, urlPath: string, body: string) {
  const mchid = required(config.wechat.mchId, 'WX_MCH_ID');
  const serialNo = required(config.wechat.certSerialNo, 'WX_CERT_SERIAL_NO');
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256').update(message).sign(getMerchantPrivateKey(), 'base64');
  const token = `mchid="${mchid}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${sign}"`;
  return `WECHATPAY2-SHA256-RSA2048 ${token}`;
}

const wxapi = axios.create({ baseURL: 'https://api.mch.weixin.qq.com' });

export async function jsapiPrepay(outTradeNo: string, description: string, amountCent: number, payerOpenId: string) {
  const appid = required(config.wechat.appId, 'WX_APP_ID');
  const mchid = required(config.wechat.mchId, 'WX_MCH_ID');
  const notifyUrl = `${config.baseUrl}${config.wechat.notifyPath}`;
  const payload = {
    appid, mchid, description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: amountCent, currency: 'CNY' },
    payer: { openid: payerOpenId },
  };
  const body = JSON.stringify(payload);
  const auth = buildAuthToken('POST', '/v3/pay/transactions/jsapi', body);
  const { data } = await wxapi.post('/v3/pay/transactions/jsapi', payload, {
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  const prepay_id = data.prepay_id as string;
  return signJsapi(appid, prepay_id);
}

function signJsapi(appid: string, prepay_id: string) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const pkg = `prepay_id=${prepay_id}`;
  const message = `${appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  const sign = crypto.createSign('RSA-SHA256').update(message).sign(getMerchantPrivateKey(), 'base64');
  return { appId: appid, timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign: sign };
}

export async function h5Prepay(outTradeNo: string, description: string, amountCent: number, clientIp: string) {
  const appid = required(config.wechat.appId, 'WX_APP_ID');
  const mchid = required(config.wechat.mchId, 'WX_MCH_ID');
  const notifyUrl = `${config.baseUrl}${config.wechat.notifyPath}`;
  const payload = {
    appid, mchid, description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: amountCent, currency: 'CNY' },
    scene_info: { payer_client_ip: clientIp, h5_info: { type: 'Wap' } },
  };
  const body = JSON.stringify(payload);
  const auth = buildAuthToken('POST', '/v3/pay/transactions/h5', body);
  const { data } = await wxapi.post('/v3/pay/transactions/h5', payload, {
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return data; // contains h5_url
}

export async function queryOrder(outTradeNo: string) {
  const mchid = required(config.wechat.mchId, 'WX_MCH_ID');
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(mchid)}`;
  const auth = buildAuthToken('GET', path, '');
  const { data } = await wxapi.get(path, { headers: { Authorization: auth } });
  return data;
}

export async function closeOrder(outTradeNo: string) {
  const mchid = required(config.wechat.mchId, 'WX_MCH_ID');
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}/close`;
  const body = JSON.stringify({ mchid });
  const auth = buildAuthToken('POST', path, body);
  const { data } = await wxapi.post(path, { mchid }, { headers: { Authorization: auth, 'Content-Type': 'application/json' } });
  return data;
}

