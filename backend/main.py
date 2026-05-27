"""
FastAPI 后端入口。

接口：
    POST /api/generate       - 上传图片+意图，创建任务，返回 task_id
    GET  /api/task/{task_id} - 查询任务状态
    GET  /api/health         - 健康检查

启动：
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import shutil
import tempfile
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import task_manager
from pipeline import run_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时初始化数据库。"""
    task_manager.init_db()
    yield


app = FastAPI(title="AI Video Generator", lifespan=lifespan)

# CORS：允许前端跨域调用
# 演示环境放宽，生产环境要收紧到具体域名
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/generate")
async def generate(
    image: UploadFile = File(...),
    user_intent: str = Form(...),
):
    """
    创建视频生成任务。

    前端用 multipart/form-data 提交：
        - image: 图片文件
        - user_intent: 用户意图字符串
    """
    if not image.filename:
        raise HTTPException(400, "缺少图片文件")

    # 保存上传文件到临时目录（OSS uploader 接收本地路径）
    suffix = os.path.splitext(image.filename)[1] or ".jpg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(image.file, tmp)
        tmp.close()
        local_path = tmp.name
    finally:
        image.file.close()

    # 创建任务
    task_id = task_manager.create_task(user_intent)

    # 后台线程跑 Pipeline
    def worker(tid: str) -> None:
        task_manager.update_task(tid, status="running", progress=0, current_step="初始化")

        def on_progress(percent: int, step: str, extra: dict) -> None:
            task_manager.update_task(tid, progress=percent, current_step=step, **extra)

        try:
            run_pipeline(local_path, user_intent, on_progress)
            task_manager.update_task(tid, status="succeeded")
        except Exception as e:
            traceback.print_exc()
            task_manager.update_task(tid, status="failed", error=str(e))
        finally:
            # 清理临时文件
            try:
                os.unlink(local_path)
            except OSError:
                pass

    task_manager.run_in_background(task_id, worker)
    return {"task_id": task_id}


@app.get("/api/task/{task_id}")
def get_task(task_id: str):
    """查询任务状态。前端轮询此接口。"""
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(404, "任务不存在")
    return task
