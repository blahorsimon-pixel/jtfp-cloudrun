import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const QuoteQuery = z.object({
  skuId: z.coerce.number().int().positive(),
  qty: z.coerce.number().int().positive().default(1),
  addressId: z.coerce.number().int().positive(),
});

router.get('/quote', async (req, res, next) => {
  try {
    const q = QuoteQuery.parse(req.query);
    // TODO: 根据 addressId、skuId、qty 计算运费与承运商
    const now = new Date();
    const expireAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    return res.json({ freightAmountCent: 1200, expireAt, carrierOptions: [] });
  } catch (e) { next(e); }
});

export default router;

