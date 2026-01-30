<template>
  <div class="home-page">
    <!-- 顶部banner -->
    <div class="header-banner">
      <div class="banner-content">
        <h1 class="luxury-title">小傅甄选 · 严选房源</h1>
        <p>专业资产服务平台 · 助您捡漏安家</p>
      </div>
      <!-- 搜索栏嵌入banner底部 -->
      <div class="search-container">
        <van-search
          v-model="keyword"
          placeholder="搜索小区名称、地址、学区"
          shape="round"
          background="transparent"
          @search="onSearch"
          @clear="onSearch"
        />
      </div>
    </div>

    <!-- 快速分类导航 - 黄金奢华版 -->
    <div class="luxury-category-section" v-if="categories.length > 0">
      <!-- 顶部装饰线 -->
      <div class="luxury-deco-top">
        <div class="deco-line"></div>
        <div class="deco-diamond">◆</div>
        <div class="deco-line"></div>
      </div>
      
      <div class="category-nav-luxury">
        <div 
          v-for="(cat, index) in categories" 
          :key="cat.id" 
          class="nav-item-luxury" 
          :class="{ active: activeCategoryId === cat.id }"
          :style="{ '--delay': index * 0.1 + 's' }"
          @click="onSelectCategory(cat.id)"
        >
          <!-- 金色光环背景 -->
          <div class="icon-glow"></div>
          <!-- 图标容器 -->
          <div class="icon-container">
            <div class="icon-frame">
              <div class="icon-inner" :class="getCategoryIconClass(cat.name)"></div>
            </div>
            <!-- 闪光扫过效果 -->
            <div class="shine-sweep"></div>
          </div>
          <!-- 文字标签 -->
          <span class="nav-label">{{ cat.name }}</span>
          <!-- 底部金线 -->
          <div class="label-underline"></div>
        </div>
      </div>
      
      <!-- 底部装饰线 -->
      <div class="luxury-deco-bottom">
        <div class="deco-corner left"></div>
        <div class="deco-pattern"></div>
        <div class="deco-corner right"></div>
      </div>
    </div>

    <!-- 房源列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div class="property-list">
          <!-- 骨架屏 -->
          <template v-if="loading && list.length === 0">
            <div v-for="i in 3" :key="i" class="property-card skeleton-card">
              <van-skeleton title avatar :row="3" />
            </div>
          </template>

          <div
            v-for="item in list"
            :key="item.id"
            class="property-card"
            :data-id="item.id"
            @click="goToDetail(item.id)"
          >
            <!-- 封面图 -->
            <div class="property-image">
              <img
                :src="getImageUrl(item)"
                class="property-img"
                :data-item-id="item.id"
                @error="(e) => onImgError(e, item.id)"
                @load="(e) => onImgLoad(e, item.id)"
                loading="lazy"
              />
              <div v-if="imageLoadingStates[item.id]" class="image-loading">
                <van-loading type="spinner" size="20" />
              </div>
              <div v-if="item.is_featured === 1" class="featured-badge">
                <span class="jintai-badge">精选推荐</span>
              </div>
              <div class="property-status-tag" :class="getStatusClass(item)">
                {{ getStatusText(item) }}
              </div>
            </div>

            <!-- 房源信息 -->
            <div class="property-info">
              <!-- 拍卖信息 -->
              <div class="auction-meta" v-if="item.bidding_phase || item.auction_time">
                <span class="auction-phase" v-if="item.bidding_phase">{{ item.bidding_phase }}</span>
                <span class="auction-time" v-if="item.auction_time">
                  <van-icon name="clock-o" />
                  {{ item.auction_time }} 开始
                </span>
              </div>

              <h3 class="property-title">{{ item.community_name }}</h3>

              <div class="property-tags">
                <van-tag plain color="#C5A059" v-if="item.building_area">
                  {{ item.building_area }}㎡
                </van-tag>
                <van-tag plain color="#C5A059" v-if="item.house_type">
                  {{ item.house_type }}
                </van-tag>
                <van-tag plain color="#8C8C8C" v-if="item.floor_info">
                  {{ item.floor_info }}
                </van-tag>
                <van-tag plain color="#E6A23C" v-if="item.school_district">
                  {{ item.school_district }}
                </van-tag>
              </div>

              <div class="property-footer">
                <div class="price-container">
                  <div class="price-main">
                    <span class="price-label">起拍价</span>
                    <div class="price-value">
                      <span class="price-number">{{ item.starting_price || '-' }}</span>
                      <span class="price-unit">万</span>
                    </div>
                  </div>
                  <!-- 评估价已隐藏 -->
                  <!-- <div class="price-sub" v-if="item.evaluation_total_price">
                    评估价 ¥{{ item.evaluation_total_price }}万
                  </div> -->
                </div>
                
                <!-- 捡漏空间 - 黄金砖效果 -->
                <div class="gold-bar-badge" v-if="item.profit_space">
                  <!-- 黄金砖主体 -->
                  <div class="gold-bar-body">
                    <!-- 顶部高光 -->
                    <div class="gold-bar-highlight"></div>
                    <!-- 金印信息区 -->
                    <div class="gold-stamp-area">
                      <div class="stamp-header">
                        <span class="stamp-logo">◆ 捡漏空间 ◆</span>
                      </div>
                      <div class="stamp-value">
                        <span class="value-number">{{ item.profit_space }}</span>
                        <span class="value-unit">万</span>
                      </div>
                    </div>
                    <!-- 右侧斜面 -->
                    <div class="gold-bar-bevel"></div>
                  </div>
                  <!-- 底部阴影 -->
                  <div class="gold-bar-shadow"></div>
                </div>
                
                <van-button
                  type="primary"
                  size="small"
                  round
                  class="jintai-btn"
                >
                  查看详情
                </van-button>
              </div>
            </div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <!-- 空状态 -->
    <van-empty
      v-if="!loading && !refreshing && list.length === 0"
      description="暂无房源"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getPropertyList, getCategories } from '../api/property'
