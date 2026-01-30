/**
 * 小程序登录服务
 */
const { post } = require('../utils/request');

/**
 * 小程序登录（使用 wx.login 获取的 code 换取 token）
 * @returns {Promise<{token: string, user: object}>}
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject({ code: 'WX_LOGIN_FAILED', message: 'wx.login 失败' });
          return;
        }
        // 调用后端接口换取 token
        post('/auth/mini/login', { code: loginRes.code })
          .then(resolve)
          .catch(reject);
      },
      fail(err) {
        reject({ code: 'WX_LOGIN_FAILED', message: 'wx.login 失败', error: err });
      },
    });
  });
}

module.exports = { login };
