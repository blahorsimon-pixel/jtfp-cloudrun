import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// 获取商品评论列表
router.get('/', async (req, res, next) => {
  try {
    const productId = parseInt(req.query.productId as string || '0', 10);
    const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);

    const result = storage.reviews.list({
      productId: productId > 0 ? productId : undefined,
      status: 1,
      page,
      pageSize,
    });

    return res.json({
      total: result.total,
      page,
      pageSize,
      reviews: result.reviews,
    });
  } catch (e) {
    next(e);
  }
});

// 获取商品评分统计
router.get('/stats/:productId', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId, 10);

    const avgRating = storage.reviews.getAverageRating(productId);
    const count = storage.reviews.getReviewCount(productId);

    return res.json({
      average_rating: avgRating,
      review_count: count,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
