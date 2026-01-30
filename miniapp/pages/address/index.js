/**
 * 本地收货地址（不依赖后端 /me/addresses）
 */
const ADDRESS_KEY = 'address';

Page({
  data: {
    form: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
    },
    regionValue: [], // picker 的 value，格式如 ['广东省', '深圳市', '南山区']
    regionText: '',  // 显示文本，如 "广东省 深圳市 南山区"
  },

  onLoad() {
    const saved = wx.getStorageSync(ADDRESS_KEY);
    if (saved && typeof saved === 'object') {
      const province = saved.province || '';
      const city = saved.city || '';
      const district = saved.district || '';
      this.setData({
        form: {
          name: saved.name || '',
          phone: saved.phone || '',
          province,
          city,
          district,
          detail: saved.detail || '',
        },
        regionValue: province && city && district ? [province, city, district] : [],
        regionText: province && city && district ? `${province} ${city} ${district}` : '',
      });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    if (!field) return;
    this.setData({ [`form.${field}`]: value });
  },

  onRegionChange(e) {
    const regionArr = e.detail.value || [];
    const province = regionArr[0] || '';
    const city = regionArr[1] || '';
    const district = regionArr[2] || '';
    this.setData({
      'form.province': province,
      'form.city': city,
      'form.district': district,
      regionValue: regionArr,
      regionText: regionArr.filter(Boolean).join(' '),
    });
  },

  chooseWxAddress() {
    wx.chooseAddress({
      success: (res) => {
        const province = res.provinceName || '';
        const city = res.cityName || '';
        const district = res.countyName || '';
        this.setData({
          'form.name': res.userName || this.data.form.name,
          'form.phone': res.telNumber || this.data.form.phone,
          'form.province': province,
          'form.city': city,
          'form.district': district,
          'form.detail': res.detailInfo || this.data.form.detail,
          regionValue: [province, city, district].filter(Boolean),
          regionText: [province, city, district].filter(Boolean).join(' '),
        });
        wx.showToast({ title: '已获取微信地址', icon: 'success' });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showToast({ title: '您拒绝了授权', icon: 'none' });
        } else {
          wx.showToast({ title: '获取地址失败', icon: 'none' });
        }
      },
    });
  },

  save() {
    const f = this.data.form || {};
    const name = String(f.name || '').trim();
    const phone = String(f.phone || '').trim();
    const province = String(f.province || '').trim();
    const city = String(f.city || '').trim();
    const district = String(f.district || '').trim();
    const detail = String(f.detail || '').trim();

    if (!name) return wx.showToast({ title: '请填写收货人', icon: 'none' });
    if (!phone || phone.length < 6) return wx.showToast({ title: '请填写手机号', icon: 'none' });
    if (!province || !city || !district) return wx.showToast({ title: '请填写省市区', icon: 'none' });
    if (!detail) return wx.showToast({ title: '请填写详细地址', icon: 'none' });

    const region = `${province} ${city} ${district}`.trim();
    wx.setStorageSync(ADDRESS_KEY, { name, phone, province, city, district, detail, region });
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 300);
  },

  clear() {
    wx.showModal({
      title: '清空地址',
      content: '确定要清空已保存的收货地址吗？',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync(ADDRESS_KEY);
        this.setData({
          form: { name: '', phone: '', province: '', city: '', district: '', detail: '' },
          regionValue: [],
          regionText: '',
        });
      },
    });
  },
});