import type { PropertyItem } from '../api/property'

// 内置占位图：避免依赖外网
const FALLBACK_IMG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'600'%20height%3D'400'%3E%3Crect%20width%3D'100%25'%20height%3D'100%25'%20fill%3D'%23f5f5f5'/%3E%3Ctext%20x%3D'50%25'%20y%3D'50%25'%20dominant-baseline%3D'middle'%20text-anchor%3D'middle'%20fill%3D'%23999'%20font-size%3D'24'%3E%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E"

const router = useRouter()
const list = ref<PropertyItem[]>([])
const categories = ref<any[]>([])
const activeCategoryId = ref<number | undefined>(undefined)
const keyword = ref('')
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20
// 图片加载状态管理
const imageLoadingStates = ref<Record<number, boolean>>({})
// 图片加载超时定时器
const imageLoadTimeouts = ref<Record<number, NodeJS.Timeout>>({})

// 图片URL规范化函数：将相对路径转换为完整URL
const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url || !url.trim()) {
    return FALLBACK_IMG
  }
  
  const trimmedUrl = url.trim()
  
  // 如果是完整URL（http/https开头），直接返回
  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl
  }
  
  // 如果是data URL，直接返回
  if (/^data:/i.test(trimmedUrl)) {
    return trimmedUrl
  }
  
  // 如果是相对路径，拼接当前页面的origin
  const origin = window.location.origin
  
  // 如果路径以/开头，直接拼接
  if (trimmedUrl.startsWith('/')) {
    return `${origin}${trimmedUrl}`
  }
  
  // 否则，假设是文件名，拼接默认上传路径
  // 根据实际配置，可能是 /JTFP/h5/images/uploads/ 或 /h5/images/uploads/
  return `${origin}/h5/images/uploads/${trimmedUrl}`
}

// 获取图片URL，如果无效则返回占位图
const getImageUrl = (item: PropertyItem): string => {
  if (!item.cover_url || !item.cover_url.trim()) {
    return FALLBACK_IMG
  }
  const url = normalizeImageUrl(item.cover_url)
  // 如果规范化后的URL仍然是占位图，直接返回
  if (url === FALLBACK_IMG) {
    return FALLBACK_IMG
  }
  
  return url
}

