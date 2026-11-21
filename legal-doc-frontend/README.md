# legal-doc-frontend

法律文书技能编排系统前端（Vue 3 + Vite + TypeScript + Element Plus + @vue-flow/core）。

> 与后端 `legal-doc-orchestrator` 分离管理、独立部署。

## 开发

```bash
npm install
npm run dev   # http://localhost:5173，/api 代理到 http://localhost:9898（vite.config.ts）
```

后端需独立启动（见后端项目）。Vite dev server 已配置 `/api` → `localhost:9898` 代理。

## 构建

```bash
npm run build   # 产物 dist/（vue-tsc 类型检查 + vite build）
```

## Docker（独立容器）

```bash
docker build -t legal-doc-web .
```

容器以 nginx 托管 `dist` 并反代 `/api` 到后端（`nginx.conf` 中 `proxy_pass http://api:9898`，
配合后端项目根的 `docker-compose.yml` 编排；独立部署时改为实际后端地址）。

## 目录结构

```
src/
├── api/                # axios 封装 + 接口
├── components/         # 通用组件
├── composables/        # useRegistrationPoll 等
├── router/             # Vue router
├── stores/             # pinia
├── views/
│   └── pipeline/       # Vue Flow 流程可视化 + 时间线 + 详情抽屉
├── types/
├── App.vue
├── main.ts
└── style.css
```
