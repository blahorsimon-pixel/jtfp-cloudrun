/**
 * 订单列表
 */
const { getMyOrders, miniPrepay } = require('../../services/api');
const { normalizeImageUrl } = require('../../utils/url');

Page({
  data: {
    loading: true,
    error: null,
    orders: [],
    page: 1,
    pageSize: 10,
    total: 0,
  },

  onLoad() {
    // keep
  },

  onShow() {
    this.reload();
  },

  onPullDownRefresh() {
    this.reload().finally(() => wx.stopPullDownRefresh());
  },

  async reload() {
    this.setData({ page: 1, orders: [] });
    return this.loadOrders(true);
  },

  async loadOrders(isReplace = false) {
    this.setData({ loading: true, error: null });
    try {
      const app = getApp();
      await app.ensureLogin();

      const res = await getMyOrders({ page: this.data.page, pageSize: this.data.pageSize });
      const list = res.orders || res.data || [];
      const normalized = Array.isArray(list)
        ? list.map((o) => ({
            ...o,
            cover_url: normalizeImageUrl(o.cover_url),
          }))
        : [];

      const orders = isReplace ? normalized : (this.data.orders || []).concat(normalized);
      this.setData({
        orders,
        total: Number(res.total || 0),
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  onReachBottom() {
    const { orders, total, loading, page, pageSize } = this.data;
    if (loading) return;
    if ((orders || []).length >= Number(total || 0)) return;
    this.setData({ page: Number(page || 1) + 1 });
    this.loadOrders(false);
  },

  goDetail(e) {
    const orderNo = e.currentTarget.dataset.orderno;
    wx.navigateTo({ url: `/pages/order-detail/index?orderNo=${encodeURIComponent(orderNo)}` });
  },

  async payNow(e) {
    const orderNo = e.currentTarget.dataset.orderno;
    if (!orderNo) return;
    try {
      const app = getApp();
      await app.ensureLogin();

      const payParams = await miniPrepay(orderNo);
      await new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: String(payParams.timeStamp || payParams.timestamp || ''),
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType || 'RSA',
          paySign: payParams.paySign,
          success: resolve,
          fail: reject,
        });
      });
      wx.showToast({ title: '支付成功', icon: 'success' });
      this.reload();
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '支付失败', icon: 'none' });
    }
  },
});
