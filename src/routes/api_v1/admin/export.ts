import { Router } from 'express';
import { pool } from '../../../db/mysql';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import ExcelJS from 'exceljs';
import type { RowDataPacket } from 'mysql2/promise';

const router = Router();

router.use(requireAdminToken);

// Status mapping to Chinese
const statusMap: Record<string, string> = {
  PENDING_FREIGHT: '待处理',
  WAIT_SHIP: '待处理',
  SHIPPED: '已发货',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CLOSED_UNPAID: '已关闭',
  CANCELLED: '已取消',
};

// Carrier code mapping
const carrierMap: Record<string, string> = {
  JD: '京东',
  SF: '顺丰',
  YTO: '圆通',
  ZTO: '中通',
  STO: '申通',
  EMS: 'EMS',
};

interface ExportQuery {
  status?: string;
  orderNo?: string;
  phone?: string; // receiver phone (from address_snapshot / user.phone)
  inviteCode?: string; // o.invite_code
  startDate?: string; // legacy: YYYY-MM-DD
  endDate?: string; // legacy: YYYY-MM-DD
  startAt?: string; // new: YYYY-MM-DD HH:mm:ss
  endAt?: string; // new: YYYY-MM-DD HH:mm:ss
}

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

function normalizeRange(query: ExportQuery): { startAt?: string; endAt?: string } {
  const startAt = query.startAt ?? (query.startDate ? `${query.startDate} 00:00:00` : undefined);
  const endAt = query.endAt ?? (query.endDate ? `${query.endDate} 23:59:59` : undefined);
  return { startAt, endAt };
}

