import { Router } from 'express';
import { pool } from '../../../db/mysql';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const router = Router();

// 所有接口需要管理员权限
router.use(requireAdminToken);

/**
 * GET /api/v1/admin/categories - 获取所有分类列表
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories ORDER BY sort_order DESC, id ASC'
    );
    res.json({ categories: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/admin/categories - 创建新分类
 */
router.post('/', async (req, res) => {
  try {
    const { name, icon, sort_order, status } = req.body;
    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO categories (name, icon, sort_order, status) VALUES (?, ?, ?, ?)',
      [name, icon || null, sort_order || 0, status ?? 1]
    );

    res.json({
      success: true,
      id: result.insertId,
      message: '分类创建成功'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/admin/categories/:id - 更新分类
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, sort_order, status } = req.body;

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ error: '分类不存在' });
    }

    await pool.query(
      'UPDATE categories SET name = ?, icon = ?, sort_order = ?, status = ? WHERE id = ?',
      [name, icon || null, sort_order || 0, status ?? 1, id]
    );

    res.json({ success: true, message: '分类更新成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/admin/categories/:id - 删除分类
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查是否有房源关联了此分类
    const [properties] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM properties WHERE category_id = ? LIMIT 1',
      [id]
    );
    if (properties.length > 0) {
      return res.status(400).json({ error: '该分类下已有房源，无法删除' });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true, message: '分类删除成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
