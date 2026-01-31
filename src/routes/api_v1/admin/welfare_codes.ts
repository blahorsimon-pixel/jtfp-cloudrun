import { Router } from 'express';
import { requireAdminToken } from '../../../middlewares/admin_auth';
import { storage } from '../../../storage';

const router = Router();
router.use(requireAdminToken);

// 获取福利码列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);
    const keyword = (req.query.keyword as string) || '';

    const result = storage.welfareCodes.list({
      page,
      pageSize,
      keyword: keyword || undefined,
    });

    res.json({
      total: result.total,
      page,
      pageSize,
      codes: result.codes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取福利码详情
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const code = storage.welfareCodes.findById(id);

    if (!code) {
      return res.status(404).json({ error: '福利码不存在' });
    }

    const items = storage.welfareCodes.getItems(id);

    res.json({ code, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 创建福利码
router.post('/', async (req, res) => {
  try {
    const code = storage.welfareCodes.create(req.body);
    res.json({ success: true, id: code.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 更新福利码
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = storage.welfareCodes.findById(id);
    if (!existing) {
      return res.status(404).json({ error: '福利码不存在' });
    }

    storage.welfareCodes.update(id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除福利码
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    storage.welfareCodes.remove(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 验证福利码
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    const result = storage.welfareCodes.validateCode(code);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
