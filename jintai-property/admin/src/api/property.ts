import request from '../utils/request'

export interface PropertyQuery {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number | string
}

export interface Property {
  id?: number
  // 40字段
  auction_time?: string
  bidding_phase?: string
  community_name: string
  detail_address?: string
  building_area?: string
  house_type?: string
  floor_info?: string
  building_year?: string
  decoration_status?: string
  property_status?: string
  holding_years?: string
  property_type?: string
  starting_price?: string
  starting_unit_price?: string
  auction_platform?: string
  auction_deposit?: string
  price_increment?: string
  evaluation_total_price?: string
  evaluation_unit_price?: string
  loan_70_percent?: string
  loan_80_percent?: string
  loan_90_percent?: string
  market_total_price?: string
  market_unit_price?: string
  school_district?: string
  business_circle?: string
  profit_space?: string
  auth_code?: string
  deed_tax_rate?: string
  deed_tax_amount?: string
  vat_rate?: string
  vat_amount?: string
  income_tax_rate?: string
  income_tax_amount?: string
  customer_name?: string
  customer_phone?: string
  customer_survey_brief?: string
  assigned_salesman?: string
  unionID?: string
  openID?: string
  // 商城字段
  status?: number
  is_featured?: number
  category_id?: number | null
  cover_url?: string
  images?: string | string[]  // JSON字符串或数组
  sort_order?: number
  created_at?: string
  updated_at?: string
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

// 图片上传响应接口
export interface UploadResponse {
  success: boolean
  url?: string
  urls?: string[]
  error?: string
}

// 获取房源列表
export const getProperties = (params: PropertyQuery) => {
  return request.get('/properties', { params })
}

// 获取房源详情
export const getPropertyDetail = (id: number) => {
  return request.get(`/properties/${id}`)
}

// 创建房源
export const createProperty = (data: Property) => {
  return request.post('/properties', data)
}

// 更新房源
export const updateProperty = (id: number, data: Property) => {
  return request.put(`/properties/${id}`, data)
}

// 删除房源
export const deleteProperty = (id: number) => {
  return request.delete(`/properties/${id}`)
}

// 批量删除
export const batchDeleteProperties = (ids: number[]) => {
  return request.post('/properties/batch-delete', { ids })
}

// 下载导入模板
export const downloadTemplate = () => {
  window.open('/templates/property_import_template.xlsx', '_blank')
}

// Excel导入
export const importExcel = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/properties/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 导出Excel
export const exportProperties = (ids?: number[]) => {
  return request.post('/properties/export', { ids }, {
    responseType: 'blob'
  }).then((blob: any) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `房源数据_${new Date().getTime()}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  })
}

// 上传单张图片
export const uploadImage = (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 上传多张图片
export const uploadImages = (files: File[]): Promise<UploadResponse> => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })
  return request.post('/upload/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 删除图片
export const deleteImage = (url: string) => {
  return request.delete('/upload/image', { data: { url } })
}
