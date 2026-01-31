import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../../storage';
import { requireUserAuth } from '../../../middlewares/user_auth';

const router = Router();

router.use(requireUserAuth);

// 获取我的订单列表
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);
    const status = req.query.status as string | undefined;

    const result = storage.orders.list({
      userId,
      status,
      page,
      pageSize,
    });

    return res.json({
      total: result.total,
      page,
      pageSize,
      orders: result.orders,
    });
  } catch (e) {
    next(e);
  }
});

// 获取订单详情
router.get('/:orderNo', async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user!.userId;

    const order = storage.orders.findByOrderNo(orderNo);
    if (!order) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '订单不存在' });
    }
    if (order.user_id !== userId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: '无权访问' });
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
router.post('/:orderNo/cancel', async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user!.userId;

    const order = storage.orders.findByOrderNo(orderNo);
    if (!order) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '订单不存在' });
    }
    if (order.user_id !== userId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: '无权操作' });
    }
    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ code: 'CANNOT_CANCEL', message: '当前状态不可取消' });
    }

    storage.orders.updateStatus(orderNo, 'CANCELLED');

    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
