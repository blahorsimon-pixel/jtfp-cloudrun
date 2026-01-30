const CART_KEY = 'cart';

function getCart() {
  const raw = wx.getStorageSync(CART_KEY);
  if (Array.isArray(raw)) return raw;
  return [];
}

function setCart(items) {
  wx.setStorageSync(CART_KEY, Array.isArray(items) ? items : []);
}

function makeKey(productId, skuId) {
  return `${Number(productId)}:${Number(skuId || 0)}`;
}

function addToCart(payload) {
  const productId = Number(payload.productId);
  const skuId = payload.skuId ? Number(payload.skuId) : 0;
  const qty = Math.max(1, Number(payload.qty || 1));
  const key = makeKey(productId, skuId);

  // 福利码商品不允许加入购物车
  if (Number(payload.is_welfare || 0) === 1) {
    return getCart();
  }

  const cart = getCart();
  const idx = cart.findIndex((x) => x && x.key === key);

  const item = {
    key,
    productId,
    skuId: skuId || null,
    qty,
    title: payload.title || '',
    skuTitle: payload.skuTitle || '',
    cover_url: payload.cover_url || '',
    price_cent: Number(payload.price_cent || 0),
    is_welfare: 0, // 普通商品才能加入购物车
  };

  if (idx >= 0) {
    const existing = cart[idx] || {};
    const mergedQty = Math.max(1, Number(existing.qty || 0) + item.qty);
    cart[idx] = { ...existing, ...item, qty: mergedQty };
  } else {
    cart.push(item);
  }

  setCart(cart);
  return cart;
}

function updateQty(key, qty) {
  const cart = getCart();
  const idx = cart.findIndex((x) => x && x.key === key);
  if (idx < 0) return cart;

  const nextQty = Math.max(1, Number(qty || 1));
  const isWelfare = Number(cart[idx]?.is_welfare || 0) === 1;
  cart[idx] = { ...cart[idx], qty: isWelfare ? 1 : nextQty };
  setCart(cart);
  return cart;
}

function removeItem(key) {
  const cart = getCart().filter((x) => x && x.key !== key);
  setCart(cart);
  return cart;
}

function clearCart() {
  setCart([]);
}

module.exports = {
  CART_KEY,
  getCart,
  setCart,
  addToCart,
  updateQty,
  removeItem,
  clearCart,
};

