/**
 * H5商城小程序版 - App 入口
 */
const { login } = require('./services/auth');

App({
  globalData: {
    userInfo: null,
    token: null,
    isLoggedIn: false,
  },

  onLaunch() {
    // 尝试从本地缓存恢复登录态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    }
  },

  /**
   * 静默登录（自动调用 wx.login 换取 token）
   * @returns {Promise<{token: string, user: object}>}
   */
  async silentLogin() {
    try {
      const res = await login();
      this.globalData.token = res.token;
      this.globalData.userInfo = res.user;
      this.globalData.isLoggedIn = true;
      wx.setStorageSync('token', res.token);
      wx.setStorageSync('userInfo', res.user);
      return res;
    } catch (e) {
      console.error('silentLogin failed', e);
      throw e;
    }
  },

  /**
   * 确保已登录（若未登录则自动静默登录）
   */
  async ensureLogin() {
    if (this.globalData.isLoggedIn && this.globalData.token) {
      return { token: this.globalData.token, user: this.globalData.userInfo };
    }
    return this.silentLogin();
  },

  /**
   * 登出
   */
  logout() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  },
});
