import { defineConfig } from "wxt";
import path from "path";

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
  }),

  // WXT 开发服务器运行配置
  dev: {
    server: {
      // 固定开发服务器运行的端口，防止与本地存在的其他项目自增冲突
      port: 3123,
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
    version: "1.1.2",

    // 声明扩展所需要的浏览器 API 权限
    permissions: [
      "storage",           // 读写本地/同步存储，用于保存用户配置
      "unlimitedStorage",  // 解除存储容量限制，通常配合存储大量数据使用（例如离线快照或大型数据结构等）
      "activeTab",         // 临时获取当前激活标签页的权限和执行脚本的能力
      "scripting",         // 允许动态向网页注入内容脚本或 CSS
      "downloads",         // 用于管理文件下载导出
      "contextMenus",      // 允许向浏览器右键菜单添加自定义选项
      "bookmarks",         // 提供读取、修改系统书签的权限
      "alarms",            // 提供定时任务运行能力，例如定期进行后台同步任务
      "favicon",           // 允许通过 _favicon API 获取网站安全、无报错的回退图标
    ],

    // 声明扩展在哪些域名下可以无缝跨域发起请求或读取状态
    // <all_urls> 表示由于需要分析或管理任意网页的书签数据，所以允许匹配所有网址
    host_permissions: ["<all_urls>"],

    // 定义扩展的全局/页面级的快捷键
    commands: {
      // 快捷保存当前页面书签命令
      "save-bookmark": {
        suggested_key: {
          default: "Ctrl+Shift+X", // Windows / Linux 默认建议按键
          mac: "Command+Shift+X",  // macOS 默认建议按键
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
          id: "hamhome@example.com",     // 必须提供的 Firefox 扩展唯一 ID 标识
          strict_min_version: "109.0",   // 指定能够运行该扩展的 Firefox 最低版本要求
          data_collection_permissions: { // 声明隐私权有关收集权限要求
            required: ["none"],
          },
        },
      },
    }),
  }),
});

