/**
 * 店铺页眉组件 - 简洁版
 */
Component({
  properties: {
    shopName: {
      type: String,
      value: '携荷管家'
    },
    shopDesc: {
      type: String,
      value: '商家自营店'
    }
  },

  data: {
    // 修复后的吉祥物图片URL：使用已验证的静态资源前缀 /h5/images/
    logoUrl: 'https://www.jintai.cloud/h5/images/mascot.png',
    logoError: false
  },

  methods: {
    /**
     * 图片加载失败时使用备用图
     */
    onLogoError(e) {
      console.error('Logo加载失败:', e.detail.errMsg);
      this.setData({
        logoUrl: '/assets/images/tab-home.png',
        logoError: true
      });
    }
  }
});
