// 后端 API 封装层
// 所有与后端的通信都走这里，方便统一管理

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// 与后端 task_manager.py 的字段一一对应
export type TaskStatus = "pending" | "running" | "succeeded" | "failed";

export interface Task {
  id: string;
  status: TaskStatus;
  progress: number;
  current_step: string | null;
  user_intent: string;
  image_url: string | null;
  generated_prompt: string | null;
  video_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

// 创建任务：上传图片 + 用户意图
export async function createTask(image: File, userIntent: string): Promise<{ task_id: string }> {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("user_intent", userIntent);

  const resp = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`创建任务失败: ${text}`);
  }
  return resp.json();
}

// 查询任务
export async function getTask(taskId: string): Promise<Task> {
  const resp = await fetch(`${API_BASE}/api/task/${taskId}`);
  if (!resp.ok) {
    throw new Error(`查询任务失败: ${resp.status}`);
  }
  return resp.json();
}
