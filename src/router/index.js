import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { state } from '../store/index.js'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/vote/login', name: 'student-login', component: () => import('../views/StudentLoginView.vue') },
  { path: '/vote/booth', name: 'voting', component: () => import('../views/VotingBoothView.vue') },
  { path: '/vote/confirm', name: 'confirmation', component: () => import('../views/ConfirmationView.vue') },
  { path: '/vote/success', name: 'success', component: () => import('../views/SuccessView.vue') },
  { path: '/admin/login', name: 'admin-login', component: () => import('../views/AdminLoginView.vue') },
  { path: '/admin', name: 'admin', component: () => import('../views/AdminPanelView.vue'), beforeEnter: (to, from) => { if (!state.isAdmin && !sessionStorage.getItem('sbo_admin')) return '/admin/login' } },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
