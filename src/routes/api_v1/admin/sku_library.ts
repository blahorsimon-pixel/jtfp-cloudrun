import { Router } from 'express';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import { storage } from '../../../storage';

const router = Router();
router.use(requireAdminToken);

// 获取 SKU 列表（从所有商品中聚合）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);

    // 获取所有商品的 SKU
    const allProducts = storage.products.list({ pageSize: 10000 });
    const allSkus: any[] = [];

    for (const product of allProducts.products) {
      const skus = storage.products.getSkus(product.id);
      skus.forEach(sku => {
        allSkus.push({
          ...sku,
          product_title: product.title,
        });
      });
    }

    const total = allSkus.length;
    const offset = (page - 1) * pageSize;
    const paginated = allSkus.slice(offset, offset + pageSize);

    res.json({
      total,
      page,
      pageSize,
      skus: paginated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 根据 SKU Code 查询
router.get('/by-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const sku = storage.products.findSkuByCode(code);

    if (!sku) {
      return res.status(404).json({ error: 'SKU 不存在' });
    }

    const product = storage.products.findById(sku.product_id);

    res.json({
      sku,
      product,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