router.get('/', async (req, res) => {
  try {
    const query = req.query as ExportQuery;

    // Build WHERE clause
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

    // Fetch orders with all related data
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
        oi.sku_id,
        oi.sku_title,
        oi.quantity,
        oi.sale_price,
        oi.total_price,
        oi.sku_attrs,
        p.id as product_id,
        COALESCE(ps.cover_url, sl.cover_url, p.cover_url) as cover_url,
        COALESCE(oi.sku_code, ps.sku_code) as sku_code,
        COALESCE(sl.sku_title, oi.sku_title) as sku_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.order_no = oi.order_no
      LEFT JOIN product_skus ps ON oi.sku_id = ps.id
      LEFT JOIN sku_library sl ON sl.sku_code = COALESCE(oi.sku_code, ps.sku_code)
      LEFT JOIN products p ON p.id = COALESCE(ps.product_id, oi.sku_id)
      ${whereClause}
      ORDER BY o.created_at DESC, o.order_no, oi.id`,
      params
    );

    // Fetch payments, shipments, refunds for all matching orders
    const orderNos = [...new Set(rows.map((r: any) => r.order_no))];
    
    const paymentsMap = new Map<string, any[]>();
    const shipmentsMap = new Map<string, any>(); // latest shipment per order
    const refundsMap = new Map<string, number>();

    if (orderNos.length > 0) {
      const [payments] = await pool.query<RowDataPacket[]>(
        `SELECT order_no, status, amount, transaction_id, updated_at
         FROM payments
         WHERE order_no IN (?)
         ORDER BY created_at ASC`,
        [orderNos]
      );

      payments.forEach((p: any) => {
        if (!paymentsMap.has(p.order_no)) {
          paymentsMap.set(p.order_no, []);
        }
        paymentsMap.get(p.order_no)!.push(p);
      });

      const [shipments] = await pool.query<RowDataPacket[]>(
        `SELECT s.order_no, s.carrier_code, s.tracking_no, s.shipped_at, s.delivered_at, s.created_at, s.id
         FROM shipments s
         WHERE s.order_no IN (?)
         ORDER BY s.order_no ASC, s.created_at ASC, s.id ASC`,
        [orderNos]
      );

      // keep latest
      shipments.forEach((s: any) => {
        shipmentsMap.set(s.order_no, s);
      });

      const [refunds] = await pool.query<RowDataPacket[]>(
        `SELECT order_no, SUM(amount) as total_refund
         FROM refunds
         WHERE order_no IN (?) AND status = 'SUCCESS'
         GROUP BY order_no`,
        [orderNos]
      );

      refunds.forEach((r: any) => {
        refundsMap.set(r.order_no, r.total_refund || 0);
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('订单明细');

    // Define columns as per 40listdindang.md
    sheet.columns = [
      { header: '1. 开拍时间', key: 'auction_time', width: 20 },
      { header: '2. 竞价阶段', key: 'bidding_phase', width: 15 },
      { header: '3. 小区名称', key: 'community_name', width: 25 },
      { header: '4. 详细地址', key: 'detail_address', width: 40 },
      { header: '5. 建筑面积/㎡', key: 'building_area', width: 15 },
      { header: '6. 房屋户型', key: 'house_type', width: 15 },
      { header: '7. 楼层', key: 'floor_info', width: 12 },
      { header: '8. 建筑年份', key: 'building_year', width: 12 },
      { header: '9. 装修情况', key: 'decoration_status', width: 15 },
      { header: '10. 物业现状', key: 'property_status', width: 25 },
      { header: '11. 持有年数', key: 'holding_years', width: 12 },
      { header: '12. 物业类型', key: 'property_type', width: 15 },
      { header: '13. 起拍价', key: 'starting_price', width: 12 },
      { header: '14. 起拍单价', key: 'starting_unit_price', width: 12 },
      { header: '15. 竞拍平台', key: 'auction_platform', width: 15 },
      { header: '16. 竞拍保证金', key: 'auction_deposit', width: 15 },
      { header: '17. 加价幅度', key: 'price_increment', width: 12 },
      { header: '18. 评估总价', key: 'evaluation_total_price', width: 12 },
      { header: '19. 评估单价', key: 'evaluation_unit_price', width: 12 },
      { header: '20. 7成可贷金额', key: 'loan_70_percent', width: 15 },
      { header: '21. 8成可贷金额', key: 'loan_80_percent', width: 15 },
      { header: '22. 9成可贷金额', key: 'loan_90_percent', width: 15 },
      { header: '23. 市场参考总价', key: 'market_total_price', width: 15 },
      { header: '24. 市场参考单价', key: 'market_unit_price', width: 15 },
      { header: '25. 学区', key: 'school_district', width: 20 },
      { header: '26. 商圈', key: 'business_circle', width: 20 },
      { header: '27. 捡漏空间', key: 'profit_space', width: 15 },
      { header: '28. 授权码', key: 'auth_code', width: 15 },
      { header: '29. 契税率', key: 'deed_tax_rate', width: 12 },
      { header: '30. 契税金额', key: 'deed_tax_amount', width: 12 },
      { header: '31. 增值税率', key: 'vat_rate', width: 12 },
      { header: '32. 增值税金额', key: 'vat_amount', width: 12 },
      { header: '33. 个税率', key: 'income_tax_rate', width: 12 },
      { header: '34. 个税金额', key: 'income_tax_amount', width: 12 },
      { header: '35. 客户姓名', key: 'customer_name', width: 15 },
      { header: '36. 客户联系号码', key: 'customer_phone', width: 18 },
      { header: '37. 客户尽调简介', key: 'customer_survey_brief', width: 40 },
      { header: '38. 归属业务员', key: 'assigned_salesman', width: 15 },
      { header: '39. unionID', key: 'unionID', width: 30 },
      { header: '40. OpenID', key: 'openID', width: 30 },
    ];

    // Populate rows
    for (const row of rows) {
      const addr: any = safeJsonParse(row.address_snapshot) || {};
      const payments = paymentsMap.get(row.order_no) || [];
      const successPayment = payments.find(p => p.status === 'SUCCESS');
      const paidAmount = payments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0);
      const shipment = shipmentsMap.get(row.order_no);
      const refundAmount = refundsMap.get(row.order_no) || 0;

      // Format datetime to Beijing time (Asia/Shanghai)
      const formatDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
          .replace(/\//g, '-').replace(',', '');
      };

      // Format amount: cent to yuan with 2 decimals
      const toYuan = (cent: number) => (cent / 100).toFixed(2);

      sheet.addRow({
        auction_time: '',
        bidding_phase: '',
        community_name: '',
        detail_address: addr.province && addr.city ? `${addr.province}${addr.city}${addr.district || ''}${addr.detail || ''}` : '',
        building_area: '',
        house_type: '',
        floor_info: '',
        building_year: '',
        decoration_status: '',
        property_status: '',
        holding_years: '',
        property_type: '',
        starting_price: '',
        starting_unit_price: '',
        auction_platform: '',
        auction_deposit: '',
        price_increment: '',
        evaluation_total_price: '',
        evaluation_unit_price: '',
        loan_70_percent: '',
        loan_80_percent: '',
        loan_90_percent: '',
        market_total_price: '',
        market_unit_price: '',
        school_district: '',
        business_circle: '',
        profit_space: '',
        auth_code: row.invite_code || '',
        deed_tax_rate: '',
        deed_tax_amount: '',
        vat_rate: '',
        vat_amount: '',
        income_tax_rate: '',
        income_tax_amount: '',
        customer_name: addr.name || '',
        customer_phone: addr.phone || '',
        customer_survey_brief: row.buyer_note || '',
        assigned_salesman: '',
        unionID: row.unionid || '',
        openID: row.openid || '',
      });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2');
    const filename = `orders-${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;