// 图片加载错误处理
const onImgError = (e: Event, itemId: number) => {
  const target = e.target as HTMLImageElement | null
  if (!target) return
  
  // 清除超时定时器
  if (imageLoadTimeouts.value[itemId]) {
    clearTimeout(imageLoadTimeouts.value[itemId])
    delete imageLoadTimeouts.value[itemId]
  }
  
  // 停止loading状态
  imageLoadingStates.value[itemId] = false
  
  // 如果已经是占位图，不再处理
  if (target.src === FALLBACK_IMG || target.src.includes('data:image')) {
    return
  }
  
  // 替换为占位图
  target.src = FALLBACK_IMG
  target.onerror = null // 防止无限循环
}

// 图片加载成功处理
const onImgLoad = (e: Event, itemId: number) => {
  const target = e.target as HTMLImageElement | null
  if (!target) return
  
  // 清除超时定时器
  if (imageLoadTimeouts.value[itemId]) {
    clearTimeout(imageLoadTimeouts.value[itemId])
    delete imageLoadTimeouts.value[itemId]
  }
  
  // 停止loading状态
  imageLoadingStates.value[itemId] = false
  target.style.opacity = '1'
}

const getStatusText = (item: PropertyItem) => {
  // 根据拍卖时间判断状态
  if (item.auction_time) {
    const auctionDate = new Date(item.auction_time)
    const now = new Date()
    if (auctionDate > now) {
      return '预告中'
    } else {
      return '进行中'
    }
  }
  return '即将开拍'
}

const getStatusClass = (item: PropertyItem) => {
  if (item.auction_time) {
    const auctionDate = new Date(item.auction_time)
    const now = new Date()
    if (auctionDate > now) {
      return 'status-upcoming'
    } else {
      return 'status-ongoing'
    }
  }
  return 'status-upcoming'
}

const getCategoryIconClass = (name: string) => {
  if (name.includes('住宅')) return 'residential'
  if (name.includes('商业')) return 'commercial'
  if (name.includes('学区')) return 'school'
  if (name.includes('捡漏')) return 'bargain'
  return 'residential' // 默认图标
}

const onSelectCategory = (id: number) => {
  if (activeCategoryId.value === id) {
    activeCategoryId.value = undefined
  } else {
    activeCategoryId.value = id
  }
  onSearch()
}

const fetchCategoriesData = async () => {
  try {
    const res: any = await getCategories()
    categories.value = res.categories || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

const fetchData = async (isLoadMore = false) => {
  try {
    loading.value = true
    const res: any = await getPropertyList({
      page: page.value,
      pageSize,
      keyword: keyword.value,
      categoryId: activeCategoryId.value
    })

    const newList = res.list || []
    
    // 清除旧的加载状态和超时定时器
    if (!isLoadMore) {
      Object.values(imageLoadTimeouts.value).forEach(timeout => clearTimeout(timeout))
      imageLoadingStates.value = {}
      imageLoadTimeouts.value = {}
    }
    
    if (isLoadMore) {
      list.value = [...list.value, ...newList]
    } else {
      list.value = newList
    }

    // 初始化新房源的图片加载状态
    newList.forEach((item: PropertyItem) => {
      const url = item.cover_url?.trim()
      // 只有有效图片URL才显示loading
      if (url && url !== FALLBACK_IMG) {
        imageLoadingStates.value[item.id] = true
        
        // 设置超时：如果5秒后还没加载完成，强制停止loading
        imageLoadTimeouts.value[item.id] = setTimeout(() => {
          if (imageLoadingStates.value[item.id]) {
            imageLoadingStates.value[item.id] = false
          }
        }, 5000)
      } else {
        imageLoadingStates.value[item.id] = false
      }
    })

    // 判断是否还有更多数据
    if (list.value.length >= res.total || newList.length < pageSize) {
      finished.value = true
    } else {
      finished.value = false
    }
  } catch (error: any) {
    console.error('加载失败:', error)
    showToast('加载失败，请重试')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onLoad = () => {
  if (finished.value || loading.value) return
  page.value++
  fetchData(true)
}

const onRefresh = () => {
  page.value = 1
  finished.value = false
  list.value = []
  fetchData()
}

const onSearch = () => {
  page.value = 1
  finished.value = false
  list.value = []
  fetchData()
}

const goToDetail = (id: number) => {
  router.push(`/property/${id}`)
}

onMounted(() => {
  fetchCategoriesData()
  fetchData()
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--jintai-bg-secondary) 0%, var(--jintai-bg) 400px);
  padding-bottom: 40px;
}

.header-banner {
  background: var(--jintai-red-gradient);
  padding: 60px 24px 70px;
  color: white;
  text-align: center;
  position: relative;
  border-radius: 0 0 40px 40px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(166, 25, 46, 0.2);
  overflow: hidden;
}

.header-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 10% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 40%);
  pointer-events: none;
}

.header-banner::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 100px,
    rgba(255, 215, 0, 0.03) 100px,
    rgba(255, 215, 0, 0.03) 200px
  );
  animation: bannerRotate 60s linear infinite;
  pointer-events: none;
}

