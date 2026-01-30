Component({
  data: {
    selected: 0,
    color: '#8E8E93',
    selectedColor: '#ff6b35',
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconClass: 'icon-home',
      },
      {
        pagePath: '/pages/category/index',
        text: '分类',
        iconClass: 'icon-category',
      },
      {
        pagePath: '/pages/cart/index',
        text: '购物车',
        iconClass: 'icon-cart',
      },
      {
        pagePath: '/pages/profile/index',
        text: '我的',
        iconClass: 'icon-user',
      },
    ],
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({ url });
    },
  },
});
