import { Router } from 'express';
import { pool } from '../../../db/mysql';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

router.use(requireAdminToken);

function toPriceCent(priceYuan: any) {
  const priceNum = Number(priceYuan);
  if (!Number.isFinite(priceNum) || priceNum < 0) return null;
  return Math.round(priceNum * 100);
}

function parseSkuAttrs(input: any): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input === 'object') {
    try { return JSON.stringify(input); } catch { return null; }
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return null;
    // allow raw JSON string
    try {
      const obj = JSON.parse(s);
      return JSON.stringify(obj);
    } catch {
      // allow plain text, wrap into JSON string
      return JSON.stringify({ text: s });
    }
  }
  return null;
}

async function skuCodeExists(
  code: string,
  opts?: { excludeProductSkuId?: number; ignoreSkuLibrary?: boolean }
): Promise<boolean> {
  const c = String(code || '').trim();
  if (!c) return false;
  if (!opts?.ignoreSkuLibrary) {
    const [[a]] = await pool.query<RowDataPacket[]>(
      'SELECT 1 as ok FROM sku_library WHERE sku_code = ? LIMIT 1',
      [c]
    );
    if (a) return true;
  }
  if (opts?.excludeProductSkuId && Number.isFinite(opts.excludeProductSkuId)) {
    const [[b]] = await pool.query<RowDataPacket[]>(
      'SELECT 1 as ok FROM product_skus WHERE sku_code = ? AND id <> ? LIMIT 1',
      [c, opts.excludeProductSkuId]
    );
    return !!b;
  }
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
    if (!(await skuCodeExists(code))) return code;
  }
  throw new Error('SKU编码生成失败：重试次数过多');
}

router.get('/', async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = Math.min(parseInt((req.query.pageSize as string) || '50', 10), 200);
    const offset = (page - 1) * pageSize;

    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM products'
    );
    const total = (countRows?.[0] as any)?.total ?? 0;

    const [products] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, price_cent, stock, status, cover_url, is_featured, sort_order, is_welfare, shipping_fee_cent, free_shipping_qty, created_at, updated_at
       FROM products
       ORDER BY is_featured DESC, sort_order DESC, id DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    res.json({ total, page, pageSize, products });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get product detail + skus
