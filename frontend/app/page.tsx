"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/lib/api";

// 示例意图（点击快速填充）
const INTENT_PRESETS = [
  "温馨治愈，柔和电影感",
  "动感节奏，活泼明快",
  "神秘氛围，缓慢推近",
  "复古电影，胶片质感",
];

// 案例视频画廊（真实样例，存储在 OSS）
const GALLERY = [
  {
    title: "灵动小猫",
    desc: "车内欢快律动 · 5s",
    video: "https://libaivedio.oss-cn-beijing.aliyuncs.com/gallery/01-warm-cat.mp4",
  },
  {
    title: "城市夜景",
    desc: "江水缓流，明月升起 · 5s",
    video: "https://libaivedio.oss-cn-beijing.aliyuncs.com/gallery/02-city-night.mp4",
  },
  {
    title: "海边日出",
    desc: "海浪与朝阳同升 · 5s",
    video: "https://libaivedio.oss-cn-beijing.aliyuncs.com/gallery/03-mountain-sunrise.mp4",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userIntent, setUserIntent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const onSubmit = async () => {
    if (!imageFile || !userIntent.trim()) {
      setError("请上传图片并填写视频意图");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { task_id } = await createTask(imageFile, userIntent);
      router.push(`/task/${task_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {/* 顶部标题区 */}
      <header className="text-center mb-12 mt-8">
        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono">
          3-STAGE AI PIPELINE · POWERED BY KLING 3.0
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-text-primary via-accent-glow to-text-primary bg-clip-text text-transparent">
          AI 视频生成
        </h1>
        <p className="text-text-secondary text-lg">
          上传一张图，AI 自动理解、自动写 Prompt、自动生成 5 秒视频
        </p>
      </header>

      {/* 主表单区 */}
      <div className="card glow-border mb-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* 左：上传图片 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              <span className="text-accent">①</span> 上传图片
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative aspect-video bg-bg-tertiary border-2 border-dashed border-border hover:border-accent rounded-lg cursor-pointer transition-colors overflow-hidden flex items-center justify-center"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="预览" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center text-text-muted">
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-sm">点击或拖拽上传图片</div>
                  <div className="text-xs mt-1">JPG / PNG · 小于 10MB</div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          </div>

          {/* 右：意图输入 */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-text-secondary mb-3">
              <span className="text-accent">②</span> 描述你想要的视频风格
            </label>
            <textarea
              value={userIntent}
              onChange={(e) => setUserIntent(e.target.value)}
              placeholder="例如：温馨治愈，缓慢推近，电影感..."
              className="input flex-1 min-h-[120px] resize-none"
              maxLength={200}
            />
            <div className="text-xs text-text-muted mt-2 mb-3">
              {userIntent.length} / 200 · AI 会基于这句话自动写专业 Prompt
            </div>

            {/* 快捷意图 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {INTENT_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setUserIntent(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-bg-tertiary border border-border hover:border-accent hover:text-accent transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={onSubmit}
              disabled={submitting || !imageFile || !userIntent.trim()}
              className="btn-primary w-full"
            >
              {submitting ? "正在创建任务..." : "🚀 开始生成视频"}
            </button>

            {error && (
              <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 技术栈展示 */}
      <div className="mb-12">
        <h2 className="text-sm text-text-muted font-mono mb-4 text-center">TECHNOLOGY STACK</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { name: "qwen-vl-max", role: "图像理解" },
            { name: "qwen-max", role: "Prompt 工程" },
            { name: "kling 3.0", role: "视频生成" },
            { name: "FastAPI", role: "异步任务编排" },
          ].map((t) => (
            <div
              key={t.name}
              className="px-4 py-2 rounded-lg bg-bg-secondary border border-border"
            >
              <div className="font-mono text-sm text-accent">{t.name}</div>
              <div className="text-xs text-text-muted">{t.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 案例视频画廊 */}
      <div>
        <h2 className="text-2xl font-bold mb-4">案例展示</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {GALLERY.map((g) => (
            <div
              key={g.title}
              className="card hover:border-accent/50 transition-colors group"
            >
              <div className="aspect-video bg-black rounded-lg mb-3 overflow-hidden">
                <video
                  src={g.video}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
              </div>
              <div className="font-medium">{g.title}</div>
              <div className="text-xs text-text-muted font-mono mt-1">{g.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-border text-center text-text-muted text-sm">
        AI Video Generator · Built for engineering interview
      </footer>
    </main>
  );
}
