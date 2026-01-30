import { Router } from 'express';

const router = Router();

// GET /redeem/catalog
router.get('/catalog', async (_req, res) => {
  // TODO: 查询 redemption_sku + 库存
  return res.json({ list: [], total: 0 });
});

// GET /redeem/sku/:id
router.get('/sku/:id', async (req, res) => {
  const { id } = req.params;
  // TODO: 根据 id 查询sku与库存
  return res.json({ id: Number(id), spuId: 0, skuTitle: 'TODO', requiredPoints: 0, stock: 0, needAddress: true, perUserLimit: null, dailyLimit: null, status: 1 });
});

export default router;

