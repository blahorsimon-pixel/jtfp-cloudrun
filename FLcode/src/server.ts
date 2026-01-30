import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDB } from './db';
import userRouter from './routes/user';
import adminRouter from './routes/admin';

// 初始化数据库
initDB();

export const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/health', (_req, res) => res.json({ ok: true, service: 'flcode' }));

// API 路由
app.use('/api', userRouter);
app.use('/api/admin', adminRouter);

// 静态文件服务
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// 前端路由 fallback
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

// 错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ ok: false, message: err.message || '服务器错误' });
});

