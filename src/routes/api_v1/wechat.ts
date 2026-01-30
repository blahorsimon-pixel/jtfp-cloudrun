import { Router } from 'express';
import axios from 'axios';
import { signJsSdk } from '../../services/wechat_mp';
import { config } from '../../config/index';
import { getAccessToken } from '../../services/wechat_mp';

const router = Router();

// GET /api/v1/wechat/js-sdk/sign?url=ENCODED_CURRENT_URL
router.get('/js-sdk/sign', async (req, res) => {
  try {
    const url = (req.query.url as string) || '';
    if (!url) return res.status(400).json({ code: 'INVALID_PARAMS', message: 'url required' });
    const data = await signJsSdk(url);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ code: 'SIGN_ERROR', message: e?.message || 'sign error' });
  }
});

// TEMP: diagnostics endpoint - DO NOT KEEP IN PRODUCTION
if ((process.env.DIAG_ENABLED || '').toLowerCase() === 'true') {
  router.get('/diag', async (_req, res) => {
    try {
      // mask secret
      const sec = config.wechat.mpSecret || '';
      const masked = sec ? (sec.length <= 6 ? sec[0] + '***' + sec.slice(-1) : sec.slice(0, 2) + '***' + sec.slice(-2)) : '';

      // get egress ip
      let egressIp: string | undefined;
      try {
        const ipr = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
        egressIp = ipr?.data?.ip;
      } catch {}

      // try get access_token
      let atOk = false;
      let atErr: string | undefined;
      try {
        const token = await getAccessToken();
        atOk = !!token;
      } catch (err: any) {
        atErr = err?.message || String(err);
      }

      res.json({
        appId: config.wechat.appId,
        mpSecretMasked: masked,
        secretLength: sec.length,
        egressIp,
        accessTokenOk: atOk,
        accessTokenError: atErr,
        notes: 'This endpoint is temporary for diagnostics; remove after debugging.'
      });
    } catch (e: any) {
      res.status(500).json({ code: 'DIAG_ERROR', message: e?.message || 'diag error' });
    }
  });
}

export default router;
