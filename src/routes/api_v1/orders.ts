import { Router } from 'express';
import { z } from 'zod';
import { storage, withTransaction } from '../../storage';
import { AppError } from '../../utils/errors';
import { requireUserAuth } from '../../middlewares/user_auth';

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

// 获取订单详情
router.get('/:orderNo', requireUserAuth, async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user!.userId;

    const order = storage.orders.findByOrderNo(orderNo);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', '订单不存在');
    }
    if (order.user_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', '无权访问此订单');
    }

    const items = storage.orders.getOrderItems(orderNo);

    return res.json({
      order,
      items,
    });
  } catch (e) {
    next(e);
  }
});

// 取消订单
router.post('/:orderNo/cancel', requireUserAuth, async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user!.userId;

    const order = storage.orders.findByOrderNo(orderNo);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', '订单不存在');
    }
    if (order.user_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', '无权操作此订单');
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw new AppError(400, 'CANNOT_CANCEL', '当前状态不可取消');
    }

    storage.orders.updateStatus(orderNo, 'CANCELLED');
    storage.orders.logChange(orderNo, 'status', order.status, 'CANCELLED', 'user');

    return res.json({ success: true, message: '订单已取消' });
  } catch (e) {
    next(e);
  }
});

export default router;
