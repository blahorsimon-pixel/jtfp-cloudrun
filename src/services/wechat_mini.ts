/**
 * 微信小程序服务：code2session 登录
 */
import axios from 'axios';
import { config } from '../config/index';

export interface Code2SessionResult {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 调用微信 jscode2session 接口
 * @param code wx.login() 返回的 code
 */
export async function code2session(code: string): Promise<Code2SessionResult> {
  const appid = config.wechat.miniAppId;
  const secret = config.wechat.miniAppSecret;
  if (!appid || !secret) {
    throw new Error('WECHAT_MINI_APPID or WECHAT_MINI_SECRET not configured');
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  const { data } = await axios.get<Code2SessionResult>(url, { timeout: 10000 });
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`code2session failed: ${data.errcode} ${data.errmsg}`);
  }
  return data;
}
