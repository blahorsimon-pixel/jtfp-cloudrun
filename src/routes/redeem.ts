import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/errors';

const router = Router();

const CreateOrderReq = z.object({
  skuId: z.number().int().positive(),
  addressId: z.number().int().positive(),
});

router.post('/orders', async (req, res, next) => {
  try {
    const body = CreateOrderReq.parse(req.body);
    // TODO: 校验登录用户，从 req 中获取 userId（后续接入鉴权中间件）
    // TODO: 校验限购、校验积分可用、扣积分、锁库存、创建订单（PENDING_FREIGHT）
    // TODO: 当运费为0时，直接进入 WAIT_SHIP
    const mock = {
      orderNo: 'R' + Date.now(),
      status: 'PENDING_FREIGHT',
      freightAmountCent: 1200,
      requiredPoints: 100,
      payRequired: true,
    };
    return res.json(mock);
  } catch (e) { next(e); }
});

const PayFreightReq = z.object({
  payScene: z.enum(['JSAPI','MWEB']),
  wxOpenId: z.string().optional(),
  returnUrl: z.string().url().optional(),
});

router.post('/orders/:orderNo/pay-freight', async (req, res, next) => {
  try {
    const _body = PayFreightReq.parse(req.body);
    const { orderNo } = req.params;
    if (!orderNo) throw new AppError(400, 'INVALID_PARAMS', 'orderNo required');
    // TODO: 依据 payScene 生成微信预下单，并返回前端调起参数（仅运费）
    return res.json({
      appId: 'wx123', timeStamp: String(Math.floor(Date.now()/1000)), nonceStr: 'nonce',
      package: 'prepay_id=mock', signType: 'RSA', paySign: 'signature'
    });
  } catch (e) { next(e); }
});

const UpdateAddrReq = z.object({ addressId: z.number().int().positive() });
router.put('/orders/:orderNo/address', async (req, res, next) => {
  try {
    const _body = UpdateAddrReq.parse(req.body);
    const { orderNo } = req.params;
    if (!orderNo) throw new AppError(400, 'INVALID_PARAMS', 'orderNo required');
    // TODO: 更新地址快照与运费重算，关闭旧预支付单，生成新单
    return res.json({ orderNo, freightAmountCent: 1500, needNewPay: true });
  } catch (e) { next(e); }
});

router.post('/orders/:orderNo/cancel', async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    if (!orderNo) throw new AppError(400, 'INVALID_PARAMS', 'orderNo required');
    // TODO: 若已支付运费则申请退款；返还积分；释放库存；更改状态
    return res.json({ orderNo, status: 'CANCELLED', refundFreight: 'APPLIED' });
  } catch (e) { next(e); }
});

router.get('/orders/:orderNo', async (req, res, next) => {
  try {
    const { orderNo } = req.params;
    if (!orderNo) throw new AppError(400, 'INVALID_PARAMS', 'orderNo required');
    // TODO: 查询订单详情
    return res.json({ orderNo, status: 'PENDING_FREIGHT', pointsCost: 100, freightAmountCent: 1200 });
  } catch (e) { next(e); }
});

export default router;

