/**
 * 首页
 */
const { getProducts } = require('../../services/api');
const { normalizeImageUrl } = require('../../utils/url');

Page({
  data: {
    products: [],
    loading: true,
    error: null,
  },

  onLoad() {
    this.loadProducts();
  },

  onShow() {
    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh() {
    this.loadProducts().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadProducts() {
    this.setData({ loading: true, error: null });
    try {
      const res = await getProducts({ status: 1, limit: 20 });
      const list = res.data || res.products || res.list || res || [];
      const products = Array.isArray(list)
        ? list.map((p) => ({
            ...p,
            cover_url: normalizeImageUrl(p.cover_url),
          }))
        : [];
      this.setData({
        products,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  goToSearch() {
    wx.showToast({ title: '暂未实现搜索', icon: 'none' });
  },

  goToProduct(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/product/index?id=${id}` });
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
