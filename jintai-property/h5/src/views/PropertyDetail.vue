<template>
  <div class="detail-page">
    <!-- 沉浸式顶部导航栏 -->
    <van-nav-bar
      fixed
      placeholder
      :border="false"
      class="luxury-nav-bar"
      :class="{ 'is-scrolled': isScrolled }"
      @click-left="onBack"
    >
      <template #left>
        <div class="nav-back-btn">
          <van-icon name="arrow-left" />
        </div>
      </template>
      <template #title>
        <span v-show="isScrolled" class="nav-title">房源详情</span>
      </template>
      <template #right>
        <div class="nav-right-btns">
          <van-icon name="share-o" />
        </div>
      </template>
    </van-nav-bar>

    <div v-if="loading" class="loading-container">
      <van-loading size="24px" color="var(--jintai-red-primary)">加载中...</van-loading>
    </div>

    <div v-else-if="property" class="detail-content">
      <!-- 沉浸式橱窗轮播 -->
      <div class="hero-section">
        <van-swipe 
          v-if="carouselImages.length > 0"
          class="hero-swipe" 
          :autoplay="3000" 
          @change="onSwipeChange"
        >
          <van-swipe-item v-for="(img, index) in carouselImages" :key="index">
            <van-image
              :src="img"
              fit="cover"
              class="hero-image"
              @click="previewImage(index)"
            >
              <template #loading>
                <div class="hero-loading">
                  <van-loading type="spinner" size="24px" color="var(--jintai-gold-primary)" />
                </div>
              </template>
              <template #error>
                <img :src="FALLBACK_IMG" class="hero-fallback" />
              </template>
            </van-image>
          </van-swipe-item>
          <template #indicator>
            <div class="custom-indicator">
              {{ currentSwipe + 1 }}/{{ carouselImages.length }}
            </div>
          </template>
        </van-swipe>
        <div v-else class="hero-placeholder">
          <img :src="FALLBACK_IMG" />
        </div>
        
        <!-- 悬浮标签 -->
        <div v-if="property.is_featured === 1" class="hero-featured-tag">
          <span class="jintai-badge">精选推荐</span>
        </div>
      </div>

      <!-- 核心信息卡片 -->
      <div class="main-info-card">
        <div class="price-header">
          <div class="main-price">
            <span class="currency gold-text">¥</span>
            <span class="amount gold-text">{{ property.starting_price || '-' }}</span>
            <span class="unit gold-text">万</span>
            <span class="label">起拍价</span>
          </div>
          <div class="sub-prices">
            <div class="sub-price-item">
              <span class="label">评估价</span>
              <span class="val">¥{{ property.evaluation_total_price || '-' }}万</span>
            </div>
            <div class="sub-price-item">
              <span class="label">市场价</span>
              <span class="val">¥{{ property.market_total_price || '-' }}万</span>
            </div>
          </div>
        </div>
        
        <!-- 拍卖信息 -->
        <div class="auction-meta-detail" v-if="property.bidding_phase || property.auction_time">
          <span class="auction-phase-detail" v-if="property.bidding_phase">{{ property.bidding_phase }}</span>
          <span class="auction-status-detail" v-if="property.auction_time">
            <van-icon name="clock-o" />
            {{ property.auction_time }} 开始
          </span>
        </div>
        
        <h1 class="property-title luxury-title">{{ property.community_name }}</h1>

        <div class="quick-tags">
          <div class="q-tag">
            <span class="q-val">{{ property.building_area || '-' }}㎡</span>
            <span class="q-label">面积</span>
          </div>
          <div class="q-divider"></div>
          <div class="q-tag">
            <span class="q-val">{{ property.house_type || '-' }}</span>
            <span class="q-label">户型</span>
          </div>
          <div class="q-divider"></div>
          <div class="q-tag">
            <span class="q-val">{{ property.orientation || '南北' }}</span>
            <span class="q-label">朝向</span>
          </div>
        </div>
      </div>

      <!-- 淘宝式吸顶 Tab 导航 -->
      <van-sticky :offset-top="46" v-if="visibleTabs.length > 0">
        <van-tabs 
          v-model:active="activeTab" 
          scrollspy 
          sticky 
          class="luxury-tabs"
          color="var(--jintai-red-primary)"
          line-width="20px"
        >
          <van-tab 
            v-for="tab in visibleTabs" 
            :key="tab.key"
            :title="tab.name" 
            :name="tab.key + '-info'" 
          />
        </van-tabs>
      </van-sticky>

      <!-- 房源信息模块 -->
      <div v-if="isModuleVisible('property')" id="property-info" class="module-section">
        <div class="section-header">
          <h2 class="luxury-title">房源概况</h2>
        </div>
        <div class="luxury-card info-grid">
          <div class="grid-item">
            <span class="label">楼层</span>
            <span class="value">{{ property.floor_info || '-' }}</span>
          </div>
          <div class="grid-item">
            <span class="label">朝向</span>
            <span class="value">{{ property.orientation || '南北' }}</span>
          </div>
          <div class="grid-item">
            <span class="label">建筑年份</span>
            <span class="value">{{ property.building_year || '-' }}</span>
          </div>
          <div class="grid-item">
            <span class="label">物业类型</span>
            <span class="value">{{ property.property_type || '-' }}</span>
          </div>
          <div class="grid-item">
            <span class="label">物业现状</span>
            <span class="value">{{ property.property_status || '-' }}</span>
          </div>
          <div class="grid-item">
            <span class="label">学区</span>
            <span class="value">{{ property.school_district || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 拍卖信息模块 -->
      <div v-if="isModuleVisible('auction')" id="auction-info" class="module-section">
        <div class="section-header">
          <h2 class="luxury-title">拍卖详情</h2>
          <span class="header-tag">官方同步</span>
        </div>
        <div class="luxury-card auction-details">
          <div class="auction-time-box">
            <van-icon name="clock-o" />
            <span class="label">开拍时间：</span>
            <span class="value">{{ property.auction_time || '-' }}</span>
          </div>
          <van-divider />
          <div class="detail-row">
            <span class="label">竞价阶段</span>
            <span class="value highlight">{{ property.bidding_phase || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">竞拍平台</span>
            <span class="value">{{ property.auction_platform || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">保证金</span>
            <span class="value">¥{{ property.auction_deposit || '-' }}万</span>
          </div>
          <div class="detail-row">
            <span class="label">加价幅度</span>
            <span class="value">¥{{ property.price_increment || '-' }}万</span>
          </div>
        </div>
      </div>

      <!-- 金融贷款模块 -->
      <div v-if="isModuleVisible('loan')" id="loan-info" class="module-section">
        <div class="section-header">
          <h2 class="luxury-title">贷款参考</h2>
          <van-icon name="info-o" @click="showLoanInfo" />
        </div>
        <div class="luxury-card loan-card">
          <div class="loan-options">
            <div class="loan-opt">
              <span class="percent">70%</span>
              <span class="amount">¥{{ property.loan_70_percent || '-' }}万</span>
              <span class="label">参考贷款</span>
            </div>
            <div class="loan-opt featured">
              <span class="percent">80%</span>
              <span class="amount">¥{{ property.loan_80_percent || '-' }}万</span>
              <span class="label">热门选择</span>
            </div>
            <div class="loan-opt">
              <span class="percent">90%</span>
              <span class="amount">¥{{ property.loan_90_percent || '-' }}万</span>
              <span class="label">最高可贷</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 税费参考模块 -->
      <div v-if="isModuleVisible('tax')" id="tax-info" class="module-section">
        <div class="section-header">
          <h2 class="luxury-title">税费测算</h2>
        </div>
        <div class="luxury-card tax-card">
          <div class="tax-item">
            <div class="tax-info-main">
              <span class="label">契税</span>
              <span class="rate">({{ property.deed_tax_rate || '1.5%' }})</span>
            </div>
            <span class="value">¥{{ property.deed_tax_amount || '-' }}万</span>
          </div>
          <div class="tax-item">
            <div class="tax-info-main">
              <span class="label">增值税</span>
              <span class="rate">({{ property.vat_rate || '5.3%' }})</span>
            </div>
            <span class="value">¥{{ property.vat_amount || '-' }}万</span>
          </div>
          <div class="tax-item">
            <div class="tax-info-main">
              <span class="label">个人所得税</span>
              <span class="rate">({{ property.income_tax_rate || '1%' }})</span>
            </div>
            <span class="value">¥{{ property.income_tax_amount || '-' }}万</span>
          </div>
          <van-divider />
          <div class="tax-total">
            <span class="label">预估总税费</span>
            <span class="value gold-text">¥{{ calculateTotalTax() }}万</span>
          </div>
        </div>
      </div>

      <!-- 更多图片 -->
      <div class="module-section">
        <div class="section-header">
          <h2 class="luxury-title">房源相册</h2>
          <span class="count">{{ allImages.length }}张</span>
        </div>
        <div class="image-gallery-luxury">
          <div 
            v-for="(img, index) in allImages" 
            :key="index" 
            class="gallery-item-luxury"
            @click="previewImage(index)"
          >
            <van-image
              :src="img"
              fit="cover"
              class="gallery-img"
            >
              <template #loading>
                <van-loading type="spinner" size="20" />
              </template>
              <template #error>
                <img :src="FALLBACK_IMG" class="gallery-fallback" />
              </template>
            </van-image>
          </div>
        </div>
      </div>

      <!-- 底部占位 -->
      <div class="footer-placeholder"></div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-action-bar" v-if="property">
      <div class="action-left">
        <div class="icon-btn" @click="toggleFavorite">
          <van-icon :name="isFavorite ? 'star' : 'star-o'" :color="isFavorite ? 'var(--jintai-red-primary)' : ''" />
          <span>收藏</span>
        </div>
        <div class="icon-btn" @click="handleShare">
          <van-icon name="share-o" />
          <span>分享</span>
        </div>
      </div>
      <div class="action-right">
        <van-button
          block
          round
          class="jintai-btn luxury-contact-btn"
          @click="handleContact"
        >
          <van-icon name="phone-o" class="phone-icon" />
          立即咨询
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showImagePreview } from 'vant'
import { getPropertyDetail } from '../api/property'
import type { PropertyDetail } from '../api/property'

// 内置占位图：避免依赖外网
const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'750'%20height%3D'500'%3E%3Crect%20width%3D'100%25'%20height%3D'100%25'%20fill%3D'%23f5f5f5'/%3E%3Ctext%20x%3D'50%25'%20y%3D'50%25'%20dominant-baseline%3D'middle'%20text-anchor%3D'middle'%20fill%3D'%23999'%20font-size%3D'28'%3E%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E"

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const property = ref<PropertyDetail | null>(null)
const isScrolled = ref(false)
const activeTab = ref('property-info')
const currentSwipe = ref(0)
const isFavorite = ref(false)

// 默认模块配置
const defaultModuleConfig = {
  tabs: [
    { key: 'property', name: '房源', visible: true, order: 1 },
    { key: 'auction', name: '拍卖', visible: true, order: 2 },
    { key: 'loan', name: '金融', visible: true, order: 3 },
    { key: 'tax', name: '税费', visible: true, order: 4 }
  ]
}

// 获取可见的Tab列表（按order排序）
const visibleTabs = computed(() => {
  if (!property.value?.module_config?.tabs) {
    return defaultModuleConfig.tabs.filter(tab => tab.visible)
  }
  return property.value.module_config.tabs
    .filter(tab => tab.visible)
    .sort((a, b) => a.order - b.order)
})

// 检查模块是否可见
const isModuleVisible = (key: string): boolean => {
  if (!property.value?.module_config?.tabs) {
    // 没有配置时，使用默认配置
    return defaultModuleConfig.tabs.find(tab => tab.key === key)?.visible ?? true
  }
  const tab = property.value.module_config.tabs.find(tab => tab.key === key)
  return tab?.visible ?? false
}

// 监听滚动
const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

const onSwipeChange = (index: number) => {
  currentSwipe.value = index
}

// 处理图片URL - 确保图片路径可访问
const normalizeImageUrl = (url: string): string => {
  if (!url) return ''
  
  // 如果已经是完整URL（http/https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // 如果是data URI，直接返回
  if (url.startsWith('data:')) {
    return url
  }
  
  // 对于所有相对路径，拼接后端服务器地址
  // 后端服务器已配置 /JTFP/h5/images/uploads/ 的静态文件服务
  const path = url.startsWith('/') ? url : `/${url}`
  return `http://localhost:6200${path}`
}

// 获取所有图片
const allImages = computed(() => {
  if (!property.value) return []
  let images: string[] = []
  if (property.value.images) {
    if (Array.isArray(property.value.images)) {
      images = property.value.images
    } else if (typeof property.value.images === 'string') {
      try {
        images = JSON.parse(property.value.images)
      } catch {
        images = []
      }
    }
  }
  if (images.length === 0 && property.value.cover_url) {
    images = [property.value.cover_url]
  }
  // 过滤并处理所有图片URL
  return images
    .filter(img => img && img.trim())
    .map(img => normalizeImageUrl(img))
})

const carouselImages = computed(() => allImages.value.slice(0, 5))

const onImgError = (e: Event) => {
  const img = e.target as HTMLImageElement | null
  if (!img) return
  if (img.src === FALLBACK_IMG) return
  img.src = FALLBACK_IMG
}

const previewImage = (startIndex: number) => {
  if (allImages.value.length === 0) return
  showImagePreview({
    images: allImages.value,
    startPosition: startIndex,
    closeable: true
  })
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res: any = await getPropertyDetail(Number(route.params.id))
    property.value = res.data || res.property
    // 设置默认Tab为第一个可见的模块
    if (visibleTabs.value.length > 0) {
      activeTab.value = visibleTabs.value[0].key + '-info'
    }
  } catch (error) {
    console.error('加载失败:', error)
    showToast('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

const calculateTotalTax = () => {
  if (!property.value) return '0'
  const total = (Number(property.value.deed_tax_amount) || 0) + 
                (Number(property.value.vat_amount) || 0) + 
                (Number(property.value.income_tax_amount) || 0)
  return total.toFixed(2)
}

const onBack = () => router.back()

const handleContact = () => {
  // 直接拨打电话
  window.location.href = 'tel:13556851842'
}

const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  showToast(isFavorite.value ? '已加入收藏' : '已取消收藏')
}

const handleShare = () => {
  showToast('分享功能开发中')
}

const openMap = () => {
  showToast('地图功能开发中')
}

const showLoanInfo = () => {
  showDialog({
    title: '贷款说明',
    message: '以上贷款额度仅供参考，实际额度以银行审批为准。',
    confirmButtonText: '知道了'
  })
}

onMounted(() => {
  fetchDetail()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--jintai-bg);
  padding-bottom: 100px;
}

/* 导航栏 */
.luxury-nav-bar {
  background: transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.luxury-nav-bar.is-scrolled {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.nav-back-btn, .nav-right-btns {
  width: 34px;
  height: 34px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  transition: all 0.3s;
}

.is-scrolled .nav-back-btn, .is-scrolled .nav-right-btns {
  background: #F5F5F5;
  color: var(--jintai-text);
}

.nav-title {
  font-weight: 600;
  color: var(--jintai-text);
}

/* Hero Section */
.hero-section {
  position: relative;
  height: 50vh; /* 使用视口高度，更加自适应 */
  min-height: 250px; /* 设置最小高度 */
  max-height: 400px; /* 设置最大高度 */
  margin-top: -46px; /* 抵消 nav-bar placeholder */
}

.hero-swipe, .hero-image, .hero-placeholder {
  width: 100%;
  height: 100%;
}

.hero-image :deep(.van-image) {
  width: 100%;
  height: 100%;
}

.hero-image :deep(.van-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--jintai-bg-secondary);
}

.hero-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.custom-indicator {
  position: absolute;
  right: 16px;
  bottom: 16px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  font-size: 12px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.hero-featured-tag {
  position: absolute;
  top: 60px;
  left: 16px;
}

/* 价格区域升级 */
.main-info-card {
  margin: -40px 4vw 16px;
  position: relative;
  z-index: 2;
  background: white;
  border-radius: var(--jintai-radius-md);
  padding: clamp(16px, 5vw, 24px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--jintai-border);
}

.price-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--jintai-bg-secondary);
}

.main-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 12px;
}

.main-price .currency {
  font-size: clamp(16px, 4vw, 18px);
  font-weight: 700;
  margin-right: 4px;
}

.main-price .amount {
  font-size: clamp(28px, 8vw, 36px);
  font-weight: 800;
  letter-spacing: -1px;
}

.main-price .unit {
  font-size: clamp(16px, 4vw, 18px);
  margin-left: 2px;
  font-weight: 700;
}

.main-price .label {
  margin-left: 16px;
  font-size: 11px;
  color: white;
  background: var(--jintai-red-primary);
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 600;
  letter-spacing: 1px;
}

.sub-prices {
  display: flex;
  gap: 24px;
}

.sub-price-item {
  font-size: 13px;
  display: flex;
  align-items: center;
}

.sub-price-item .label {
  color: var(--jintai-text-light);
  margin-right: 8px;
}

.sub-price-item .val {
  color: var(--jintai-text);
  font-weight: 600;
}

/* 模块卡片升级 */
.luxury-card {
  background: white;
  border-radius: var(--jintai-radius-md);
  padding: clamp(16px, 4vw, 20px);
  margin: 0 4vw 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--jintai-border);
  position: relative;
  overflow: hidden;
}

.luxury-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--jintai-gold-gradient);
  opacity: 0.8;
}

/* Tab 样式升级 */
.luxury-tabs :deep(.van-tabs__nav) {
  background: var(--jintai-bg);
  padding: 0 16px;
}

.luxury-tabs :deep(.van-tab--active) {
  color: var(--jintai-red-primary);
  font-weight: 800;
}

.luxury-tabs :deep(.van-tabs__line) {
  background: var(--jintai-red-gradient);
  height: 3px;
  border-radius: 3px;
}

/* 底部操作栏升级 */
.bottom-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 84px;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  align-items: center;
  padding: 0 clamp(12px, 4vw, 20px);
  gap: clamp(12px, 3vw, 16px);
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.08);
  z-index: 100;
  backdrop-filter: blur(10px);
}