router.get('/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!Number.isFinite(productId) || productId <= 0) return res.status(400).json({ error: 'Invalid productId' });

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, price_cent, stock, status, cover_url, description, is_featured, sort_order, is_welfare, shipping_fee_cent, free_shipping_qty, created_at, updated_at
       FROM products WHERE id = ? LIMIT 1`,
      [productId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });

    const [skus] = await pool.query<RowDataPacket[]>(
      `SELECT id, product_id, sku_title, sku_code, sku_code_locked, sku_attrs, price_cent, stock, status, cover_url, created_at, updated_at
       FROM product_skus WHERE product_id = ?
       ORDER BY id DESC`,
      [productId]
    );

    return res.json({ product: rows[0], skus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, priceYuan, stock, status, coverUrl, description, isFeatured, sortOrder, isWelfare, shippingFeeYuan, freeShippingQty } = req.body ?? {};

    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid title' });
    }
    const priceCent = toPriceCent(priceYuan);
    if (priceCent === null) {
      return res.status(400).json({ error: 'Invalid priceYuan' });
    }

    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      return res.status(400).json({ error: 'Invalid stock' });
    }

    const statusNum = status === undefined ? 1 : Number(status);
    if (![0, 1].includes(statusNum)) {
      return res.status(400).json({ error: 'Invalid status (0/1)' });
    }

    const cover = coverUrl === undefined || coverUrl === null ? null : String(coverUrl);
    const desc = description === undefined || description === null ? null : String(description);
    
    // 置顶和排序字段
    const isFeaturedNum = isFeatured ? 1 : 0;
    const sortOrderNum = Number(sortOrder) || 0;
    
    // 福利码商品标识
    const isWelfareNum = isWelfare ? 1 : 0;

    // 运费设置（分）：默认15元=1500分
    const shippingFeeCent = shippingFeeYuan !== undefined && shippingFeeYuan !== null && shippingFeeYuan !== ''
      ? Math.round(Number(shippingFeeYuan) * 100)
      : 1500;
    if (!Number.isFinite(shippingFeeCent) || shippingFeeCent < 0) {
      return res.status(400).json({ error: 'Invalid shippingFeeYuan' });
    }

    // 包邮件数：默认2件
    const freeShippingQtyNum = freeShippingQty !== undefined && freeShippingQty !== null && freeShippingQty !== ''
      ? Number(freeShippingQty)
      : 2;
    if (!Number.isInteger(freeShippingQtyNum) || freeShippingQtyNum < 0) {
      return res.status(400).json({ error: 'Invalid freeShippingQty' });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO products (title, price_cent, stock, status, cover_url, description, is_featured, sort_order, is_welfare, shipping_fee_cent, free_shipping_qty) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [title.trim(), priceCent, stockNum, statusNum, cover, desc, isFeaturedNum, sortOrderNum, isWelfareNum, shippingFeeCent, freeShippingQtyNum]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const body = req.body ?? {};

    const updates: string[] = [];
    const params: any[] = [];

    if (body.stock !== undefined) {
      const stockNum = Number(body.stock);
      if (!Number.isInteger(stockNum) || stockNum < 0) return res.status(400).json({ error: 'Invalid stock' });
      updates.push('stock = ?');
      params.push(stockNum);
    }

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) return res.status(400).json({ error: 'Invalid title' });
      updates.push('title = ?');
      params.push(body.title.trim());
    }

    if (body.priceYuan !== undefined) {
      const pc = toPriceCent(body.priceYuan);
      if (pc === null) return res.status(400).json({ error: 'Invalid priceYuan' });
      updates.push('price_cent = ?');
      params.push(pc);
    }

    if (body.status !== undefined) {
      const statusNum = Number(body.status);
      if (![0, 1].includes(statusNum)) return res.status(400).json({ error: 'Invalid status (0/1)' });
      updates.push('status = ?');
      params.push(statusNum);
    }

    if (body.coverUrl !== undefined) {
      updates.push('cover_url = ?');
      params.push(body.coverUrl ? String(body.coverUrl) : null);
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      params.push(body.description ? String(body.description) : null);
    }

    // 置顶推荐
    if (body.isFeatured !== undefined) {
      const isFeaturedNum = body.isFeatured ? 1 : 0;
      updates.push('is_featured = ?');
      params.push(isFeaturedNum);
    }

    // 排序值
    if (body.sortOrder !== undefined) {
      const sortOrderNum = Number(body.sortOrder) || 0;
      updates.push('sort_order = ?');
      params.push(sortOrderNum);
    }

    // 福利码商品标识
    if (body.isWelfare !== undefined) {
      const isWelfareNum = body.isWelfare ? 1 : 0;
      updates.push('is_welfare = ?');
      params.push(isWelfareNum);
    }

    // 运费设置（元转分）
    if (body.shippingFeeYuan !== undefined) {
      const shippingFeeCent = Math.round(Number(body.shippingFeeYuan) * 100);
      if (!Number.isFinite(shippingFeeCent) || shippingFeeCent < 0) {
        return res.status(400).json({ error: 'Invalid shippingFeeYuan' });
      }
      updates.push('shipping_fee_cent = ?');
      params.push(shippingFeeCent);
    }

    // 包邮件数
    if (body.freeShippingQty !== undefined) {
      const freeShippingQtyNum = Number(body.freeShippingQty);
      if (!Number.isInteger(freeShippingQtyNum) || freeShippingQtyNum < 0) {
        return res.status(400).json({ error: 'Invalid freeShippingQty' });
      }
      updates.push('free_shipping_qty = ?');
      params.push(freeShippingQtyNum);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(productId);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SKU CRUD
router.post('/:productId/skus', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!Number.isFinite(productId) || productId <= 0) return res.status(400).json({ error: 'Invalid productId' });

    const body = req.body ?? {};
    const fromSkuLibraryIdRaw = body.fromSkuLibraryId;

    // Support attrs text field (frontend will use text to reduce JSON errors)
    const skuAttrsInput = body.skuAttrsText ?? body.skuAttrs;

    let finalSkuTitle: string;
    let finalSkuCode: string | null;
    let finalSkuCodeLocked = 0;
    let finalAttrsJson: string | null;
    let finalPriceCent: number;
    let finalStockNum: number;
    let finalStatusNum: number;
    let finalCover: string | null;

    if (fromSkuLibraryIdRaw !== undefined && fromSkuLibraryIdRaw !== null && String(fromSkuLibraryIdRaw).trim() !== '') {
      const fromSkuLibraryId = parseInt(String(fromSkuLibraryIdRaw), 10);
      if (!Number.isFinite(fromSkuLibraryId) || fromSkuLibraryId <= 0) {
        return res.status(400).json({ error: 'Invalid fromSkuLibraryId' });
      }
      const [libRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, sku_code, sku_title, attrs_text, price_cent, status, cover_url
         FROM sku_library WHERE id = ? LIMIT 1`,
        [fromSkuLibraryId]
      );
      if (!libRows.length) return res.status(404).json({ error: 'SKU库条目不存在' });
      const lib = libRows[0] as any;

      finalSkuTitle = (typeof body.skuTitle === 'string' && body.skuTitle.trim()) ? body.skuTitle.trim() : String(lib.sku_title || '').trim();
      if (!finalSkuTitle) return res.status(400).json({ error: 'Invalid skuTitle' });

      finalSkuCode = String(lib.sku_code || '').trim() || null;
      if (!finalSkuCode) return res.status(400).json({ error: 'SKU库编码为空' });
      finalSkuCodeLocked = 1;

      // attrs: prefer body override, fallback to library attrs_text
      const attrsText = (skuAttrsInput !== undefined && skuAttrsInput !== null && String(skuAttrsInput).trim() !== '')
        ? String(skuAttrsInput)
        : (lib.attrs_text == null ? '' : String(lib.attrs_text));
      finalAttrsJson = parseSkuAttrs(attrsText);

      // price: allow override, else use library price_cent
      if (body.priceYuan !== undefined && body.priceYuan !== null && String(body.priceYuan).trim() !== '') {
        const pc = toPriceCent(body.priceYuan);
        if (pc === null) return res.status(400).json({ error: 'Invalid priceYuan' });
        finalPriceCent = pc;
      } else {
        finalPriceCent = Number(lib.price_cent || 0);
      }

      // stock: not in library; default 0 if not provided
      const stockVal = body.stock === undefined ? 0 : body.stock;
      finalStockNum = Number(stockVal);
      if (!Number.isInteger(finalStockNum) || finalStockNum < 0) return res.status(400).json({ error: 'Invalid stock' });

      // status: allow override, else use library status
      const st = body.status === undefined ? Number(lib.status ?? 1) : Number(body.status);
      if (![0, 1].includes(st)) return res.status(400).json({ error: 'Invalid status (0/1)' });
      finalStatusNum = st;

      // cover: allow override, else use library cover_url
      finalCover = body.coverUrl !== undefined ? (body.coverUrl ? String(body.coverUrl) : null) : (lib.cover_url ? String(lib.cover_url) : null);

      // product_skus 中不允许重复；sku_library 本身会包含该编码（允许）
      if (await skuCodeExists(finalSkuCode, { ignoreSkuLibrary: true })) {
        return res.status(400).json({ error: 'SKU编码已存在（商品SKU中重复）' });
      }
    } else {
      const { skuTitle, skuCode, priceYuan, stock, status, coverUrl } = body;
      if (typeof skuTitle !== 'string' || skuTitle.trim().length === 0) return res.status(400).json({ error: 'Invalid skuTitle' });
      finalSkuTitle = skuTitle.trim();

      const priceCent = toPriceCent(priceYuan);
      if (priceCent === null) return res.status(400).json({ error: 'Invalid priceYuan' });
      finalPriceCent = priceCent;

      finalStockNum = Number(stock);
      if (!Number.isInteger(finalStockNum) || finalStockNum < 0) return res.status(400).json({ error: 'Invalid stock' });

      finalStatusNum = status === undefined ? 1 : Number(status);
      if (![0, 1].includes(finalStatusNum)) return res.status(400).json({ error: 'Invalid status (0/1)' });

      finalAttrsJson = parseSkuAttrs(skuAttrsInput);
      finalCover = coverUrl ? String(coverUrl) : null;

      const codeInput = skuCode ? String(skuCode).trim() : '';
      if (codeInput) {
        if (await skuCodeExists(codeInput)) return res.status(400).json({ error: 'SKU编码已存在（全局唯一）' });
        finalSkuCode = codeInput;
      } else {
        finalSkuCode = await genNextSkuCode();
      }
      finalSkuCodeLocked = 0;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO product_skus (product_id, sku_title, sku_code, sku_code_locked, sku_attrs, price_cent, stock, status, cover_url)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [productId, finalSkuTitle, finalSkuCode, finalSkuCodeLocked, finalAttrsJson, finalPriceCent, finalStockNum, finalStatusNum, finalCover]
    );

    return res.json({ success: true, id: result.insertId, skuCode: finalSkuCode });
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'SKU编码冲突，请重试' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:productId/skus/:skuId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const skuId = parseInt(req.params.skuId, 10);
    if (!Number.isFinite(productId) || productId <= 0) return res.status(400).json({ error: 'Invalid productId' });
    if (!Number.isFinite(skuId) || skuId <= 0) return res.status(400).json({ error: 'Invalid skuId' });

    const body = req.body ?? {};
    const updates: string[] = [];
    const params: any[] = [];

    if (body.skuTitle !== undefined) {
      if (typeof body.skuTitle !== 'string' || body.skuTitle.trim().length === 0) return res.status(400).json({ error: 'Invalid skuTitle' });
      updates.push('sku_title = ?');
      params.push(body.skuTitle.trim());
    }
    if (body.skuCode !== undefined) {
      // Check lock flag before allowing update
      const [lockRows] = await pool.query<RowDataPacket[]>(
        'SELECT sku_code_locked FROM product_skus WHERE product_id = ? AND id = ? LIMIT 1',
        [productId, skuId]
      );
      if (!lockRows.length) return res.status(404).json({ error: 'SKU not found' });
      const locked = Number((lockRows[0] as any).sku_code_locked || 0) === 1;
      if (locked) return res.status(400).json({ error: 'SKU编码已锁定不可修改' });

      const newCode = body.skuCode ? String(body.skuCode).trim() : null;
      if (newCode && (await skuCodeExists(newCode, { excludeProductSkuId: skuId }))) {
        return res.status(400).json({ error: 'SKU编码已存在（全局唯一）' });
      }
      updates.push('sku_code = ?');
      params.push(newCode);
    }
    if (body.skuAttrs !== undefined || body.skuAttrsText !== undefined) {
      updates.push('sku_attrs = ?');
      params.push(parseSkuAttrs(body.skuAttrsText ?? body.skuAttrs));
    }
    if (body.priceYuan !== undefined) {
      const pc = toPriceCent(body.priceYuan);
      if (pc === null) return res.status(400).json({ error: 'Invalid priceYuan' });
      updates.push('price_cent = ?');
      params.push(pc);
    }
    if (body.stock !== undefined) {
      const stockNum = Number(body.stock);
      if (!Number.isInteger(stockNum) || stockNum < 0) return res.status(400).json({ error: 'Invalid stock' });
      updates.push('stock = ?');
      params.push(stockNum);
    }
    if (body.status !== undefined) {
      const statusNum = Number(body.status);
      if (![0, 1].includes(statusNum)) return res.status(400).json({ error: 'Invalid status (0/1)' });
      updates.push('status = ?');
      params.push(statusNum);
    }
    if (body.coverUrl !== undefined) {
      updates.push('cover_url = ?');
      params.push(body.coverUrl ? String(body.coverUrl) : null);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(productId, skuId);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE product_skus SET ${updates.join(', ')} WHERE product_id = ? AND id = ?`,
      params
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'SKU not found' });
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:productId/skus/:skuId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const skuId = parseInt(req.params.skuId, 10);
    if (!Number.isFinite(productId) || productId <= 0) return res.status(400).json({ error: 'Invalid productId' });
    if (!Number.isFinite(skuId) || skuId <= 0) return res.status(400).json({ error: 'Invalid skuId' });

    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM product_skus WHERE product_id = ? AND id = ?`,
      [productId, skuId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'SKU not found' });
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;






















