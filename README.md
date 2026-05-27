# AI Video Generator

> **3 段式 AI Pipeline 驱动的图生视频应用**
>
> 用户上传一张图 + 一句话风格描述 → AI 自动理解、自动写专业 Prompt、自动生成 5 秒视频

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776ab?logo=python)](https://www.python.org/)

## 🎬 在线体验

| 入口 | 链接 |
|---|---|
| **产品演示** | [ai-video-generator-nine-livid.vercel.app](https://ai-video-generator-nine-livid.vercel.app/) |
| **后端 API 文档（Swagger）** | [Railway · /docs](https://ai-video-generator-production-fe26.up.railway.app/docs) |
| **源码** | [github.com/fuguang240-max/ai-video-generator](https://github.com/fuguang240-max/ai-video-generator) |
| **演示视频** | _即将上线_ |

---

## 💡 产品定位

很多 AI 视频工具的最大问题是：**用户不会写 Prompt**。直接让普通用户描述"运镜、光影、节奏"是反人性的。

本项目的核心思路：**让用户只说意图，AI 自动写专业 Prompt**。

- 用户输入："温馨治愈" 4 个字
- AI 自动产出：`小猫缓缓抬头眨眼，毛发被微风轻拂；镜头从平视缓慢推近至特写，阳光在毛发上形成柔和光斑`

适用场景：电商商品视频、自媒体素材、社交媒体短片。

---

## 🏗 技术架构

```
┌─────────────────┐         ┌─────────────────┐         ┌────────────────────┐
│                 │  HTTP   │                 │         │  3-Stage AI        │
│   Next.js 14    │────────▶│   FastAPI       │────────▶│  Pipeline          │
│   Frontend      │  Poll   │   Backend       │         │                    │
│                 │◀────────│                 │         │  ├─ qwen-vl-max    │
└─────────────────┘         └────────┬────────┘         │  │  (图像理解)     │
       │                             │                  │  │                  │
       │                             ▼                  │  ├─ qwen-max       │
       │                    ┌─────────────────┐         │  │  (Prompt 工程)  │
       │                    │   SQLite        │         │  │                  │
       │                    │   Task State    │         │  └─ Kling 3.0     │
       │                    └─────────────────┘         │     (视频生成)     │
       │                                                └────────────────────┘
       ▼                                                          │
┌─────────────────┐                                               │
│   Vercel CDN    │◀──────────────────────────────────────────────┘
│   (全球加速)     │                  Video URL
└─────────────────┘
```

### 3 段式 AI Pipeline（核心创新）

| Stage | 模型 | 职责 | 输入 | 输出 |
|-------|------|------|------|------|
| 1️⃣ 视觉理解 | `qwen-vl-max` | 客观描述图片 | 图片 URL | 100 字图片描述 |
| 2️⃣ Prompt 工程 | `qwen-max` | 改写为专业视频 prompt | 描述 + 用户意图 | 80 字视频 prompt |
| 3️⃣ 视频生成 | `Kling 3.0` | 图生视频 | 图 + Prompt | 5 秒 MP4 |

**为什么不一次性调用？**

- **职责分离**：每段可独立 debug、独立缓存、独立优化
- **可观测**：每个 Stage 进度实时落库，用户能看到 AI 在执行哪一步
- **可降级**：保留 `--raw` 模式，AI 不可靠时人工写 prompt 兜底

---

## ⚙️ 工程亮点

### 异步任务编排

视频生成耗时 1-3 分钟，HTTP 同步等待会超时。本项目用**后台线程 + 任务持久化**：

```python
# main.py 节选
task_id = task_manager.create_task(user_intent)
task_manager.run_in_background(task_id, worker)
return {"task_id": task_id}  # 立即返回，不阻塞
```

前端轮询任务状态，每 2 秒拉一次进度。

**架构上预留了升级路径**——TaskManager 封装了任务创建/查询，未来切换到 Celery + Redis 不需要改业务代码。

### 实时进度可观测

Pipeline 每个 Stage 都回调 `on_progress(percent, step, extra)`，把进度、当前步骤、生成的 prompt 等中间产物实时写入 SQLite。前端通过 Pipeline 可视化展示。

### CORS + 跨域部署

前端部署在 Vercel（全球 CDN），后端部署在 Railway。跨域请求通过 FastAPI 的 `CORSMiddleware` 处理，安全且解耦。

---

## 🚀 技术栈

| 层级 | 技术 |
|---|---|
| **前端** | Next.js 14 (App Router) · TypeScript · Tailwind CSS · 黑暗科技风 UI |
| **后端** | FastAPI · SQLite · 后台线程异步任务 · OpenAI 兼容 API |
| **AI 服务** | 阿里百炼（qwen-vl-max + qwen-max + Kling 3.0） |
| **存储** | 阿里云 OSS（图片）+ 可灵 CDN（视频） |
| **部署** | Vercel（前端）· Railway（后端）· GitHub 自动 CD |

---

## 📁 项目结构

```
ai-video-generator/
├── backend/                  # FastAPI 后端
│   ├── main.py              # HTTP 路由 + CORS
│   ├── pipeline.py          # 3 段式 AI Pipeline
│   ├── task_manager.py      # SQLite 任务状态机
│   ├── prompt_generator.py  # LLM Prompt 工程
│   ├── oss_uploader.py      # 阿里云 OSS 上传
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/                 # Next.js 前端
    ├── app/
    │   ├── page.tsx         # 首页
    │   └── task/[id]/
    │       └── page.tsx     # 任务详情页
    └── lib/api.ts           # 后端 API 封装
```

---

## 🛠 本地运行

### 后端

```bash
cd backend
pip install -r requirements.txt

set DASHSCOPE_API_KEY=sk-xxx
set OSS_ACCESS_KEY_ID=LTAI...
set OSS_ACCESS_KEY_SECRET=xxx
set OSS_BUCKET=your-bucket

uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
cp .env.local.example .env.local
# 修改 NEXT_PUBLIC_API_BASE 指向后端地址

npm run dev
```

---

## 📊 关键指标

| 指标 | 数值 |
|---|---|
| 单条视频生成总耗时 | 60-90 秒 |
| API 调用成本（每条视频） | ¥3-5 元 |
| 前端首屏加载 | < 1s（Vercel CDN） |

---

## 🔮 优化方向

- [ ] **多模型路由**：根据付费档位动态选择 Kling / Seedance / Wan
- [ ] **Prompt 缓存**：同图同意图复用，省 30%+ AI 成本
- [ ] **失败重试 + 降级**：超时自动重试，降级备用模型
- [ ] **小说 → 多镜头视频**：LLM 拆分镜 + ffmpeg 合成
- [ ] **生产级任务队列**：升级到 Celery + Redis

---

## 📜 设计决策（FAQ）

**Q: 为什么用 SQLite 而不是 Redis？**

A: 演示场景并发量极低，SQLite 部署简单（不需要额外服务），且任务数据可持久化。架构上做了抽象，未来扩容时切换到 Redis 只需替换 TaskManager 实现。

**Q: 为什么不直接调用一次 AI 模型生成视频？**

A: 让用户写视频 Prompt 是反人性的（普通人不懂运镜、光影术语）。3 段式 Pipeline 把"理解图"和"生成 Prompt"拆开，用户只需说意图，AI 自动产出专业 Prompt。

**Q: 为什么前端用 Next.js App Router 而不是 Pages Router？**

A: App Router 是 Next.js 14 的官方推荐方向，支持 Server Components、嵌套布局、动态路由更直观。

**Q: 为什么后端用 FastAPI 而不是 Flask / Django？**

A: FastAPI 原生支持异步、Pydantic 类型校验、自动生成 OpenAPI 文档（即 `/docs` 路径）。

---

## 📄 License

MIT

---

> Built for engineering interview · 2026
