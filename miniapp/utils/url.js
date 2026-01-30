const { BASE_URL } = require('./request');

function getApiOrigin() {
  try {
    return new URL(BASE_URL).origin;
  } catch (e) {
    // 兜底：避免 URL 构造失败导致小程序白屏
    return 'https://www.jintai.cloud';
  }
}

/**
 * 归一化图片 URL，确保 <image src> 可用的完整 https 地址
 * - https/http: 原样返回
 * - //example.com/a.png: 补 https:
 * - /h5/images/a.jpg: 拼接为 origin + path
 * - 其它相对路径: 拼接为 origin + '/' + path
 * - 空值: 返回一个可用的本地占位图
 */
function normalizeImageUrl(input) {
  if (input == null) return '/assets/images/tab-home.png';
  const url = String(input).trim();
  if (!url) return '/assets/images/tab-home.png';

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;

  const origin = getApiOrigin();
  if (url.startsWith('/')) return origin + url;
  return origin + '/' + url;
}

/**
 * 归一化富文本 HTML 内的 <img src="..."> 地址，确保 rich-text 内图片可加载
 * - src="/h5/..." -> https://{origin}/h5/...
 * - src="//..." -> https://...
 * - src="relative/path" -> https://{origin}/relative/path
 * - src="data:image/..." -> 保留不变
 * 同时尽量给 <img> 注入自适应样式（不覆盖已有 style）
 */
function normalizeHtmlImageSrc(html) {
  if (html == null) return '';
  let out = String(html);
  if (!out.trim()) return '';

  // normalize src
  out = out.replace(/(<img\b[^>]*?\bsrc=)(['"]?)([^'"\s>]+)\2/gi, (_m, p1, quote, src) => {
    const raw = String(src || '').trim();
    if (!raw) return `${p1}${quote || '"'}${raw}${quote || '"'}`;
    if (/^data:/i.test(raw)) return `${p1}${quote || '"'}${raw}${quote || '"'}`;
    const next = normalizeImageUrl(raw);
    return `${p1}${quote || '"'}${next}${quote || '"'}`;
  });

  const inject = 'max-width:100%;height:auto;display:block;';

  // append style if exists and missing our inject
  out = out.replace(/(<img\b[^>]*?\bstyle=)(['"])([\s\S]*?)\2/gi, (m, p1, q, style) => {
    const s = String(style || '');
    if (s.includes('max-width') || s.includes('height:auto')) return m;
    const merged = (s.trim().replace(/;?$/, ';') + inject).replace(/\s+/g, ' ');
    return `${p1}${q}${merged}${q}`;
  });

  // add style attr if missing
  out = out.replace(/<img\b(?![^>]*\bstyle=)/gi, `<img style="${inject}"`);

  return out;
}

module.exports = { normalizeImageUrl, normalizeHtmlImageSrc, getApiOrigin };

