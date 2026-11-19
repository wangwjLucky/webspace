import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // 127.0.0.1 直连，避免 localhost 被本机代理/TUN 规则劫持转发到其他服务
      '/api': 'http://127.0.0.1:8081',
    },
  },
})
