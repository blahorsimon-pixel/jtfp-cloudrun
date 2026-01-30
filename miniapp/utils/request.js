/**
 * 封装 wx.request，统一处理鉴权、错误
 */

// TODO: 发布前改为正式域名
const BASE_URL = 'https://www.jintai.cloud/h5/api/api/v1';

/**
 * 发起请求
 * @param {object} options
 * @param {string} options.url - 相对路径（如 /products）
 * @param {string} [options.method='GET']
 * @param {object} [options.data]
 * @param {boolean} [options.needAuth=false] - 是否需要携带 token
 */
function request(options) {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const header = {
      'Content-Type': 'application/json',
    };

    // 如果需要鉴权，添加 Authorization header
    if (options.needAuth && app.globalData.token) {
      header['Authorization'] = `Bearer ${app.globalData.token}`;
    }

    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header,
      timeout: 15000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token 失效，清除登录态
          app.logout();
          reject({ code: 'UNAUTHORIZED', message: '登录已过期，请重新登录' });
        } else {
          const body = res.data || {};
          reject({
            code: (body && body.code) || 'REQUEST_ERROR',
            message: (body && body.message) || '请求失败',
            status: res.statusCode,
          });
        }
      },
      fail(err) {
        reject({ code: 'NETWORK_ERROR', message: '网络错误', error: err });
      },
    });
  });
}

/**
 * GET 请求
 */
function get(url, data, needAuth = false) {
  return request({ url, method: 'GET', data, needAuth });
}

/**
 * POST 请求
 */
function post(url, data, needAuth = false) {
  return request({ url, method: 'POST', data, needAuth });
}

module.exports = { request, get, post, BASE_URL };
