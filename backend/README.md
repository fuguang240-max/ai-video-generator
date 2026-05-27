# AI Video Generator - Backend

## 本地运行

### 1. 装依赖

```bash
pip install -r requirements.txt
```

### 2. 设环境变量

```cmd
set DASHSCOPE_API_KEY=sk-xxx
set OSS_ACCESS_KEY_ID=LTAI...
set OSS_ACCESS_KEY_SECRET=xxx
set OSS_BUCKET=xxx
```

### 3. 起服务

```bash
uvicorn main:app --reload --port 8000
```

打开 http://localhost:8000/docs 看自动生成的 API 文档。

### 4. 测试接口

健康检查：
```bash
curl http://localhost:8000/api/health
```

创建任务：
```bash
curl -X POST http://localhost:8000/api/generate ^
  -F "image=@test.jpg" ^
  -F "user_intent=温馨治愈"
```

查询任务：
```bash
curl http://localhost:8000/api/task/<task_id>
```

## 架构

```
HTTP 请求
   ↓
FastAPI (main.py)
   ↓
TaskManager (SQLite)
   ↓
Background Thread → Pipeline
   ├── OSS Upload
   ├── LLM Prompt Generation (qwen-vl-max + qwen-max)
   └── Kling Video Generation
```
