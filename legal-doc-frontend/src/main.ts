import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as Icons from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './style.css'

document.documentElement.classList.add('dark')
const app = createApp(App)
for (const [key, comp] of Object.entries(Icons)) app.component(key, comp)
app.use(createPinia()).use(router).use(ElementPlus)
app.mount('#app')
