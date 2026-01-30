import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';
dotenv.config();

const required = (name: string, def?: string) => {
  const v = process.env[name] ?? def;
  if (v === undefined) throw new Error(`Missing env ${name}`);
  return v;
};

// 微信云托管环境变量适配
// 云托管提供: MYSQL_ADDRESS (格式: host:port), MYSQL_USERNAME, MYSQL_PASSWORD
const parseMySQLAddress = () => {
  const addr = process.env.MYSQL_ADDRESS;
  if (addr) {
    const [host, port] = addr.split(':');
    return { host, port: parseInt(port || '3306', 10) };
  }
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT ?? '3306', 10)
  };
};

const dbAddr = parseMySQLAddress();

// 是否运行在微信云托管环境
const isWxCloudRun = !!process.env.MYSQL_ADDRESS || !!process.env.WX_CLOUDRUN_ENV;

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  baseUrl: process.env.BASE_URL ?? 'https://www.jintai.cloud/h5/api',
  isWxCloudRun,
  db: {
    host: dbAddr.host,
    port: dbAddr.port,
    user: process.env.MYSQL_USERNAME || required('DB_USER'),
    password: process.env.MYSQL_PASSWORD || required('DB_PASSWORD'),
    database: required('DB_NAME', 'h5mall'),
  },
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  jwtSecret: process.env.JWT_SECRET ?? 'change_me',
  adminToken: process.env.ADMIN_TOKEN ?? '',
  orderUnpaidTtlMin: parseInt(process.env.ORDER_UNPAID_TTL_MIN ?? '10', 10),
  wechat: {
    enabled: /^(1|true|yes)$/i.test(process.env.WECHAT_PAY_ENABLED ?? 'true'),
    // 公众号
    appId: process.env.WECHAT_MP_APPID ?? process.env.WX_APP_ID ?? '',
    mpSecret: process.env.WECHAT_MP_SECRET ?? process.env.WX_MP_SECRET ?? process.env.WX_APP_SECRET ?? '',
    // 小程序
    miniAppId: process.env.WECHAT_MINI_APPID ?? '',
    miniAppSecret: process.env.WECHAT_MINI_SECRET ?? '',
    mchId: process.env.WX_MCH_ID ?? process.env.WECHAT_MCH_ID ?? '',
    certSerialNo: (() => {
      const fromEnv = process.env.WX_CERT_SERIAL_NO ?? process.env.WECHAT_MCH_SERIAL_NO ?? '';
      if (fromEnv) return fromEnv;
      // 兜底：若 env 未配置，但磁盘存在商户证书（apiclient_cert.pem），则自动读取 serial
      // 这样可以避免“改前端/重启服务后，忘记注入序列号”导致预下单失败
      const keyPath =
        process.env.WX_PRIVATE_KEY_PATH ??
        process.env.WECHAT_MCH_PRIVATE_KEY_PATH ??
        '/www/wwwroot/H5/secrets/wechat/mch/apiclient_key.pem';
      const guessCertPaths = [
        '/www/wwwroot/H5/secrets/wechat/mch/apiclient_cert.pem',
        '/www/wwwroot/H5/secrets/wechat/mch/apiclient_cert.crt',
        keyPath.replace(/_key\.pem$/i, '_cert.pem'),
      ];
      for (const p of guessCertPaths) {
        try {
          if (!fs.existsSync(p)) continue;
          const pem = fs.readFileSync(p, 'utf8');
          const x = new crypto.X509Certificate(pem);
          // Node 返回的 serialNumber 可能带冒号或大写，直接透传给微信即可
          const serial = (x.serialNumber || '').replace(/:/g, '');
          if (serial) return serial;
        } catch {
          // ignore
        }
      }
      return '';
    })(),
    apiV3Key: process.env.WX_API_V3_KEY ?? process.env.WECHAT_API_V3_KEY ?? '',
    // 证书路径（本地开发/传统部署）
    privateKeyPath: process.env.WX_PRIVATE_KEY_PATH ?? process.env.WECHAT_MCH_PRIVATE_KEY_PATH ?? '/www/wwwroot/H5/secrets/wechat/mch/apiclient_key.pem',
    platformCertPath: process.env.WX_PLATFORM_CERT_PATH ?? process.env.WECHAT_PLATFORM_CERT_PATH ?? '/www/wwwroot/H5/secrets/wechat/platform/pub_key_wechatpay202512.pem',
    // 证书内容（云托管环境，通过环境变量注入 base64 编码的证书）
    privateKeyContent: process.env.WX_PRIVATE_KEY_CONTENT ? Buffer.from(process.env.WX_PRIVATE_KEY_CONTENT, 'base64').toString('utf8') : '',
    platformCertContent: process.env.WX_PLATFORM_CERT_CONTENT ? Buffer.from(process.env.WX_PLATFORM_CERT_CONTENT, 'base64').toString('utf8') : '',
    notifyPath: process.env.WECHAT_NOTIFY_PATH ?? '/api/v1/pay/wechat/notify',
    jsSdkCacheTtl: parseInt(process.env.JS_SDK_CACHE_TTL ?? '5400', 10),
    payAuthDir: process.env.PAY_AUTH_DIR ?? '/h5/pay/',
  }
};

export const ttlMs = config.orderUnpaidTtlMin * 60 * 1000;
