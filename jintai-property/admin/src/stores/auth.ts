import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const username = ref(localStorage.getItem('admin_username') || '')

  const setToken = (newToken: string, user: string) => {
    token.value = newToken
    username.value = user
    localStorage.setItem('admin_token', newToken)
    localStorage.setItem('admin_username', user)
  }

  const clearToken = () => {
    token.value = ''
    username.value = ''
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
  }

  return {
    token,
    username,
    setToken,
    clearToken
  }
})
