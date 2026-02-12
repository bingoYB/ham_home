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
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "zh_CN",
    version: "1.1.0",
    permissions: [
      "storage",
      "activeTab",
      "scripting",
      "downloads",
      "contextMenus",
      "bookmarks",
    ],
    host_permissions: ["<all_urls>"],
    commands: {
      "save-bookmark": {
        suggested_key: {
          default: "Ctrl+Shift+X",
          mac: "Command+Shift+X",
        },
        description: "__MSG_commandSaveBookmark__",
      },
      "toggle-bookmark-panel": {
        suggested_key: {
          default: "Ctrl+Shift+L",
          mac: "Command+Shift+L",
        },
        description: "__MSG_commandTogglePanel__",
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
          data_collection_permissions: {
            required: ["none"],
          },
        },
      },
    }),
  }),
});
