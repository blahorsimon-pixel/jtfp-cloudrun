import request from '../utils/request'

export interface Category {
  id?: number
  name: string
  icon?: string
  sort_order?: number
  status?: number
  created_at?: string
  updated_at?: string
}

// 获取分类列表
export const getCategories = () => {
  return request.get('/categories')
}

// 创建分类
export const createCategory = (data: Category) => {
  return request.post('/categories', data)
}

// 更新分类
export const updateCategory = (id: number, data: Category) => {
  return request.put(`/categories/${id}`, data)
}

// 删除分类
export const deleteCategory = (id: number) => {
  return request.delete(`/categories/${id}`)
}
