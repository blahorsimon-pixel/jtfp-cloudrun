import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/JTFP/h5/'),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/property/:id',
      name: 'PropertyDetail',
      component: () => import('../views/PropertyDetail.vue')
    }
  ]
})

export default router
