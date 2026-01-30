import { Router } from 'express';
import { pool } from '../db/mysql';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    // For now, we fetch all reviews. We can add pagination later.
    const [reviews] = await pool.query(
      `SELECT r.id, r.user_name, r.user_avatar, r.rating, r.content, r.created_at, p.title as product_title, p.cover_url as product_cover
       FROM product_reviews r
       JOIN products p ON r.product_id = p.id
       WHERE r.status = 1
       ORDER BY r.created_at DESC
       LIMIT 50`
    );
    res.json({ list: reviews });
  } catch (e) {
    next(e);
  }
});

export default router;
