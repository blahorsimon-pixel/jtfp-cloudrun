import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { AppError } from '../../utils/errors';
import { genOutTradeNo } from '../../utils/id';
import { config } from '../../config/index';
import { requireUserAuth } from '../../middlewares/user_auth';

const router = Router();

// 小程序支付功能已禁用
router.post('/wechat/jsapi/prepay', requireUserAuth, async (req, res) => {
  return res.status(400).json({ code: 'PAYMENT_DISABLED', message: '支付功能已禁用' });
});

export default router;
