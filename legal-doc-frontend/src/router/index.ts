import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'register', component: () => import('../views/RegistrationView.vue') },
  { path: '/list', name: 'list', component: () => import('../views/ListView.vue') },
  { path: '/result/:id', name: 'result', component: () => import('../views/ResultView.vue') },
  { path: '/pipeline/:id', name: 'pipeline', component: () => import('../views/pipeline/PipelineView.vue') },
]

export default createRouter({ history: createWebHistory(), routes })