@keyframes bannerRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.banner-content {
  position: relative;
  z-index: 1;
}

.banner-content h1 {
  font-size: 30px;
  margin-bottom: 12px;
  background: var(--jintai-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 4px;
  font-weight: 800;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.banner-content p {
  font-size: 14px;
  opacity: 0.9;
  letter-spacing: 2px;
  color: var(--jintai-gold-champagne);
  font-weight: 400;
}

.search-container {
  position: absolute;
  bottom: -24px;
  left: 20px;
  right: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  border: 1px solid var(--jintai-gold-primary);
  z-index: 2;
}

/* ========== 黄金奢华分类导航 ========== */
.luxury-category-section {
  margin: 0 16px 24px;
  padding: 0;
  position: relative;
  padding-top: 36px;
}

/* 顶部装饰 */
.luxury-deco-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.luxury-deco-top .deco-line {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #D4AF37 30%, #FFD700 50%, #D4AF37 70%, transparent);
  border-radius: 2px;
}

.luxury-deco-top .deco-diamond {
  font-size: 12px;
  color: #FFD700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
  animation: diamondPulse 2s ease-in-out infinite;
}

@keyframes diamondPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
}

/* 主导航容器 */
.category-nav-luxury {
  display: flex;
  justify-content: space-around;
  padding: 28px 16px 24px;
  gap: 12px;
  background: 
    linear-gradient(145deg, 
      rgba(251, 243, 220, 0.98) 0%, 
      rgba(247, 231, 206, 0.95) 30%,
      rgba(232, 213, 183, 0.92) 70%,
      rgba(247, 231, 206, 0.95) 100%
    );
  border-radius: 24px;
  box-shadow: 
    0 8px 32px rgba(184, 134, 11, 0.15),
    0 2px 8px rgba(212, 175, 55, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(184, 134, 11, 0.1);
  border: 2px solid transparent;
  background-clip: padding-box;
  position: relative;
  overflow: hidden;
}

/* 金色边框效果 */
.category-nav-luxury::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #FFD700 0%, #D4AF37 25%, #B8860B 50%, #D4AF37 75%, #FFD700 100%);
  border-radius: 26px;
  z-index: -1;
  animation: borderShimmer 4s linear infinite;
}

@keyframes borderShimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.category-nav-luxury::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: luxurySweep 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes luxurySweep {
  0%, 100% { left: -100%; }
  50% { left: 150%; }
}

/* 单个导航项 */
.nav-item-luxury {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  flex: 1;
  padding: 16px 8px 12px;
  border-radius: 20px;
  position: relative;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  animation: itemFadeIn 0.6s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes itemFadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

.nav-item-luxury:active {
  transform: scale(0.96);
}

/* 金色光环背景 */
.nav-item-luxury .icon-glow {
  position: absolute;
  top: 8px;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  transition: all 0.4s ease;
  pointer-events: none;
}

.nav-item-luxury:hover .icon-glow,
.nav-item-luxury.active .icon-glow {
  opacity: 1;
  animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 0.9; }
}

/* 图标容器 */
.nav-item-luxury .icon-container {
  position: relative;
  width: 68px;
  height: 68px;
  z-index: 1;
}

/* 图标外框 - 奢华金属边框 */
.nav-item-luxury .icon-frame {
  width: 100%;
  height: 100%;
  background: 
    linear-gradient(145deg, #FFFFFF 0%, #F9F5EC 50%, #F0E6D3 100%);
  border-radius: 18px;
  padding: 3px;
  box-shadow: 
    0 6px 20px rgba(184, 134, 11, 0.2),
    0 2px 6px rgba(212, 175, 55, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(184, 134, 11, 0.1);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 金属边框效果 */
.nav-item-luxury .icon-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  padding: 2px;
  background: linear-gradient(145deg, #FFE066 0%, #D4AF37 30%, #B8860B 60%, #D4AF37 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.nav-item-luxury:hover .icon-frame::before,
.nav-item-luxury.active .icon-frame::before {
  opacity: 1;
}

/* 激活状态 */
.nav-item-luxury.active .icon-frame {
  background: linear-gradient(145deg, #FFD700 0%, #D4AF37 50%, #C9A227 100%);
  box-shadow: 
    0 8px 28px rgba(255, 215, 0, 0.4),
    0 4px 12px rgba(212, 175, 55, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.4),
    inset 0 -2px 0 rgba(184, 134, 11, 0.3);
  transform: translateY(-4px);
}

/* 图标内部 */
.nav-item-luxury .icon-inner {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #FFFFFF 0%, #FDFBF7 100%);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.4s ease;
}

.nav-item-luxury .icon-inner::after {
  content: '';
  width: 32px;
  height: 32px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  transition: all 0.4s ease;
}

.nav-item-luxury.active .icon-inner {
  background: transparent;
}

.nav-item-luxury.active .icon-inner::after {
  filter: brightness(0) invert(1);
  transform: scale(1.1);
}

/* 闪光扫过效果 */
.nav-item-luxury .shine-sweep {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  transform: skewX(-20deg);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-item-luxury:hover .shine-sweep,
.nav-item-luxury.active .shine-sweep {
  opacity: 1;
  animation: shineSweep 1.5s ease-in-out infinite;
}

@keyframes shineSweep {
  0% { left: -100%; }
  100% { left: 200%; }
}

/* 图标样式 */
.icon-inner.residential::after { 
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='gold1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FFD700'/%3E%3Cstop offset='50%25' style='stop-color:%23D4AF37'/%3E%3Cstop offset='100%25' style='stop-color:%23B8860B'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23gold1)' d='M16 2L3 13h3v14h8v-8h4v8h8V13h3L16 2zm0 3.5L25 14v11h-4v-8H11v8H7V14L16 5.5z'/%3E%3C/svg%3E"); 
}
.icon-inner.commercial::after { 
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='gold2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FFD700'/%3E%3Cstop offset='50%25' style='stop-color:%23D4AF37'/%3E%3Cstop offset='100%25' style='stop-color:%23B8860B'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23gold2)' d='M28 6H16V2H4v28h24V6zm-22 2h6v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2H6V8zm8 20h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V8h2v4zm12 16H16V10h10v18zm-2-14h-6v2h6v-2zm0 4h-6v2h6v-2zm0 4h-6v2h6v-2z'/%3E%3C/svg%3E"); 
}
.icon-inner.school::after { 
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='gold3' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FFD700'/%3E%3Cstop offset='50%25' style='stop-color:%23D4AF37'/%3E%3Cstop offset='100%25' style='stop-color:%23B8860B'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23gold3)' d='M16 4L2 11l14 7 11-5.5V21h3v-9L16 4zm0 3.5L25.5 12 16 16.5 6.5 12 16 7.5zM7 15.8v5.4l9 4.5 9-4.5v-5.4l-9 4.5-9-4.5z'/%3E%3C/svg%3E"); 
}
.icon-inner.bargain::after { 
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='gold4' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FFD700'/%3E%3Cstop offset='50%25' style='stop-color:%23D4AF37'/%3E%3Cstop offset='100%25' style='stop-color:%23B8860B'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23gold4)' d='M28.5 15.2l-12-12C16 2.7 15.3 2.5 14.5 2.5h-9C4.1 2.5 3 3.6 3 5v9c0 .8.2 1.5.7 2l12 12c.5.5 1.2.7 2 .7s1.5-.2 2-.7l8.8-8.8c.5-.5.7-1.2.7-2s-.2-1.5-.7-2zM8 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm9.8 13.8l-11-11c-.2-.2-.3-.5-.3-.8V6h7c.3 0 .6.1.8.3l11 11-7.5 7.5z'/%3E%3Cpath fill='url(%23gold4)' opacity='0.6' d='M24 15l-8-8 1.5-1.5 8 8z'/%3E%3C/svg%3E"); 
}

/* 文字标签 */
.nav-item-luxury .nav-label {
  font-size: 14px;
  font-weight: 600;
  color: #5C4B2C;
  letter-spacing: 1px;
  transition: all 0.4s ease;
  position: relative;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.nav-item-luxury:hover .nav-label,
.nav-item-luxury.active .nav-label {
  background: linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #FFD700 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  text-shadow: none;
}

/* 底部金线装饰 */
.nav-item-luxury .label-underline {
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #D4AF37, #FFD700, #D4AF37);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
}

.nav-item-luxury:hover .label-underline,
.nav-item-luxury.active .label-underline {
  width: 80%;
}

/* 底部装饰 */
.luxury-deco-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 18px;
  padding: 0 20px;
}

.luxury-deco-bottom .deco-corner {
  width: 20px;
  height: 20px;
  border: 2px solid #D4AF37;
  opacity: 0.5;
}

.luxury-deco-bottom .deco-corner.left {
  border-right: none;
  border-top: none;
}

.luxury-deco-bottom .deco-corner.right {
  border-left: none;
  border-top: none;
}

.luxury-deco-bottom .deco-pattern {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    #D4AF37 10%, 
    #FFD700 25%,
    transparent 40%,
    transparent 60%,
    #FFD700 75%,
    #D4AF37 90%,
    transparent 100%
  );
  position: relative;
}

.luxury-deco-bottom .deco-pattern::before {
  content: '✦';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #D4AF37;
  font-size: 10px;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
}

.property-list {
  padding: 0 16px;
}

.property-card {
  background: white;
  border-radius: var(--jintai-radius-md);
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--jintai-border);
}

.property-card:hover {
  box-shadow: 0 8px 24px rgba(166, 25, 46, 0.1);
  transform: translateY(-4px);
  border-color: var(--jintai-gold-primary);
}

.property-card:active {
  transform: scale(0.98);
}

.property-image {
  position: relative;
  width: 100%;
  height: 210px;
  background: #f5f5f5;
  overflow: hidden;
}

.property-image .property-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.3s ease;
}

.property-image .image-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none;
}

.featured-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.2); }
}

