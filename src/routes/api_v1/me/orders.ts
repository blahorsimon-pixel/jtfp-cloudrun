import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../../db/mysql';
import { requireUserAuth } from '../../../middlewares/user_auth';
import { isWxConfigured, closeOrder as wxCloseOrder } from '../../../services/wxpay';
import { logOrderChange, OrderChangeType } from '../../../services/order_change_log_service';

const router = Router();

router.use(requireUserAuth);

interface ListQuery {
  page?: string;
  pageSize?: string;
  status?: string;
}

const statusMapCn: Record<string, string> = {
  PENDING_FREIGHT: '待支付运费',
  PENDING_PAYMENT: '待支付',
  PAID: '待发货',
  WAIT_SHIP: '待发货',
  SHIPPED: '已发货',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CLOSED_UNPAID: '已关闭(未支付)',
  CANCELLED: '已取消',
};

function normalizeStatuses(input?: string): string[] {
  const raw = (input || '').trim();
  if (!raw) return [];
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  // 兼容 Tab 分组：一个“状态名”可能映射到多个真实状态
  const out: string[] = [];
  for (const p of parts) {
    if (p === 'WAIT_SHIP') out.push('WAIT_SHIP', 'PAID'); // 兼容历史 PAID
    else if (p === 'COMPLETED') out.push('COMPLETED', 'DELIVERED');
    else out.push(p);
  }
  return Array.from(new Set(out));
}

// GET /api/v1/me/orders
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const query = req.query as ListQuery;
    const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize || '10', 10) || 10, 1), 50);
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['o.user_id = ?'];
    const params: any[] = [userId];

    const statusList = normalizeStatuses(query.status);
    if (statusList.length > 0) {
      conditions.push(`o.status IN (${statusList.map(() => '?').join(',')})`);
      params.push(...statusList);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM orders o
       ${whereClause}`,
      params
    );
    const total = (countRows?.[0] as any)?.total ?? 0;

    // 每笔订单一行：取第一条明细（封面/标题展示用）+ 最新物流
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        o.order_no,
        o.created_at,
        o.status,
        o.total_amount,
        oi.sku_title,
        oi.quantity,
        COALESCE(ps.cover_url, p.cover_url) as cover_url,
        s.carrier_code,
        s.tracking_no,
        s.shipped_at,
        s.delivered_at
      FROM orders o
      LEFT JOIN (
        SELECT x.*
        FROM order_items x
        JOIN (
          SELECT order_no, MIN(id) as min_id
          FROM order_items
          GROUP BY order_no
        ) y ON y.order_no = x.order_no AND y.min_id = x.id
      ) oi ON oi.order_no = o.order_no
      LEFT JOIN product_skus ps ON oi.sku_id = ps.id
      LEFT JOIN products p ON p.id = COALESCE(ps.product_id, oi.sku_id)
      LEFT JOIN (
        SELECT ss.*
        FROM shipments ss
        JOIN (
          SELECT order_no, MAX(id) as max_id
          FROM shipments
          GROUP BY order_no
        ) latest ON latest.max_id = ss.id
      ) s ON s.order_no = o.order_no
      ${whereClause}
      ORDER BY o.created_at DESC, o.order_no DESC
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const orders = (rows as any[]).map((row) => ({
      ...row,
      status_cn: statusMapCn[row.status] || row.status,
    }));

    return res.json({ total, page, pageSize, orders });
  } catch (err: any) {
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: err?.message || 'server error' });
  }
});

// POST /api/v1/me/orders/:orderNo/cancel
// 用户侧“删除/取消未支付订单”：仅允许 PENDING_PAYMENT
router.post('/:orderNo/cancel', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { orderNo } = req.params;
    if (!orderNo) return res.status(400).json({ code: 'BAD_REQUEST', message: 'orderNo required' });

    // Check ownership + status
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT order_no, status
       FROM orders
       WHERE order_no = ? AND user_id = ?
       LIMIT 1`,
      [orderNo, userId]
    );
    if (!orders || orders.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
    }
    const order = orders[0] as any;
    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(409).json({ code: 'ORDER_STATE_CONFLICT', message: '仅支持取消未支付订单' });
    }

    // Best-effort: close pending wechat orders
    try {
      const [pays] = await pool.query<RowDataPacket[]>(
        `SELECT out_trade_no, status
         FROM payments
         WHERE order_no = ? AND channel = 'WECHAT' AND type = 'ORDER'
         ORDER BY id DESC
         LIMIT 3`,
        [orderNo]
      );
      const pending = (pays as any[]).find((p) => ['INIT', 'PENDING'].includes(String(p?.status || '')));
      const outTradeNo = pending?.out_trade_no;
      if (outTradeNo && isWxConfigured()) {
        await wxCloseOrder(String(outTradeNo)).catch(() => {});
      }
      await pool.query(
        `UPDATE payments SET status='CLOSED'
         WHERE order_no = ? AND channel='WECHAT' AND type='ORDER' AND status IN ('INIT','PENDING')`,
        [orderNo]
      );
    } catch {
      // ignore
    }

    await pool.query(
      `UPDATE orders SET status='CANCELLED' WHERE order_no=? AND user_id=? AND status='PENDING_PAYMENT'`,
      [orderNo, userId]
    );

    // 记录变更日志
    await logOrderChange({
      order_no: orderNo,
      change_type: OrderChangeType.ORDER_STATUS,
      field_name: 'status',
      old_value: 'PENDING_PAYMENT',
      new_value: 'CANCELLED',
      operator: `USER:${userId}`,
      reason: '用户手动取消订单'
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: err?.message || 'server error' });
  }
});

// GET /api/v1/me/orders/:orderNo
router.get('/:orderNo', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { orderNo } = req.params;
    if (!orderNo) return res.status(400).json({ code: 'BAD_REQUEST', message: 'orderNo required' });

    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT o.*
       FROM orders o
       WHERE o.order_no = ? AND o.user_id = ?
       LIMIT 1`,
      [orderNo, userId]
    );
    if (!orders || orders.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
    }
    const order = orders[0];

    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT
        oi.*,
        COALESCE(ps.cover_url, p.cover_url) as cover_url
      FROM order_items oi
      LEFT JOIN product_skus ps ON oi.sku_id = ps.id
      LEFT JOIN products p ON p.id = COALESCE(ps.product_id, oi.sku_id)
      WHERE oi.order_no = ?
      ORDER BY oi.id ASC`,
      [orderNo]
    );

    const [shipments] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM shipments WHERE order_no = ? ORDER BY id DESC`,
      [orderNo]
    );

    return res.json({ order, items, shipments });
  } catch (err: any) {
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: err?.message || 'server error' });
  }
});

export default router;


