import { Router } from 'express';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import { storage } from '../../../storage';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Apply admin auth to all routes in this router
router.use(requireAdminToken);

interface OrderListQuery {
  page?: string;
  pageSize?: string;
  status?: string;
  orderNo?: string;
  phone?: string;
  inviteCode?: string;
  startDate?: string;
  endDate?: string;
  startAt?: string;
  endAt?: string;
}

const statusMapCn: Record<string, string> = {
  PENDING_FREIGHT: '待处理',
  WAIT_SHIP: '待处理',
  SHIPPED: '已发货',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CLOSED_UNPAID: '已关闭',
  CANCELLED: '已取消',
};

function safeJsonParse<T = any>(v: any): T | null {
  if (v == null) return null;
  if (typeof v === 'object') return v as T;
  if (typeof v !== 'string') return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

function normalizeRange(query: OrderListQuery): { startAt?: string; endAt?: string } {
  const startAt = query.startAt ?? (query.startDate ? `${query.startDate} 00:00:00` : undefined);
  const endAt = query.endAt ?? (query.endDate ? `${query.endDate} 23:59:59` : undefined);
  return { startAt, endAt };
}

// List orders
router.get('/', async (req, res) => {
  try {
    const query = req.query as OrderListQuery;
    const page = parseInt(query.page || '1', 10);
    const pageSize = Math.min(parseInt(query.pageSize || '20', 10), 100);
    const { startAt, endAt } = normalizeRange(query);

    const result = storage.orders.list({
      page,
      pageSize,
      status: query.status,
      orderNo: query.orderNo,
      phone: query.phone,
      startAt,
      endAt,
    });

    // 格式化输出
    const orders = result.orders.map((o: any) => {
      const addr = safeJsonParse(o.address_snapshot) || {};
      return {
        ...o,
        status_cn: statusMapCn[o.status] || o.status,
        receiver_name: addr.name || o.address_name || '',
        receiver_phone: addr.phone || o.address_phone || '',
        receiver_address: addr.detail || addr.address || o.address_detail || '',
      };
    });

    res.json({
      total: result.total,
      page,
      pageSize,
      orders,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get order detail
router.get('/:orderNo', async (req, res) => {
  try {
    const { orderNo } = req.params;
    const order = storage.orders.findByOrderNo(orderNo);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const items = storage.orders.getOrderItems(orderNo);
    const logs = storage.orders.getChangeLogs(orderNo);
    const addr = safeJsonParse(order.address_snapshot) || {};

    res.json({
      order: {
        ...order,
        status_cn: statusMapCn[order.status] || order.status,
        receiver_name: addr.name || '',
        receiver_phone: addr.phone || '',
        receiver_address: addr.detail || addr.address || '',
      },
      items,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status
router.put('/:orderNo/status', async (req, res) => {
  try {
    const { orderNo } = req.params;
    const { status, reason } = req.body;

    const order = storage.orders.findByOrderNo(orderNo);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const oldStatus = order.status;
    storage.orders.updateStatus(orderNo, status);
    storage.orders.logChange(orderNo, 'status', oldStatus, status, 'admin');

    res.json({ success: true, message: '订单状态更新成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update order remark
router.put('/:orderNo/remark', async (req, res) => {
  try {
    const { orderNo } = req.params;
    const { remark } = req.body;

    const order = storage.orders.findByOrderNo(orderNo);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const oldRemark = order.remark || '';
    storage.orders.update(orderNo, { remark });
    storage.orders.logChange(orderNo, 'remark', oldRemark, remark || '', 'admin');

    res.json({ success: true, message: '备注更新成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete order
router.delete('/:orderNo', async (req, res) => {
  try {
    const { orderNo } = req.params;
    
    const order = storage.orders.findByOrderNo(orderNo);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    storage.orders.remove(orderNo);
    res.json({ success: true, message: '订单删除成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const total = storage.orders.countByStatus();
    const pending = storage.orders.countByStatus('PENDING_PAYMENT') + 
                   storage.orders.countByStatus('PENDING_FREIGHT') +
                   storage.orders.countByStatus('WAIT_SHIP');
    const shipped = storage.orders.countByStatus('SHIPPED');
    const completed = storage.orders.countByStatus('COMPLETED');

    res.json({
      total,
      pending,
      shipped,
      completed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
