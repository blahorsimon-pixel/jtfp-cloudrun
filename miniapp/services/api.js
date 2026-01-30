/**
 * API 服务封装
 */
const { get, post } = require('../utils/request');

// ========== 商品 ==========
/**
 * 获取商品列表
 */
function getProducts(params = {}) {
  return get('/products', params);
}

/**
 * 获取商品详情
 */
function getProductDetail(id) {
  return get(`/products/${id}`);
}

// ========== 购物车 ==========
// 小程序端购物车使用本地存储，不需要后端接口

// ========== 订单 ==========
/**
 * 创建订单
 */
function createOrder(data) {
  return post('/orders', data, true);
}

/**
 * 获取我的订单列表
 */
function getMyOrders(params = {}) {
  return get('/me/orders', params, true);
}

/**
 * 获取订单详情
 */
function getOrderDetail(orderNo) {
  return get(`/me/orders/${orderNo}`, {}, true);
}

// ========== 支付 ==========
/**
 * 小程序支付预下单
 */
function miniPrepay(orderNo) {
  return post('/pay/wechat/mini/prepay', { orderNo }, true);
}

// ========== 福利码 ==========
/**
 * 验证福利码并获取报价
 * @param {number} productId - 商品ID
 * @param {string} code - 6位福利码
 */
function getWelfareQuote(productId, code) {
  return get('/welfare/quote', { productId, code });
}

// ========== 地址 ==========
/**
 * 获取收货地址列表
 */
function getAddresses() {
  return get('/me/addresses', {}, true);
}

/**
 * 保存收货地址
 */
function saveAddress(data) {
  return post('/me/addresses', data, true);
}

module.exports = {
  getProducts,
  getProductDetail,
  createOrder,
  getMyOrders,
  getOrderDetail,
  miniPrepay,
  getWelfareQuote,
  getAddresses,
  saveAddress,
};
