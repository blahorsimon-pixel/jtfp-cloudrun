import { Router } from 'express';

const router = Router();

// TODO: 从鉴权中间件注入 userId，这里暂用 mock
router.get('/points', async (_req, res) => {
  return res.json({ available: 0, owed: 0, frozen: 0, lifetimeEarned: 0, lifetimeSpent: 0, updatedAt: new Date().toISOString() });
});

router.get('/points/ledger', async (_req, res) => {
  return res.json({ list: [], nextCursor: null });
});

export default router;

