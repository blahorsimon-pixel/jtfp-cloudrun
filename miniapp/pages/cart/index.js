/**
 * 购物车（本地存储）
 */
const { getCart, updateQty, removeItem } = require('../../utils/cart');
const { normalizeImageUrl } = require('../../utils/url');

Page({
  data: {
    items: [],
    totalCent: 0,
  },

  onLoad() {
    // keep
  },

  onShow() {
    // 设置自定义 tabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadCart();
  },

  loadCart() {
    const items = (getCart() || []).map((it) => ({
      ...it,
      cover_url: normalizeImageUrl(it.cover_url),
    }));
    const totalCent = items.reduce((sum, it) => sum + Number(it.price_cent || 0) * Number(it.qty || 0), 0);
    this.setData({ items, totalCent });
  },

  /**
   * 减少数量
   */
  dec(e) {
    const key = e.currentTarget.dataset.key;
    const item = (this.data.items || []).find((x) => x.key === key);
    if (!item) return;
    
    // 福利商品不能修改数量
    if (item.is_welfare == 1) return;
    
    const newQty = Number(item.qty || 1) - 1;
    if (newQty < 1) {
      // 数量为0时提示删除
      wx.showModal({
        title: '提示',
        content: '确定要移除该商品吗？',
        success: (res) => {
          if (res.confirm) {
            removeItem(key);
            this.loadCart();
          }
        },
      });
      return;
    }
    
    updateQty(key, newQty);
    this.loadCart();
  },

  /**
   * 增加数量
   */
  inc(e) {
    const key = e.currentTarget.dataset.key;
    const item = (this.data.items || []).find((x) => x.key === key);
    if (!item) return;
    
    // 福利商品不能修改数量
    if (item.is_welfare == 1) return;
    
    const newQty = Number(item.qty || 1) + 1;
    if (newQty > 99) {
      wx.showToast({ title: '最多购买99件', icon: 'none' });
      return;
    }
    
    updateQty(key, newQty);
    this.loadCart();
  },

  /**
   * 删除商品
   */
  remove(e) {
    const key = e.currentTarget.dataset.key;
    wx.showModal({
      title: '删除商品',
      content: '确定要从购物车移除该商品吗？',
      confirmColor: '#ff6b35',
      success: (res) => {
        if (res.confirm) {
          removeItem(key);
          this.loadCart();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  /**
   * 跳转商品详情
   */
  goProduct(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/product/index?id=${id}` });
  },

  /**
   * 去结算
   */
  goCheckout() {
    if (!this.data.items || this.data.items.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/checkout/index' });
  },

  /**
   * 去首页
   */
  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
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
