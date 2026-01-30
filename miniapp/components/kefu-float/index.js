/**
 * 企业微信客服悬浮按钮组件
 * 
 * 使用说明：
 * 1. 在页面 json 中引入：
 *    "usingComponents": {
 *      "kefu-float": "/components/kefu-float/index"
 *    }
 * 2. 在页面 wxml 中使用：
 *    <kefu-float></kefu-float>
 */

Component({
  data: {
    // 企业微信 corpId
    corpId: 'wx5da0b7b07d9a9b63',
    
    // 客服链接（已提供）
    kefuUrl: 'https://work.weixin.qq.com/kfid/kfc5ea01ebdb760fa5c',
  },

  lifetimes: {
    attached() {
    },
    ready() {
    }
  },

  methods: {
    openKefu() {
      const { corpId, kefuUrl } = this.data;
      
      // 调用企业微信客服 API
      wx.openCustomerServiceChat({
        extInfo: { url: kefuUrl },
        corpId: corpId,
        success: (res) => {
          console.log('打开客服成功', res);
        },
        fail: (err) => {
          console.error('打开客服失败', err);
          wx.showToast({
            title: '客服暂不可用',
            icon: 'none',
            duration: 2000,
          });
        },
      });
    },
  },
});
