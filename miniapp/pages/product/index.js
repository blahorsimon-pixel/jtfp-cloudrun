/**
 * 商品详情
 */
const { getProductDetail, getWelfareQuote } = require('../../services/api');
const { normalizeImageUrl, normalizeHtmlImageSrc } = require('../../utils/url');
const { addToCart } = require('../../utils/cart');

const INVALID_WELFARE_MSG = '您输入的福利码错误，请输入正确码，否则无法通过福利通道下单。';

Page({
  data: {
    id: null,
    loading: true,
    error: null,

    product: null,
    skus: [],
    selectedSkuId: null,

    qty: 1,
    displayPriceCent: 0,

    // rich-text nodes（HTML 字符串）
    descNodes: '',

    // 福利码相关
    welfareCode: '',
    welfareChecked: false,
    welfareValid: false,
    welfarePriceCent: 0,
    welfareNote: '',
    welfareError: '',
    welfareMaxUsage: 1,
    welfareUsedCount: 0,
    welfareRemainingUsage: 0,
  },

  // 福利码验证防抖定时器
  _welfareTimer: null,

  onLoad(query) {
    const id = Number(query && query.id);
    if (!id || !Number.isFinite(id)) {
      this.setData({ loading: false, error: '参数错误：缺少商品ID' });
      return;
    }
    this.setData({ id });
    this.loadDetail();
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => wx.stopPullDownRefresh());
  },

  async loadDetail() {
    this.setData({ loading: true, error: null });
    try {
      const res = await getProductDetail(this.data.id);
      const product = res.data || res.product || res || null;
      const skus = Array.isArray(res.skus) ? res.skus : [];

      if (!product) {
        this.setData({ loading: false, error: '商品不存在' });
        return;
      }

      const normalizedProduct = {
        ...product,
        cover_url: normalizeImageUrl(product.cover_url),
      };
      const normalizedSkus = skus.map((s) => ({
        ...s,
        cover_url: normalizeImageUrl(s.cover_url || product.cover_url),
      }));
      const descNodes = normalizeHtmlImageSrc(normalizedProduct.description || '');

      const isWelfare = Number(normalizedProduct.is_welfare || 0) === 1;

      // 默认选择第一个SKU（非福利商品且存在SKU时）
      let selectedSkuId = null;
      if (!isWelfare && normalizedSkus.length > 0) {
        selectedSkuId = Number(normalizedSkus[0].id);
      }

      this.setData({
        product: normalizedProduct,
        skus: normalizedSkus,
        selectedSkuId,
        qty: isWelfare ? 1 : 1,
        displayPriceCent: 0,
        descNodes,
        loading: false,
      });

      this.updateDisplayPrice();
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  selectSku(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (!id || !Number.isFinite(id)) return;
    this.setData({ selectedSkuId: id });
    this.updateDisplayPrice();
  },

  decQty() {
    const product = this.data.product;
    if (!product) return;
    if (Number(product.is_welfare || 0) === 1) return;
    const next = Math.max(1, Number(this.data.qty || 1) - 1);
    this.setData({ qty: next });
  },

  incQty() {
    const product = this.data.product;
    if (!product) return;
    if (Number(product.is_welfare || 0) === 1) return;
    const next = Math.max(1, Number(this.data.qty || 1) + 1);
    this.setData({ qty: next });
  },

  addToCart() {
    const product = this.data.product;
    if (!product) return;

    const isWelfare = Number(product.is_welfare || 0) === 1;
    
    // 福利码商品不允许加入购物车
    if (isWelfare) {
      wx.showToast({ title: '该商品仅支持福利码通道购买，不能加入购物车', icon: 'none' });
      return;
    }

    const skus = this.data.skus || [];
    const selectedSkuId = this.data.selectedSkuId;
    const sku = selectedSkuId ? skus.find((s) => Number(s.id) === Number(selectedSkuId)) : null;

    const payload = {
      productId: Number(product.id),
      skuId: sku ? Number(sku.id) : null,
      qty: Math.max(1, Number(this.data.qty || 1)),
      title: product.title,
      skuTitle: sku ? sku.sku_title : '',
      cover_url: (sku && sku.cover_url) || product.cover_url,
      price_cent: sku ? Number(sku.price_cent || 0) : Number(product.price_cent || 0),
      is_welfare: 0,
    };

    addToCart(payload);
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  buyNow() {
    const product = this.data.product;
    if (!product) return;

    const isWelfare = Number(product.is_welfare || 0) === 1;

    // 福利码商品：必须验证通过才能购买
    if (isWelfare) {
      if (!this.data.welfareValid) {
        wx.showToast({ title: this.data.welfareError || '请先输入正确的福利码', icon: 'none' });
        return;
      }
      // 福利码商品直接跳转结算页，携带福利码信息
      const query = {
        productId: product.id,
        qty: 1,
        inviteCode: this.data.welfareCode.trim(),
        welfarePriceCent: this.data.welfarePriceCent,
        welfareNote: this.data.welfareNote || '',
      };
      const queryStr = Object.keys(query)
        .map((k) => `${k}=${encodeURIComponent(query[k])}`)
        .join('&');
      wx.navigateTo({ url: `/pages/checkout/index?${queryStr}` });
      return;
    }

    // 普通商品：加入购物车后跳转结算
    this.addToCart();
    wx.navigateTo({ url: '/pages/checkout/index' });
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/index' });
  },

  updateDisplayPrice() {
    const product = this.data.product;
    if (!product) return;
    const isWelfare = Number(product.is_welfare || 0) === 1;
    if (isWelfare) {
      // 福利商品：如果验证成功，显示福利码价格；否则显示商品原价
      const priceCent = this.data.welfareValid 
        ? Number(this.data.welfarePriceCent || 0) 
        : Number(product.price_cent || 0);
      this.setData({ displayPriceCent: priceCent });
      return;
    }
    const selectedSkuId = this.data.selectedSkuId;
    const sku = selectedSkuId
      ? (this.data.skus || []).find((s) => Number(s.id) === Number(selectedSkuId))
      : null;
    const priceCent = sku ? Number(sku.price_cent || 0) : Number(product.price_cent || 0);
    this.setData({ displayPriceCent: priceCent });
  },

  // 福利码输入处理
  onWelfareCodeInput(e) {
    const value = (e.detail.value || '').replace(/\D/g, '').slice(0, 6);
    this.setData({ welfareCode: value });

    // 清除之前的定时器
    if (this._welfareTimer) {
      clearTimeout(this._welfareTimer);
      this._welfareTimer = null;
    }

    // 满6位后延迟验证（防抖）
    if (value.length === 6) {
      this._welfareTimer = setTimeout(() => {
        this.checkWelfareCode(value);
      }, 300);
    } else {
      // 不满6位时重置验证状态
      this.setData({
        welfareChecked: false,
        welfareValid: false,
        welfarePriceCent: 0,
        welfareNote: '',
        welfareError: '',
        welfareMaxUsage: 1,
        welfareUsedCount: 0,
        welfareRemainingUsage: 0,
      });
      this.updateDisplayPrice();
    }
  },

  // 验证福利码
  async checkWelfareCode(code) {
    const product = this.data.product;
    if (!product) return;
    const isWelfare = Number(product.is_welfare || 0) === 1;
    if (!isWelfare) return;

    const c = (code || '').trim();
    if (!/^\d{6}$/.test(c)) return;

    try {
      const data = await getWelfareQuote(product.id, c);
      this.setData({
        welfareChecked: true,
        welfareValid: !!data?.ok,
        welfarePriceCent: Number(data?.priceCent || 0),
        welfareNote: String(data?.note || ''),
        welfareError: '',
        welfareMaxUsage: Number(data?.maxUsage || 1),
        welfareUsedCount: Number(data?.usedCount || 0),
        welfareRemainingUsage: Number(data?.remainingUsage || 0),
      });
      this.updateDisplayPrice();
    } catch (e) {
      const errMsg = (e && e.message) || INVALID_WELFARE_MSG;
      this.setData({
        welfareChecked: true,
        welfareValid: false,
        welfarePriceCent: 0,
        welfareNote: '',
        welfareError: errMsg,
        welfareMaxUsage: 1,
        welfareUsedCount: 0,
        welfareRemainingUsage: 0,
      });
      this.updateDisplayPrice();
      wx.showToast({ title: errMsg, icon: 'none' });
    }
  },

  /**
   * 转发分享 - 分享当前商品
   */
  onShareAppMessage() {
    const product = this.data.product;
    const title = product ? product.title : '携荷管家 - 品质母婴好物';
    const imageUrl = product ? product.cover_url : '';
    const path = product ? `/pages/product/index?id=${product.id}` : '/pages/index/index';
    return {
      title,
      path,
      imageUrl,
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const product = this.data.product;
    const title = product ? product.title : '携荷管家 - 品质母婴好物';
    const imageUrl = product ? product.cover_url : '';
    return {
      title,
      imageUrl,
    };
  },
});
