import { Router } from 'express';
import { pool } from '../db/mysql';

const router = Router();

// List products for home page (sorted by is_featured and sort_order)
router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        p.id, p.title, p.price_cent, p.stock, p.status, p.cover_url, p.is_featured, p.sort_order, p.is_welfare,
        p.shipping_fee_cent, p.free_shipping_qty,
        (SELECT COUNT(*) FROM product_skus s WHERE s.product_id = p.id AND s.status = 1) as sku_count,
        (SELECT MIN(price_cent) FROM product_skus s WHERE s.product_id = p.id AND s.status = 1) as min_sku_price_cent,
        (SELECT SUM(stock) FROM product_skus s WHERE s.product_id = p.id AND s.status = 1) as sum_sku_stock
       FROM products p
       WHERE p.status=1 
       ORDER BY p.is_featured DESC, p.sort_order DESC, p.id DESC LIMIT 100`
    );
    return res.json({ list: rows });
  } catch (e) {
    next(e);
  }
});

// Product detail (include description for detail page)
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [rows]: any = await pool.query(
      'SELECT id,title,price_cent,stock,status,cover_url,description,is_welfare,shipping_fee_cent,free_shipping_qty FROM products WHERE id=?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ code: 'NOT_FOUND', message: 'product not found' });
    const product = rows[0];
    const [skus]: any = await pool.query(
      `SELECT id, product_id, sku_title, sku_code, sku_attrs, price_cent, stock, status, cover_url
       FROM product_skus
       WHERE product_id = ? AND status = 1
       ORDER BY id DESC`,
      [id]
    );
    // 若存在SKU：返回给前端选择；并提供聚合库存/最低价便于展示
    if (Array.isArray(skus) && skus.length > 0) {
      const sumStock = skus.reduce((sum: number, s: any) => sum + Number(s.stock || 0), 0);
      const minPrice = skus.reduce((min: number, s: any) => Math.min(min, Number(s.price_cent || 0)), Number(skus[0].price_cent || 0));
      product.stock = sumStock;
      product.price_cent = minPrice;
    }
    return res.json({ ...product, skus });
  } catch (e) {
    next(e);
  }
});

export default router;
