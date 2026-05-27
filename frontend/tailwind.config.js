/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 黑暗科技风配色板
        bg: {
          primary: "#0a0a0f",      // 主背景 - 几乎纯黑
          secondary: "#13131a",    // 次背景 - 卡片
          tertiary: "#1c1c26",     // 三级背景 - 输入框
        },
        accent: {
          DEFAULT: "#a855f7",      // 紫色主色
          glow: "#c084fc",         // 紫色高亮
          dim: "#7e22ce",          // 紫色暗调
        },
        text: {
          primary: "#e4e4e7",      // 主文字
          secondary: "#a1a1aa",    // 次要文字
          muted: "#71717a",        // 弱化文字
        },
        border: {
          DEFAULT: "#27272a",
          hover: "#3f3f46",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "Menlo", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(168, 85, 247, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(168, 85, 247, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
