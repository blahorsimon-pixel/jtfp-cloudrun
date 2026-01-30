import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory('/JTFP/admin/'),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'Layout',
      component: () => import('../views/Layout.vue'),
      redirect: '/properties',
      meta: { requiresAuth: true },
      children: [
        {
          path: '/properties',
          name: 'Properties',
          component: () => import('../views/Properties.vue'),
          meta: { title: '房源管理' }
        },
        {
          path: '/properties/create',
          name: 'PropertyCreate',
          component: () => import('../views/PropertyForm.vue'),
          meta: { title: '新增房源' }
        },
        {
          path: '/properties/edit/:id',
          name: 'PropertyEdit',
          component: () => import('../views/PropertyForm.vue'),
          meta: { title: '编辑房源' }
        },
        {
          path: '/categories',
          name: 'Categories',
          component: () => import('../views/Categories.vue'),
          meta: { title: '分类管理' }
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth !== false && !authStore.token) {
    next('/login')
  } else if (to.path === '/login' && authStore.token) {
    next('/')
  } else {
    next()
  }
})

export default router
