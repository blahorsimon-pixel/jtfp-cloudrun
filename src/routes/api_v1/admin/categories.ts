import { Router } from 'express';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import { storage } from '../../../storage';

const router = Router();

// 所有接口需要管理员权限
router.use(requireAdminToken);

/**
 * GET /api/v1/admin/categories - 获取所有分类列表
 */
router.get('/', async (req, res) => {
  try {
    const categories = storage.categories.list();
    res.json({ categories });
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

    const category = storage.categories.create({
      name,
      icon: icon || undefined,
      sort_order: sort_order || 0,
      status: status ?? 1,
    });

    res.json({
      success: true,
      id: category.id,
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

    const existing = storage.categories.findById(Number(id));
    if (!existing) {
      return res.status(404).json({ error: '分类不存在' });
    }

    storage.categories.update(Number(id), {
      name,
      icon: icon || null,
      sort_order: sort_order || 0,
      status: status ?? 1,
    });

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
    if (storage.properties.existsByCategoryId(Number(id))) {
      return res.status(400).json({ error: '该分类下已有房源，无法删除' });
    }

    storage.categories.remove(Number(id));
    res.json({ success: true, message: '分类删除成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
