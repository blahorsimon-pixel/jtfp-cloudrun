/**
 * 微信小程序 CI 上传脚本（服务器端 Linux 使用）
 *
 * 用法示例：
 *   cd /www/wwwroot/H5
 *   MINI_BUILD=1 MINI_DESC="修复首页空白" node scripts/miniapp-upload.js
 *
 * 版本号规则（你选的“2：日期版”）：
 *   YYYY.MM.DD-<MINI_BUILD>
 *   例：2026.01.07-1
 */
const ci = require('miniprogram-ci');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function getDateVersion(buildNo) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}.${mm}.${dd}-${buildNo}`;
}

async function main() {
  const projectPath = process.env.MINI_PROJECT_PATH || '/www/wwwroot/H5/miniapp';
  const privateKeyPath =
    process.env.MINI_PRIVATE_KEY_PATH ||
    '/www/wwwroot/H5/secrets/wechat/mini/private.wxb4bf281976e4b9c1.key';

  const buildNoRaw = process.env.MINI_BUILD || '1';
  const buildNo = Number(buildNoRaw);
  if (!Number.isFinite(buildNo) || buildNo <= 0) {
    throw new Error(`Invalid MINI_BUILD: "${buildNoRaw}" (should be a positive number)`);
  }

  const version = process.env.MINI_VERSION || getDateVersion(buildNo);
  const desc =
    process.env.MINI_DESC ||
    `server upload ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;

  const project = new ci.Project({
    type: 'miniProgram',
    projectPath,
    privateKeyPath,
    appid: 'wxb4bf281976e4b9c1',
  });

  const res = await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      minify: true,
      uploadWithSourceMap: true,
    },
    onProgressUpdate: console.log,
  });

  console.log('UPLOAD_OK', res);
}

main().catch((e) => {
  console.error('UPLOAD_FAILED', e && (e.stack || e.message || e));
  process.exit(1);
});