.property-status-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 14px;
  border-radius: var(--jintai-radius-sm);
  font-size: 11px;
  font-weight: 700;
  color: white;
  z-index: 1;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
}

.status-upcoming { 
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.95) 0%, rgba(212, 175, 55, 0.95) 100%);
}
.status-ongoing { 
  background: linear-gradient(135deg, rgba(230, 67, 64, 0.95) 0%, rgba(197, 67, 64, 0.95) 100%);
}

.property-info {
  padding: 16px;
}

/* 拍卖信息元数据 */
.auction-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.auction-phase {
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

.auction-time {
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

.auction-time :deep(.van-icon) {
  font-size: 14px;
  color: var(--jintai-red-primary);
}

.property-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--jintai-text);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.property-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.property-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--jintai-border);
}

.price-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-label {
  font-size: 14px;
  color: var(--jintai-text-light);
  font-weight: 600;
}

.price-value {
  background: var(--jintai-gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

.price-number {
  font-size: 32px;
  letter-spacing: -0.5px;
}

.price-unit {
  font-size: 18px;
  margin-left: 2px;
  font-weight: 700;
}

.price-sub {
  font-size: 11px;
  color: var(--jintai-text-light);
  text-decoration: line-through;
  opacity: 0.8;
}

/* ========== 捡漏空间 - 黄金砖效果 ========== */
.gold-bar-badge {
  position: relative;
  perspective: 800px;
  transform-style: preserve-3d;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(139, 114, 6, 0.4));
}

/* 黄金砖主体 - 3D立体效果 */
.gold-bar-body {
  position: relative;
  width: 135px;  /* 固定宽度 - 适合8位数字显示 */
  padding: 8px 14px 6px;
  /* 真实黄金渐变 - 模拟金条表面反光 */
  background: 
    linear-gradient(155deg, 
      #FFFDE8 0%,
      #FFF5B8 5%,
      #FFE766 12%,
      #FFD700 22%,
      #F5C400 35%,
      #E6B400 45%,
      #D4A500 55%,
      #C99A00 65%,
      #BF9000 75%,
      #B08600 85%,
      #9A7500 95%,
      #8B6914 100%
    );
  border-radius: 3px;
  /* 3D立体阴影效果 */
  box-shadow: 
    /* 底部厚度阴影 - 营造厚度感 */
    0 4px 0 #8B6914,
    0 5px 0 #7A5A10,
    0 6px 0 #6B4D0C,
    /* 外部投影 */
    0 8px 16px rgba(139, 105, 20, 0.5),
    0 4px 6px rgba(139, 105, 20, 0.3),
    /* 内部高光 */
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 2px 6px rgba(255, 253, 232, 0.6),
    inset 2px 0 4px rgba(255, 247, 184, 0.4),
    /* 内部暗边 */
    inset -2px 0 4px rgba(139, 105, 20, 0.15),
    inset 0 -1px 3px rgba(139, 105, 20, 0.2);
  transform: rotateX(8deg) rotateY(-2deg);
  transform-origin: center bottom;
  overflow: hidden;
  /* 立体边框 */
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.5);
  border-left: 1px solid rgba(255, 247, 184, 0.4);
  border-right: 1px solid rgba(139, 105, 20, 0.3);
  border-bottom: 1px solid rgba(107, 77, 12, 0.4);
}

