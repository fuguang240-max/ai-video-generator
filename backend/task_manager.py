"""
SQLite 任务管理器。

任务状态流转：
    pending → running → succeeded / failed

为什么不用 Celery + Redis？
    单机演示场景，并发量极低。SQLite + Thread 足够，且部署简单。
    架构上做了抽象，未来切到 Celery 只需替换执行逻辑，不动业务代码。
"""

import sqlite3
import threading
import uuid
import json
from datetime import datetime
from typing import Optional, Callable
from contextlib import contextmanager

DB_PATH = "tasks.db"


def init_db() -> None:
    """初始化数据库表。"""
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                current_step TEXT,
                user_intent TEXT,
                image_url TEXT,
                generated_prompt TEXT,
                video_url TEXT,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        c.commit()


@contextmanager
def _conn():
    """获取数据库连接（每次新建避免线程问题）。"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def create_task(user_intent: str) -> str:
    """创建任务并返回 task_id。"""
    task_id = uuid.uuid4().hex
    now = datetime.utcnow().isoformat()
    with _conn() as c:
        c.execute(
            "INSERT INTO tasks (id, status, user_intent, created_at, updated_at) "
            "VALUES (?, 'pending', ?, ?, ?)",
            (task_id, user_intent, now, now),
        )
        c.commit()
    return task_id


def update_task(task_id: str, **fields) -> None:
    """更新任务字段。"""
    fields["updated_at"] = datetime.utcnow().isoformat()
    cols = ", ".join(f"{k} = ?" for k in fields.keys())
    values = list(fields.values()) + [task_id]
    with _conn() as c:
        c.execute(f"UPDATE tasks SET {cols} WHERE id = ?", values)
        c.commit()


def get_task(task_id: str) -> Optional[dict]:
    """查询任务。"""
    with _conn() as c:
        row = c.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return dict(row) if row else None


def run_in_background(task_id: str, fn: Callable[[str], None]) -> None:
    """在后台线程中执行任务函数。"""
    thread = threading.Thread(target=fn, args=(task_id,), daemon=True)
    thread.start()
