import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index';

export function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  
  if (!config.adminToken || token !== config.adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