/* 顶部高光条 - 模拟金属反光 */
.gold-bar-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 253, 232, 0.3) 20%,
    rgba(255, 247, 184, 0.15) 50%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 0;
}

/* 流光扫过效果 */
.gold-bar-body::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -100%;
  width: 50%;
  height: 200%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, 0.15) 40%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0.15) 60%,
    transparent 100%
  );
  transform: skewX(-20deg);
  animation: goldBarShine 5s ease-in-out infinite;
  pointer-events: none;
  z-index: 3;
}

@keyframes goldBarShine {
  0%, 100% { left: -100%; opacity: 0.5; }
  15% { opacity: 1; }
  50% { left: 180%; opacity: 1; }
  65%, 100% { opacity: 0.5; }
}

/* 右侧斜面 - 3D立体边缘 */
.gold-bar-bevel {
  position: absolute;
  top: 0;
  right: -6px;
  width: 7px;
  height: calc(100% + 6px);
  background: linear-gradient(90deg, 
    #C99A00 0%,
    #A68200 30%,
    #8B6914 60%,
    #7A5A10 100%
  );
  transform: skewY(-8deg);
  transform-origin: top left;
  border-radius: 0 2px 2px 0;
  box-shadow: inset 0 1px 0 rgba(255, 247, 184, 0.3);
}

