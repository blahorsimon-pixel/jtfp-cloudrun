import { Router } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { pool } from '../../db/mysql';
import { AppError } from '../../utils/errors';
import { genOutTradeNo } from '../../utils/id';
import { config } from '../../config/index';
import { isWxConfigured, jsapiPrepay, queryOrder, closeOrder as wxCloseOrder } from '../../services/wxpay';
import { extractJwtFromReq } from '../../utils/jwt';
import { decryptResource } from '../../services/wxpay_notify';
import { loadPlatformPublicKey, verifySignature } from '../../services/wxpay_verify';
import { requireWeChatUA, requirePayAuthDir } from '../../middlewares/wx_guard';
import { logOrderChange, OrderChangeType } from '../../services/order_change_log_service';

const router = Router();

const WELFARE_INVALID_MSG = '您输入的福利码错误，请输入正确码，否则无法通过福利通道下单。';

const PrepayReq = z.object({
  orderNo: z.string().min(1),
  wxOpenId: z.string().min(1).optional(),
});

router.post('/wechat/jsapi/prepay', requireWeChatUA, requirePayAuthDir, async (req, res, next) => {
  return res.status(400).json({ code: 'PAYMENT_DISABLED', message: '支付功能已禁用' });
  /* 禁用支付逻辑
  try {
    const body = PrepayReq.parse(req.body);
    let { orderNo, wxOpenId } = body;

    if (!wxOpenId) {
      const { payload } = extractJwtFromReq(req);
      wxOpenId = payload?.openid;
    }
    if (!wxOpenId) {
      return res.status(401).json({ code: 'NEED_WECHAT_OAUTH', message: 'missing wxOpenId, please run OAuth in WeChat' });
    }

    const [rows]: any = await pool.query('SELECT order_no,status,total_amount,invite_code FROM orders WHERE order_no=?', [orderNo]);
    if (!rows.length) throw new AppError(404, 'ORDER_NOT_FOUND', 'order not found');
    const order = rows[0];
    if (order.status !== 'PENDING_PAYMENT') throw new AppError(409, 'ORDER_STATE_CONFLICT', 'order not pending payment');

    // Welfare order: if invite_code exists, ensure code still available (multi-use support)
    const inviteCode = (order.invite_code || '').toString().trim();
    if (/^\d{6}$/.test(inviteCode)) {
      const [codes]: any = await pool.query(
        'SELECT status, max_usage, used_count FROM welfare_codes WHERE code=? LIMIT 1',
        [inviteCode]
      );
      const wc = codes?.[0];
      if (!wc || Number(wc.status) !== 1 || Number(wc.used_count) >= Number(wc.max_usage)) {
        throw new AppError(400, 'INVALID_WELFARE_CODE', WELFARE_INVALID_MSG);
      }
    }

    // Ensure payment record (idempotent per order)
    const outTradeNo = genOutTradeNo('P');
    await pool.query('INSERT IGNORE INTO payments (order_no,type,channel,out_trade_no,amount,status,idempotency_key) VALUES (?,?,?,?,?,?,?)',
      [orderNo, 'ORDER', 'WECHAT', outTradeNo, order.total_amount, 'PENDING', `${orderNo}:${outTradeNo}`]);

    if (!isWxConfigured()) {
      return res.status(400).json({ code: 'WXPAY_NOT_CONFIGURED', message: '微信支付未配置，无法预下单', data: { outTradeNo } });
    }

    try {
      const params = await jsapiPrepay(outTradeNo, `订单${orderNo}`, order.total_amount, wxOpenId);
      return res.json({ outTradeNo, ...params });
    } catch (e: any) {
      // Surface axios error details for faster debugging (no secrets)
      const isAxios = !!(e?.isAxiosError);
      const status = isAxios ? e?.response?.status : undefined;
      const data = isAxios ? e?.response?.data : undefined;
      // Log full error server-side
      console.error('WXPAY_PREPAY_ERROR', { status, data, message: e?.message });
      const msg = status ? `WeChat prepay failed (HTTP ${status})` : 'WeChat prepay failed';
      return res.status(502).json({ code: 'WXPAY_PREPAY_FAILED', message: msg });
    }
  } catch (e) { next(e); }
  */
});

