import { Router } from 'express';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../../../db/mysql';
import { requireAdminToken } from '../../../middlewares/admin_auth';

const router = Router();
router.use(requireAdminToken);

function toPriceCent(priceYuan: any) {
  const priceNum = Number(priceYuan);
  if (!Number.isFinite(priceNum) || priceNum < 0) return null;
  return Math.round(priceNum * 100);
}

async function skuCodeExists(code: string): Promise<boolean> {
  const c = String(code || '').trim();
  if (!c) return false;
  const [[a]] = await pool.query<RowDataPacket[]>(
    'SELECT 1 as ok FROM sku_library WHERE sku_code = ? LIMIT 1',
    [c]
  );
  if (a) return true;
  const [[b]] = await pool.query<RowDataPacket[]>(
    'SELECT 1 as ok FROM product_skus WHERE sku_code = ? LIMIT 1',
    [c]
  );
  return !!b;
}

async function genNextSkuCode(): Promise<string> {
  // Use AUTO_INCREMENT id as sequence number; loop to avoid collision with historical/manual codes.
  for (let i = 0; i < 50; i++) {
    const [r] = await pool.query<ResultSetHeader>('INSERT INTO sku_code_seq VALUES ()');
    const id = Number(r.insertId);
    const code = `xg${String(id).padStart(6, '0')}`;
    // If code already used (historical manual), keep advancing sequence.
    if (!(await skuCodeExists(code))) return code;
  }
  throw new Error('SKU编码生成失败：重试次数过多');
}

// GET /api/v1/admin/sku-library?page=&pageSize=&keyword=&status=
router.get('/', async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = Math.min(parseInt((req.query.pageSize as string) || '50', 10), 200);
    const offset = (page - 1) * pageSize;
    const keyword = String((req.query.keyword as string) || '').trim();
    const statusStr = (req.query.status as string) ?? '';

    const conditions: string[] = [];
    const params: any[] = [];

    if (keyword) {
      conditions.push('(sku_code LIKE ? OR sku_title LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (statusStr !== '' && statusStr !== undefined && statusStr !== null) {
      const st = Number(statusStr);
      if (![0, 1].includes(st)) return res.status(400).json({ error: 'Invalid status (0/1)' });
      conditions.push('status = ?');
      params.push(st);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM sku_library ${where}`,
      params
    );
    const total = (countRows?.[0] as any)?.total ?? 0;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, sku_code, sku_title, attrs_text, price_cent, status, cover_url, created_at, updated_at
       FROM sku_library
       ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    return res.json({ total, page, pageSize, list: rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/admin/sku-library
// Body: { skuTitle, skuCode?, attrsText?, priceYuan, status?, coverUrl? }
router.post('/', async (req, res) => {
  try {
    const { skuTitle, skuCode, attrsText, priceYuan, status, coverUrl } = req.body ?? {};
    if (typeof skuTitle !== 'string' || skuTitle.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid skuTitle' });
    }
    const priceCent = toPriceCent(priceYuan);
    if (priceCent === null) return res.status(400).json({ error: 'Invalid priceYuan' });
    const statusNum = status === undefined ? 1 : Number(status);
    if (![0, 1].includes(statusNum)) return res.status(400).json({ error: 'Invalid status (0/1)' });
    const cover = coverUrl ? String(coverUrl) : null;
    const attrs = attrsText === undefined || attrsText === null || String(attrsText).trim() === '' ? null : String(attrsText);

    let code = skuCode ? String(skuCode).trim() : '';
    if (code) {
      if (await skuCodeExists(code)) return res.status(400).json({ error: 'SKU编码已存在（全局唯一）' });
    } else {
      code = await genNextSkuCode();
    }

    const [r] = await pool.query<ResultSetHeader>(
      `INSERT INTO sku_library (sku_code, sku_title, attrs_text, price_cent, status, cover_url)
       VALUES (?,?,?,?,?,?)`,
      [code, skuTitle.trim(), attrs, priceCent, statusNum, cover]
    );
    return res.json({ success: true, id: r.insertId, skuCode: code });
  } catch (err: any) {
    // Handle duplicate key (race on sku_code unique)
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'SKU编码冲突，请重试' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/admin/sku-library/:id
// Body: { skuTitle?, attrsText?, priceYuan?, status?, coverUrl? }  (sku_code 不允许修改)
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });

    const body = req.body ?? {};
    if (body.skuCode !== undefined) {
      return res.status(400).json({ error: 'skuCode 不允许修改' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (body.skuTitle !== undefined) {
      if (typeof body.skuTitle !== 'string' || body.skuTitle.trim().length === 0) return res.status(400).json({ error: 'Invalid skuTitle' });
      updates.push('sku_title = ?');
      params.push(body.skuTitle.trim());
    }
    if (body.attrsText !== undefined) {
      const v = body.attrsText === null ? null : String(body.attrsText);
      updates.push('attrs_text = ?');
      params.push(v && v.trim() ? v : null);
    }
    if (body.priceYuan !== undefined) {
      const pc = toPriceCent(body.priceYuan);
      if (pc === null) return res.status(400).json({ error: 'Invalid priceYuan' });
      updates.push('price_cent = ?');
      params.push(pc);
    }
    if (body.status !== undefined) {
      const st = Number(body.status);
      if (![0, 1].includes(st)) return res.status(400).json({ error: 'Invalid status (0/1)' });
      updates.push('status = ?');
      params.push(st);
    }
    if (body.coverUrl !== undefined) {
      updates.push('cover_url = ?');
      params.push(body.coverUrl ? String(body.coverUrl) : null);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const [r] = await pool.query<ResultSetHeader>(
      `UPDATE sku_library SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'SKU not found' });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/admin/sku-library/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
    const [r] = await pool.query<ResultSetHeader>('DELETE FROM sku_library WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'SKU not found' });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;






















