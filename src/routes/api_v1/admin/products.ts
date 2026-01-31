import { Router } from 'express';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import { storage } from '../../../storage';

const router = Router();
router.use(requireAdminToken);

// 获取商品列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);
    const keyword = (req.query.keyword as string) || '';

    const result = storage.products.list({
      page,
      pageSize,
      keyword: keyword || undefined,
    });

    res.json({
      total: result.total,
      page,
      pageSize,
      products: result.products,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取商品详情
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = storage.products.findById(id);

    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    const skus = storage.products.getSkus(id);

    res.json({ product, skus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 创建商品
router.post('/', async (req, res) => {
  try {
    const product = storage.products.create(req.body);
    res.json({ success: true, id: product.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 更新商品
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = storage.products.findById(id);
    if (!existing) {
      return res.status(404).json({ error: '商品不存在' });
    }

    storage.products.update(id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除商品
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    storage.products.remove(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
