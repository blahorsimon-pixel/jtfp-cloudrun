/**
 * 小程序支付路由
 * POST /api/v1/pay/wechat/mini/prepay
 */
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/mysql';
import { AppError } from '../../utils/errors';
import { genOutTradeNo } from '../../utils/id';
import { config } from '../../config/index';
import { extractJwtFromReq } from '../../utils/jwt';
import { getMiniIdentity } from '../../services/user_service';
import { miniJsapiPrepay, isMiniPayConfigured } from '../../services/wxpay_mini';

const router = Router();

const WELFARE_INVALID_MSG = '您输入的福利码错误，请输入正确码，否则无法通过福利通道下单。';

const PrepayReq = z.object({
  orderNo: z.string().min(1),
});

/**
 * POST /api/v1/pay/wechat/mini/prepay
 * 小程序支付预下单（使用小程序 AppID 和小程序 openid）
 */
router.post('/prepay', async (req, res, next) => {
  return res.status(400).json({ code: 'PAYMENT_DISABLED', message: '支付功能已禁用' });
  /* 禁用支付逻辑
  try {
    const body = PrepayReq.parse(req.body);
    const { orderNo } = body;

    // 从 Authorization header 获取 JWT
    const { payload } = extractJwtFromReq(req);
    if (!payload?.sub) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'missing or invalid token' });
    }
    const userId = Number(payload.sub);

    // 获取该用户的小程序身份（包含 openid）
    const miniIdentity = await getMiniIdentity(userId);
    if (!miniIdentity) {
      return res.status(400).json({ code: 'MINI_IDENTITY_NOT_FOUND', message: '用户未绑定小程序' });
    }
    const miniOpenId = miniIdentity.openid;

    // 查询订单
    const [rows]: any = await pool.query(
      'SELECT order_no, user_id, status, total_amount, invite_code FROM orders WHERE order_no = ?',
      [orderNo]
    );
    if (!rows.length) throw new AppError(404, 'ORDER_NOT_FOUND', 'order not found');
    const order = rows[0];

    // 校验订单归属
    if (order.user_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'order does not belong to this user');
    }

    // 校验订单状态
    if (order.status !== 'PENDING_PAYMENT') {
      throw new AppError(409, 'ORDER_STATE_CONFLICT', 'order not pending payment');
    }

    // 福利码校验（与 H5 一致）
    const inviteCode = (order.invite_code || '').toString().trim();
    if (/^\d{6}$/.test(inviteCode)) {
      const [codes]: any = await pool.query(
        'SELECT status, max_usage, used_count FROM welfare_codes WHERE code = ? LIMIT 1',
        [inviteCode]
      );
      const wc = codes?.[0];
      if (!wc || Number(wc.status) !== 1 || Number(wc.used_count) >= Number(wc.max_usage)) {
        throw new AppError(400, 'INVALID_WELFARE_CODE', WELFARE_INVALID_MSG);
      }
    }

    // 创建支付记录（幂等）
    const outTradeNo = genOutTradeNo('PM'); // PM = Pay Mini
    await pool.query(
      'INSERT IGNORE INTO payments (order_no, type, channel, out_trade_no, amount, status, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [orderNo, 'ORDER', 'WECHAT_MINI', outTradeNo, order.total_amount, 'PENDING', `${orderNo}:${outTradeNo}`]
    );

    // 检查小程序支付配置
    if (!isMiniPayConfigured()) {
      return res.status(400).json({
        code: 'MINI_PAY_NOT_CONFIGURED',
        message: '小程序支付未配置（请检查 WECHAT_MINI_APPID 及商户号绑定）',
        data: { outTradeNo },
      });
    }

    try {
      const params = await miniJsapiPrepay(outTradeNo, `订单${orderNo}`, order.total_amount, miniOpenId);
      return res.json({ outTradeNo, ...params });
    } catch (e: any) {
      const isAxios = !!e?.isAxiosError;
      const status = isAxios ? e?.response?.status : undefined;
      const data = isAxios ? e?.response?.data : undefined;
      console.error('MINI_WXPAY_PREPAY_ERROR', { status, data, message: e?.message });
      const msg = status ? `WeChat prepay failed (HTTP ${status})` : 'WeChat prepay failed';
      return res.status(502).json({ code: 'WXPAY_PREPAY_FAILED', message: msg });
    }
  } catch (e) {
    next(e);
  }
  */
});

export default router;
