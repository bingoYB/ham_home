import { defineConfig } from "wxt";
import path from "path";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: ({ mode }) => ({
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
        "@ui": path.resolve(__dirname, "../../packages/ui/src"),
      },
    },
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
  }),
  dev: {
    server: {
      port: 3123,
    },
  },
  manifest: ({ browser }) => ({
    name: "HamHome - 智能书签助手",
    description: "🐹 让收藏不再积灰，AI 驱动的智能书签管理工具",
    version: "1.0.0",
    permissions: [
      "storage",
      "activeTab",
      "scripting",
      "downloads",
      "contextMenus",
    ],
    host_permissions: ["<all_urls>"],
    commands: {
      "save-bookmark": {
        suggested_key: {
          default: "Ctrl+Shift+S",
          mac: "Command+Shift+S",
        },
        description: "快速收藏当前页面",
      },
      "toggle-bookmark-panel": {
        suggested_key: {
          default: "Ctrl+Shift+L",
          mac: "Command+Shift+L",
        },
        description: "切换书签面板",
      },
    },
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    // Firefox 特定配置
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "hamhome@example.com",
          strict_min_version: "109.0",
        },
      },
    }),
  }),
});
