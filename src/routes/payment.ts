import { Router } from 'express';
import { decryptResource } from '../services/wxpay_notify';
import { loadPlatformPublicKey, verifySignature } from '../services/wxpay_verify';
import { config } from '../config/index';
import { pool } from '../db/mysql';
import { logOrderChange, OrderChangeType } from '../services/order_change_log_service';

const router = Router();

const WELFARE_CONSUME_FAIL_LOG = 'WELFARE_CONSUME_FAIL';

// 微信支付回调（统一用于普通订单/运费支付，当前重点处理普通订单 ORDER）
router.post('/wechat/notify', async (req, res) => {
  return res.status(200).json({ code: 'PAYMENT_DISABLED' });
  /* 禁用支付回调
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
      await pool.query('UPDATE orders SET status="PAID" WHERE order_no=? AND status="PENDING_PAYMENT"', [pay.order_no]);

      // 记录变更日志
      await logOrderChange({
        order_no: pay.order_no,
        change_type: OrderChangeType.ORDER_STATUS,
        field_name: 'status',
        old_value: 'PENDING_PAYMENT',
        new_value: 'PAID',
        operator: 'SYSTEM',
        reason: '微信支付成功自动更新状态(PAID)'
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
        console.error(WELFARE_CONSUME_FAIL_LOG, { orderNo: pay.order_no, err: (e as any)?.message || e });
      }
      return res.status(200).json({ code: 'SUCCESS' });
    }

    await pool.query('UPDATE payments SET status=? WHERE id=?', [tradeState || 'FAIL', pay.id]);
    return res.status(200).json({ code: 'SUCCESS' });
  } catch (e) {
    // 出错也返回 200/SUCCESS，避免微信反复重试
    return res.status(200).json({ code: 'SUCCESS' });
  }
  */
});

export default router;
