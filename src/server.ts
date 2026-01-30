import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import path from 'path';
import fs from 'fs';
import { errorMiddleware } from './utils/errors';
import { config } from './config/index';
import shippingRouter from './routes/shipping';
import redeemRouter from './routes/redeem';
import paymentRouter from './routes/payment';
import pointsRouter from './routes/points';
import catalogRouter from './routes/catalog';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import reviewsRouter from './routes/reviews';
import welfareCodesRouter from './routes/welfare_codes';

// v1 routers
import apiAuth from './routes/api_v1/auth';
import apiWechat from './routes/api_v1/wechat';
import apiPay from './routes/api_v1/pay';
import apiPayDiag from './routes/api_v1/pay_diag';
import apiAdminOrders from './routes/api_v1/admin/orders';
import apiAdminInventory from './routes/api_v1/admin/inventory';
import apiAdminProducts from './routes/api_v1/admin/products';
import apiAdminExport from './routes/api_v1/admin/export';
import apiAdminUpload from './routes/api_v1/admin/upload';
import apiAdminWelfareCodes from './routes/api_v1/admin/welfare_codes';
import apiAdminSkuLibrary from './routes/api_v1/admin/sku_library';
import apiAdminProperties from './routes/api_v1/admin/properties';
import apiAdminCategories from './routes/api_v1/admin/categories';
import apiMeOrders from './routes/api_v1/me/orders';
import apiAuthMini from './routes/api_v1/auth_mini';
import apiPayMini from './routes/api_v1/pay_mini';
import apiProducts from './routes/api_v1/products';
import apiOrders from './routes/api_v1/orders';
import apiPropertiesMall from './routes/api_v1/properties_mall';

export const app = express();

app.use(cors());
// Route-level raw body for WeChat notify (signature verification needs raw body)
// app.use('/payments/wechat/notify', express.raw({ type: 'application/json' })); // legacy
// app.use('/api/v1/pay/wechat/notify', express.raw({ type: 'application/json' }));
// app.use('/h5/api/api/v1/pay/wechat/notify', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
app.use(pinoHttp());

app.get('/health', (_req, res) => res.json({ ok: true, env: config.env }));
app.get('/h5/api/health', (_req, res) => res.json({ ok: true, env: config.env, prefix: '/h5/api' }));

app.use('/shipping', shippingRouter);
app.use('/redeem', redeemRouter);
// app.use('/payments', paymentRouter);
app.use('/me', pointsRouter);
app.use('/redeem', catalogRouter); // catalog routes under /redeem
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);
app.use('/reviews', reviewsRouter);
app.use('/welfare', welfareCodesRouter);

// mount v1 APIs
app.use('/api/v1/auth', apiAuth);
app.use('/api/v1/auth/mini', apiAuthMini);  // 小程序登录
app.use('/api/v1/wechat', apiWechat);
app.use('/api/v1/products', apiProducts);
app.use('/api/v1/properties/mall', apiPropertiesMall);  // 房源商城API
app.use('/api/v1/orders', apiOrders);
// app.use('/api/v1/pay', apiPay);
// app.use('/api/v1/pay/wechat/mini', apiPayMini);  // 小程序支付
app.use('/api/v1/me/orders', apiMeOrders);
app.use('/api/v1/admin/orders', apiAdminOrders);
app.use('/api/v1/admin/inventory', apiAdminInventory);
app.use('/api/v1/admin/products', apiAdminProducts);
app.use('/api/v1/admin/export', apiAdminExport);
app.use('/api/v1/admin/upload', apiAdminUpload);
app.use('/api/v1/welfare', welfareCodesRouter);
app.use('/api/v1/admin/welfare-codes', apiAdminWelfareCodes);
app.use('/api/v1/admin/sku-library', apiAdminSkuLibrary);
app.use('/api/v1/admin/properties', apiAdminProperties);
app.use('/api/v1/admin/categories', apiAdminCategories);
if ((process.env.DIAG_ENABLED || '').toLowerCase() === 'true') {
  app.use('/api/v1/pay/diag', apiPayDiag);
}

// mount v1 APIs under /h5/api/v1/* for frontend compatibility
app.use('/h5/api/v1/admin/orders', apiAdminOrders);
app.use('/h5/api/v1/admin/inventory', apiAdminInventory);
app.use('/h5/api/v1/admin/products', apiAdminProducts);
app.use('/h5/api/v1/admin/export', apiAdminExport);
app.use('/h5/api/v1/admin/upload', apiAdminUpload);
app.use('/h5/api/v1/admin/welfare-codes', apiAdminWelfareCodes);
app.use('/h5/api/v1/admin/sku-library', apiAdminSkuLibrary);
app.use('/h5/api/v1/admin/properties', apiAdminProperties);
app.use('/h5/api/v1/admin/categories', apiAdminCategories);

