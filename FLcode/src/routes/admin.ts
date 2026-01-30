import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import ExcelJS from 'exceljs';
import {
  getConfig,
  getAllConfig,
  setConfig,
  setConfigs,
  getAllCodes,
  searchCodes,
  addCode,
  addCodesBatch,
  updateCode,
  deleteCode,
  clearAllCodes,
} from '../db';

const router = Router();

// 文件上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 Excel 文件格式 (.xlsx, .xls)'));
    }
  },
});

// 验证 schema
const LoginSchema = z.object({
  password: z.string().min(1, '请输入密码'),
});

const CodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的中国大陆手机号'),
  code: z.string().regex(/^\d{6}$/, '码必须是6位数字'),
  note: z.string().optional(),
});

const UpdateCodeSchema = z.object({
  id: z.coerce.number().int().positive(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的中国大陆手机号'),
  code: z.string().regex(/^\d{6}$/, '码必须是6位数字'),
  note: z.string().optional(),
});

const ConfigSchema = z.object({
  success_msg: z.string().optional(),
  fail_msg: z.string().optional(),
  usage_tip: z.string().optional(),
  admin_password: z.string().min(1).optional(),
  page_title: z.string().optional(),
});

// 简单的 session 认证中间件（基于 token）
const sessions = new Map<string, { expireAt: number }>();

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers['x-admin-token'] as string;
  if (!token) {
    return res.status(401).json({ ok: false, message: '请先登录' });
  }
  const session = sessions.get(token);
  if (!session || session.expireAt < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ ok: false, message: '登录已过期，请重新登录' });
  }
  // 续期
  session.expireAt = Date.now() + 24 * 60 * 60 * 1000;
  next();
}

// 管理员登录
router.post('/login', (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: parsed.error.errors[0]?.message });
  }

  const adminPassword = getConfig('admin_password') || 'admin123';
  if (parsed.data.password !== adminPassword) {
    return res.status(401).json({ ok: false, message: '密码错误' });
  }

  const token = generateToken();
  sessions.set(token, { expireAt: Date.now() + 24 * 60 * 60 * 1000 }); // 24小时有效

  res.json({ ok: true, token, message: '登录成功' });
});

// 登出
router.post('/logout', (req, res) => {
  const token = req.headers['x-admin-token'] as string;
  if (token) {
    sessions.delete(token);
  }
  res.json({ ok: true, message: '已登出' });
});

// 验证 token 是否有效
router.get('/verify', authMiddleware, (_req, res) => {
  res.json({ ok: true, message: 'Token 有效' });
});

// 获取配置
router.get('/config', authMiddleware, (_req, res) => {
  const config = getAllConfig();
  res.json({ ok: true, data: config });
});

// 更新配置
router.post('/config', authMiddleware, (req, res) => {
  const parsed = ConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: parsed.error.errors[0]?.message });
  }

  const configs: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      configs[key] = value;
    }
  }

  if (Object.keys(configs).length > 0) {
    setConfigs(configs);
  }

  res.json({ ok: true, message: '配置已更新' });
});

// 获取福利码列表
router.get('/codes', authMiddleware, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
  const keyword = (req.query.keyword as string) || '';

  const result = keyword ? searchCodes(keyword, page, pageSize) : getAllCodes(page, pageSize);
  res.json({
    ok: true,
    data: result.data,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    },
  });
});

// 添加单个福利码
router.post('/codes', authMiddleware, (req, res) => {
  const parsed = CodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: parsed.error.errors[0]?.message });
  }

  const result = addCode(parsed.data.phone, parsed.data.code, parsed.data.note);
  if (result.success) {
    res.json({ ok: true, message: result.message, id: result.id });
  } else {
    res.status(400).json({ ok: false, message: result.message });
  }
});

// 更新福利码
router.put('/codes/:id', authMiddleware, (req, res) => {
  const data = { ...req.body, id: req.params.id };
  const parsed = UpdateCodeSchema.safeParse(data);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: parsed.error.errors[0]?.message });
  }

  const result = updateCode(parsed.data.id, parsed.data.phone, parsed.data.code, parsed.data.note);
  if (result.success) {
    res.json({ ok: true, message: result.message });
  } else {
    res.status(400).json({ ok: false, message: result.message });
  }
});

// 删除福利码
router.delete('/codes/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: '无效的 ID' });
  }

  const result = deleteCode(id);
  if (result.success) {
    res.json({ ok: true, message: result.message });
  } else {
    res.status(400).json({ ok: false, message: result.message });
  }
});

// 清空所有福利码
router.delete('/codes', authMiddleware, (_req, res) => {
  const result = clearAllCodes();
  res.json({ ok: true, message: result.message });
});

// Excel 批量上传
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: '请选择文件' });
    }

    const workbook = new ExcelJS.Workbook();
    // @ts-ignore - Buffer type compatibility
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ ok: false, message: 'Excel 文件为空' });
    }

    const codes: Array<{ phone: string; code: string; note?: string }> = [];
    const parseErrors: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      // 跳过表头行
      if (rowNumber === 1) return;

      const phone = String(row.getCell(1).value || '').trim();
      const code = String(row.getCell(2).value || '').trim();
      const note = String(row.getCell(3).value || '').trim();

      // 验证手机号
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        parseErrors.push(`第 ${rowNumber} 行：手机号格式无效 (${phone})`);
        return;
      }

      // 验证码格式
      if (!/^\d{6}$/.test(code)) {
        parseErrors.push(`第 ${rowNumber} 行：码格式无效，需要6位数字 (${code})`);
        return;
      }

      codes.push({ phone, code, note: note || undefined });
    });

    if (codes.length === 0) {
      return res.status(400).json({
        ok: false,
        message: '未找到有效数据',
        errors: parseErrors,
      });
    }

    const result = addCodesBatch(codes);

    res.json({
      ok: true,
      message: `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
      success: result.success,
      failed: result.failed,
      errors: [...parseErrors, ...result.errors].slice(0, 50), // 最多返回50条错误
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e.message || '文件处理失败' });
  }
});

// 下载 Excel 模板
router.get('/template', (_req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('福利码模板');

  // 设置表头
  worksheet.columns = [
    { header: '手机号', key: 'phone', width: 15 },
    { header: '6位数字码', key: 'code', width: 12 },
    { header: '备注', key: 'note', width: 30 },
  ];

  // 添加示例数据
  worksheet.addRow({ phone: '13800138000', code: '123456', note: '示例备注' });
  worksheet.addRow({ phone: '13900139000', code: '654321', note: '' });

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=welfare_code_template.xlsx');

  workbook.xlsx.write(res).then(() => res.end());
});

export default router;

