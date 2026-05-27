# AI Video Generator

> **3 段式 AI Pipeline 驱动的图生视频应用**
>
> 用户上传一张图 + 一句话风格描述 → AI 自动理解、自动写专业 Prompt、自动生成 5 秒视频

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776ab?logo=python)](https://www.python.org/)

---

## 🎬 在线体验

| 入口 | 链接 |
|---|---|
| 🌐 **产品演示** | [ai-video-generator-nine-livid.vercel.app](https://ai-video-generator-nine-livid.vercel.app/) |
| 📚 **后端 API 文档（Swagger）** | [Railway · /docs](https://ai-video-generator-production-fe26.up.railway.app/docs) |
| 💻 **源码** | [github.com/fuguang240-max/ai-video-generator](https://github.com/fuguang240-max/ai-video-generator) |
| 🎥 **演示视频** | _即将上线_ |

> 上传一张图 + 输入 "温馨治愈" 4 个字 → 60-90 秒后拿到一段带运镜的 5 秒视频。

---

## 💡 产品定位

### 问题

试用过可灵、即梦、Runway 这些视频生成工具后，发现一个共同痛点：

**普通用户不会写视频 Prompt**。

想做出像样的视频，需要懂 "广角推进""柔光""慢镜头"这些专业术语。普通用户进来只会输入"我想要好看的视频"，结果生成的视频很烂。

### 解决方案

把"写 Prompt"这一步**从用户身上拿走，让 AI 自己写**。

| 用户输入 | AI 自动产出的 Prompt |
|---|---|
| "温馨治愈" | "小猫缓缓抬头眨眼，毛发被微风轻拂；镜头从平视缓慢推近至特写，阳光在毛发上形成柔和光斑" |
| "城市夜景，缓慢推近" | "灯火璀璨的城市天际线，江面如镜倒映着楼宇灯光；镜头由远景缓缓推近至中央地标建筑，月光从云后悄然显现" |

### 适用场景

- 电商商品视频（小商家批量生产展示视频）
- 自媒体素材（公众号/小红书的配图视频化）
- 社交媒体短片（朋友圈/抖音的氛围内容）

---

## 🏗 技术架构

```
┌─────────────────┐         ┌─────────────────┐         ┌────────────────────┐
│                 │  HTTP   │                 │         │  3-Stage AI        │
│   Next.js 14    │────────▶│   FastAPI       │────────▶│  Pipeline          │
│   Frontend      │  Poll   │   Backend       │         │                    │
│   (Vercel)      │◀────────│   (Railway)     │         │  ① qwen-vl-max     │
└─────────────────┘         └────────┬────────┘         │     视觉理解        │
                                     │                  │                    │
                                     ▼                  │  ② qwen-max        │
                            ┌─────────────────┐         │     Prompt 工程     │
                            │   SQLite        │         │                    │
                            │   Task State    │         │  ③ Kling 3.0       │
                            └─────────────────┘         │     视频生成        │
                                                        └────────────────────┘
                                                                  │
                                                                  ▼
                                                        ┌────────────────────┐
                                                        │  Aliyun OSS        │
                                                        │  (图片/视频存储)   │
                                                        └────────────────────┘
```

### 核心：3 段式 AI Pipeline

| Stage | 模型 | 职责 | 输入 | 输出 |
|-------|------|------|------|------|
| ① 视觉理解 | `qwen-vl-max` | 客观描述图片 | 图片 URL | 100 字描述（主体/场景/光影） |
| ② Prompt 工程 | `qwen-max` | 改写为专业视频 prompt | 描述 + 用户意图 | 80 字视频 prompt |
| ③ 视频生成 | `Kling 3.0` | 图生视频 | 图 + Prompt | 5 秒 MP4 |

**为什么不一次性调用 Kling？**

直接让用户写 Prompt，普通人写不出来；让 LLM 一次性"看图+写 Prompt+生成"，又会让流程黑盒、不可控、不可降级。

3 段式的好处：

- **职责分离**：每段可独立 debug、独立缓存、独立优化
- **可观测**：每个 Stage 进度实时落库，前端能展示 AI 正在做什么
- **可降级**：保留 `--raw` 模式，AI 不可靠时人工写 Prompt 兜底
- **可路由**：不同 Stage 可以接不同的模型供应商，按成本/质量动态选择

---

## ⚙️ 关键技术决策

### 1. 异步任务编排：后台线程而不是 Celery

视频生成耗时 60-180 秒，HTTP 同步等待会超时。需要异步。

但**没引入 Celery + Redis**，用了 Python 后台线程 + SQLite。

理由：

- 演示场景并发量极低（< 5 并发），后台线程足够
- Celery 需要 Redis/RabbitMQ 中间件，增加部署复杂度
- SQLite 比 Redis 多一个好处：进程重启数据不丢

**架构上预留了升级路径** —— TaskManager 类封装了任务创建/查询/更新，未来切到 Celery 只需替换实现，业务代码不动。

```python
# 立刻返回，不阻塞
task_id = task_manager.create_task(user_intent)
task_manager.run_in_background(task_id, worker)
return {"task_id": task_id}
```

### 2. 进度可观测：每个 Stage 都回调

Pipeline 每个阶段都调用 `on_progress(percent, step, extra)`，把进度、当前步骤、生成的中间产物（如 LLM 写的 Prompt）实时写入 SQLite。前端 2 秒轮询一次，可视化展示：

```
[✓] 上传图片        Aliyun OSS         10%
[✓] 视觉理解        qwen-vl-max        30%
[✓] Prompt 生成     qwen-max           40%
[●] 视频生成        Kling 3.0          75%  (运行中... 45s)
[ ] 完成
```

### 3. 跨域部署：Vercel + Railway

前端部署在 Vercel（全球 CDN），后端部署在 Railway（Docker 容器）。跨域请求用 FastAPI 的 `CORSMiddleware`。

这种"前后端独立部署"的架构相比"前后端同源"有几个好处：

- 前端用 CDN 加速，首屏 < 1s
- 前后端可独立扩缩容
- 任一侧故障不影响另一侧

---

## 🚀 技术栈

| 层级 | 技术 |
|---|---|
| **前端** | Next.js 14 (App Router) · TypeScript · Tailwind CSS · 黑暗科技风 UI |
| **后端** | FastAPI · SQLite · 后台线程异步任务 · OpenAI 兼容 API |
| **AI 服务** | 阿里百炼（qwen-vl-max + qwen-max + Kling 3.0） |
| **存储** | 阿里云 OSS（图片）+ 可灵 CDN（视频） |
| **部署** | Vercel（前端）· Railway（后端，Docker）· GitHub 自动 CD |

---

## 📁 项目结构

```
ai-video-generator/
├── backend/                     # FastAPI 后端
│   ├── main.py                 # HTTP 路由 + CORS
│   ├── pipeline.py             # 3 段式 AI Pipeline 编排
│   ├── task_manager.py         # SQLite 任务状态机
│   ├── prompt_generator.py     # LLM Prompt 工程（qwen-vl-max + qwen-max）
│   ├── oss_uploader.py         # 阿里云 OSS 上传
│   ├── requirements.txt
│   └── Dockerfile              # Railway 部署用
│
└── frontend/                    # Next.js 前端
    ├── app/
    │   ├── page.tsx            # 首页（上传 + 意图 + 案例画廊）
    │   ├── task/[id]/
    │   │   └── page.tsx        # 任务详情页（Pipeline 可视化）
    │   ├── layout.tsx
    │   └── globals.css         # 黑暗科技风样式
    ├── lib/
    │   └── api.ts              # 后端 API 封装
    ├── tailwind.config.js      # 配色：紫色 #a855f7 + 深黑 #0a0a0f
    └── package.json
```

---

## 📊 关键指标

| 指标 | 数值 |
|---|---|
| 单条视频生成总耗时 | 60-90 秒 |
| API 成本（每条视频） | ¥3-5 元（其中 Kling 占 95%） |
| 前端首屏加载 | < 1s（Vercel CDN） |
| 后端冷启动 | < 5s（Railway Docker） |
| 代码行数 | 后端 ~400 行，前端 ~600 行 |

---

## 🛠 本地运行

### 后端

```bash
cd backend
pip install -r requirements.txt

# 配置环境变量
set DASHSCOPE_API_KEY=sk-xxx
set OSS_ACCESS_KEY_ID=LTAI...
set OSS_ACCESS_KEY_SECRET=xxx
set OSS_BUCKET=your-bucket

uvicorn main:app --reload --port 8000
```

打开 http://localhost:8000/docs 看自动生成的 Swagger UI 测试 API。

### 前端

```bash
cd frontend
npm install
cp .env.local.example .env.local
# 修改 NEXT_PUBLIC_API_BASE 指向后端地址

npm run dev
```

打开 http://localhost:3000。

---

## 🔮 未来优化

- [ ] **多模型路由**：根据用户付费档位动态选择 Kling / Seedance / Wan（成本 vs 质量权衡）
- [ ] **Prompt 缓存**：同图同意图复用 LLM 输出，省 30%+ AI 成本
- [ ] **失败重试 + 降级**：超时自动重试，多次失败降级到备用模型
- [ ] **生产级任务队列**：从 SQLite + Thread 升级到 Celery + Redis
- [ ] **小说 → 多镜头视频**：LLM 拆分镜 + ffmpeg 合成多段视频
- [ ] **用户系统 + 历史**：基于 Clerk / Supabase Auth

---

## 📜 设计决策 FAQ

**Q: 为什么用 SQLite 而不是 Redis？**

A: 演示场景并发量极低，SQLite 无需额外部署、数据可持久化。架构上做了抽象（TaskManager 类），未来扩容时切换 Redis 只需替换实现。

**Q: 为什么不直接调用一次 AI 模型生成视频？**

A: 让用户写视频 Prompt 是反人性的（不懂运镜、光影术语）。3 段式 Pipeline 把"理解图"和"生成 Prompt"拆开，用户只需说意图，AI 自动产出专业 Prompt。

**Q: 为什么前端用 Next.js App Router 而不是 Pages Router？**

A: App Router 是 Next.js 14 的官方推荐方向，支持 Server Components、嵌套布局、动态路由更直观。

**Q: 为什么后端用 FastAPI 而不是 Flask / Django？**

A: FastAPI 原生支持 async/await（I/O 密集场景）、Pydantic 类型校验、自动生成 OpenAPI 文档（即 `/docs` 路径就是免费的 Swagger UI）。

**Q: 为什么部署用 Vercel + Railway 而不是单一云服务商？**

A: Vercel 全球 CDN 加速前端，Railway 用 Docker 部署后端容器，各取所长。两边都是免费层够用，且都跟 GitHub 自动 CD 集成。

---

## 📄 License

MIT

---

> Built in under 24 hours · 2026