// 支付通知（原子更新订单）
router.post('/wechat/notify', async (req, res) => {
  try {
    const ts = (req.headers['wechatpay-timestamp'] as string) || '';
    const nonce = (req.headers['wechatpay-nonce'] as string) || '';
    const sign = (req.headers['wechatpay-signature'] as string) || '';
    const serial = (req.headers['wechatpay-serial'] as string) || '';

    const rawBodyBuf = req.body as Buffer; // via express.raw middleware
    const rawBody = rawBodyBuf?.toString('utf8') || '';

    const platformPem = loadPlatformPublicKey();
    if (platformPem) {
      const ok = verifySignature(ts, nonce, rawBody, sign, platformPem);
      if (!ok) {
        return res.status(401).json({ code: 'SIGN_VERIFY_FAIL', message: 'invalid signature' });
      }
    }

    const notify = JSON.parse(rawBody);
    const { id, create_time, event_type, resource } = notify || {};
    if (!resource) return res.status(400).json({ code: 'INVALID_PARAMS', message: 'missing resource' });

    const plain = decryptResource(resource, config.wechat.apiV3Key || '');
    const outTradeNo: string = plain.out_trade_no;
    const transactionId: string = plain.transaction_id;
    const tradeState: string = plain.trade_state;

    if (!outTradeNo) return res.status(200).json({ code: 'SUCCESS' });

    const [rows]: any = await pool.query('SELECT id, order_no, status, amount FROM payments WHERE out_trade_no=?', [outTradeNo]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({ code: 'SUCCESS' });
    }
    const pay = rows[0];

    if (pay.status === 'SUCCESS') {
      return res.status(200).json({ code: 'SUCCESS' });
    }

    if (tradeState === 'SUCCESS') {
      await pool.query('UPDATE payments SET status="SUCCESS", transaction_id=?, notify_payload=JSON_OBJECT("id", ?, "create_time", ?, "event_type", ?, "serial", ?) WHERE id=?', [transactionId, id || '', create_time || '', event_type || '', serial || '', pay.id]);
      // 统一状态：支付成功后进入“待发货”
      await pool.query('UPDATE orders SET status="WAIT_SHIP" WHERE order_no=? AND status="PENDING_PAYMENT"', [pay.order_no]);

      // 记录变更日志
      await logOrderChange({
        order_no: pay.order_no,
        change_type: OrderChangeType.ORDER_STATUS,
        field_name: 'status',
        old_value: 'PENDING_PAYMENT',
        new_value: 'WAIT_SHIP',
        operator: 'SYSTEM',
        reason: '微信支付成功自动更新状态'
      });

      // Consume welfare code after order paid (multi-use support with idempotency)
      try {
        const [oRows]: any = await pool.query('SELECT invite_code, user_id FROM orders WHERE order_no=? LIMIT 1', [pay.order_no]);
        const code = (oRows?.[0]?.invite_code || '').toString().trim();
        const userId = Number(oRows?.[0]?.user_id || 0);
        if (/^\d{6}$/.test(code)) {
          // 检查该订单是否已经消费过福利码（幂等）
          const [usageRows]: any = await pool.query(
            'SELECT id FROM welfare_code_usage WHERE order_no = ? LIMIT 1',
            [pay.order_no]
          );
          if (!usageRows || usageRows.length === 0) {
            // 原子更新：递增 used_count，当达到 max_usage 时自动设置 status=2
            const [updateResult]: any = await pool.query(
              `UPDATE welfare_codes 
               SET used_count = used_count + 1,
                   status = CASE WHEN used_count + 1 >= max_usage THEN 2 ELSE status END,
                   consumed_order_no = ?,
                   consumed_at = NOW()
               WHERE code = ? AND status = 1 AND used_count < max_usage`,
              [pay.order_no, code]
            );
            // 记录使用明细
            if (updateResult.affectedRows > 0) {
              const [wcRows]: any = await pool.query('SELECT id FROM welfare_codes WHERE code = ? LIMIT 1', [code]);
              const welfareCodeId = wcRows?.[0]?.id || 0;
              await pool.query(
                'INSERT INTO welfare_code_usage (welfare_code_id, code, order_no, user_id) VALUES (?, ?, ?, ?)',
                [welfareCodeId, code, pay.order_no, userId]
              );
            }
          }
        }
      } catch (e) {
        console.error('WELFARE_CONSUME_FAIL', { orderNo: pay.order_no, err: (e as any)?.message || e });
      }
      return res.status(200).json({ code: 'SUCCESS' });
    }

    await pool.query('UPDATE payments SET status=? WHERE id=?', [tradeState || 'FAIL', pay.id]);
    return res.status(200).json({ code: 'SUCCESS' });
  } catch (e) {
    // 出错也返回 200/SUCCESS，避免微信反复重试
    return res.status(200).json({ code: 'SUCCESS' });
  }
});

router.get('/wechat/orders/:outTradeNo', async (req, res, next) => {
  try {
    const { outTradeNo } = req.params;
    const [rows]: any = await pool.query('SELECT order_no, out_trade_no, status, amount, transaction_id, updated_at FROM payments WHERE out_trade_no=?', [outTradeNo]);
    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'payment not found');
    const pay = rows[0];
    res.json(pay);
  } catch (e) { next(e); }
});

router.post('/wechat/orders/:outTradeNo/close', async (req, res, next) => {
  try {
    const { outTradeNo } = req.params;
    const data = await wxCloseOrder(outTradeNo);
    // Mark local status closed if still pending
    await pool.query('UPDATE payments SET status="CLOSED" WHERE out_trade_no=? AND status IN ("INIT","PENDING")', [outTradeNo]);
    res.json({ ok: true, data });
  } catch (e) { next(e); }
});

export default router;

