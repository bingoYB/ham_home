import { defineConfig } from "wxt";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// WXT 配置入口，用于管理浏览器扩展的构建、开发服务器以及 Manifest 清单配置
export default defineConfig({
  // 引入 WXT 官方的 React 模块，以支持使用 React 开发扩展 UI（如 Options、Popup 等）
  modules: ["@wxt-dev/module-react"],

  // Vite 构建配置，覆盖或补充 WXT 内置的 Vite 默认设定
  vite: ({ mode }) => ({
    resolve: {
      alias: {
        // 项目内部绝对路径别名配置
        "@": path.resolve(__dirname, "./"), // 指向本项目根目录 apps/extension/
        "@ui": path.resolve(__dirname, "../../packages/ui/src"), // 指向 MonoRepo 中共享的 UI 组件库

        // 用于修复部分依赖路径解析异常的问题
        // Vite/WXT 无法正确解析 @langchain/anthropic 内部使用的无扩展名子路径
        "@anthropic-ai/sdk/lib/transform-json-schema": path.resolve(
          __dirname,
          "../../node_modules/.pnpm/node_modules/@anthropic-ai/sdk/lib/transform-json-schema.js",
        ),
      },
    },
    esbuild: {
      // 在生产环境构建时，自动移除所有的 console.log 和 debugger 语句，减小打包体积并保护隐私
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    plugins: [
      process.env.ANALYZE === "true" &&
        visualizer({
          open: true,
          filename: "stats.html",
          gzipSize: true,
          brotliSize: true,
        }),
    ],
  }),

  // WXT 开发服务器运行配置
  dev: {
    server: {
      // 固定开发服务器运行的端口，防止与本地存在的其他项目自增冲突
      port: 3124,
    },
  },

  // Extension Manifest (清单文件) 动态配置
  // 提供一个工厂函数，允许根据目标浏览器分类（Chrome、Firefox、Edge 等）返回定制化的 manifest
  manifest: ({ browser }) => ({
    // 使用 i18n 多语言消息占位符配置扩展名称
    name: "__MSG_extName__",
    // 使用 i18n 多语言消息占位符配置扩展描述
    description: "__MSG_extDescription__",
    // 设置扩展的默认语言区域为简体中文
    default_locale: "zh_CN",
    // 扩展的版本号
    version: "1.1.5",

    // 声明扩展所需要的浏览器 API 权限
    // 下面的注释同时对应 Chrome Web Store 提交时可填写的权限用途说明
    permissions: [
      "storage", // 保存用户书签数据、分类、标签、设置、AI 配置等本地/同步数据
      "unlimitedStorage", // 本地保存网页快照、页面内容和向量索引，避免数据量增大后触发默认存储配额限制
      "activeTab", // 仅在用户主动操作当前标签页时，读取当前页面信息并执行保存、快照、面板切换等操作
      "scripting", // 在当前活动页面按需执行脚本，用于提取页面 HTML/正文内容，保存书签快照或分析页面内容
      // "downloads",         // 当前代码未直接调用 browser.downloads API；若仅通过 <a download> 导出文件，可考虑移除此权限
      "contextMenus", // 在网页右键菜单中提供“收藏到 HamHome”入口，方便用户快速保存当前页面或链接
      "bookmarks", // 读取浏览器原生书签树，用于导入用户已有书签到 HamHome
      "alarms", // 创建后台定时任务，定期执行 WebDAV 同步，并在本地书签变更后延迟触发同步
      "favicon", // 使用 Chromium 的 _favicon 能力为书签获取站点图标，并在失败时安全回退,
    ],

    // 声明需要在页面上下文中可访问的资源
    // SingleFile hooks-frames.js 需要注入到 MAIN world 以 Hook 原生 API
    web_accessible_resources: [
      {
        resources: ["single-file-hooks-frames.js"],
        matches: ["<all_urls>"],
      },
    ],

    // 声明扩展在哪些域名下可运行内容脚本/访问页面
    // <all_urls> 的原因：
    // 1. 用户可能在任意网页上触发“保存到 HamHome”
    // 2. 需要在当前网页提取标题、正文、元信息、HTML 快照
    // 3. 书签侧边面板需要在任意网页中注入显示
    host_permissions: ["<all_urls>"],

    // 地址栏搜索集成
    omnibox: {
      keyword: "ham",
    },

    // 定义扩展的全局/页面级的快捷键
    commands: {
      // 快捷保存当前页面书签命令
      "save-bookmark": {
        suggested_key: {
          default: "Ctrl+Shift+X", // Windows / Linux 默认建议按键
          mac: "Command+Shift+X", // macOS 默认建议按键
        },
        description: "__MSG_commandSaveBookmark__", // 多语言快捷键描述
      },
      // 切换主控制面板（侧边栏或悬浮窗）显示/隐藏的命令
      "toggle-bookmark-panel": {
        suggested_key: {
          default: "Ctrl+Shift+L",
          mac: "Command+Shift+L",
        },
        description: "__MSG_commandTogglePanel__",
      },
    },

    // 扩展的不同分辨率图标配置，用于应用商店、工具栏等处展示
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },

    // Firefox 特定的清单配置扩展选项
    // 如果当前构建目标(browser)是 firefox，则将此对象展开合入 manifest 中
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "hamhome@example.com", // 必须提供的 Firefox 扩展唯一 ID 标识
          strict_min_version: "109.0", // 指定能够运行该扩展的 Firefox 最低版本要求
          data_collection_permissions: {
            // 声明隐私权有关收集权限要求
            required: ["none"],
          },
        },
      },
    }),
  }),
});