// mirror mounts under /h5/api/api/v1/* so gateway can proxy without rewrite
app.use('/h5/api/api/v1/auth', apiAuth);
app.use('/h5/api/api/v1/auth/mini', apiAuthMini);  // 小程序登录
app.use('/h5/api/api/v1/wechat', apiWechat);
app.use('/h5/api/api/v1/products', apiProducts);
app.use('/h5/api/api/v1/properties/mall', apiPropertiesMall);  // 房源商城API
app.use('/h5/api/api/v1/orders', apiOrders);
// app.use('/h5/api/api/v1/pay', apiPay);
// app.use('/h5/api/api/v1/pay/wechat/mini', apiPayMini);  // 小程序支付
app.use('/h5/api/api/v1/me/orders', apiMeOrders);
app.use('/h5/api/api/v1/admin/orders', apiAdminOrders);
app.use('/h5/api/api/v1/admin/inventory', apiAdminInventory);
app.use('/h5/api/api/v1/admin/products', apiAdminProducts);
app.use('/h5/api/api/v1/admin/export', apiAdminExport);
app.use('/h5/api/api/v1/admin/upload', apiAdminUpload);
app.use('/h5/api/api/v1/welfare', welfareCodesRouter);
app.use('/h5/api/api/v1/admin/welfare-codes', apiAdminWelfareCodes);
app.use('/h5/api/api/v1/admin/sku-library', apiAdminSkuLibrary);
app.use('/h5/api/api/v1/admin/properties', apiAdminProperties);
app.use('/h5/api/api/v1/admin/categories', apiAdminCategories);
if ((process.env.DIAG_ENABLED || '').toLowerCase() === 'true') {
  app.use('/h5/api/api/v1/pay/diag', apiPayDiag);
}

// serve static demo H5
const publicDir = path.join(__dirname, '..', 'public');

// ========== 微信云托管静态文件服务 ==========
// 云托管环境下，前端构建产物位于 public/admin 和 public/h5
const adminDir = path.join(publicDir, 'admin');
const h5Dir = path.join(publicDir, 'h5');

// Admin 管理后台（SPA history 模式支持）
if (fs.existsSync(adminDir)) {
  app.use('/admin', express.static(adminDir, { index: 'index.html' }));
  // SPA fallback: 所有 /admin/* 非静态资源请求返回 index.html
  app.get('/admin/*', (req, res, next) => {
    const indexPath = path.join(adminDir, 'index.html');
    if (fs.existsSync(indexPath) && !req.path.includes('.')) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// H5 商城（SPA history 模式支持）
if (fs.existsSync(h5Dir)) {
  app.use('/h5', express.static(h5Dir, { index: 'index.html' }));
  // SPA fallback
  app.get('/h5/*', (req, res, next) => {
    const indexPath = path.join(h5Dir, 'index.html');
    if (fs.existsSync(indexPath) && !req.path.includes('.')) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// ========== 原有静态文件服务（保持兼容） ==========
// serve uploaded images (admin upload -> /h5/images/uploads/<filename>)
// upload dir: prefer env UPLOAD_DIR; otherwise legacy; otherwise <project>/public/uploads
const legacyUploadDir = '/www/wwwroot/H5/h5-ui/dist/images/uploads';
const uploadsDir =
  process.env.UPLOAD_DIR || (fs.existsSync(legacyUploadDir) ? legacyUploadDir : path.join(publicDir, 'uploads'));
const imagesDir = path.dirname(uploadsDir);
app.use('/h5/images/uploads', express.static(uploadsDir));
// serve images under /JTFP/h5 prefix for frontend compatibility
app.use('/JTFP/h5/images/uploads', express.static(uploadsDir));
// optional hardening: serve other h5 images under the same prefix
app.use('/h5/images', express.static(imagesDir));
app.use('/JTFP/h5/images', express.static(imagesDir));
// serve jintai-property h5 public images
const jintaiH5ImagesDir = '/www/wwwroot/jtfp/jintai-property/h5/public/images';
if (fs.existsSync(jintaiH5ImagesDir)) {
  app.use('/JTFP/h5/images', express.static(jintaiH5ImagesDir));
}

// 后台管理页是频繁迭代的纯前端单页：避免被浏览器/CDN 缓存导致用户刷新仍加载旧版本
app.use(['/h5/admin', '/JTFP/H5/admin'], (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 支持别名路径访问静态资源
app.use('/JTFP/H5', express.static(path.join(publicDir, 'h5')));
app.use(express.static(publicDir));

app.use(errorMiddleware);
