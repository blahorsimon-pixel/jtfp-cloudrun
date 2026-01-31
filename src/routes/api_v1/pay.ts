import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { AppError } from '../../utils/errors';
import { genOutTradeNo } from '../../utils/id';
import { config } from '../../config/index';
import { isWxConfigured, jsapiPrepay, queryOrder, closeOrder as wxCloseOrder } from '../../services/wxpay';
import { extractJwtFromReq } from '../../utils/jwt';
import { decryptResource } from '../../services/wxpay_notify';
import { loadPlatformPublicKey, verifySignature } from '../../services/wxpay_verify';
import { requireWeChatUA, requirePayAuthDir } from '../../middlewares/wx_guard';

const router = Router();

const WELFARE_INVALID_MSG = '您输入的福利码错误，请输入正确码，否则无法通过福利通道下单。';

const PrepayReq = z.object({
  orderNo: z.string().min(1),
  wxOpenId: z.string().min(1).optional(),
});

router.post('/wechat/jsapi/prepay', requireWeChatUA, requirePayAuthDir, async (req, res, next) => {
  return res.status(400).json({ code: 'PAYMENT_DISABLED', message: '支付功能已禁用' });
});

// 支付通知（原子更新订单）
router.post('/wechat/notify', async (req, res) => {
  try {
    const ts = (req.headers['wechatpay-timestamp'] as string) || '';
    const nonce = (req.headers['wechatpay-nonce'] as string) || '';
    const sign = (req.headers['wechatpay-signature'] as string) || '';
    const serial = (req.headers['wechatpay-serial'] as string) || '';

    const rawBodyBuf = req.body as Buffer;
    const rawBody = rawBodyBuf?.toString('utf8') || '';

    const platformPem = loadPlatformPublicKey();
    if (platformPem) {
      const ok = verifySignature(ts, nonce, rawBody, sign, platformPem);
      if (!ok) {
        return res.status(401).json({ code: 'SIGN_VERIFY_FAIL', message: 'invalid signature' });
      }
    }

    const bodyJson = JSON.parse(rawBody);
    if (bodyJson?.event_type !== 'TRANSACTION.SUCCESS') {
      return res.json({ code: 'SUCCESS', message: 'ignored' });
    }

    const resource = bodyJson.resource;
    if (!resource) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'missing resource' });
    }

    const pay = decryptResource(resource, config.wechat.apiV3Key);
    if (!pay || pay.trade_state !== 'SUCCESS') {
      return res.json({ code: 'SUCCESS', message: 'not success state' });
    }

    // 使用 FileStore 更新订单状态
    const order = storage.orders.findByOrderNo(pay.out_trade_no);
    if (order) {
      storage.orders.updateStatus(pay.order_no, 'PENDING_FREIGHT', {
        paid_at: new Date().toISOString(),
        payment_method: 'WECHAT',
      });
      storage.orders.logChange(pay.order_no, 'status', order.status, 'PENDING_FREIGHT', 'wechat_notify');
    }

    return res.json({ code: 'SUCCESS', message: 'ok' });
  } catch (e: any) {
    console.error('NOTIFY_ERROR', e);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: e.message });
  }
});

export default router;