.luxury-contact-btn {
  height: 50px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  background: var(--jintai-red-gradient) !important;
  color: white !important;
  border: none;
  box-shadow: 0 6px 20px rgba(166, 25, 46, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.luxury-contact-btn .phone-icon {
  color: var(--jintai-gold-primary);
  font-size: 18px;
}

.header-tag {
  font-size: 11px;
  color: white;
  background: var(--jintai-red-primary);
  border: none;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.auction-time-box {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--jintai-red-primary);
  font-weight: 700;
  font-size: 15px;
}

.loan-opt.featured {
  background: #fffdf5;
  border-color: var(--jintai-gold-primary);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.15);
}

.loan-opt.featured .amount {
  color: var(--jintai-red-primary);
}

.footer-placeholder {
  height: 40px;
}

/* 拍卖信息元数据 */
.auction-meta-detail {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.auction-phase-detail {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  color: white;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
}

.auction-status-detail {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--jintai-text);
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
}

.auction-status-detail :deep(.van-icon) {
  font-size: 14px;
  color: var(--jintai-red-primary);
}

/* 标题和地址 */
.property-title {
  font-size: clamp(18px, 4.5vw, 20px);
  font-weight: 600;
  color: var(--jintai-text);
  margin: 0 0 16px 0;
  line-height: 1.4;
}

/* 快捷标签 */
.quick-tags {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-top: 16px;
  border-top: 1px solid var(--jintai-bg-secondary);
}

.q-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.q-val {
  font-size: clamp(16px, 4vw, 18px);
  font-weight: 700;
  color: var(--jintai-text);
}

.q-label {
  font-size: 12px;
  color: var(--jintai-text-light);
}

.q-divider {
  width: 1px;
  height: 32px;
  background: var(--jintai-border);
}

/* 模块区域 */
.module-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4vw;
  margin-bottom: 12px;
}

