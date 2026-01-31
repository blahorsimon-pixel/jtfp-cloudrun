import { Router } from 'express';
import { z } from 'zod';
import { storage, withTransaction } from '../storage';
import { AppError } from '../utils/errors';
import { requireUserAuth } from '../middlewares/user_auth';

const router = Router();

// 下单功能（简化版）
const CreateOrderReq = z.object({
  propertyId: z.number().optional(),
  skuItems: z.array(z.object({
    skuId: z.number(),
    quantity: z.number().min(1),
  })).optional(),
  addressSnapshot: z.any().optional(),
  buyerNote: z.string().optional(),
  inviteCode: z.string().optional(),
});

router.post('/', requireUserAuth, async (req, res, next) => {
  try {
    const body = CreateOrderReq.parse(req.body);
    const userId = req.user!.userId;

    const order = storage.orders.create({
      user_id: userId,
      property_id: body.propertyId,
      status: 'PENDING_PAYMENT',
      total_amount: 0,
      address_snapshot: body.addressSnapshot ? JSON.stringify(body.addressSnapshot) : undefined,
      buyer_note: body.buyerNote,
      invite_code: body.inviteCode,
    });

    return res.json({
      order_no: order.order_no,
      status: order.status,
      total_amount: order.total_amount,
    });
  } catch (e) {
    next(e);
  }
});

// 获取订单状态
router.get('/:orderNo/status', requireUserAuth, async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    const order = storage.orders.findByOrderNo(orderNo);
    
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', '订单不存在');
    }

    return res.json({
      order_no: order.order_no,
      status: order.status,
      total_amount: order.total_amount,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
