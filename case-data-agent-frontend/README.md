# 案卷数据问答 · 前端

案卷数据问答系统的 Web 前端。基于 React + TypeScript + Vite 构建，提供基于会话的自然语言问答界面，支持流式输出、Markdown 渲染（含代码高亮与表格修复）、历史会话管理与消息操作。

## 技术栈

| 分类 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | React 18 + TypeScript | 函数组件 + Hooks |
| 构建 | Vite 5 | 开发服务器与生产打包 |
| UI 组件 | Ant Design 6 + @ant-design/icons | 输入框、按钮、Tooltip、Spin、message 等 |
| Markdown | react-markdown + remark-gfm | 支持 GFM（表格、任务列表等） |
| 代码高亮 | react-syntax-highlighter（Prism · oneDark） | 回答中的代码块高亮 |
| 图表 | recharts | 数据可视化（依赖预置，按需使用） |

## 目录结构

```
case-data-agent-frontend/
├── index.html              # HTML 入口，标题「案卷数据问答」
├── vite.config.ts          # Vite 配置：端口 5174，代理 /api → 后端
├── tsconfig.json           # TypeScript 配置（strict 模式）
├── package.json            # 依赖与脚本
└── src/
    ├── main.tsx            # React 挂载入口
    ├── App.tsx             # 主组件：会话列表、问答交互、流式渲染
    ├── markdown.ts         # 粘连 Markdown 表格修复工具
    ├── App.css             # 主组件样式
    └── index.css           # 全局样式
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- 后端服务运行于 `http://localhost:8080`（见下方「后端联调」）

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器（默认端口 5174）
npm run dev

# 生产构建（输出到 dist/）
npm run build

# 本地预览构建产物
npm run preview
```

开发服务器启动后访问 http://localhost:5174 。

### 启动前后端服务（联调）

两个服务各占一个终端，**先后端、后前端**：

```bash
# 终端 1：后端（端口 8080）
conda activate case-data-agent
cd D:\pyWorkspace\case-data-agent
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

```bash
# 终端 2：前端（端口 5174）
cd D:\webspace\case-data-agent-frontend
npm run dev
```

前端启动后，浏览器访问 **http://localhost:5174** 即可。前端的 `/api` 请求由 Vite 自动代理到后端 `http://localhost:8080`。后端未起时前端会话列表为空、问答报错，后端起来后刷新页面即可恢复。

## 后端联调

`vite.config.ts` 配置了开发代理，将所有 `/api` 请求转发到后端：

```ts
server: {
  port: 5174,
  proxy: { '/api': 'http://localhost:8080' },
}
```

前端依赖的接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/v1/sessions` | 获取会话列表，返回 `{ sessions: SessionItem[] }` |
| GET | `/api/v1/sessions/:id/messages` | 获取某会话的历史消息，返回 `{ messages: Msg[] }` |
| POST | `/api/v1/chat` | 发送问答，请求体 `{ question, session_id? }`，响应为 SSE 流 |

### SSE 流式协议

`POST /api/v1/chat` 返回 `text/event-stream`，前端通过 `ReadableStream` + `TextDecoder` 逐行解析 `data:` 行。事件类型：

| event | data 字段 | 说明 |
| --- | --- | --- |
| `thinking` | `session_id?`, `steps?` | 思考/中间步骤，含新建会话的 `session_id` |
| `done` | `answer`, `session_id?` | 结束事件，`answer` 为完整回答 |
| `error` | `message` | 错误事件，前端渲染为 `[错误] ...` |

> 前端在收到首个事件时即插入占位 assistant 消息，随事件逐步更新内容，实现流式打字效果。

## 功能说明

### 会话管理

- **会话列表**：进入应用自动加载，按时间分组展示（7 天内 / 30 天内 / 更早）。
- **新建会话**：点击「新对话」清空当前消息并开始新会话。
- **历史会话**：点击列表项加载该会话的历史消息。

### 问答交互

- **建议问题**：空会话时展示预设示例，点击即填入输入框。
- **流式回答**：发送后实时展示思考步骤与回答内容。
- **Markdown 渲染**：回答支持 GFM 表格、代码块（含语法高亮）、列表等。
- **消息操作**：每条 assistant 消息支持「复制」全文与「重新生成」。

### 表格修复

模型输出的 Markdown 表格常出现表头、分隔行、数据行粘连甚至跨行折断的情况（例如 `| 日期 | 登记 | ... | 合计 ||------|------|...`）。`src/markdown.ts` 中的 `repairMarkdownTables` 负责在渲染前重建为标准 Markdown 表格：

- 合并以 `|` 开头的粘连行；
- 按 `|` 切分单元格并定位分隔段；
- 依据表头列数重建表头、分隔行、数据行；
- 丢弃表格中间因折断产生的空单元格与空行。

## 配置说明

| 配置项 | 文件 | 默认值 | 说明 |
| --- | --- | --- | --- |
| 开发端口 | `vite.config.ts` | `5174` | `server.port` |
| 后端地址 | `vite.config.ts` | `http://localhost:8080` | `server.proxy['/api']` |
| TS strict | `tsconfig.json` | 开启 | `compilerOptions.strict` |

如需指向其他后端地址，修改 `vite.config.ts` 中 `proxy['/api']` 的 `target` 即可。

## 构建

```bash
npm run build
```

产物输出到 `dist/`，为静态资源，可由任意静态服务器或后端服务直接托管。部署时需确保 `/api` 请求能路由到后端服务（由部署环境的反向代理负责，开发期由 Vite 代理处理）。
