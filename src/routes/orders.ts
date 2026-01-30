import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../db/mysql';
import { genOrderNo, genOutTradeNo } from '../utils/id';
import { AppError } from '../utils/errors';
import { isWxConfigured, jsapiPrepay, h5Prepay } from '../services/wxpay';
import { requireWeChatUA } from '../middlewares/wx_guard';
import { extractJwtFromReq } from '../utils/jwt';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

const WELFARE_INVALID_MSG = '您输入的福利码错误，请输入正确码，否则无法通过福利通道下单。';

// 查询商品是否为福利码商品
async function isWelfareProduct(conn: any, productId: number): Promise<boolean> {
  const [rows] = await conn.query(
    'SELECT is_welfare FROM products WHERE id = ? LIMIT 1',
    [productId]
  ) as [RowDataPacket[], any];
  return rows.length > 0 && Number(rows[0].is_welfare) === 1;
}

const AddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  region: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  detail: z.string().min(1)
});

const CartItemSchema = z.object({
  productId: z.number().int().positive(),
  skuId: z.number().int().positive().optional(),
  qty: z.number().int().positive(),
});

const CreateOrderReq = z.object({
  userId: z.number().int().positive().optional(),
  items: z.array(CartItemSchema).min(1),
  address: AddressSchema,
  inviteCode: z.string().optional(),
  buyerNote: z.string().max(500).optional(),
});

