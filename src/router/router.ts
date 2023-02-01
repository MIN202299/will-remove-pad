import { createRouter, RouteRecordRaw, createWebHistory } from 'vue-router'


const BigScreen = () => import('@/pages/BigScreen.vue')
const Pad = () => import('@/pages/Pad.vue')
const ShowroomEquip = () => import('@/pages/ShowroomEquip.vue')
const ShowroomEquipPad = () => import('@/pages/ShowroomEquipPad.vue')

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
      },
      {
        path: 'showroom',
        component: ShowroomEquip
      },
      {
        path: 'showroomPad',
        component: ShowroomEquipPad
      }
    ]
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})