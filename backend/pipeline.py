"""
视频生成 Pipeline。

把命令行版本的逻辑封装成可被后端任务调用的函数。
每个 step 都会回调 update_progress 更新数据库，前端能看到实时进度。
"""

import os
import time
import requests
from typing import Callable

from oss_uploader import upload_image
from prompt_generator import generate_prompt

# ---- 可灵配置 ----
DASHSCOPE_KEY = os.environ.get("DASHSCOPE_API_KEY")
DS_BASE = "https://dashscope.aliyuncs.com/api/v1"
MODEL = "kling/kling-v3-video-generation"
MODE = "std"
DURATION = 5


def _create_kling_task(image_url: str, prompt: str) -> str:
    url = f"{DS_BASE}/services/aigc/video-generation/video-synthesis"
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }
    payload = {
        "model": MODEL,
        "input": {
            "prompt": prompt,
            "media": [{"type": "first_frame", "url": image_url}],
        },
        "parameters": {
            "mode": MODE,
            "duration": DURATION,
            "audio": False,
            "watermark": False,
        },
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["output"]["task_id"]


def _poll_kling(task_id: str, on_tick: Callable[[int], None]) -> str:
    """轮询可灵任务，on_tick(elapsed_seconds) 用于报告进度。"""
    url = f"{DS_BASE}/tasks/{task_id}"
    headers = {"Authorization": f"Bearer {DASHSCOPE_KEY}"}
    start = time.time()
    timeout = 600

    while True:
        if time.time() - start > timeout:
            raise TimeoutError(f"可灵任务超时: {task_id}")

        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        output = resp.json()["output"]
        status = output["task_status"]
        on_tick(int(time.time() - start))

        if status == "SUCCEEDED":
            return output["video_url"]
        if status in ("FAILED", "CANCELED", "UNKNOWN"):
            raise RuntimeError(f"可灵任务失败: {output}")

        time.sleep(10)


def run_pipeline(
    local_image_path: str,
    user_intent: str,
    on_progress: Callable[[int, str, dict], None],
) -> str:
    """
    端到端执行 Pipeline。

    Args:
        local_image_path: 本地图片路径
        user_intent: 用户意图（一句话）
        on_progress: 进度回调 (percent, step_text, extra_fields)

    Returns:
        最终的 video_url
    """
    # Step 1: 上传 OSS（10%）
    on_progress(10, "正在上传图片到云端", {})
    image_url = upload_image(local_image_path)
    on_progress(20, "图片已上传", {"image_url": image_url})

    # Step 2: LLM 生成 prompt（30%）
    on_progress(30, "AI 正在理解图片并生成专业 prompt", {})
    prompt = generate_prompt(image_url, user_intent)
    on_progress(40, f"Prompt 已生成", {"generated_prompt": prompt})

    # Step 3: 创建可灵任务（50%）
    on_progress(50, "正在调用可灵 3.0 模型生成视频", {})
    kling_task_id = _create_kling_task(image_url, prompt)

    # Step 4: 轮询可灵（50% → 95%，按时间估算）
    def kling_tick(elapsed: int) -> None:
        # 可灵通常 60-180 秒，把这段映射到 50%-95%
        pct = min(95, 50 + int(elapsed / 180 * 45))
        on_progress(pct, f"可灵生成中 ({elapsed}s)", {})

    video_url = _poll_kling(kling_task_id, kling_tick)

    # Step 5: 完成
    on_progress(100, "视频生成完成", {"video_url": video_url})
    return video_url
