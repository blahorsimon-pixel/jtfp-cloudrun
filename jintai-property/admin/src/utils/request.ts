import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const request = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      
      if (status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        const authStore = useAuthStore()
        authStore.clearToken()
        // 根据当前路径判断是云托管还是本地部署
        const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/JTFP/admin'
        window.location.href = `${basePath}/login`
        return Promise.reject(error)
      }
      
      ElMessage.error(data.error || '请求失败')
    } else {
      ElMessage.error('网络错误，请检查连接')
    }
    
    return Promise.reject(error)
  }
)

export default request
