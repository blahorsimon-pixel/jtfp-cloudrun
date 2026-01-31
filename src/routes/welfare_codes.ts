import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';

const router = Router();

// 验证福利码
const ValidateReq = z.object({
  code: z.string().min(1),
});

router.post('/validate', async (req, res, next) => {
  try {
    const { code } = ValidateReq.parse(req.body);
    const result = storage.welfareCodes.validateCode(code);
    
    return res.json(result);
  } catch (e) {
    next(e);
  }
});

// 使用福利码
router.post('/use', async (req, res, next) => {
  try {
    const { code } = ValidateReq.parse(req.body);
    
    const validation = storage.welfareCodes.validateCode(code);
    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    const success = storage.welfareCodes.useCode(code);
    
    return res.json({
      success,
      message: success ? '福利码使用成功' : '福利码使用失败',
    });
  } catch (e) {
    next(e);
  }
});

export default router;