router.post('/', requireWeChatUA, async (req, res, next) => {
  try {
    const body = CreateOrderReq.parse(req.body);
    const { payload } = extractJwtFromReq(req);
    const jwtUserId = Number(payload?.sub);
    const finalUserId = Number.isFinite(jwtUserId) && jwtUserId > 0 ? jwtUserId : Number(body.userId || 0);
    if (!finalUserId || !Number.isFinite(finalUserId) || finalUserId <= 0) {
      return res.status(401).json({ code: 'NEED_WECHAT_OAUTH', message: '请先在微信内完成登录授权' });
    }

    // 兜底：从 region 补齐 province/city/district
    const addr: any = body.address || {};
    const province = (addr.province || '').trim();
    const city = (addr.city || '').trim();
    const district = (addr.district || '').trim();
    const region = (addr.region || '').trim();
    if (!province || !city || !district) {
      const parts = region ? region.split(/[\s/]+/).map((s: string) => s.trim()).filter(Boolean) : [];
      const p = province || parts[0] || '';
      const c = city || parts[1] || '';
      const d = district || parts[2] || '';
      body.address = { ...addr, province: p, city: c, district: d };
    }
    if (!(body.address.province || '').trim() || !(body.address.city || '').trim() || !(body.address.district || '').trim()) {
      throw new AppError(400, 'BAD_REQUEST', '收货地址省/市/区不完整，请返回确认订单页重新选择地址');
    }
    const orderNo = genOrderNo('O');

    const buyerNoteFromReq =
      typeof (body as any).buyerNote === 'string' ? String((body as any).buyerNote).trim() : '';
    const buyerNoteNormalized = buyerNoteFromReq ? buyerNoteFromReq.slice(0, 500) : null;

    const result = await withTransaction(async (conn) => {
      let goodsAmount = 0;
      const orderItems: any[][] = [];
      let inviteCodeToSave: string | null = null;
      let buyerNoteToSave: string | null = buyerNoteNormalized;

      // Welfare product: enforce rules - 查询数据库判断是否为福利码商品
      let isWelfareOrder = false;
      let welfareProductId: number | null = null;
      if (body.items.length === 1) {
        const firstProductId = Number(body.items[0].productId);
        if (await isWelfareProduct(conn, firstProductId)) {
          isWelfareOrder = true;
          welfareProductId = firstProductId;
        }
      }
      
      if (isWelfareOrder && welfareProductId) {
        const it0 = body.items[0];
        const qty0 = Number(it0.qty || 0);
        if (qty0 !== 1) {
          throw new AppError(400, 'WELFARE_RULE', '福利通道商品不支持选择数量');
        }
        if (it0.skuId) {
          throw new AppError(400, 'WELFARE_RULE', '福利通道商品不支持选择规格');
        }
        const code = (body.inviteCode || '').trim();
        if (!/^\d{6}$/.test(code)) {
          throw new AppError(400, 'INVALID_WELFARE_CODE', WELFARE_INVALID_MSG);
        }
        inviteCodeToSave = code;

        // ========== 福利码订单：展开为多SKU（支持多次使用） ==========
        // 查询福利码主表：status=1 且 used_count < max_usage
        const [wcRows] = await conn.query<RowDataPacket[]>(
          `SELECT id, code, price_cent, original_price_cent, note, status, max_usage, used_count
           FROM welfare_codes
           WHERE product_id = ? AND code = ? AND status = 1 AND used_count < max_usage
           LIMIT 1 FOR UPDATE`,
          [welfareProductId, code]
        );
        if (!wcRows.length) {
          // 检查是否是已用完的福利码
          const [exhaustedRows] = await conn.query<RowDataPacket[]>(
            `SELECT id, max_usage, used_count FROM welfare_codes 
             WHERE product_id = ? AND code = ? AND status = 1 AND used_count >= max_usage
             LIMIT 1`,
            [welfareProductId, code]
          );
          if (exhaustedRows && exhaustedRows.length > 0) {
            throw new AppError(400, 'WELFARE_CODE_EXHAUSTED', '该福利码已达到最大使用次数，无法再次使用。');
          }
          throw new AppError(400, 'INVALID_WELFARE_CODE', WELFARE_INVALID_MSG);
        }
        const wc = wcRows[0];

        // 设置买家备注为福利码备注
        const welfareNote = (wc.note == null ? '' : String(wc.note)).trim();
        buyerNoteToSave = welfareNote ? welfareNote : null;

        // 查询福利码关联的SKU明细
        const [itemRows] = await conn.query<RowDataPacket[]>(
          `SELECT wci.id, wci.sku_library_id, wci.sku_code, wci.sku_title, wci.quantity, wci.price_cent,
                  sl.cover_url as sku_cover_url
           FROM welfare_code_items wci
           LEFT JOIN sku_library sl ON sl.id = wci.sku_library_id
           WHERE wci.welfare_code_id = ?
           ORDER BY wci.id ASC`,
          [wc.id]
        );

        if (itemRows.length > 0) {
          // 多SKU福利码：每个SKU单独一条order_items记录
          for (const item of itemRows as any[]) {
            const skuPrice = Number(item.price_cent || 0);
            const skuQty = Number(item.quantity || 1);
            const itemTotal = skuPrice * skuQty;
            
            // sku_id 使用 sku_library_id（如有），否则用负数ID标记为福利码SKU
            const skuIdForItem = item.sku_library_id || -(item.id);
            
            orderItems.push([
              orderNo,
              skuIdForItem,
              item.sku_title || '福利商品',
              item.sku_code || null, // 直接存储 sku_code
              skuQty,
              skuPrice,
              itemTotal,
              JSON.stringify({ welfareCode: code, skuCode: item.sku_code }), // 记录来源
            ]);
          }
          // goodsAmount = 福利码实付总价（可能有优惠）
          goodsAmount = Number(wc.price_cent || 0);
        } else {
          // 兼容旧数据：没有SKU明细时，使用福利码的price_cent作为单条记录
          const [prodRows] = await conn.query<RowDataPacket[]>(
            `SELECT id, title FROM products WHERE id = ? LIMIT 1`,
            [welfareProductId]
          );
          const prodTitle = prodRows[0]?.title || '福利商品';
          const salePrice = Number(wc.price_cent || 0);
          
          orderItems.push([
            orderNo,
            welfareProductId,
            prodTitle,
            null, // sku_code (旧数据无SKU编码)
            1,
            salePrice,
            salePrice,
            JSON.stringify({ welfareCode: code }),
          ]);
          goodsAmount = salePrice;
        }

      } else {
        // ========== 非福利码订单：普通逻辑 ==========
        // Not welfare order: forbid mixing welfare product with others
        // 检查是否有任何福利码商品混入普通订单
        for (const it of body.items) {
          if (await isWelfareProduct(conn, Number(it.productId))) {
            throw new AppError(400, 'WELFARE_RULE', '福利通道商品不支持与其他商品合并下单');
          }
        }

        for (const item of body.items) {
          const qty = item.qty;
          if (item.skuId) {
            // Multi-SKU: lock sku row
            const [skuRows]: any = await conn.query(
              `SELECT s.id, s.product_id, s.sku_title, s.sku_code, s.sku_attrs, s.price_cent, s.stock, s.status,
                      p.title as product_title, p.status as product_status, p.cover_url as product_cover
               FROM product_skus s
               JOIN products p ON p.id = s.product_id
               WHERE s.id = ? AND s.product_id = ? FOR UPDATE`,
              [item.skuId, item.productId]
            );
            if (!skuRows.length) throw new AppError(404, 'NOT_FOUND', `SKU ${item.skuId} not found`);
            const sku = skuRows[0];
            if (sku.product_status !== 1) throw new AppError(400, 'SKU_OFFLINE', `商品已下架：${sku.product_title}`);
            if (sku.status !== 1) throw new AppError(400, 'SKU_OFFLINE', `规格已下架：${sku.sku_title}`);
            if (sku.stock < qty) throw new AppError(400, 'OUT_OF_STOCK', `库存不足：${sku.product_title} ${sku.sku_title}`);

            const salePrice = Number(sku.price_cent || 0);
            const itemTotal = salePrice * qty;
            goodsAmount += itemTotal;

            const skuTitle = `${sku.product_title} ${sku.sku_title}`.trim();
            const skuAttrs = sku.sku_attrs ? JSON.stringify(sku.sku_attrs) : null;

            orderItems.push([
              orderNo, sku.id, skuTitle, sku.sku_code || null, qty, salePrice, itemTotal, skuAttrs
            ]);

            await conn.query('UPDATE product_skus SET stock = stock - ? WHERE id=?', [qty, sku.id]);
          } else {
            // Legacy single product: lock product row
            const [prodRows]: any = await conn.query(
              `SELECT id, title, price_cent, stock, status FROM products WHERE id = ? FOR UPDATE`,
              [item.productId]
            );
            if (!prodRows.length) throw new AppError(404, 'NOT_FOUND', `Product ${item.productId} not found`);
            const prod = prodRows[0];
            if (prod.status !== 1) throw new AppError(400, 'SKU_OFFLINE', `商品已下架：${prod.title}`);
            if (prod.stock < qty) throw new AppError(400, 'OUT_OF_STOCK', `库存不足：${prod.title}`);

            const salePrice = Number(prod.price_cent || 0);
            const itemTotal = salePrice * qty;
            goodsAmount += itemTotal;

            orderItems.push([
              orderNo,
              prod.id,
              prod.title,
              null, // sku_code (单商品无SKU编码)
              qty,
              salePrice,
              itemTotal,
              null,
            ]);

            await conn.query('UPDATE products SET stock = stock - ? WHERE id=?', [qty, prod.id]);
          }
        }
      }

      // 运费规则：根据商品个性化设置计算
      // 获取订单中所有商品的运费设置
      let maxShippingFeeCent = 1500; // 默认运费15元
      let maxFreeShippingQty = 2; // 默认2件包邮

      // 福利码订单：按SKU总数量计算
      const totalQty = isWelfareOrder 
        ? orderItems.reduce((sum, it) => sum + Number(it[4] || 0), 0) // 索引4是quantity
        : body.items.reduce((sum, it) => sum + it.qty, 0);

      if (!isWelfareOrder) {
        // 非福利码订单：查询所有商品的运费设置，取最高值
        const productIds = body.items.map(it => it.productId);
        const [shippingRows] = await conn.query<RowDataPacket[]>(
          `SELECT id, shipping_fee_cent, free_shipping_qty FROM products WHERE id IN (?)`,
          [productIds]
        );
        for (const row of shippingRows as any[]) {
          const shippingFee = Number(row.shipping_fee_cent ?? 1500);
          const freeQty = Number(row.free_shipping_qty ?? 2);
          if (shippingFee > maxShippingFeeCent) maxShippingFeeCent = shippingFee;
          if (freeQty > maxFreeShippingQty) maxFreeShippingQty = freeQty;
        }
      } else {
        // 福利码订单：查询福利码商品的运费设置
        const [welfareProductRows] = await conn.query<RowDataPacket[]>(
          `SELECT shipping_fee_cent, free_shipping_qty FROM products WHERE id = ?`,
          [welfareProductId]
        );
        if (welfareProductRows.length > 0) {
          const row = welfareProductRows[0] as any;
          maxShippingFeeCent = Number(row.shipping_fee_cent ?? 1500);
          maxFreeShippingQty = Number(row.free_shipping_qty ?? 2);
        }
      }

      // 计算运费：如果包邮件数为0表示不包邮，否则判断是否达到包邮件数
      const freightAmount = (maxFreeShippingQty === 0 || totalQty < maxFreeShippingQty) 
        ? maxShippingFeeCent 
        : 0;

      // 福利码专拍：不再有运费补贴
      const manualAdjustAmount = 0;

      const totalAmount = Math.max(0, goodsAmount + freightAmount + manualAdjustAmount);

      await conn.query(
        'INSERT INTO orders (order_no, user_id, type, status, total_amount, goods_amount, freight_amount, discount_amount, manual_adjust_amount, points_cost, address_snapshot, invite_code, buyer_note, version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)',
        [
          orderNo,
          finalUserId,
          'NORMAL',
          'WAIT_SHIP',
          totalAmount,
          goodsAmount,
          freightAmount,
          0,
          manualAdjustAmount,
          0,
          JSON.stringify(body.address),
          inviteCodeToSave,
          buyerNoteToSave,
        ]
      );

      // order_items
      if (orderItems.length > 0) {
        await conn.query(
          'INSERT INTO order_items (order_no, sku_id, sku_title, sku_code, quantity, sale_price, total_price, sku_attrs) VALUES ?',
          [orderItems]
        );
      }
      
      return { orderNo, totalAmount, goodsAmount, freightAmount };
    });

    return res.json({ orderNo: result.orderNo, status: 'WAIT_SHIP', totalAmountCent: result.totalAmount, freightAmountCent: result.freightAmount, goodsAmountCent: result.goodsAmount });
  } catch (e) { next(e); }
});

