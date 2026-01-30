import { Router } from 'express';
import { z } from 'zod';
import { getCodeByPhone, getConfig, getAllConfig } from '../db';

const router = Router();

// 手机号验证 schema
const PhoneSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的中国大陆手机号'),
});

// 获取页面配置（公开）
router.get('/config', (_req, res) => {
  const config = getAllConfig();
  // 只返回前端需要的配置，不返回管理密码
  res.json({
    ok: true,
    data: {
      page_title: config.page_title || '福利码领取',
      success_msg: config.success_msg || '恭喜您，领取成功！',
      fail_msg: config.fail_msg || '抱歉，未找到您的福利码。',
      usage_tip: config.usage_tip || '请在有效期内使用此码。',
    },
  });
});

// 用户领取/查询福利码
router.post('/claim', (req, res) => {
  const parsed = PhoneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: parsed.error.errors[0]?.message || '参数错误',
    });
  }

  const { phone } = parsed.data;
  const record = getCodeByPhone(phone);

  if (record) {
    const successMsg = getConfig('success_msg') || '恭喜您，领取成功！';
    const usageTip = getConfig('usage_tip') || '请在有效期内使用此码。';
    return res.json({
      ok: true,
      found: true,
      code: record.code,
      note: record.note,
      message: successMsg,
      usage_tip: usageTip,
    });
  } else {
    const failMsg = getConfig('fail_msg') || '抱歉，未找到您的福利码，请确认手机号是否正确。';
    return res.json({
      ok: true,
      found: false,
      message: failMsg,
    });
  }
});

export default router;

