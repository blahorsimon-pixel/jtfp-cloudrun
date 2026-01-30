/**
 * 微信小程序支付服务（使用小程序 AppID 下单）
 * 复用现有商户号、证书、密钥，仅 appid 不同
 */
import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import { config } from '../config/index';

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/**
 * 检查小程序支付是否配置完成
 * 需要：miniAppId + 商户号 + 证书 + APIv3 Key
 */
export function isMiniPayConfigured(): boolean {
  return !!(
    config.wechat.miniAppId &&
    config.wechat.mchId &&
    config.wechat.apiV3Key &&
    config.wechat.certSerialNo &&
    config.wechat.privateKeyPath
  );
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

/**
 * 小程序 JSAPI 预下单
 * @param outTradeNo 商户订单号
 * @param description 商品描述
 * @param amountCent 金额（分）
 * @param payerOpenId 小程序用户的 openid
 */
export async function miniJsapiPrepay(
  outTradeNo: string,
  description: string,
  amountCent: number,
  payerOpenId: string
) {
  // 使用小程序 AppID（不是公众号）
  const appid = required(config.wechat.miniAppId, 'WECHAT_MINI_APPID');
  const mchid = required(config.wechat.mchId, 'WX_MCH_ID');
  const notifyUrl = `${config.baseUrl}${config.wechat.notifyPath}`;

  const payload = {
    appid,
    mchid,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: amountCent, currency: 'CNY' },
    payer: { openid: payerOpenId },
  };

  const body = JSON.stringify(payload);
  const auth = buildAuthToken('POST', '/v3/pay/transactions/jsapi', body);

  const { data } = await wxapi.post('/v3/pay/transactions/jsapi', payload, {
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  const prepay_id = data.prepay_id as string;
  return signJsapiForMini(appid, prepay_id);
}

/**
 * 生成小程序 wx.requestPayment 所需参数
 */
function signJsapiForMini(appid: string, prepay_id: string) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const pkg = `prepay_id=${prepay_id}`;
  const message = `${appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  const sign = crypto.createSign('RSA-SHA256').update(message).sign(getMerchantPrivateKey(), 'base64');
  return {
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA' as const,
    paySign: sign,
  };
}
