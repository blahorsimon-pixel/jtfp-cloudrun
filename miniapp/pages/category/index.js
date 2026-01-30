/**
 * 分类页（简单分组：全部 / 福利 / 普通）
 */
const { getProducts } = require('../../services/api');
const { normalizeImageUrl } = require('../../utils/url');

Page({
  data: {
    tab: 'all', // all | welfare | normal
    loading: true,
    error: null,
    products: [],
    filteredProducts: [],
  },

  onLoad() {
    this.loadProducts();
  },

  onPullDownRefresh() {
    this.loadProducts().finally(() => wx.stopPullDownRefresh());
  },

  onShow() {
    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  async loadProducts() {
    this.setData({ loading: true, error: null });
    try {
      const res = await getProducts({ status: 1, limit: 200 });
      const list = res.data || res.products || res.list || res || [];
      const products = Array.isArray(list)
        ? list.map((p) => ({ ...p, cover_url: normalizeImageUrl(p.cover_url) }))
        : [];
      this.setData({ products, loading: false });
      this.updateFiltered();
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  setTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab) return;
    this.setData({ tab });
    this.updateFiltered();
  },

  updateFiltered() {
    const tab = this.data.tab;
    const list = this.data.products || [];
    let filtered = list;
    if (tab === 'welfare') filtered = list.filter((p) => Number(p.is_welfare || 0) === 1);
    else if (tab === 'normal') filtered = list.filter((p) => Number(p.is_welfare || 0) !== 1);
    this.setData({ filteredProducts: filtered });
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
