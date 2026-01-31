import { Router } from 'express';
import { storage } from '../../storage';

/**
 * 房源商城公开接口
 * 供H5前端商城展示房源商品
 */
const router = Router();

function toInt(v: any, fallback: number) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * GET /api/v1/properties/mall - 获取上架房源列表
 * Query参数：
 *  - page: 页码，默认1
 *  - pageSize: 每页数量，默认20，最大100
 *  - keyword: 关键词搜索（小区名称、地址）
 *  - categoryId: 分类ID筛选
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(toInt(req.query.page, 1), 1);
    const pageSize = Math.min(Math.max(toInt(req.query.pageSize, 20), 1), 100);
    const keyword = String((req.query.keyword as string) || '').trim();
    const categoryId = toInt(req.query.categoryId, 0);

    const result = storage.properties.listMall({
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
      data: result.list, // 兼容前端不同的字段名
      properties: result.list 
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/properties/mall/categories - 获取所有房源分类
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = storage.categories.listEnabled();
    res.json({ categories });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/v1/properties/mall/:id - 获取房源商品详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const property = storage.properties.findMallById(id);

    if (!property) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '房源不存在或已下架' });
    }

    return res.json({ 
      data: property, 
      property, 
      // 兼容原有商品详情接口格式
      skus: [] // 房源不需要SKU
    });
  } catch (e) {
    next(e);
  }
});

export default router;