/* 底部厚边 */
.gold-bar-body::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(180deg, 
    #8B6914 0%,
    #7A5A10 50%,
    #6B4D0C 100%
  );
  transform: perspective(100px) rotateX(-60deg);
  transform-origin: top center;
  z-index: -1;
}

/* 金印信息区 - 凹刻压印效果 */
.gold-stamp-area {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

/* 金印头部 - 压印标记 */
.stamp-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1px;
}

.stamp-logo {
  font-size: 12px;  /* 增大30%: 从9px到12px */
  font-weight: 900;
  letter-spacing: 0.8px;
  /* 单色凹刻效果 - 深色基调 */
  color: #6B4D0C;
  /* 凹刻立体阴影 */
  text-shadow: 
    /* 顶部亮边 - 模拟凹陷上方的光 */
    0 1px 0 rgba(255, 253, 232, 1),
    0 1.5px 0 rgba(255, 247, 184, 0.8),
    /* 底部暗边 - 凹陷深处 */
    0 -1px 0 rgba(107, 77, 12, 0.6),
    0 -1.5px 1px rgba(92, 74, 8, 0.4),
    /* 内阴影效果 */
    inset 0 1px 2px rgba(107, 77, 12, 0.3);
  font-family: "SimHei", "Heiti SC", "Microsoft YaHei", sans-serif;
  filter: contrast(1.2);
}

