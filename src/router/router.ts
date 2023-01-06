import { createRouter, RouteRecordRaw, createWebHistory } from 'vue-router'


const BigScreen = () => import('@/components/BigScreen.vue')
const Pad = () => import('@/components/Pad.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/bigScreen',
    children: [
      {
        path: 'bigScreen',
        component: BigScreen
      },
      {
        path: 'pad',
        component: Pad
      }
    ]
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})