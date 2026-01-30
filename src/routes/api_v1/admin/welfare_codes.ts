import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../../db/mysql';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import type { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { logOrderChange, OrderChangeType } from '../../../services/order_change_log_service';

const router = Router();
router.use(requireAdminToken);

function toPriceCent(priceYuan: any): number | null {
  const priceNum = Number(priceYuan);
  if (!Number.isFinite(priceNum) || priceNum < 0) return null;
  return Math.round(priceNum * 100);
}

// ==================== 获取福利码商品列表（is_welfare=1） ====================

router.get('/welfare-products', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, status, cover_url, created_at
       FROM products 
       WHERE is_welfare = 1
       ORDER BY id DESC`
    );
    res.json({ products: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 列表查询（返回关联SKU汇总信息） ====================

const ListQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  code: z.string().optional(),
  status: z.coerce.number().int().optional(), // 0/1/2
  productId: z.coerce.number().int().positive().optional(),
});

router.get('/', async (req, res) => {
  try {
    const q = ListQuery.parse(req.query);
    const page = q.page || 1;
    const pageSize = Math.min(q.pageSize || 50, 200);
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (q.productId) {
      conditions.push('wc.product_id = ?');
      params.push(q.productId);
    }
    if (q.code) {
      conditions.push('wc.code LIKE ?');
      params.push(`%${q.code.trim()}%`);
    }
    if (q.status !== undefined && q.status !== null && Number.isFinite(q.status)) {
      conditions.push('wc.status = ?');
      params.push(Number(q.status));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM welfare_codes wc ${where}`,
      params
    );
    const total = Number((countRows?.[0] as any)?.total || 0);

    // 查询福利码列表，包含SKU汇总信息和多次使用字段
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        wc.id, wc.code, wc.product_id, wc.price_cent, wc.original_price_cent,
        wc.note, wc.status, wc.consumed_order_no, wc.consumed_at, wc.created_at, wc.updated_at,
        wc.max_usage, wc.used_count,
        GROUP_CONCAT(DISTINCT wci.sku_code ORDER BY wci.id SEPARATOR ', ') as sku_codes,
        GROUP_CONCAT(DISTINCT wci.sku_title ORDER BY wci.id SEPARATOR ', ') as sku_titles,
        SUM(wci.quantity) as total_quantity,
        COUNT(wci.id) as sku_count
       FROM welfare_codes wc
       LEFT JOIN welfare_code_items wci ON wci.welfare_code_id = wc.id
       ${where}
       GROUP BY wc.id
       ORDER BY wc.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({ total, page, pageSize, list: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 校验福利码是否已存在 ====================

const CheckQuery = z.object({
  code: z.string().regex(/^\d{6}$/),
  productId: z.coerce.number().int().positive().optional(),
});

router.get('/check', async (req, res) => {
  try {
    const q = CheckQuery.parse(req.query);
    
    // 如果指定了 productId，按联合键查询；否则查询所有同code的记录
    if (q.productId) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, code, product_id, status FROM welfare_codes 
         WHERE code = ? AND product_id = ? LIMIT 1`,
        [q.code, q.productId]
      );
      
      if (rows.length > 0) {
        const row = rows[0] as any;
        const statusText = row.status === 1 ? '未使用' : row.status === 2 ? '已使用' : '已禁用';
        return res.json({ 
          exists: true, 
          code: row.code,
          productId: row.product_id,
          status: row.status,
          statusText 
        });
      }
    } else {
      // 兼容：不指定 productId 时，查询所有同 code 的记录
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, code, product_id, status FROM welfare_codes WHERE code = ?`,
        [q.code]
      );
      
      if (rows.length > 0) {
        const productIds = rows.map((r: any) => r.product_id).join(',');
        const statusTexts = rows.map((r: any) => {
          return r.status === 1 ? '未使用' : r.status === 2 ? '已使用' : '已禁用';
        }).join(',');
        return res.json({ 
          exists: true, 
          code: q.code,
          productIds,
          count: rows.length,
          statusText: `存在${rows.length}条记录(${statusTexts})`
        });
      }
    }
    
    res.json({ exists: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 获取福利码详情（含SKU明细） ====================

router.get('/:code/detail', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });
    
    const productId = req.query.productId ? parseInt(String(req.query.productId), 10) : null;

    let wcRows: RowDataPacket[];
    if (productId && Number.isFinite(productId)) {
      // 按联合键查询
      [wcRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, code, product_id, price_cent, original_price_cent, note, status, 
                consumed_order_no, consumed_at, created_at, updated_at,
                max_usage, used_count
         FROM welfare_codes WHERE code = ? AND product_id = ? LIMIT 1`,
        [code, productId]
      );
    } else {
      // 兼容：不指定 productId 时，查询第一条记录
      [wcRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, code, product_id, price_cent, original_price_cent, note, status, 
                consumed_order_no, consumed_at, created_at, updated_at,
                max_usage, used_count
         FROM welfare_codes WHERE code = ? LIMIT 1`,
        [code]
      );
    }
    
    if (!wcRows.length) return res.status(404).json({ error: '福利码不存在' });

    const welfareCode = wcRows[0];

    // 查询关联的SKU明细
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, welfare_code_id, sku_library_id, sku_code, sku_title, quantity, price_cent, created_at
       FROM welfare_code_items
       WHERE welfare_code_id = ?
       ORDER BY id ASC`,
      [welfareCode.id]
    );

    res.json({
      ...welfareCode,
      items: itemRows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 新增福利码（支持多SKU） ====================

const SkuItemSchema = z.object({
  skuLibraryId: z.coerce.number().int().positive(),
  skuCode: z.string().min(1),
  skuTitle: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  priceYuan: z.any(), // 福利码定价单价（元）
});

const CreateReq = z.object({
  code: z.string().regex(/^\d{6}$/),
  productId: z.coerce.number().int().positive().default(1),
  priceYuan: z.any(), // 实付总价（优惠后）
  originalPriceYuan: z.any().optional(), // 原价汇总（可选，若不传则自动计算）
  note: z.string().optional(),
  items: z.array(SkuItemSchema).optional(), // 多SKU明细
  maxUsage: z.coerce.number().int().min(1).max(1000).default(1), // 最大使用次数（1-1000）
});

router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const body = CreateReq.parse(req.body ?? {});
    const priceCent = toPriceCent(body.priceYuan);
    if (priceCent === null) return res.status(400).json({ error: 'Invalid priceYuan' });

    await conn.beginTransaction();

    // 计算原价汇总
    let originalPriceCent = 0;
    const items = body.items || [];
    
    if (items.length > 0) {
      for (const item of items) {
        const itemPrice = toPriceCent(item.priceYuan);
        if (itemPrice === null) {
          await conn.rollback();
          return res.status(400).json({ error: `Invalid priceYuan for SKU ${item.skuCode}` });
        }
        originalPriceCent += itemPrice * item.quantity;
      }
    } else {
      // 无SKU时，原价=实付价
      originalPriceCent = priceCent;
    }

    // 允许手动指定原价
    if (body.originalPriceYuan !== undefined && body.originalPriceYuan !== null && body.originalPriceYuan !== '') {
      const manualOriginal = toPriceCent(body.originalPriceYuan);
      if (manualOriginal !== null) {
        originalPriceCent = manualOriginal;
      }
    }

    // 插入福利码主表（含最大使用次数）
    const maxUsage = body.maxUsage || 1;
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO welfare_codes (code, product_id, price_cent, original_price_cent, note, status, max_usage, used_count)
       VALUES (?,?,?,?,?,1,?,0)`,
      [body.code, body.productId, priceCent, originalPriceCent, (body.note || '').trim() || null, maxUsage]
    );
    const welfareCodeId = result.insertId;

    // 插入SKU明细
    if (items.length > 0) {
      const itemValues: any[][] = [];
      for (const item of items) {
        const itemPrice = toPriceCent(item.priceYuan)!;
        itemValues.push([
          welfareCodeId,
          item.skuLibraryId,
          item.skuCode,
          item.skuTitle,
          item.quantity,
          itemPrice,
        ]);
      }
      await conn.query(
        `INSERT INTO welfare_code_items (welfare_code_id, sku_library_id, sku_code, sku_title, quantity, price_cent)
         VALUES ?`,
        [itemValues]
      );
    }

    await conn.commit();
    res.json({ success: true, id: welfareCodeId });
  } catch (err: any) {
    await conn.rollback();
    if (String(err?.code || '').toUpperCase() === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '福利码已存在' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ==================== 批量导入福利码（简化版，无SKU） ====================

const BulkReq = z.object({
  productId: z.coerce.number().int().positive().default(1),
  maxUsage: z.coerce.number().int().min(1).max(1000).default(1), // 批量默认使用次数
  items: z.array(z.object({
    code: z.string().regex(/^\d{6}$/),
    priceYuan: z.any(),
    note: z.string().optional(),
    maxUsage: z.coerce.number().int().min(1).max(1000).optional(), // 单个福利码可覆盖
  })).min(1),
});

router.post('/bulk', async (req, res) => {
  try {
    const body = BulkReq.parse(req.body ?? {});
    
    // 先检查哪些福利码已经存在
    const allCodes = body.items.map(it => it.code);
    const [existingRows] = await pool.query<RowDataPacket[]>(
      `SELECT code, status FROM welfare_codes WHERE code IN (${allCodes.map(() => '?').join(',')})`,
      allCodes
    );
    
    const existingCodesSet = new Set(existingRows.map((row: any) => row.code));
    const existingCodesMap = new Map(existingRows.map((row: any) => [row.code, row.status]));
    
    // 分类：新增和已存在
    const toInsert: any[] = [];
    const skipped: any[] = [];
    
    for (const it of body.items) {
      const pc = toPriceCent(it.priceYuan);
      if (pc === null) return res.status(400).json({ error: `Invalid priceYuan for code ${it.code}` });
      
      if (existingCodesSet.has(it.code)) {
        const status = existingCodesMap.get(it.code);
        const statusText = status === 1 ? '未使用' : status === 2 ? '已使用' : '已禁用';
        skipped.push({
          code: it.code,
          priceYuan: it.priceYuan,
          note: it.note || '',
          reason: `已存在(${statusText})`
        });
      } else {
        const itemMaxUsage = it.maxUsage || body.maxUsage || 1;
        toInsert.push([it.code, body.productId, pc, pc, (it.note || '').trim() || null, 1, itemMaxUsage, 0]);
      }
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO welfare_codes (code, product_id, price_cent, original_price_cent, note, status, max_usage, used_count)
         VALUES ?`,
        [toInsert]
      );
      inserted = result.affectedRows || 0;
    }

    res.json({ 
      success: true, 
      inserted, 
      skipped: skipped.length,
      detail: {
        insertedCodes: toInsert.map(v => v[0]),
        skippedItems: skipped
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 编辑福利码（支持修改SKU列表） ====================

const PatchReq = z.object({
  productId: z.coerce.number().int().positive().optional(), // 指定要修改哪个商品的福利码
  status: z.coerce.number().int().optional(),
  newCode: z.string().regex(/^\d{6}$/).optional(),
  priceYuan: z.any().optional(),
  originalPriceYuan: z.any().optional(),
  note: z.string().optional(),
  items: z.array(SkuItemSchema).optional(), // 完整替换SKU列表
  maxUsage: z.coerce.number().int().min(1).max(1000).optional(), // 最大使用次数
});

router.patch('/:code', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const code = String(req.params.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });
    const body = PatchReq.parse(req.body ?? {});

    await conn.beginTransaction();

    // 按联合键查询：如果传了 productId，则精确查询；否则查询第一条
    let wcRows: RowDataPacket[];
    if (body.productId) {
      [wcRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, product_id, status FROM welfare_codes 
         WHERE code = ? AND product_id = ? LIMIT 1 FOR UPDATE`,
        [code, body.productId]
      );
    } else {
      [wcRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, product_id, status FROM welfare_codes 
         WHERE code = ? LIMIT 1 FOR UPDATE`,
        [code]
      );
    }
    
    if (!wcRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Code not found' });
    }
    const wc = wcRows[0];
    const wcProductId = wc.product_id;
    // 已用完的福利码（status=2）：只允许修改items、note和maxUsage，不能修改code、status、price
    if (wc.status === 2) {
      if (body.newCode !== undefined || body.status !== undefined || body.priceYuan !== undefined || body.originalPriceYuan !== undefined) {
        await conn.rollback();
        return res.status(400).json({ error: '已用完的福利码不可修改编码、状态或价格，但可以更新SKU明细和最大使用次数' });
      }
    }

    // 构建动态更新字段
    const updates: string[] = [];
    const params: any[] = [];

    if (body.status !== undefined) {
      const st = Number(body.status);
      if (![0, 1].includes(st)) {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid status (0/1)' });
      }
      updates.push('status = ?');
      params.push(st);
    }

    if (body.newCode !== undefined) {
      updates.push('code = ?');
      params.push(body.newCode);
    }

    if (body.priceYuan !== undefined) {
      const priceCent = toPriceCent(body.priceYuan);
      if (priceCent === null) {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid priceYuan' });
      }
      updates.push('price_cent = ?');
      params.push(priceCent);
    }

    if (body.originalPriceYuan !== undefined) {
      const originalPriceCent = toPriceCent(body.originalPriceYuan);
      if (originalPriceCent === null) {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid originalPriceYuan' });
      }
      updates.push('original_price_cent = ?');
      params.push(originalPriceCent);
    }

    if (body.note !== undefined) {
      updates.push('note = ?');
      params.push(body.note.trim() || null);
    }

    // 处理最大使用次数
    if (body.maxUsage !== undefined) {
      const maxUsage = Number(body.maxUsage);
      if (!Number.isInteger(maxUsage) || maxUsage < 1 || maxUsage > 1000) {
        await conn.rollback();
        return res.status(400).json({ error: '最大使用次数必须在1-1000之间' });
      }
      updates.push('max_usage = ?');
      params.push(maxUsage);
    }

    // 如果传入了items，重新计算original_price_cent
    if (body.items !== undefined) {
      let calculatedOriginal = 0;
      for (const item of body.items) {
        const itemPrice = toPriceCent(item.priceYuan);
        if (itemPrice === null) {
          await conn.rollback();
          return res.status(400).json({ error: `Invalid priceYuan for SKU ${item.skuCode}` });
        }
        calculatedOriginal += itemPrice * item.quantity;
      }
      // 仅当未手动指定原价时，自动计算
      if (body.originalPriceYuan === undefined) {
        updates.push('original_price_cent = ?');
        params.push(calculatedOriginal);
      }

      // 删除旧的SKU明细
      await conn.query(`DELETE FROM welfare_code_items WHERE welfare_code_id = ?`, [wc.id]);

      // 插入新的SKU明细
      if (body.items.length > 0) {
        const itemValues: any[][] = [];
        for (const item of body.items) {
          const itemPrice = toPriceCent(item.priceYuan)!;
          itemValues.push([
            wc.id,
            item.skuLibraryId,
            item.skuCode,
            item.skuTitle,
            item.quantity,
            itemPrice,
          ]);
        }
        await conn.query(
          `INSERT INTO welfare_code_items (welfare_code_id, sku_library_id, sku_code, sku_title, quantity, price_cent)
           VALUES ?`,
          [itemValues]
        );
      }
    }

    if (updates.length > 0) {
      params.push(code, wcProductId);
      await conn.query(
        `UPDATE welfare_codes SET ${updates.join(', ')} WHERE code = ? AND product_id = ?`,
        params
      );
    }

    await conn.commit();

    // 查询使用该福利码的订单（用于前端展示确认弹窗）
    let pendingSync = null;
    if (body.items !== undefined && body.items.length > 0) {
      const effectiveCode = body.newCode || code;
      const [orderRows] = await pool.query<RowDataPacket[]>(
        `SELECT o.order_no, o.created_at, o.status,
                (SELECT COUNT(*) FROM order_items WHERE order_no = o.order_no) as current_items
         FROM orders o
         WHERE o.invite_code = ?
         ORDER BY o.created_at DESC`,
        [effectiveCode]
      );

      if (orderRows.length > 0) {
        pendingSync = {
          orderCount: orderRows.length,
          newItemCount: body.items.length,
          orders: (orderRows as any[]).map(o => ({
            orderNo: o.order_no,
            createdAt: o.created_at,
            status: o.status,
            currentItems: o.current_items,
            newItems: body.items!.length,
          })),
        };
      }
    }

    res.json({ success: true, pendingSync });
  } catch (err: any) {
    await conn.rollback();
    if (String(err?.code || '').toUpperCase() === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '新福利码已存在' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ==================== 同步福利码SKU到订单明细（需确认后调用） ====================

const SyncOrdersReq = z.object({
  confirmSync: z.boolean(),
});

router.post('/:code/sync-orders', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const code = String(req.params.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });
    
    const body = SyncOrdersReq.parse(req.body ?? {});
    if (!body.confirmSync) {
      return res.status(400).json({ error: '请确认同步操作' });
    }

    await conn.beginTransaction();

    // 1. 查询福利码及其SKU明细
    const [wcRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, code, price_cent FROM welfare_codes WHERE code = ? LIMIT 1`,
      [code]
    );
    if (!wcRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: '福利码不存在' });
    }
    const wc = wcRows[0];

    const [itemRows] = await conn.query<RowDataPacket[]>(
      `SELECT sku_library_id, sku_code, sku_title, quantity, price_cent
       FROM welfare_code_items
       WHERE welfare_code_id = ?
       ORDER BY id ASC`,
      [wc.id]
    );

    if (itemRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: '福利码没有SKU明细，无法同步' });
    }

    // 2. 金额校验：SKU总金额必须与福利码price_cent一致
    const skuTotalCent = (itemRows as any[]).reduce(
      (sum, item) => sum + item.price_cent * item.quantity, 0
    );
    if (skuTotalCent !== wc.price_cent) {
      await conn.rollback();
      return res.status(400).json({ 
        error: `SKU总金额(${(skuTotalCent/100).toFixed(2)}元)与福利码价格(${(wc.price_cent/100).toFixed(2)}元)不一致，请先调整福利码价格`,
        skuTotalYuan: (skuTotalCent/100).toFixed(2),
        codeYuan: (wc.price_cent/100).toFixed(2),
      });
    }

    // 3. 查询使用该福利码的订单
    const [orderRows] = await conn.query<RowDataPacket[]>(
      `SELECT order_no FROM orders WHERE invite_code = ?`,
      [code]
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      return res.json({ success: true, syncResult: { ordersUpdated: 0, itemsUpdated: 0, itemsAdded: 0 } });
    }

    let ordersUpdated = 0;
    let itemsUpdated = 0;
    let itemsAdded = 0;

    // 4. 逐个订单同步
    for (const orderRow of orderRows as any[]) {
      const orderNo = orderRow.order_no;

      // 获取该订单的第一条明细ID
      const [firstItemRows] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM order_items WHERE order_no = ? ORDER BY id ASC LIMIT 1`,
        [orderNo]
      );

      if (firstItemRows.length === 0) {
        // 没有明细，直接插入所有新SKU
        for (const skuItem of itemRows as any[]) {
          const [result] = await conn.query<ResultSetHeader>(
            `INSERT INTO order_items (order_no, sku_id, sku_code, sku_title, quantity, sale_price, total_price, sku_attrs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderNo,
              skuItem.sku_library_id || 0,
              skuItem.sku_code,
              skuItem.sku_title,
              skuItem.quantity,
              skuItem.price_cent,
              skuItem.price_cent * skuItem.quantity,
              JSON.stringify({ welfareCode: code, skuCode: skuItem.sku_code }),
            ]
          );
          const newItemId = result.insertId;
          itemsAdded++;

          // 记录变更日志
          await logOrderChange({
            order_no: orderNo,
            order_item_id: newItemId,
            change_type: OrderChangeType.ITEM_SKU,
            field_name: 'sync-orders (new)',
            new_value: JSON.stringify(skuItem),
            operator: 'ADMIN',
            reason: `福利码订单同步(新增明细): ${code}`
          }, conn);
        }
      } else {
        const firstItemId = firstItemRows[0].id;
        const firstSku = itemRows[0] as any;

        // 获取更新前的旧值
        const [oldRows] = await conn.query<RowDataPacket[]>(
          'SELECT * FROM order_items WHERE id = ?',
          [firstItemId]
        );
        const oldFirstItem = oldRows[0];

        // 更新第一条明细
        await conn.query(
          `UPDATE order_items 
           SET sku_id = ?, sku_code = ?, sku_title = ?, quantity = ?, sale_price = ?, total_price = ?, sku_attrs = ?
           WHERE id = ?`,
          [
            firstSku.sku_library_id || 0,
            firstSku.sku_code,
            firstSku.sku_title,
            firstSku.quantity,
            firstSku.price_cent,
            firstSku.price_cent * firstSku.quantity,
            JSON.stringify({ welfareCode: code, skuCode: firstSku.sku_code }),
            firstItemId,
          ]
        );
        itemsUpdated++;

        // 记录更新日志
        await logOrderChange({
          order_no: orderNo,
          order_item_id: firstItemId,
          change_type: OrderChangeType.ITEM_SKU,
          field_name: 'sync-orders (update)',
          old_value: JSON.stringify(oldFirstItem),
          new_value: JSON.stringify(firstSku),
          operator: 'ADMIN',
          reason: `福利码订单同步(更新明细): ${code}`
        }, conn);

        // 删除该订单的其他旧明细前记录日志
        const [itemsToDelete] = await conn.query<RowDataPacket[]>(
          `SELECT * FROM order_items WHERE order_no = ? AND id != ?`,
          [orderNo, firstItemId]
        );
        for (const item of itemsToDelete) {
           await logOrderChange({
            order_no: orderNo,
            order_item_id: item.id,
            change_type: OrderChangeType.ITEM_SKU,
            field_name: 'sync-orders (delete)',
            old_value: JSON.stringify(item),
            operator: 'ADMIN',
            reason: `福利码订单同步(删除冗余明细): ${code}`
          }, conn);
        }

        // 删除该订单的其他旧明细（仅保留第一条）
        await conn.query(
          `DELETE FROM order_items WHERE order_no = ? AND id != ?`,
          [orderNo, firstItemId]
        );

        // 追加其余SKU
        for (let i = 1; i < itemRows.length; i++) {
          const skuItem = itemRows[i] as any;
          const [result] = await conn.query<ResultSetHeader>(
            `INSERT INTO order_items (order_no, sku_id, sku_code, sku_title, quantity, sale_price, total_price, sku_attrs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderNo,
              skuItem.sku_library_id || 0,
              skuItem.sku_code,
              skuItem.sku_title,
              skuItem.quantity,
              skuItem.price_cent,
              skuItem.price_cent * skuItem.quantity,
              JSON.stringify({ welfareCode: code, skuCode: skuItem.sku_code }),
            ]
          );
          const newItemId = result.insertId;
          itemsAdded++;

          // 记录变更日志
          await logOrderChange({
            order_no: orderNo,
            order_item_id: newItemId,
            change_type: OrderChangeType.ITEM_SKU,
            field_name: 'sync-orders (append)',
            new_value: JSON.stringify(skuItem),
            operator: 'ADMIN',
            reason: `福利码订单同步(追加明细): ${code}`
          }, conn);
        }
      }

      ordersUpdated++;
    }

    await conn.commit();
    res.json({
      success: true,
      syncResult: {
        ordersUpdated,
        itemsUpdated,
        itemsAdded,
      },
    });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ==================== 删除福利码 ====================

router.delete('/:code', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const code = String(req.params.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });
    
    const productId = req.query.productId ? parseInt(String(req.query.productId), 10) : null;

    await conn.beginTransaction();

    let wcRows: RowDataPacket[];
    if (productId && Number.isFinite(productId)) {
      // 按联合键删除指定商品的福利码
      [wcRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, status FROM welfare_codes WHERE code = ? AND product_id = ? LIMIT 1 FOR UPDATE`,
        [code, productId]
      );
    } else {
      // 兼容：不指定 productId 时，删除第一条
      [wcRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, status FROM welfare_codes WHERE code = ? LIMIT 1 FOR UPDATE`,
        [code]
      );
    }
    
    if (!wcRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Code not found' });
    }
    const wc = wcRows[0];
    if (wc.status === 2) {
      await conn.rollback();
      return res.status(400).json({ error: '已使用的福利码不能删除' });
    }

    // 删除SKU明细
    await conn.query(`DELETE FROM welfare_code_items WHERE welfare_code_id = ?`, [wc.id]);

    // 删除福利码主表
    await conn.query(`DELETE FROM welfare_codes WHERE id = ?`, [wc.id]);

    await conn.commit();
    res.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ==================== 导出福利码为Excel ====================

const ExportQuery = z.object({
  codes: z.string().optional(),
  status: z.coerce.number().int().optional(),
  productId: z.coerce.number().int().positive().optional(),
});

router.get('/export', async (req, res) => {
  try {
    const q = ExportQuery.parse(req.query);

    const conditions: string[] = [];
    const params: any[] = [];

    if (q.productId) {
      conditions.push('wc.product_id = ?');
      params.push(q.productId);
    }
    if (q.status !== undefined && q.status !== null && Number.isFinite(q.status)) {
      conditions.push('wc.status = ?');
      params.push(Number(q.status));
    }
    if (q.codes) {
      const codeList = q.codes.split(',').map(c => c.trim()).filter(c => /^\d{6}$/.test(c));
      if (codeList.length > 0) {
        conditions.push(`wc.code IN (${codeList.map(() => '?').join(',')})`);
        params.push(...codeList);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        wc.code, wc.price_cent, wc.original_price_cent, wc.note, wc.status, 
        wc.consumed_order_no, wc.consumed_at, wc.created_at,
        GROUP_CONCAT(CONCAT(wci.sku_code, '×', wci.quantity) ORDER BY wci.id SEPARATOR '; ') as sku_summary
       FROM welfare_codes wc
       LEFT JOIN welfare_code_items wci ON wci.welfare_code_id = wc.id
       ${where}
       GROUP BY wc.id
       ORDER BY wc.id DESC`,
      params
    );

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    const worksheet = workbook.addWorksheet('福利码');

    worksheet.columns = [
      { header: '福利码', key: 'code', width: 15 },
      { header: '实付价(元)', key: 'price_yuan', width: 12 },
      { header: '原价(元)', key: 'original_price_yuan', width: 12 },
      { header: 'SKU组合', key: 'sku_summary', width: 40 },
      { header: '备注', key: 'note', width: 30 },
      { header: '状态', key: 'status_cn', width: 12 },
      { header: '使用订单号', key: 'consumed_order_no', width: 25 },
      { header: '使用时间', key: 'consumed_at', width: 20 },
      { header: '创建时间', key: 'created_at', width: 20 },
    ];

    for (const row of rows as any[]) {
      const statusCn = row.status === 1 ? '未使用' : row.status === 2 ? '已使用' : '已禁用';
      worksheet.addRow({
        code: row.code,
        price_yuan: ((row.price_cent || 0) / 100).toFixed(2),
        original_price_yuan: ((row.original_price_cent || 0) / 100).toFixed(2),
        sku_summary: row.sku_summary || '',
        note: row.note || '',
        status_cn: statusCn,
        consumed_order_no: row.consumed_order_no || '',
        consumed_at: row.consumed_at ? new Date(row.consumed_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '',
        created_at: row.created_at ? new Date(row.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=welfare-codes-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
