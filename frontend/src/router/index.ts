import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
    meta: {
      title: '首页'
    }
  },
  {
    path: '/market',
    name: 'Market',
    component: () => import('@/pages/Market.vue'),
    meta: {
      title: '算力市场'
    }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/pages/Tasks.vue'),
    meta: {
      title: '我的任务'
    }
  },
  {
    path: '/tasks/:id',
    name: 'TaskDetail',
    component: () => import('@/pages/TaskDetail.vue'),
    meta: {
      title: '任务详情'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - iExec 算力交易市场`
  }
  next()
})

export default router