const PayReq = z.object({
  payScene: z.enum(['JSAPI','MWEB']),
  wxOpenId: z.string().optional(),
  returnUrl: z.string().url().optional(),
});

router.post('/:orderNo/pay', requireWeChatUA, async (req, res, next) => {
  return res.status(400).json({ code: 'PAYMENT_DISABLED', message: '支付功能已禁用' });
  /* 禁用支付逻辑
  try {
    const { orderNo } = req.params;
    const body = PayReq.parse(req.body);
    const ua = (req.headers['user-agent'] || '').toString();
    const isWeChatUa = /MicroMessenger/i.test(ua);

    const [rows]: any = await pool.query('SELECT order_no,status,total_amount FROM orders WHERE order_no=?', [orderNo]);
    if (!rows.length) throw new AppError(404, 'ORDER_NOT_FOUND', 'order not found');
    const order = rows[0];
    if (order.status !== 'PENDING_PAYMENT') throw new AppError(409, 'ORDER_STATE_CONFLICT', 'order not pending payment');

    const outTradeNo = genOutTradeNo('P');
    await pool.query('INSERT INTO payments (order_no,type,channel,out_trade_no,amount,status,idempotency_key) VALUES (?,?,?,?,?,?,?)',
      [orderNo, 'ORDER', 'WECHAT', outTradeNo, order.total_amount, 'PENDING', `${orderNo}:${outTradeNo}`]);

    if (!isWxConfigured()) {
      return res.status(400).json({ code: 'WXPAY_NOT_CONFIGURED', message: '微信支付未配置，无法预下单', data: { outTradeNo } });
    }

    if (!isWeChatUa) {
      return res.status(400).json({ code: 'NOT_WECHAT_ENV', message: 'Please open in WeChat' });
    }
    const redirectUrl = `/h5/pay/checkout.html?orderNo=${encodeURIComponent(orderNo)}`;
    return res.json({ scene: 'JSAPI', mweb_url: redirectUrl, outTradeNo, code: 'WX_ONLY_REDIRECT' });
  } catch (e) { next(e); }
  */
});

export default router;
