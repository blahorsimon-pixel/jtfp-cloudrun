<template>
  <div class="property-form-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑房源' : '新增房源' }}</span>
          <el-button type="text" @click="handleBack">返回列表</el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="140px"
        v-loading="loading"
      >
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="小区名称" prop="community_name">
              <el-input v-model="form.community_name" placeholder="请输入小区名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="详细地址">
              <el-input v-model="form.detail_address" placeholder="请输入详细地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 房屋属性 -->
        <el-divider content-position="left">房屋属性</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="建筑面积(㎡)">
              <el-input v-model="form.building_area" placeholder="89.5" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="房屋户型">
              <el-input v-model="form.house_type" placeholder="3室2厅" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="楼层">
              <el-input v-model="form.floor_info" placeholder="12/26" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="建筑年份">
              <el-input v-model="form.building_year" placeholder="2010" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="装修情况">
              <el-input v-model="form.decoration_status" placeholder="精装/毛坯" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="物业现状">
              <el-input v-model="form.property_status" placeholder="租赁/空置/住人" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="持有年数">
              <el-input v-model="form.holding_years" placeholder="5年" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="物业类型">
              <el-input v-model="form.property_type" placeholder="住宅/商业" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 拍卖信息 -->
        <el-divider content-position="left">拍卖信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="开拍时间">
              <el-input v-model="form.auction_time" placeholder="2026-02-01 10:00" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="竞价阶段">
              <el-input v-model="form.bidding_phase" placeholder="一拍/二拍" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="竞拍平台">
              <el-input v-model="form.auction_platform" placeholder="京东司法拍卖" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="竞拍保证金(万)">
              <el-input v-model="form.auction_deposit" placeholder="20" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="加价幅度(万)">
              <el-input v-model="form.price_increment" placeholder="1" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 价格信息 -->
        <el-divider content-position="left">价格信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="起拍价(万)">
              <el-input v-model="form.starting_price" placeholder="200" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="起拍单价(万/㎡)">
              <el-input v-model="form.starting_unit_price" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="根据起拍价和建筑面积自动计算" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="评估总价(万)">
              <el-input v-model="form.evaluation_total_price" placeholder="300" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="评估单价(万/㎡)">
              <el-input v-model="form.evaluation_unit_price" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="根据评估总价和建筑面积自动计算" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="市场参考总价(万)">
              <el-input v-model="form.market_total_price" placeholder="320" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="市场参考单价(万/㎡)">
              <el-input v-model="form.market_unit_price" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="根据市场参考总价和建筑面积自动计算" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 贷款信息 -->
        <el-divider content-position="left">贷款信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="7成可贷金额(万)">
              <el-input v-model="form.loan_70_percent" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="评估总价 × 70%" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="8成可贷金额(万)">
              <el-input v-model="form.loan_80_percent" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="评估总价 × 80%" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="9成可贷金额(万)">
              <el-input v-model="form.loan_90_percent" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="评估总价 × 90%" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 税费信息 -->
        <el-divider content-position="left">税费信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="契税率">
              <el-input v-model="form.deed_tax_rate" placeholder="1%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="契税金额(万)">
              <el-input v-model="form.deed_tax_amount" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="起拍价 × 契税率" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="增值税率">
              <el-input v-model="form.vat_rate" placeholder="5%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="增值税金额(万)">
              <el-input v-model="form.vat_amount" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="起拍价 × 增值税率" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="个税率">
              <el-input v-model="form.income_tax_rate" placeholder="1%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="个税金额(万)">
              <el-input v-model="form.income_tax_amount" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="起拍价 × 个税率" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 区域信息 -->
        <el-divider content-position="left">区域信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="学区">
              <el-input v-model="form.school_district" placeholder="XX小学" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="商圈">
              <el-input v-model="form.business_circle" placeholder="市中心" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="捡漏空间(万)">
              <el-input v-model="form.profit_space" placeholder="自动计算">
                <template #suffix>
                  <el-tooltip content="市场参考总价 - 起拍价" placement="top">
                    <el-icon style="cursor: help; color: #909399;"><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 客户信息 -->
        <el-divider content-position="left">客户信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="客户姓名">
              <el-input v-model="form.customer_name" placeholder="张三" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户联系号码">
              <el-input v-model="form.customer_phone" placeholder="13800138000" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="归属业务员">
              <el-input v-model="form.assigned_salesman" placeholder="业务员A" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="客户尽调简介">
              <el-input
                v-model="form.customer_survey_brief"
                type="textarea"
                :rows="3"
                placeholder="客户背景、购房意向等"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="unionID">
              <el-input v-model="form.unionID" placeholder="微信unionID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="OpenID">
              <el-input v-model="form.openID" placeholder="微信OpenID" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 其他信息 -->
        <el-divider content-position="left">其他信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="授权码">
              <el-input v-model="form.auth_code" placeholder="AUTH123" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 商城展示 -->
        <el-divider content-position="left">商城展示设置</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="上架状态">
              <el-radio-group v-model="form.status">
                <el-radio :label="0">下架</el-radio>
                <el-radio :label="1">上架</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="所属分类">
              <el-select v-model="form.category_id" placeholder="请选择分类" clearable>
                <el-option
                  v-for="item in categories"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否推荐">
              <el-radio-group v-model="form.is_featured">
                <el-radio :label="0">否</el-radio>
                <el-radio :label="1">是</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序权重">
              <el-input-number v-model="form.sort_order" :min="0" :max="9999" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 模块配置 -->
        <el-divider content-position="left">模块显示配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="Tab模块配置">
              <div class="module-config-container">
                <div class="module-config-tips">
                  <el-alert
                    type="info"
                    :closable="false"
                    show-icon
                  >
                    <template #title>
                      <span>配置前端显示的Tab模块，可通过拖拽调整显示顺序</span>
                    </template>
                  </el-alert>
                </div>
                <div 
                  ref="moduleListRef" 
                  class="module-list"
                >
                  <div
                    v-for="(tab, index) in moduleTabs"
                    :key="tab.key"
                    class="module-item"
                    :class="{ 'is-disabled': !tab.visible }"
                  >
                    <div class="module-drag-handle">
                      <el-icon><Rank /></el-icon>
                    </div>
                    <div class="module-info">
                      <span class="module-name">{{ tab.name }}</span>
                      <span class="module-key">({{ tab.key }})</span>
                    </div>
                    <div class="module-switch">
                      <el-switch
                        v-model="tab.visible"
                        @change="handleModuleVisibilityChange"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 房源图片上传 -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="房源图片">
              <div class="image-upload-container">
                <el-upload
                  class="image-uploader"
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  name="file"
                  list-type="picture-card"
                  :file-list="imageFileList"
                  :on-success="handleUploadSuccess"
                  :on-error="handleUploadError"
                  :on-remove="handleRemoveImage"
                  :on-preview="handlePreviewImage"
                  :before-upload="beforeUpload"
                  :limit="40"
                  :on-exceed="handleExceed"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  multiple
                  drag
                >
                  <el-icon class="el-icon--upload"><Upload /></el-icon>
                  <div class="el-upload__text">
                    拖拽图片到此处，或 <em>点击上传</em>
                  </div>
                  <template #tip>
                    <div class="el-upload__tip">
                      支持 jpg/png/gif/webp 格式，单张图片不超过5MB，最多上传40张。第一张图片将作为封面图。
                    </div>
                  </template>
                </el-upload>
                <div v-if="imageList.length > 0" class="image-count">
                  已上传 {{ imageList.length }} / 40 张图片
                </div>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 图片预览对话框 -->
        <el-dialog v-model="previewVisible" title="图片预览" width="800px">
          <img :src="previewImageUrl" style="width: 100%" alt="预览图片" />
        </el-dialog>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '立即创建' }}
          </el-button>
          <el-button @click="handleBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Upload, Rank, InfoFilled } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import { getPropertyDetail, createProperty, updateProperty } from '../api/property'
