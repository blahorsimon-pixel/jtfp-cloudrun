import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// 获取商品列表
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);
    const keyword = (req.query.keyword as string) || '';
    const categoryId = parseInt(req.query.categoryId as string || '0', 10);

    const result = storage.products.listEnabled({
      page,
      pageSize,
      keyword: keyword || undefined,
      categoryId: categoryId > 0 ? categoryId : undefined,
    });

    return res.json({
      total: result.total,
      page,
      pageSize,
      list: result.list,
    });
  } catch (e) {
    next(e);
  }
});

// 获取商品详情
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = storage.products.findById(id);

    if (!product || product.status !== 1) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '商品不存在' });
    }

    const skus = storage.products.getSkus(id);

    return res.json({
      product,
      skus,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
