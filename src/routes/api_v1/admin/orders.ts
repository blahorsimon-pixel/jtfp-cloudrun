import { Router } from 'express';
import { pool } from '../../../db/mysql';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { logOrderChange, OrderChangeType, getOrderChangeLogs } from '../../../services/order_change_log_service';
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
  phone?: string; // receiver phone (from address_snapshot / user.phone)
  inviteCode?: string; // o.invite_code
  startDate?: string; // legacy: YYYY-MM-DD
  endDate?: string; // legacy: YYYY-MM-DD
  startAt?: string; // new: YYYY-MM-DD HH:mm:ss
  endAt?: string; // new: YYYY-MM-DD HH:mm:ss
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

const carrierMapCn: Record<string, string> = {
  JD: '京东',
  SF: '顺丰',
  YTO: '圆通',
  ZTO: '中通',
  STO: '申通',
  EMS: 'EMS',
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
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.status) {
      conditions.push('o.status = ?');
      params.push(query.status);
    }
    if (query.orderNo) {
      conditions.push('o.order_no LIKE ?');
      params.push(`%${query.orderNo}%`);
    }
    if (query.inviteCode) {
      conditions.push('o.invite_code LIKE ?');
      params.push(`%${query.inviteCode}%`);
    }
    if (query.phone) {
      // Prefer JSON_EXTRACT on address_snapshot; fallback to users.phone
      // Note: address_snapshot is stored as JSON string in DB.
      conditions.push(
        `(JSON_UNQUOTE(JSON_EXTRACT(o.address_snapshot, '$.phone')) LIKE ? OR u.phone LIKE ?)`
      );
      params.push(`%${query.phone}%`, `%${query.phone}%`);
    }
    const { startAt, endAt } = normalizeRange(query);
    if (startAt) {
      conditions.push('o.created_at >= ?');
      params.push(startAt);
    }
    if (endAt) {
      conditions.push('o.created_at <= ?');
      params.push(endAt);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 行粒度：每个商品明细一行（与 40listdindang.md 一致）
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM orders o
       JOIN order_items oi ON o.order_no = oi.order_no
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = (countRows?.[0] as any)?.total ?? 0;

    // 聚合表：支付(成功)、物流(最新一条)、退款(成功金额)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        o.order_no,
        o.created_at,
        o.status,
        o.goods_amount,
        o.freight_amount,
        o.discount_amount,
        o.manual_adjust_amount,
        o.buyer_note,
        o.invite_code,
        o.address_snapshot,
        u.openid,
        u.unionid,
        u.nickname,
        oi.id as order_item_id,
        oi.sku_id,
        oi.sku_title,
        oi.quantity,
        oi.sale_price,
        oi.total_price,
        oi.sku_attrs,
        oi.updated_at as item_updated_at,
        COALESCE(oi.sku_code, ps.sku_code) as sku_code,
        COALESCE(sl.sku_title, oi.sku_title) as sku_name,
        p.id as product_id,
        COALESCE(ps.cover_url, sl.cover_url, p.cover_url) as cover_url,
        pay.paid_amount,
        pay.paid_at,
        pay.transaction_id,
        s.carrier_code,
        s.tracking_no,
        s.shipped_at,
        s.delivered_at,
        r.refund_amount
      FROM orders o
      JOIN order_items oi ON o.order_no = oi.order_no
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN product_skus ps ON oi.sku_id = ps.id
      LEFT JOIN sku_library sl ON sl.sku_code = COALESCE(oi.sku_code, ps.sku_code)
      LEFT JOIN products p ON p.id = COALESCE(ps.product_id, oi.sku_id)
      LEFT JOIN (
        SELECT
          order_no,
          SUM(amount) as paid_amount,
          MIN(updated_at) as paid_at,
          MIN(transaction_id) as transaction_id
        FROM payments
        WHERE status = 'SUCCESS'
        GROUP BY order_no
      ) pay ON pay.order_no = o.order_no
      LEFT JOIN (
        SELECT ss.*
        FROM shipments ss
        JOIN (
          SELECT order_no, MAX(id) as max_id
          FROM shipments
          GROUP BY order_no
        ) latest ON latest.max_id = ss.id
      ) s ON s.order_no = o.order_no
      LEFT JOIN (
        SELECT order_no, SUM(amount) as refund_amount
        FROM refunds
        WHERE status = 'SUCCESS'
        GROUP BY order_no
      ) r ON r.order_no = o.order_no
      ${whereClause}
      ORDER BY o.created_at DESC, o.order_no DESC, oi.id ASC
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // 统计每个订单的SKU行数（用于前端合并单元格）
    const orderNoCount = new Map<string, number>();
    (rows as any[]).forEach((r: any) => {
      orderNoCount.set(r.order_no, (orderNoCount.get(r.order_no) || 0) + 1);
    });

    // 兼容前端显示：补齐中文状态/金额/地址等衍生字段（不影响原字段）
    // 同时添加 _isFirstItem 和 _rowSpan 用于前端合并显示
    let prevOrderNo = '';
    const orders = (rows as any[]).map((row) => {
      const addr: any = safeJsonParse(row.address_snapshot) || {};
      const receiverAddress =
        addr && (addr.province || addr.city || addr.district || addr.detail)
          ? `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.detail || ''}`
          : '';
      const refundAmount = Number(row.refund_amount || 0);
      const carrierCode = row.carrier_code || '';
      const carrierCn = carrierMapCn[carrierCode] || carrierCode || '';

      // 分组标记：判断是否为该订单的首行
      const isFirstItem = row.order_no !== prevOrderNo;
      prevOrderNo = row.order_no;

      return {
        ...row,
        // 40项字段映射 (部分字段暂无DB对应，返回空)
        auction_time: '', // 1. 开拍时间
        bidding_phase: '', // 2. 竞价阶段
        community_name: '', // 3. 小区名称
        detail_address: receiverAddress, // 4. 详细地址 (映射已有地址)
        building_area: '', // 5. 建筑面积/㎡
        house_type: '', // 6. 房屋户型
        floor_info: '', // 7. 楼层
        building_year: '', // 8. 建筑年份
        decoration_status: '', // 9. 装修情况
        property_status: '', // 10. 物业现状
        holding_years: '', // 11. 持有年数
        property_type: '', // 12. 物业类型
        starting_price: '', // 13. 起拍价
        starting_unit_price: '', // 14. 起拍单价
        auction_platform: '', // 15. 竞拍平台
        auction_deposit: '', // 16. 竞拍保证金
        price_increment: '', // 17. 加价幅度
        evaluation_total_price: '', // 18. 评估总价
        evaluation_unit_price: '', // 19. 评估单价
        loan_70_percent: '', // 20. 7成可贷金额
        loan_80_percent: '', // 21. 8成可贷金额
        loan_90_percent: '', // 22. 9成可贷金额
        market_total_price: '', // 23. 市场参考总价
        market_unit_price: '', // 24. 市场参考单价
        school_district: '', // 25. 学区
        business_circle: '', // 26. 商圈
        profit_space: '', // 27. 捡漏空间
        auth_code: row.invite_code || '', // 28. 授权码 (映射福利码)
        deed_tax_rate: '', // 29. 契税率
        deed_tax_amount: '', // 30. 契税金额
        vat_rate: '', // 31. 增值税率
        vat_amount: '', // 32. 增值税金额
        income_tax_rate: '', // 33. 个税率
        income_tax_amount: '', // 34. 个税金额
        customer_name: addr.name || '', // 35. 客户姓名 (映射收件人)
        customer_phone: addr.phone || '', // 36. 客户联系号码 (映射收件人手机)
        customer_survey_brief: row.buyer_note || '', // 37. 客户尽调简介 (映射买家备注)
        assigned_salesman: '', // 38. 归属业务员
        unionID: row.unionid || '', // 39. unionID
        openID: row.openid || '', // 40. OpenID

        // 分组标记字段
        _isFirstItem: isFirstItem,
        _rowSpan: isFirstItem ? orderNoCount.get(row.order_no) : 0,
        // 原有衍生字段
        status_cn: statusMapCn[row.status] || row.status,
        delivery_method: '快递',
        receiver_name: addr.name || '',
        receiver_phone: addr.phone || '',
        province: addr.province || '',
        city: addr.city || '',
        district: addr.district || '',
        detail: addr.detail || '',
        receiver_address: receiverAddress,
        goods_amount_yuan: (Number(row.goods_amount || 0) / 100).toFixed(2),
        paid_amount_yuan: (Number(row.paid_amount || 0) / 100).toFixed(2),
        freight_amount_yuan: (Number(row.freight_amount || 0) / 100).toFixed(2),
        discount_amount_yuan: (Number(row.discount_amount || 0) / 100).toFixed(2),
        manual_adjust_amount_yuan: (Number(row.manual_adjust_amount || 0) / 100).toFixed(2),
        sale_price_yuan: (Number(row.sale_price || 0) / 100).toFixed(2),
        total_price_yuan: (Number(row.total_price || 0) / 100).toFixed(2),
        carrier_cn: carrierCn,
        item_shipped: row.shipped_at ? '已发货' : '未发货',
        after_sale: refundAmount > 0 ? '已退款' : '',
        refund_amount_yuan: (refundAmount / 100).toFixed(2),
        payment_method: '微信支付',
        is_presale: '否',
      };
    });

    res.json({
      total,
      page,
      pageSize,
      orders,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Order detail
router.get('/:orderNo', async (req, res) => {
  try {
    const { orderNo } = req.params;

    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT 
        o.*, 
        u.openid, u.unionid, u.nickname, u.phone, u.avatar_url
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.order_no = ?
      LIMIT 1`,
      [orderNo]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT 
        oi.*,
        COALESCE(oi.sku_code, ps.sku_code) as sku_code,
        COALESCE(sl.sku_title, oi.sku_title) as sku_name,
        COALESCE(ps.cover_url, sl.cover_url, p.cover_url) as cover_url
      FROM order_items oi
      LEFT JOIN product_skus ps ON oi.sku_id = ps.id
      LEFT JOIN sku_library sl ON sl.sku_code = COALESCE(oi.sku_code, ps.sku_code)
      LEFT JOIN products p ON p.id = COALESCE(ps.product_id, oi.sku_id)
      WHERE oi.order_no = ?`,
      [orderNo]
    );

    // Get payments
    const [payments] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM payments WHERE order_no = ? ORDER BY created_at DESC`,
      [orderNo]
    );

    // Get shipments
    const [shipments] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM shipments WHERE order_no = ? ORDER BY created_at DESC`,
      [orderNo]
    );

    // Get refunds
    const [refunds] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM refunds WHERE order_no = ? ORDER BY created_at DESC`,
      [orderNo]
    );

    res.json({
      order,
      items,
      payments,
      shipments,
      refunds,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual shipment entry (with carrier selection)
// POST /api/v1/admin/orders/:orderNo/shipment
// Body: { trackingNo: string, carrierCode?: 'JD' | 'SF' | 'ZTO' }
const VALID_CARRIERS = ['JD', 'SF', 'ZTO'] as const;

router.post('/:orderNo/shipment', async (req, res) => {
  try {
    const { orderNo } = req.params;
    const trackingNo = String((req.body as any)?.trackingNo || '').trim();
    // 物流公司：默认京东快递(JD)，可选顺丰(SF)
    const rawCarrier = String((req.body as any)?.carrierCode || 'JD').trim().toUpperCase();
    const carrierCode = VALID_CARRIERS.includes(rawCarrier as any) ? rawCarrier : 'JD';

    if (!orderNo) return res.status(400).json({ error: 'orderNo required' });
    if (!trackingNo) return res.status(400).json({ error: 'trackingNo required' });
    if (trackingNo.length > 64) return res.status(400).json({ error: 'trackingNo too long' });

    // ensure order exists
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT order_no FROM orders WHERE order_no = ? LIMIT 1`,
      [orderNo]
    );
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // find latest shipment for this order
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM shipments WHERE order_no = ? ORDER BY id DESC LIMIT 1`,
      [orderNo]
    );
    const nowSql = `CURRENT_TIMESTAMP`;
    if (rows && rows.length > 0) {
      const id = (rows[0] as any).id;
      // overwrite latest
      await pool.query(
        `UPDATE shipments
         SET carrier_code = ?,
             tracking_no = ?,
             status = 'CREATED',
             shipped_at = ${nowSql},
             delivered_at = NULL
         WHERE id = ?`,
        [carrierCode, trackingNo, id]
      );
    } else {
      // insert new
      await pool.query(
        `INSERT INTO shipments (order_no, carrier_code, tracking_no, status, shipped_at, delivered_at)
         VALUES (?, ?, ?, 'CREATED', ${nowSql}, NULL)`,
        [orderNo, carrierCode, trackingNo]
      );
    }

    // 自动更新订单状态为已发货（仅针对待发货状态）
    await pool.query(
      `UPDATE orders SET status = 'SHIPPED' WHERE order_no = ? AND status IN ('WAIT_SHIP', 'PAID')`,
      [orderNo]
    );

    // 记录变更日志
    await logOrderChange({
      order_no: orderNo,
      change_type: OrderChangeType.SHIPMENT,
      field_name: 'shipment',
      new_value: JSON.stringify({ carrierCode, trackingNo }),
      operator: 'ADMIN',
      reason: '管理员录入物流信息'
    });

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

// Manual close
router.post('/:orderNo/close', async (req, res) => {
  try {
    const { orderNo } = req.params;

    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM orders WHERE order_no = ? LIMIT 1`,
      [orderNo]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Only allow closing unpaid-ish orders (兼容历史状态命名)
    if (!['PENDING_FREIGHT', 'PENDING_PAYMENT', 'WAIT_SHIP'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot close this order status' });
    }

    // Update order status
    await pool.query(
      `UPDATE orders SET status = 'CLOSED_UNPAID' WHERE order_no = ?`,
      [orderNo]
    );

    // 记录变更日志
    await logOrderChange({
      order_no: orderNo,
      change_type: OrderChangeType.CLOSE,
      field_name: 'status',
      old_value: order.status,
      new_value: 'CLOSED_UNPAID',
      operator: 'ADMIN',
      reason: '管理员手动关闭订单'
    });

    // TODO: Call WeChat close order API if payment exists
    // TODO: Release inventory reservation

    res.json({ success: true, message: 'Order closed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual reopen (开单)
router.post('/:orderNo/reopen', async (req, res) => {
  try {
    const { orderNo } = req.params;
    const { targetStatus } = req.body;

    // 验证目标状态
    const ALLOWED_TARGET_STATUS = ['PENDING_FREIGHT', 'PENDING_PAYMENT', 'WAIT_SHIP'];
    if (!targetStatus || !ALLOWED_TARGET_STATUS.includes(targetStatus)) {
      return res.status(400).json({ 
        error: '请选择有效的目标状态', 
        allowed: ALLOWED_TARGET_STATUS 
      });
    }

    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM orders WHERE order_no = ? LIMIT 1`,
      [orderNo]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const order = orders[0];

    // 只允许重新打开已关闭的订单
    if (order.status !== 'CLOSED_UNPAID') {
      return res.status(400).json({ error: '只能重新打开已关闭(未支付)的订单' });
    }

    // Update order status
    await pool.query(
      `UPDATE orders SET status = ? WHERE order_no = ?`,
      [targetStatus, orderNo]
    );

    // 记录变更日志
    await logOrderChange({
      order_no: orderNo,
      change_type: OrderChangeType.REOPEN,
      field_name: 'status',
      old_value: order.status,
      new_value: targetStatus,
      operator: 'ADMIN',
      reason: '管理员手动开单（重新打开订单）'
    });

    res.json({ success: true, message: '订单已重新打开' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get order change logs
router.get('/:orderNo/change-logs', async (req, res) => {
  try {
    const { orderNo } = req.params;
    const logs = await getOrderChangeLogs(orderNo);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete order (only for CLOSED_UNPAID, PENDING_PAYMENT, CANCELLED orders)
router.delete('/:orderNo', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { orderNo } = req.params;

    // Check order exists and get status
    const [orders] = await conn.query<RowDataPacket[]>(
      `SELECT * FROM orders WHERE order_no = ? LIMIT 1`,
      [orderNo]
    );

    if (orders.length === 0) {
      await conn.release();
      return res.status(404).json({ error: '订单不存在' });
    }

    const order = orders[0] as any;

    // Only allow deleting unpaid/cancelled orders
    const ALLOWED_DELETE_STATUS = ['CLOSED_UNPAID', 'PENDING_PAYMENT', 'CANCELLED'];
    if (!ALLOWED_DELETE_STATUS.includes(order.status)) {
      await conn.release();
      return res.status(400).json({ 
        error: '只能删除已关闭(未支付)、待支付或已取消的订单',
        current_status: order.status 
      });
    }

    // Backup order data before deletion
    try {
      const backupDir = path.join(process.cwd(), 'backups', 'deleted_orders');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const backupFile = path.join(backupDir, `deleted_order_${orderNo}_${timestamp}.sql`);

      // Fetch all related data
      const [items] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM order_items WHERE order_no = ?`,
        [orderNo]
      );
      const [payments] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM payments WHERE order_no = ?`,
        [orderNo]
      );
      const [shipments] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM shipments WHERE order_no = ?`,
        [orderNo]
      );
      const [refunds] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM refunds WHERE order_no = ?`,
        [orderNo]
      );
      const [reservations] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM inventory_reservation WHERE order_no = ?`,
        [orderNo]
      );
      const [changeLogs] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM order_change_log WHERE order_no = ?`,
        [orderNo]
      );

      // Generate SQL backup
      let backupSql = `-- Backup of order ${orderNo} deleted at ${new Date().toISOString()}\n`;
      backupSql += `-- Order status: ${order.status}\n\n`;

      // Orders table
      backupSql += `-- Orders\n`;
      backupSql += generateInsertSQL('orders', [order]);
      backupSql += `\n`;

      // Order items
      if ((items as any[]).length > 0) {
        backupSql += `-- Order Items\n`;
        backupSql += generateInsertSQL('order_items', items as any[]);
        backupSql += `\n`;
      }

      // Payments
      if ((payments as any[]).length > 0) {
        backupSql += `-- Payments\n`;
        backupSql += generateInsertSQL('payments', payments as any[]);
        backupSql += `\n`;
      }

      // Shipments
      if ((shipments as any[]).length > 0) {
        backupSql += `-- Shipments\n`;
        backupSql += generateInsertSQL('shipments', shipments as any[]);
        backupSql += `\n`;
      }

      // Refunds
      if ((refunds as any[]).length > 0) {
        backupSql += `-- Refunds\n`;
        backupSql += generateInsertSQL('refunds', refunds as any[]);
        backupSql += `\n`;
      }

      // Inventory reservations
      if ((reservations as any[]).length > 0) {
        backupSql += `-- Inventory Reservations\n`;
        backupSql += generateInsertSQL('inventory_reservation', reservations as any[]);
        backupSql += `\n`;
      }

      // Change logs
      if ((changeLogs as any[]).length > 0) {
        backupSql += `-- Change Logs\n`;
        backupSql += generateInsertSQL('order_change_log', changeLogs as any[]);
        backupSql += `\n`;
      }

      fs.writeFileSync(backupFile, backupSql, 'utf8');
    } catch (backupErr: any) {
      console.error('Backup failed:', backupErr);
      await conn.release();
      return res.status(500).json({ error: '备份订单数据失败: ' + backupErr.message });
    }

    // Start transaction to delete all related data
    await conn.beginTransaction();

    try {
      // Delete in reverse order of foreign key dependencies
      await conn.query(`DELETE FROM order_change_log WHERE order_no = ?`, [orderNo]);
      await conn.query(`DELETE FROM shipments WHERE order_no = ?`, [orderNo]);
      await conn.query(`DELETE FROM refunds WHERE order_no = ?`, [orderNo]);
      await conn.query(`DELETE FROM payments WHERE order_no = ?`, [orderNo]);
      await conn.query(`DELETE FROM inventory_reservation WHERE order_no = ?`, [orderNo]);
      await conn.query(`DELETE FROM order_items WHERE order_no = ?`, [orderNo]);
      await conn.query(`DELETE FROM orders WHERE order_no = ?`, [orderNo]);

      await conn.commit();

      res.json({ 
        success: true, 
        message: '订单已删除',
        order_no: orderNo,
        deleted_at: new Date().toISOString()
      });
    } catch (deleteErr: any) {
      await conn.rollback();
      throw deleteErr;
    }
  } catch (err: any) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: err.message || '删除订单失败' });
  } finally {
    await conn.release();
  }
});

/**
 * Generate INSERT SQL statement from data rows
 */
function generateInsertSQL(tableName: string, rows: any[]): string {
  if (!rows || rows.length === 0) return '';

  const keys = Object.keys(rows[0]);
  let sql = `INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES\n`;

  const valueRows = rows.map(row => {
    const values = keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      return val;
    });
    return `  (${values.join(', ')})`;
  });

  sql += valueRows.join(',\n') + ';\n';
  return sql;
}

export default router;

