/**
 * 结算页：本地购物车 + 本地地址表单
 * 流程：createOrder -> miniPrepay -> wx.requestPayment
 * 支持福利码订单：通过 URL 参数传递福利码信息
 */
const { createOrder, miniPrepay, getProductDetail } = require('../../services/api');
const { getCart, clearCart } = require('../../utils/cart');
const { normalizeImageUrl } = require('../../utils/url');

const ADDRESS_KEY = 'address';

Page({
  data: {
    items: [],
    goodsCent: 0,
    submitting: false,
    address: null,
    // 福利码订单相关
    isWelfareOrder: false,
    welfareInviteCode: '',
    welfareNote: '',
  },

  // 保存 URL 参数
  _queryParams: null,

  onLoad(query) {
    this._queryParams = query || {};
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    const query = this._queryParams || {};
    const addr = wx.getStorageSync(ADDRESS_KEY);
    const address = addr && typeof addr === 'object' ? addr : null;

    // 检测是否为福利码订单
    const inviteCode = (query.inviteCode || '').trim();
    const productId = Number(query.productId);
    const welfarePriceCent = Number(query.welfarePriceCent || 0);
    const welfareNote = decodeURIComponent(query.welfareNote || '');

    if (inviteCode && productId && welfarePriceCent > 0) {
      // 福利码订单：从商品详情获取商品信息
      try {
        const res = await getProductDetail(productId);
        const product = res.data || res.product || res || null;
        if (product) {
          const item = {
            key: `welfare:${productId}:${inviteCode}`,
            productId: Number(product.id),
            skuId: null,
            qty: 1,
            title: product.title,
            skuTitle: `福利码 ${inviteCode}`,
            cover_url: normalizeImageUrl(product.cover_url),
            price_cent: welfarePriceCent,
            is_welfare: 1,
          };
          this.setData({
            items: [item],
            goodsCent: welfarePriceCent,
            address,
            isWelfareOrder: true,
            welfareInviteCode: inviteCode,
            welfareNote: welfareNote,
          });
          return;
        }
      } catch (e) {
        wx.showToast({ title: '加载商品信息失败', icon: 'none' });
      }
    }

    // 普通订单：从购物车读取
    const items = (getCart() || []).map((it) => ({
      ...it,
      cover_url: normalizeImageUrl(it.cover_url),
    }));
    const goodsCent = items.reduce((sum, it) => sum + Number(it.price_cent || 0) * Number(it.qty || 0), 0);

    this.setData({
      items,
      goodsCent,
      address,
      isWelfareOrder: false,
      welfareInviteCode: '',
      welfareNote: '',
    });
  },

  goEditAddress() {
    wx.navigateTo({ url: '/pages/address/index' });
  },

  async submitOrder() {
    if (this.data.submitting) return;
    const items = this.data.items || [];
    if (items.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      wx.switchTab({ url: '/pages/cart/index' });
      return;
    }
    const address = this.data.address;
    if (!address) {
      wx.showToast({ title: '请先填写收货地址', icon: 'none' });
      this.goEditAddress();
      return;
    }

    // 福利码订单：验证福利码
    const isWelfareOrder = this.data.isWelfareOrder;
    const inviteCode = (this.data.welfareInviteCode || '').trim();
    if (isWelfareOrder && !/^\d{6}$/.test(inviteCode)) {
      wx.showToast({ title: '福利码无效，请重新选择商品', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    let createdOrderNo = '';
    try {
      const app = getApp();
      await app.ensureLogin();

      const payload = {
        items: items.map((it) => ({
          productId: Number(it.productId),
          skuId: it.skuId ? Number(it.skuId) : undefined,
          qty: Number(it.qty || 1),
        })),
        address: {
          name: address.name,
          phone: address.phone,
          region: address.region || '',
          province: address.province,
          city: address.city,
          district: address.district,
          detail: address.detail,
        },
      };

      // 福利码订单：添加 inviteCode
      if (isWelfareOrder && inviteCode) {
        payload.inviteCode = inviteCode;
      }

      const orderRes = await createOrder(payload);
      const orderNo = orderRes.orderNo || (orderRes.data && orderRes.data.orderNo);
      if (!orderNo) throw new Error('创建订单失败：缺少订单号');
      createdOrderNo = String(orderNo);

      // 预下单
      const payParams = await miniPrepay(createdOrderNo);

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

      // 福利码订单不需要清空购物车
      if (!isWelfareOrder) {
        clearCart();
      }
      wx.showToast({ title: '支付成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/order-detail/index?orderNo=${encodeURIComponent(createdOrderNo)}` });
      }, 300);
    } catch (e) {
      const msg = e && e.message ? e.message : '下单/支付失败';
      wx.showToast({ title: msg, icon: 'none' });
      // 若已创建订单但支付失败，引导用户去订单详情继续支付
      if (createdOrderNo) {
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/order-detail/index?orderNo=${encodeURIComponent(createdOrderNo)}` });
        }, 300);
      }
    } finally {
      this.setData({ submitting: false });
    }
  },
});
