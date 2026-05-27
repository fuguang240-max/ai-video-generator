"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTask, Task } from "@/lib/api";

// Pipeline 阶段定义（与后端 pipeline.py 的进度对应）
const STAGES = [
  { id: "upload", label: "上传图片", at: 10, model: "Aliyun OSS" },
  { id: "vl", label: "视觉理解", at: 30, model: "qwen-vl-max" },
  { id: "prompt", label: "Prompt 生成", at: 40, model: "qwen-max" },
  { id: "kling", label: "视频生成", at: 50, model: "kling 3.0" },
  { id: "done", label: "完成", at: 100, model: null },
];

function getStageState(progress: number, stage: number) {
  if (progress >= STAGES[stage].at) {
    // 当前阶段或之后阶段
    if (stage === STAGES.length - 1) return progress >= 100 ? "done" : "running";
    if (progress >= STAGES[stage + 1].at) return "done";
    return "running";
  }
  return "pending";
}

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  // 轮询任务状态
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const t = await getTask(taskId);
        if (stopped) return;
        setTask(t);
        if (t.status === "succeeded" || t.status === "failed") return;
        setTimeout(tick, 2000);
      } catch (e) {
        if (!stopped) setTimeout(tick, 3000);
      }
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [taskId]);

  // 计时器
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!task) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">加载任务中...</div>
      </main>
    );
  }

  const progress = task.progress || 0;
  const isDone = task.status === "succeeded";
  const isFailed = task.status === "failed";

  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      {/* 顶部导航 */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-text-secondary hover:text-accent transition-colors"
        >
          ← 返回首页
        </button>
        <div className="text-xs text-text-muted font-mono">
          Task: {taskId.slice(0, 8)}... · {elapsed}s
        </div>
      </div>

      {/* 状态主卡 */}
      <div className="card glow-border mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm text-text-muted mb-1">用户意图</div>
            <div className="text-lg">{task.user_intent}</div>
          </div>
          <StatusBadge status={task.status} />
        </div>

        {/* 进度条 */}
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-text-secondary">{task.current_step || "等待中..."}</span>
          <span className="font-mono text-accent">{progress}%</span>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-glow transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pipeline 可视化（面试杀手锏） */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">AI Pipeline</h2>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs px-3 py-1.5 rounded-md bg-bg-tertiary hover:bg-border border border-border text-text-secondary font-mono"
          >
            {showDetails ? "▼ 隐藏" : "▶ 技术细节"}
          </button>
        </div>

        <div className="space-y-3">
          {STAGES.map((stage, idx) => {
            const state = getStageState(progress, idx);
            return (
              <PipelineStage
                key={stage.id}
                index={idx + 1}
                label={stage.label}
                model={stage.model}
                state={state}
              />
            );
          })}
        </div>
      </div>

      {/* 技术细节面板 */}
      {showDetails && (
        <div className="card mb-6 font-mono text-sm">
          <h3 className="text-text-muted text-xs uppercase tracking-wider mb-4">Technical Details</h3>
          <div className="space-y-3">
            <DetailRow label="Task ID" value={taskId} />
            <DetailRow label="Status" value={task.status} />
            <DetailRow label="Progress" value={`${progress}%`} />
            <DetailRow label="Elapsed" value={`${elapsed}s`} />
            {task.image_url && (
              <DetailRow label="Image URL" value={task.image_url} link />
            )}
            {task.generated_prompt && (
              <div>
                <div className="text-text-muted text-xs mb-1">Generated Prompt (by qwen-max)</div>
                <div className="bg-bg-tertiary border border-border rounded-lg p-3 text-text-primary whitespace-pre-wrap">
                  {task.generated_prompt}
                </div>
              </div>
            )}
            {task.video_url && (
              <DetailRow label="Video URL" value={task.video_url} link />
            )}
          </div>
        </div>
      )}

      {/* 最终视频 */}
      {isDone && task.video_url && (
        <div className="card glow-border">
          <h2 className="text-lg font-semibold mb-4">✨ 生成完成</h2>
          <video
            src={task.video_url}
            controls
            autoPlay
            loop
            className="w-full rounded-lg bg-black"
          />
          <div className="flex gap-3 mt-4">
            <a
              href={task.video_url}
              download
              className="btn-primary flex-1 text-center"
            >
              下载视频
            </a>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 rounded-lg border border-border hover:border-accent text-text-secondary hover:text-accent transition-colors"
            >
              再生成一个
            </button>
          </div>
        </div>
      )}

      {/* 失败状态 */}
      {isFailed && (
        <div className="card border-red-500/40">
          <h2 className="text-lg font-semibold text-red-400 mb-2">❌ 生成失败</h2>
          <pre className="bg-bg-tertiary p-3 rounded text-sm text-red-300 whitespace-pre-wrap overflow-auto">
            {task.error}
          </pre>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: Task["status"] }) {
  const config = {
    pending: { label: "等待中", color: "bg-gray-500/20 text-gray-400 border-gray-500/40" },
    running: { label: "运行中", color: "bg-accent/20 text-accent border-accent/40 animate-pulse-slow" },
    succeeded: { label: "成功", color: "bg-green-500/20 text-green-400 border-green-500/40" },
    failed: { label: "失败", color: "bg-red-500/20 text-red-400 border-red-500/40" },
  }[status];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-mono border ${config.color}`}>
      {config.label}
    </span>
  );
}

function PipelineStage({
  index,
  label,
  model,
  state,
}: {
  index: number;
  label: string;
  model: string | null;
  state: "pending" | "running" | "done";
}) {
  const stateConfig = {
    pending: { dot: "bg-bg-tertiary border-border", text: "text-text-muted" },
    running: { dot: "bg-accent border-accent animate-glow", text: "text-text-primary" },
    done: { dot: "bg-green-500 border-green-500", text: "text-text-primary" },
  }[state];

  return (
    <div className="flex items-center gap-4">
      <div
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-mono shrink-0 ${stateConfig.dot}`}
      >
        {state === "done" ? "✓" : index}
      </div>
      <div className="flex-1">
        <div className={`font-medium ${stateConfig.text}`}>{label}</div>
        {model && <div className="text-xs text-text-muted font-mono">{model}</div>}
      </div>
      {state === "running" && (
        <div className="text-xs text-accent font-mono">运行中...</div>
      )}
    </div>
  );
}

function DetailRow({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div>
      <div className="text-text-muted text-xs mb-1">{label}</div>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-glow break-all"
        >
          {value}
        </a>
      ) : (
        <div className="text-text-primary break-all">{value}</div>
      )}
    </div>
  );
}
