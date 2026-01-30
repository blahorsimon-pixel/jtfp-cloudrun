/**
 * 订单详情
 */
const { getOrderDetail, miniPrepay } = require('../../services/api');
const { normalizeImageUrl } = require('../../utils/url');

Page({
  data: {
    orderNo: '',
    loading: true,
    error: null,
    order: null,
    items: [],
    shipments: [],
    address: null,
  },

  onLoad(query) {
    const orderNo = (query && query.orderNo) || '';
    if (!orderNo) {
      this.setData({ loading: false, error: '缺少订单号' });
      return;
    }
    this.setData({ orderNo });
    this.loadDetail();
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => wx.stopPullDownRefresh());
  },

  async loadDetail() {
    this.setData({ loading: true, error: null });
    try {
      const app = getApp();
      await app.ensureLogin();

      const res = await getOrderDetail(this.data.orderNo);
      const order = res.order || res.data || null;
      const items = Array.isArray(res.items) ? res.items : [];
      const shipments = Array.isArray(res.shipments) ? res.shipments : [];

      let address = null;
      try {
        const raw = order && order.address_snapshot;
        if (raw && typeof raw === 'string') address = JSON.parse(raw);
        else if (raw && typeof raw === 'object') address = raw;
      } catch {
        address = null;
      }

      const normalizedItems = items.map((it) => ({
        ...it,
        cover_url: normalizeImageUrl(it.cover_url),
      }));

      this.setData({
        order,
        items: normalizedItems,
        shipments,
        address,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  async payNow() {
    const order = this.data.order;
    const orderNo = this.data.orderNo;
    if (!order || !orderNo) return;
    if (order.status !== 'PENDING_PAYMENT') return;
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
      this.loadDetail();
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '支付失败', icon: 'none' });
    }
  },
});
