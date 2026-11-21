import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    server: {
        port: 5173,
        proxy: {
            // API + 文件预览都代理到后端
            '/api': { target: 'http://localhost:8989', changeOrigin: true },
        },
    },
    build: { outDir: 'dist' },
})
