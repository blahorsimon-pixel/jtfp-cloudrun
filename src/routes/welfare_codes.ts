import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/mysql';
import type { RowDataPacket } from 'mysql2/promise';

const router = Router();

const QuoteQuery = z.object({
  productId: z.coerce.number().int().positive(),
  code: z.string().regex(/^\d{6}$/),
});

const INVALID_MSG = '您输入的福利码错误，请输入正确码，否则无法通过福利通道下单。';

// Public quote endpoint: validate welfare code and return price/note + SKU items
// GET /welfare/quote?productId=1&code=123456
// 支持多次使用的福利码：status=1 且 used_count < max_usage
router.get('/quote', async (req, res) => {
  const parsed = QuoteQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_PARAMS', message: INVALID_MSG });
  }

  const { productId, code } = parsed.data;
  
  try {
    // 查询福利码主表（支持多次使用：status=1 且 used_count < max_usage）
    const [wcRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, product_id, price_cent, original_price_cent, note, status,
              max_usage, used_count
       FROM welfare_codes
       WHERE product_id = ? AND code = ? AND status = 1 AND used_count < max_usage
       LIMIT 1`,
      [productId, code]
    );
    
    if (!wcRows || wcRows.length === 0) {
      // 检查是否是已用完的福利码（给更友好的提示）
      const [exhaustedRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, max_usage, used_count FROM welfare_codes 
         WHERE product_id = ? AND code = ? AND status = 1 AND used_count >= max_usage
         LIMIT 1`,
        [productId, code]
      );
      if (exhaustedRows && exhaustedRows.length > 0) {
        return res.status(400).json({ 
          code: 'WELFARE_CODE_EXHAUSTED', 
          message: '该福利码已达到最大使用次数，无法再次使用。' 
        });
      }
      return res.status(400).json({ code: 'INVALID_WELFARE_CODE', message: INVALID_MSG });
    }
    
    const wc = wcRows[0];
    const maxUsage = Number(wc.max_usage || 1);
    const usedCount = Number(wc.used_count || 0);
    const remainingUsage = maxUsage - usedCount;
    
    // 查询关联的SKU明细
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        wci.id, wci.sku_library_id, wci.sku_code, wci.sku_title, wci.quantity, wci.price_cent,
        sl.cover_url as sku_cover_url
       FROM welfare_code_items wci
       LEFT JOIN sku_library sl ON sl.id = wci.sku_library_id
       WHERE wci.welfare_code_id = ?
       ORDER BY wci.id ASC`,
      [wc.id]
    );
    
    // 构建SKU明细列表
    const items = (itemRows as any[]).map(item => ({
      id: item.id,
      skuLibraryId: item.sku_library_id,
      skuCode: item.sku_code,
      skuTitle: item.sku_title,
      quantity: item.quantity,
      priceCent: Number(item.price_cent || 0),
      coverUrl: item.sku_cover_url || null,
    }));
    
    return res.json({
      ok: true,
      code: wc.code,
      productId: wc.product_id,
      priceCent: Number(wc.price_cent || 0), // 实付总价
      originalPriceCent: Number(wc.original_price_cent || 0), // 原价汇总
      note: wc.note || '',
      items, // SKU明细列表
      // 多次使用相关字段
      maxUsage,
      usedCount,
      remainingUsage,
    });
  } catch (e: any) {
    return res.status(500).json({ code: 'SERVER_ERROR', message: e?.message || 'server error' });
  }
});

export default router;