/* 金印数值 - 主凹刻区域 */
.stamp-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 1px;
  /* 凹刻印章效果 */
  padding: 4px 10px;
  background: linear-gradient(180deg, 
    rgba(107, 77, 12, 0.25) 0%,
    rgba(139, 105, 20, 0.1) 40%,
    rgba(255, 247, 184, 0.12) 80%,
    rgba(201, 154, 0, 0.18) 100%
  );
  border-radius: 2px;
  /* 强化凹印阴影 */
  box-shadow: 
    inset 0 2px 4px rgba(107, 77, 12, 0.5),
    inset 0 -0.5px 1px rgba(255, 253, 232, 0.5),
    0 1px 0 rgba(255, 247, 184, 0.7);
  border-top: 0.5px solid rgba(107, 77, 12, 0.4);
  border-bottom: 0.5px solid rgba(255, 247, 184, 0.5);
}

.value-number {
  font-size: 18px;  /* 保持数值较大 */
  font-weight: 900;
  /* 单色凹刻金色文字 */
  color: #5C4A08;
  /* 凹刻立体效果 */
  text-shadow: 
    /* 顶部强亮边 */
    0 1.5px 0 rgba(255, 253, 232, 1),
    0 2px 0 rgba(255, 247, 184, 0.9),
    /* 底部暗边 */
    0 -0.5px 0 rgba(92, 74, 8, 0.5),
    0 -1px 1px rgba(107, 77, 12, 0.3);
  font-family: "Georgia", "Times New Roman", serif;
  letter-spacing: -0.3px;
  filter: contrast(1.1);
}

.value-unit {
  font-size: 13px;  /* 略微增大 */
  font-weight: 900;
  color: #6B4D0C;
  text-shadow: 
    0 1px 0 rgba(255, 253, 232, 1),
    0 1.5px 0 rgba(255, 247, 184, 0.8),
    0 -0.5px 0 rgba(107, 77, 12, 0.4);
  margin-left: 1px;
}

/* 黄金砖投影 */
.gold-bar-shadow {
  position: absolute;
  bottom: -10px;
  left: 8%;
  right: 2%;
  height: 10px;
  background: radial-gradient(ellipse 60% 100% at center, 
    rgba(107, 77, 12, 0.35) 0%,
    rgba(107, 77, 12, 0.15) 50%,
    transparent 80%
  );
  filter: blur(2px);
  transform: scaleY(0.4) skewX(-5deg);
  z-index: -1;
}

/* 悬停效果 - 金光闪烁 */
.gold-bar-badge:hover .gold-bar-body {
  box-shadow: 
    0 4px 0 #9A7500,
    0 5px 0 #8B6914,
    0 6px 0 #7A5A10,
    0 10px 24px rgba(255, 215, 0, 0.5),
    0 6px 10px rgba(139, 105, 20, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 3px 8px rgba(255, 253, 232, 0.7),
    inset 2px 0 5px rgba(255, 247, 184, 0.5),
    inset -2px 0 4px rgba(139, 105, 20, 0.15),
    inset 0 -1px 3px rgba(139, 105, 20, 0.2);
  transform: rotateX(8deg) rotateY(-2deg) scale(1.03) translateY(-2px);
  filter: brightness(1.05);
}

.gold-bar-badge:hover .gold-bar-shadow {
  opacity: 0.6;
  transform: scaleY(0.5) skewX(-5deg);
}

.gold-bar-badge:hover .gold-bar-bevel {
  background: linear-gradient(90deg, 
    #D4A500 0%,
    #B08600 30%,
    #9A7500 60%,
    #8B6914 100%
  );
}

.skeleton-card {
  padding: 16px;
}

/* 确保 primary 按钮上的 jintai-btn 文字是白色 */
.jintai-btn.van-button--primary,
.van-button--primary.jintai-btn {
  color: white !important;
  background: var(--jintai-red-gradient) !important;
}
</style>
