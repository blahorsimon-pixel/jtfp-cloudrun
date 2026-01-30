import { Router } from 'express';
import fs from 'fs';
import { config } from '../../config/index';

const router = Router();

router.get('/', (_req, res) => {
  const c = config.wechat;
  const fileExists = c.privateKeyPath ? fs.existsSync(c.privateKeyPath) : false;
  const resp = {
    mchIdPresent: !!c.mchId,
    certSerialNoPresent: !!c.certSerialNo,
    apiV3KeyLen: c.apiV3Key ? c.apiV3Key.length : 0,
    privateKeyPath: c.privateKeyPath || '',
    privateKeyExists: fileExists,
    enabled: c.enabled,
    payAuthDir: c.payAuthDir,
  };
  res.json(resp);
});

export default router;




