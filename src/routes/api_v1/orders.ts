import { Router } from 'express';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { pool, withTransaction } from '../../db/mysql';
import { genOrderNo } from '../../utils/id';
import { AppError } from '../../utils/errors';
import { requireUserAuth } from '../../middlewares/user_auth';

/**
 * 小程序/前台下单接口
 *
 * POST /api/v1/orders
 * 同时会在 server.ts 中镜像挂载到 /h5/api/api/v1/orders
 *
 * 说明：
 * - 复用并对齐现有 src/routes/orders.ts 的下单逻辑（库存扣减、运费计算、福利码规则等）
 * - 不做 UA 限制（小程序请求 UA 不稳定），鉴权仅依赖 JWT
 */

const router = Router();

const WELFARE_INVALID_MSG = '您输入的福利码错误，请输入正确码，否则无法通过福利通道下单。';

const AddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  region: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  detail: z.string().min(1),
});

const CartItemSchema = z.object({
  productId: z.number().int().positive(),
  skuId: z.number().int().positive().optional(),
  qty: z.number().int().positive(),
});

const CreateOrderReq = z.object({
  items: z.array(CartItemSchema).min(1),
  address: AddressSchema,
  inviteCode: z.string().optional(),
  buyerNote: z.string().max(500).optional(),
});

// 查询商品是否为福利码商品
async function isWelfareProduct(conn: any, productId: number): Promise<boolean> {
  const [rows] = (await conn.query(
    'SELECT is_welfare FROM products WHERE id = ? LIMIT 1',
    [productId]
  )) as [RowDataPacket[], any];
  return rows.length > 0 && Number((rows[0] as any).is_welfare) === 1;
}

