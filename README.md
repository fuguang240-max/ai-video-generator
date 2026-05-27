# AI Video Generator

> 3 段式 AI Pipeline 驱动的图生视频应用 · 个人作品

![tech-stack](https://img.shields.io/badge/Next.js-14-black) ![tech-stack](https://img.shields.io/badge/FastAPI-0.115-009688) ![tech-stack](https://img.shields.io/badge/TypeScript-5-3178c6) ![tech-stack](https://img.shields.io/badge/Tailwind-3-06b6d4)

## 🎬 演示

- **在线体验**：https://your-app.vercel.app（待填）
- **演示视频**：（待填）

## 💡 产品

用户上传一张图 + 一句话风格描述，AI 自动生成 5 秒短视频。

**核心场景**：电商商品视频化、自媒体素材生成、社交媒体短片

## 🏗 技术架构

```
┌──────────────┐      ┌──────────────┐      ┌──────────────────┐
│   Next.js    │─────▶│   FastAPI    │─────▶│  3-Stage AI      │
│   Frontend   │ HTTP │   Backend    │      │  Pipeline        │
│              │◀─────│              │      │                  │
└──────────────┘ Poll └──────┬───────┘      └──────────────────┘
                             │                       │
                             ▼                       ├─ qwen-vl-max
                      ┌──────────────┐               │  (图像理解)
                      │   SQLite     │               │
                      │ Task State   │               ├─ qwen-max
                      └──────────────┘               │  (Prompt 工程)
                                                     │
                                                     └─ Kling 3.0
                                                        (视频生成)
```

### AI Pipeline（核心创新）

不直接让用户写视频 prompt，而是 3 段式编排：

| Stage | Model | Role |
|-------|-------|------|
| 1. 图像理解 | qwen-vl-max | 客观描述图片主体、场景、光影 |
| 2. Prompt 工程 | qwen-max | 结合用户意图改写为专业视频 prompt |
| 3. 视频生成 | Kling 3.0 | 基于 prompt + 首帧图生成 5s 视频 |

**优势**：用户只需说"温馨治愈"四个字，AI 自动产出包含运镜、光影、节奏的专业 prompt。

### 工程亮点

- **异步任务编排**：视频生成 1-3 分钟，后台线程跑 Pipeline，前端轮询进度
- **进度可观测**：每个 Stage 实时回调进度到 SQLite，前端 Pipeline 可视化
- **可降级架构**：保留 `--raw` 模式，AI 不靠谱时人工写 prompt 兜底
- **预留升级路径**：TaskManager 抽象层，未来切换 Celery + Redis 不动业务代码

## 🚀 技术栈

**前端**：Next.js 14 (App Router) · TypeScript · Tailwind CSS · 黑暗科技风 UI

**后端**：FastAPI · SQLite · 异步任务队列 · OpenAI 兼容 API

**AI 服务**：阿里百炼（qwen-vl-max + qwen-max + Kling 3.0）

**基础设施**：阿里云 OSS · Vercel · Railway

## 📁 项目结构

```
ai-video-generator/
├── backend/              # FastAPI 后端
│   ├── main.py          # HTTP 路由
│   ├── pipeline.py      # 3 段式 AI Pipeline
│   ├── task_manager.py  # SQLite 任务管理
│   ├── prompt_generator.py  # LLM Prompt 工程
│   └── oss_uploader.py  # OSS 上传
└── frontend/             # Next.js 前端
    ├── app/             # App Router 页面
    │   ├── page.tsx     # 首页
    │   └── task/[id]/   # 任务详情页
    └── lib/api.ts       # API 封装
```

## 🛠 本地运行

详见 [backend/README.md](./backend/README.md) 和 [frontend/README.md](./frontend/README.md)

## 📝 已知优化方向

- [ ] 支持小说 → 多镜头视频（LLM 拆分镜 + 多段拼接）
- [ ] 多模型路由（按成本/质量动态选择 Seedance / Kling / Wan）
- [ ] Prompt 缓存（同图同意图复用，省成本）
- [ ] 用户系统 + 历史记录

## 📄 License

MIT
