import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { requireAdminToken } from '../../../middlewares/admin_auth';

const router = Router();

router.use(requireAdminToken);

const normalizePrefix = (p: string) => {
  let s = (p || '').trim();
  if (!s) return '';
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.endsWith('/')) s = s.slice(0, -1);
  return s === '/' ? '' : s;
};

const PUBLIC_PREFIX = normalizePrefix(process.env.PUBLIC_PATH_PREFIX || '');

const LEGACY_UPLOAD_DIR = '/www/wwwroot/H5/h5-ui/dist/images/uploads';
const FALLBACK_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || (fs.existsSync(LEGACY_UPLOAD_DIR) ? LEGACY_UPLOAD_DIR : FALLBACK_UPLOAD_DIR);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    } catch {}
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.png';
    const name = `u_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype || '');
    if (!ok) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

// POST /api/v1/admin/upload/image
router.post('/image', upload.single('file'), (req, res) => {
  const f = (req as any).file as Express.Multer.File | undefined;
  if (!f) return res.status(400).json({ error: 'No file uploaded' });
  const url = `${PUBLIC_PREFIX}/h5/images/uploads/${encodeURIComponent(f.filename)}`;
  return res.json({ success: true, url });
});

export default router;