.section-header h2 {
  font-size: clamp(16px, 4vw, 18px);
  margin: 0;
}

.section-header .count {
  font-size: 13px;
  color: var(--jintai-text-light);
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.grid-item .label {
  font-size: 12px;
  color: var(--jintai-text-light);
}

.grid-item .value {
  font-size: 14px;
  font-weight: 600;
  color: var(--jintai-text);
}

/* 拍卖详情 */
.auction-details .detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--jintai-bg);
}

.auction-details .detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-size: 14px;
  color: var(--jintai-text-secondary);
}

.detail-row .value {
  font-size: 14px;
  font-weight: 600;
  color: var(--jintai-text);
}

.detail-row .value.highlight {
  color: var(--jintai-red-primary);
  font-weight: 700;
}

/* 贷款卡片 */
.loan-options {
  display: flex;
  gap: 12px;
  justify-content: space-around;
}

.loan-opt {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--jintai-border);
  border-radius: var(--jintai-radius-md);
  background: white;
  transition: all 0.3s;
}

.loan-opt .percent {
  font-size: 16px;
  font-weight: 700;
  color: var(--jintai-red-primary);
}

.loan-opt .amount {
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: 700;
  color: var(--jintai-text);
}

.loan-opt .label {
  font-size: 11px;
  color: var(--jintai-text-light);
}

/* 税费卡片 */
.tax-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--jintai-bg);
}

.tax-item:last-of-type {
  border-bottom: none;
}

.tax-info-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tax-item .label {
  font-size: 14px;
  color: var(--jintai-text-secondary);
}

.tax-item .rate {
  font-size: 12px;
  color: var(--jintai-text-light);
}

.tax-item .value {
  font-size: 14px;
  font-weight: 600;
  color: var(--jintai-text);
}

.tax-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  font-size: 15px;
  font-weight: 700;
}

/* 图片画廊 */
.image-gallery-luxury {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 4vw;
}

.gallery-item-luxury {
  aspect-ratio: 1;
  border-radius: var(--jintai-radius-sm);
  overflow: hidden;
  cursor: pointer;
}

.gallery-img {
  width: 100%;
  height: 100%;
}

.gallery-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 底部操作按钮 */
.action-left {
  display: flex;
  gap: 16px;
}

.icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--jintai-text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.icon-btn :deep(.van-icon) {
  font-size: 20px;
}

.action-right {
  flex: 1;
  display: flex;
}

/* 加载状态 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}
</style>
