import axios from 'axios'

const request = axios.create({
  baseURL: '/api/v1/properties/mall',
  timeout: 30000
})

request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('请求失败:', error)
    return Promise.reject(error)
  }
)

export interface PropertyItem {
  id: number
  community_name: string
  detail_address?: string
  building_area?: string
  house_type?: string
  floor_info?: string
  starting_price?: string
  evaluation_total_price?: string
  school_district?: string
  business_circle?: string
  cover_url?: string
  is_featured?: number
  auction_time?: string
  bidding_phase?: string
  profit_space?: string
  created_at?: string
}

export interface PropertyDetail extends PropertyItem {
  auction_time?: string
  bidding_phase?: string
  building_year?: string
  decoration_status?: string
  property_status?: string
  property_type?: string
  starting_unit_price?: string
  auction_platform?: string
  auction_deposit?: string
  price_increment?: string
  evaluation_unit_price?: string
  loan_70_percent?: string
  loan_80_percent?: string
  loan_90_percent?: string
  market_total_price?: string
  market_unit_price?: string
  profit_space?: string
  deed_tax_rate?: string
  deed_tax_amount?: string
  vat_rate?: string
  vat_amount?: string
  income_tax_rate?: string
  income_tax_amount?: string
  // 多图片字段
  images?: string[] | string  // JSON数组或已解析的数组
  // 模块配置
  module_config?: {
    tabs: Array<{
      key: string
      name: string
      visible: boolean
      order: number
    }>
  }
}

// 获取房源列表（H5商城）
export const getPropertyList = (params: { page?: number; pageSize?: number; keyword?: string; categoryId?: number }) => {
  // jintai-property 后端路由：GET /api/v1/properties/mall
  return request.get('/', { params })
}

// 获取分类列表
export const getCategories = () => {
  return request.get('/categories')
}

// 获取房源详情
export const getPropertyDetail = (id: number) => {
  // jintai-property 后端路由：GET /api/v1/properties/mall/:id
  return request.get(`/${id}`)
}
