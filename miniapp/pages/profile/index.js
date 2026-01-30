/**
 * 我的
 */
Page({
  data: {
    loading: false,
    loggedIn: false,
    user: null,
    displayName: '未登录',
    avatarText: 'U',
  },

  onLoad() {
    // keep
  },

  onShow() {
    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.refreshUser();
  },

  async refreshUser() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      const res = await app.ensureLogin();
      const user = res.user || null;
      const nickname = user && user.nickname ? String(user.nickname) : '';
      const displayName = nickname ? nickname : user ? `用户#${user.id}` : '已登录';
      const avatarText = nickname ? nickname.slice(0, 1) : 'U';
      this.setData({ loggedIn: true, user, displayName, avatarText, loading: false });
    } catch (e) {
      this.setData({ loggedIn: false, user: null, displayName: '未登录', avatarText: 'U', loading: false });
    }
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/order-list/index' });
  },

  goAddress() {
    wx.navigateTo({ url: '/pages/address/index' });
  },

  logout() {
    const app = getApp();
    app.logout();
    wx.showToast({ title: '已退出', icon: 'success' });
    this.setData({ loggedIn: false, user: null });
  },

  clearLocal() {
    wx.showModal({
      title: '清理缓存',
      content: '将清空购物车与本地地址信息，是否继续？',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync('cart');
        wx.removeStorageSync('address');
        wx.showToast({ title: '已清理', icon: 'success' });
      },
    });
  },

  /**
   * 转发分享
   */
  onShareAppMessage() {
    return {
      title: '携荷管家 - 品质母婴好物',
      path: '/pages/index/index',
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '携荷管家 - 品质母婴好物',
    };
  },
});