router.post('/', requireUserAuth, async (req, res, next) => {
  try {
    const body = CreateOrderReq.parse(req.body);
    const userId = req.user!.userId;

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
      (body as any).address = { ...addr, province: p, city: c, district: d };
    }
    if (
      !((body.address.province || '').trim()) ||
      !((body.address.city || '').trim()) ||
      !((body.address.district || '').trim())
    ) {
      throw new AppError(400, 'BAD_REQUEST', '收货地址省/市/区不完整，请返回确认订单页重新填写');
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
        const qty0 = Number((it0 as any).qty || 0);
        if (qty0 !== 1) {
          throw new AppError(400, 'WELFARE_RULE', '福利通道商品不支持选择数量');
        }
        if ((it0 as any).skuId) {
          throw new AppError(400, 'WELFARE_RULE', '福利通道商品不支持选择规格');
        }
        const code = (body.inviteCode || '').trim();
        if (!/^\d{6}$/.test(code)) {
          throw new AppError(400, 'INVALID_WELFARE_CODE', WELFARE_INVALID_MSG);
        }
        inviteCodeToSave = code;

        // 福利码主表：status=1 且 used_count < max_usage
        const [wcRows] = await conn.query<RowDataPacket[]>(
          `SELECT id, code, price_cent, note, status, max_usage, used_count
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
        const wc: any = wcRows[0];

        // 设置买家备注为福利码备注（优先）
        const welfareNote = (wc.note == null ? '' : String(wc.note)).trim();
        buyerNoteToSave = welfareNote ? welfareNote : null;

        // 查询福利码关联的SKU明细
        const [itemRows] = await conn.query<RowDataPacket[]>(
          `SELECT wci.id, wci.sku_library_id, wci.sku_code, wci.sku_title, wci.quantity, wci.price_cent
           FROM welfare_code_items wci
           WHERE wci.welfare_code_id = ?
           ORDER BY wci.id ASC`,
          [wc.id]
        );

        if (itemRows.length > 0) {
          // 多SKU福利码：每个SKU单独一条 order_items 记录
          for (const item of itemRows as any[]) {
            const skuPrice = Number(item.price_cent || 0);
            const skuQty = Number(item.quantity || 1);
            const itemTotal = skuPrice * skuQty;

            // sku_id 使用 sku_library_id（如有），否则用负数ID标记为福利码SKU
            const skuIdForItem = item.sku_library_id || -(item.id as number);

            orderItems.push([
              orderNo,
              skuIdForItem,
              item.sku_title || '福利商品',
              item.sku_code || null,
              skuQty,
              skuPrice,
              itemTotal,
              JSON.stringify({ welfareCode: code, skuCode: item.sku_code }),
            ]);
          }
          // goodsAmount = 福利码实付总价（可能有优惠）
          goodsAmount = Number(wc.price_cent || 0);
        } else {
          // 兼容旧数据：没有SKU明细时，使用福利码的 price_cent 作为单条记录
          const [prodRows] = await conn.query<RowDataPacket[]>(
            `SELECT id, title FROM products WHERE id = ? LIMIT 1`,
            [welfareProductId]
          );
          const prodTitle = (prodRows as any[])[0]?.title || '福利商品';
          const salePrice = Number(wc.price_cent || 0);

          orderItems.push([
            orderNo,
            welfareProductId,
            prodTitle,
            null,
            1,
            salePrice,
            salePrice,
            JSON.stringify({ welfareCode: code }),
          ]);
          goodsAmount = salePrice;
        }
      } else {
        // ========== 非福利码订单：普通逻辑 ==========
        // forbid mixing welfare product with others
        for (const it of body.items) {
          if (await isWelfareProduct(conn, Number((it as any).productId))) {
            throw new AppError(400, 'WELFARE_RULE', '福利通道商品不支持与其他商品合并下单');
          }
        }

        for (const item of body.items) {
          const qty = Number((item as any).qty || 0);
          if (qty <= 0) throw new AppError(400, 'BAD_REQUEST', 'qty invalid');

          if ((item as any).skuId) {
            // Multi-SKU: lock sku row
            const [skuRows]: any = await conn.query(
              `SELECT s.id, s.product_id, s.sku_title, s.sku_code, s.sku_attrs, s.price_cent, s.stock, s.status,
                      p.title as product_title, p.status as product_status
               FROM product_skus s
               JOIN products p ON p.id = s.product_id
               WHERE s.id = ? AND s.product_id = ? FOR UPDATE`,
              [(item as any).skuId, (item as any).productId]
            );
            if (!skuRows.length) throw new AppError(404, 'NOT_FOUND', `SKU ${(item as any).skuId} not found`);
            const sku = skuRows[0];
            if (sku.product_status !== 1) throw new AppError(400, 'SKU_OFFLINE', `商品已下架：${sku.product_title}`);
            if (sku.status !== 1) throw new AppError(400, 'SKU_OFFLINE', `规格已下架：${sku.sku_title}`);
            if (Number(sku.stock || 0) < qty)
              throw new AppError(400, 'OUT_OF_STOCK', `库存不足：${sku.product_title} ${sku.sku_title}`);

            const salePrice = Number(sku.price_cent || 0);
            const itemTotal = salePrice * qty;
            goodsAmount += itemTotal;

            const skuTitle = `${sku.product_title} ${sku.sku_title}`.trim();
            const skuAttrs = sku.sku_attrs ? JSON.stringify(sku.sku_attrs) : null;

            orderItems.push([orderNo, sku.id, skuTitle, sku.sku_code || null, qty, salePrice, itemTotal, skuAttrs]);

            await conn.query('UPDATE product_skus SET stock = stock - ? WHERE id=?', [qty, sku.id]);
          } else {
            // Legacy single product: lock product row
            const [prodRows]: any = await conn.query(
              `SELECT id, title, price_cent, stock, status FROM products WHERE id = ? FOR UPDATE`,
              [(item as any).productId]
            );
            if (!prodRows.length) throw new AppError(404, 'NOT_FOUND', `Product ${(item as any).productId} not found`);
            const prod = prodRows[0];
            if (prod.status !== 1) throw new AppError(400, 'SKU_OFFLINE', `商品已下架：${prod.title}`);
            if (Number(prod.stock || 0) < qty) throw new AppError(400, 'OUT_OF_STOCK', `库存不足：${prod.title}`);

            const salePrice = Number(prod.price_cent || 0);
            const itemTotal = salePrice * qty;
            goodsAmount += itemTotal;

            orderItems.push([orderNo, prod.id, prod.title, null, qty, salePrice, itemTotal, null]);

            await conn.query('UPDATE products SET stock = stock - ? WHERE id=?', [qty, prod.id]);
          }
        }
      }

      // 运费规则：根据商品个性化设置计算
      let maxShippingFeeCent = 1500; // 默认运费15元
      let maxFreeShippingQty = 2; // 默认2件包邮

      const totalQty = isWelfareOrder
        ? orderItems.reduce((sum, it) => sum + Number(it[4] || 0), 0)
        : body.items.reduce((sum, it) => sum + Number((it as any).qty || 0), 0);

      if (!isWelfareOrder) {
        const productIds = body.items.map((it) => Number((it as any).productId));
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
        const [welfareProductRows] = await conn.query<RowDataPacket[]>(
          `SELECT shipping_fee_cent, free_shipping_qty FROM products WHERE id = ?`,
          [welfareProductId]
        );
        if (welfareProductRows.length > 0) {
          const row: any = (welfareProductRows as any[])[0];
          maxShippingFeeCent = Number(row.shipping_fee_cent ?? 1500);
          maxFreeShippingQty = Number(row.free_shipping_qty ?? 2);
        }
      }

      const freightAmount =
        maxFreeShippingQty === 0 || totalQty < maxFreeShippingQty ? maxShippingFeeCent : 0;

      // 福利码专拍：不再有运费补贴
      const manualAdjustAmount = 0;

      const totalAmount = Math.max(0, goodsAmount + freightAmount + manualAdjustAmount);

      await conn.query(
        'INSERT INTO orders (order_no, user_id, type, status, total_amount, goods_amount, freight_amount, discount_amount, manual_adjust_amount, points_cost, address_snapshot, invite_code, buyer_note, version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)',
        [
          orderNo,
          userId,
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

      if (orderItems.length > 0) {
        await conn.query(
          'INSERT INTO order_items (order_no, sku_id, sku_title, sku_code, quantity, sale_price, total_price, sku_attrs) VALUES ?',
          [orderItems]
        );
      }

      return { orderNo, totalAmount, goodsAmount, freightAmount };
    });

    return res.json({
      orderNo: result.orderNo,
      status: 'WAIT_SHIP',
      totalAmountCent: result.totalAmount,
      freightAmountCent: result.freightAmount,
      goodsAmountCent: result.goodsAmount,
    });
  } catch (e) {
    next(e);
  }
});

export default router;

