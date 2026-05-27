# AI Video Generator - Frontend

Next.js 14 + Tailwind + TypeScript · 黑暗科技风 UI

## 本地运行

### 1. 装依赖

```bash
npm install
```

如果慢，用淘宝镜像：
```bash
npm install --registry=https://registry.npmmirror.com
```

### 2. 配置环境变量

把 `.env.local.example` 复制为 `.env.local`：

```bash
copy .env.local.example .env.local
```

编辑 `.env.local`，指向你的后端地址：
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

### 4. 同时确保后端在跑

后端必须同时在 http://localhost:8000 运行，否则前端调不通。

## 页面结构

```
/                  首页：上传图 + 写意图 + 案例画廊
/task/[id]         任务详情：Pipeline 可视化 + 进度 + 视频
```

## 部署到 Vercel

1. 把代码 push 到 GitHub
2. 登录 vercel.com，用 GitHub 登录
3. New Project → 选这个仓库 → Deploy
4. 在 Vercel 项目设置里加环境变量：
   - `NEXT_PUBLIC_API_BASE` = 你的 Railway 后端地址

## 设计说明

- **黑暗科技风**：深黑底色 + 紫色高亮，符合 AI 应用工程师面试调性
- **Pipeline 可视化**：把后端的 5 个阶段显式展示出来，体现工程素养
- **技术细节面板**：可折叠展示 LLM prompt、模型选择、耗时数据