import { getCategories } from '../api/category'
import { useAuthStore } from '../stores/auth'
import type { Property } from '../api/property'
import type { Category } from '../api/category'
import type { UploadFile, UploadProps, UploadUserFile } from 'element-plus'

interface ModuleTab {
  key: string
  name: string
  visible: boolean
  order: number
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const formRef = ref()
const loading = ref(false)
const submitting = ref(false)
const categories = ref<Category[]>([])

const isEdit = computed(() => !!route.params.id)

// 工具函数：数值解析和格式化
// 解析数值（处理空值和非数字）
const parseNum = (val: string | undefined): number => {
  if (!val) return 0
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num
}

// 解析百分比（如 "1%" -> 0.01）
const parsePercent = (val: string | undefined): number => {
  if (!val) return 0
  const num = parseFloat(val.replace('%', ''))
  return isNaN(num) ? 0 : num / 100
}

// 格式化结果（保留2位小数，去除尾0）
const formatResult = (val: number): string => {
  if (val === 0) return ''
  return parseFloat(val.toFixed(2)).toString()
}

// 图片上传相关
const uploadUrl = '/api/v1/admin/upload/image'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${authStore.token}`
}))
const imageList = ref<string[]>([])
const imageFileList = ref<UploadUserFile[]>([])
const previewVisible = ref(false)
const previewImageUrl = ref('')

// 模块配置
const moduleListRef = ref<HTMLElement | null>(null)
const moduleTabs = ref<ModuleTab[]>([
  { key: 'property', name: '房源', visible: true, order: 1 },
  { key: 'auction', name: '拍卖', visible: true, order: 2 },
  { key: 'loan', name: '金融', visible: true, order: 3 },
  { key: 'tax', name: '税费', visible: true, order: 4 }
])
let sortableInstance: Sortable | null = null

const form = reactive<Property>({
  community_name: '',
  detail_address: '',
  building_area: '',
  house_type: '',
  floor_info: '',
  building_year: '',
  decoration_status: '',
  property_status: '',
  holding_years: '',
  property_type: '',
  auction_time: '',
  bidding_phase: '',
  auction_platform: '',
  auction_deposit: '',
  price_increment: '',
  starting_price: '',
  starting_unit_price: '',
  evaluation_total_price: '',
  evaluation_unit_price: '',
  loan_70_percent: '',
  loan_80_percent: '',
  loan_90_percent: '',
  market_total_price: '',
  market_unit_price: '',
  school_district: '',
  business_circle: '',
  profit_space: '',
  auth_code: '',
  deed_tax_rate: '',
  deed_tax_amount: '',
  vat_rate: '',
  vat_amount: '',
  income_tax_rate: '',
  income_tax_amount: '',
  customer_name: '',
  customer_phone: '',
  customer_survey_brief: '',
  assigned_salesman: '',
  unionID: '',
  openID: '',
  status: 0,
  is_featured: 0,
  category_id: null,
  cover_url: '',
  images: [],
  sort_order: 0
})

// 图片上传函数
const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isImage = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'].includes(file.type)
  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过5MB！')
    return false
  }
  return true
}

const handleUploadSuccess: UploadProps['onSuccess'] = (response, uploadFile) => {
  if (response.success && response.url) {
    imageList.value.push(response.url)
    updateFormImages()
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.error || '图片上传失败')
  }
}

const handleUploadError: UploadProps['onError'] = (error) => {
  console.error('上传失败:', error)
  ElMessage.error('图片上传失败，请重试')
}

const handleRemoveImage: UploadProps['onRemove'] = (uploadFile) => {
  // 从URL获取要删除的图片
  const url = uploadFile.url || (uploadFile.response as any)?.url
  if (url) {
    const index = imageList.value.indexOf(url)
    if (index > -1) {
      imageList.value.splice(index, 1)
      updateFormImages()
    }
  }
}

const handlePreviewImage: UploadProps['onPreview'] = (uploadFile) => {
  previewImageUrl.value = uploadFile.url || (uploadFile.response as any)?.url || ''
  previewVisible.value = true
}

const handleExceed: UploadProps['onExceed'] = () => {
  ElMessage.warning('最多只能上传40张图片')
}

// 更新表单的images和cover_url字段
const updateFormImages = () => {
  form.images = [...imageList.value]
  // 第一张图片自动设置为封面
  form.cover_url = imageList.value.length > 0 ? imageList.value[0] : ''
}

// 初始化模块配置
const initModuleConfig = (moduleConfig: any) => {
  // 如果 moduleConfig 是字符串，先解析为对象
  let config = moduleConfig
  if (typeof moduleConfig === 'string') {
    try {
      config = JSON.parse(moduleConfig)
    } catch (e) {
      console.error('解析 module_config 失败:', e)
      config = null
    }
  }
  
  if (config && config.tabs && Array.isArray(config.tabs)) {
    // 从服务器加载配置
    moduleTabs.value = config.tabs.map((tab: any) => ({
      key: tab.key,
      name: tab.name,
      visible: tab.visible !== false, // 默认为true
      order: tab.order || 0
    }))
    // 按order排序
    moduleTabs.value.sort((a, b) => a.order - b.order)
  } else {
    // 使用默认配置
    moduleTabs.value = [
      { key: 'property', name: '房源', visible: true, order: 1 },
      { key: 'auction', name: '拍卖', visible: true, order: 2 },
      { key: 'loan', name: '金融', visible: true, order: 3 },
      { key: 'tax', name: '税费', visible: true, order: 4 }
    ]
  }
  // 初始化拖拽排序
  nextTick(() => {
    initSortable()
  })
}

// 初始化拖拽排序
const initSortable = () => {
  if (!moduleListRef.value || sortableInstance) return
  
  sortableInstance = Sortable.create(moduleListRef.value, {
    handle: '.module-drag-handle',
    animation: 150,
    onEnd: () => {
      // 更新order
      moduleTabs.value.forEach((tab, index) => {
        tab.order = index + 1
      })
    }
  })
}

// 处理模块显示状态变化
const handleModuleVisibilityChange = () => {
  // 确保至少有一个模块可见
  const visibleCount = moduleTabs.value.filter(tab => tab.visible).length
  if (visibleCount === 0) {
    ElMessage.warning('至少需要保留一个可见模块')
    // 恢复最后一个被关闭的模块
    const lastTab = moduleTabs.value[moduleTabs.value.length - 1]
    if (lastTab) {
      lastTab.visible = true
    }
  }
}

// 从服务器返回的数据初始化图片列表
const initImageList = (images: string | string[] | undefined, coverUrl?: string) => {
  let urls: string[] = []
  
  if (images) {
    if (typeof images === 'string') {
      try {
        urls = JSON.parse(images)
      } catch {
        urls = images ? [images] : []
      }
    } else if (Array.isArray(images)) {
      urls = images
    }
  }
  
  // 如果没有images但有cover_url，使用cover_url作为第一张图片
  if (urls.length === 0 && coverUrl) {
    urls = [coverUrl]
  }
  
  imageList.value = urls
  imageFileList.value = urls.map((url, index) => ({
    name: `image-${index}`,
    url: url,
    status: 'success' as const,
    uid: Date.now() + index
  }))
}

const rules = {
  community_name: [
    { required: true, message: '请输入小区名称', trigger: 'blur' }
  ]
}

const fetchCategories = async () => {
  try {
    const res: any = await getCategories()
    categories.value = res.categories || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

const fetchDetail = async () => {
  fetchCategories()
  if (!isEdit.value) {
    // 新建时初始化模块配置
    nextTick(() => {
      initSortable()
    })
    return
  }
  
  loading.value = true
  try {
    const res: any = await getPropertyDetail(Number(route.params.id))
    const data = res.data || res.property
    Object.assign(form, data)
    // 初始化图片列表
    initImageList(data.images, data.cover_url)
    // 初始化模块配置
    initModuleConfig(data.module_config)
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取房源详情失败')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  await formRef.value.validate()
  
  submitting.value = true
  try {
    // 准备提交数据，将images数组转换为JSON字符串
    const submitData = {
      ...form,
      images: JSON.stringify(imageList.value),
      cover_url: imageList.value.length > 0 ? imageList.value[0] : form.cover_url,
      module_config: {
        tabs: moduleTabs.value.map(tab => ({
          key: tab.key,
          name: tab.name,
          visible: tab.visible,
          order: tab.order
        }))
      }
    }
    
    if (isEdit.value) {
      await updateProperty(Number(route.params.id), submitData)
      ElMessage.success('修改成功')
    } else {
      await createProperty(submitData)
      ElMessage.success('创建成功')
    }
    router.push('/properties')
  } catch (error: any) {
    console.error('提交失败:', error)
    ElMessage.error(error?.response?.data?.error || error?.message || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

const handleBack = () => {
  router.back()
}

// 自动换算逻辑
// 1. 监听起拍价和面积 → 计算起拍单价
watch([() => form.starting_price, () => form.building_area], () => {
  const price = parseNum(form.starting_price)
  const area = parseNum(form.building_area)
  if (price > 0 && area > 0) {
    form.starting_unit_price = formatResult(price / area)
  }
})

// 2. 监听评估总价和面积 → 计算评估单价 + 贷款金额
watch([() => form.evaluation_total_price, () => form.building_area], () => {
  const price = parseNum(form.evaluation_total_price)
  const area = parseNum(form.building_area)
  
  // 评估单价
  if (price > 0 && area > 0) {
    form.evaluation_unit_price = formatResult(price / area)
  }
  
  // 贷款金额（基于评估总价）
  if (price > 0) {
    form.loan_70_percent = formatResult(price * 0.7)
    form.loan_80_percent = formatResult(price * 0.8)
    form.loan_90_percent = formatResult(price * 0.9)
  }
})

// 3. 监听市场总价和面积 → 计算市场单价
watch([() => form.market_total_price, () => form.building_area], () => {
  const price = parseNum(form.market_total_price)
  const area = parseNum(form.building_area)
  if (price > 0 && area > 0) {
    form.market_unit_price = formatResult(price / area)
  }
})

// 4. 监听起拍价和契税率 → 计算契税金额
watch([() => form.starting_price, () => form.deed_tax_rate], () => {
  const price = parseNum(form.starting_price)
  const rate = parsePercent(form.deed_tax_rate)
  if (price > 0 && rate > 0) {
    form.deed_tax_amount = formatResult(price * rate)
  }
})

// 5. 监听起拍价和增值税率 → 计算增值税金额
watch([() => form.starting_price, () => form.vat_rate], () => {
  const price = parseNum(form.starting_price)
  const rate = parsePercent(form.vat_rate)
  if (price > 0 && rate > 0) {
    form.vat_amount = formatResult(price * rate)
  }
})

// 6. 监听起拍价和个税率 → 计算个税金额
watch([() => form.starting_price, () => form.income_tax_rate], () => {
  const price = parseNum(form.starting_price)
  const rate = parsePercent(form.income_tax_rate)
  if (price > 0 && rate > 0) {
    form.income_tax_amount = formatResult(price * rate)
  }
})

// 7. 监听市场总价和起拍价 → 计算捡漏空间
watch([() => form.market_total_price, () => form.starting_price], () => {
  const market = parseNum(form.market_total_price)
  const starting = parseNum(form.starting_price)
  if (market > 0 && starting > 0) {
    form.profit_space = formatResult(market - starting)
  }
})

onMounted(() => {
  fetchDetail()
})

// 组件卸载时销毁拖拽实例
onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
})
</script>

<style scoped>
.property-form-container {
  max-width: 1200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-divider__text) {
  font-weight: 600;
  font-size: 16px;
  color: #409eff;
}

/* 图片上传样式 */
.image-upload-container {
  width: 100%;
}

.image-uploader {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  padding: 20px;
}

:deep(.el-upload-list--picture-card) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 120px;
  height: 120px;
  margin: 0;
}

:deep(.el-upload--picture-card) {
  width: 120px;
  height: 120px;
}

.image-count {
  margin-top: 10px;
  color: #909399;
  font-size: 14px;
}

.el-upload__tip {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

/* 模块配置样式 */
.module-config-container {
  width: 100%;
}

.module-config-tips {
  margin-bottom: 16px;
}

.module-list {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 8px;
  background: #fafafa;
}

.module-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: move;
  transition: all 0.3s;
}

.module-item:last-child {
  margin-bottom: 0;
}

.module-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.1);
}

.module-item.is-disabled {
  opacity: 0.6;
  background: #f5f7fa;
}

.module-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 12px;
  color: #909399;
  cursor: grab;
}

.module-drag-handle:active {
  cursor: grabbing;
}

.module-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.module-key {
  font-size: 12px;
  color: #909399;
}

.module-switch {
  margin-left: auto;
}
</style>
