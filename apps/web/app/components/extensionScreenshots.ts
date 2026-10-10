export type ExtensionScreenshotId =
  | "popupSave"
  | "popupQuickPanel"
  | "bookmarkLibrary"
  | "bookmarkBulkActions"
  | "contentPanel"
  | "aiAgent"
  | "workspaces"
  | "tabGroups"
  | "importExportSync"
  | "visualGallery"
  | "imageClipSave"
  | "healthCenter"
  | "trash";

export interface ExtensionScreenshotCopy {
  title: string;
  alt: string;
}

export interface ExtensionScreenshotMeta {
  file: string;
  zh: ExtensionScreenshotCopy;
  en: ExtensionScreenshotCopy;
  aspect: "popup" | "desktop";
}

export const EXTENSION_SCREENSHOTS: Record<ExtensionScreenshotId, ExtensionScreenshotMeta> = {
  popupSave: {
    file: "01-popup-save.png",
    aspect: "popup",
    zh: {
      title: "页内快速保存",
      alt: "HamHome 页内快速保存浮窗截图，含页面截图与快照选项",
    },
    en: {
      title: "In-page Quick Save",
      alt: "HamHome in-page quick save panel with page screenshot and snapshot options",
    },
  },
  popupQuickPanel: {
    file: "09-popup-quick-panel.png",
    aspect: "popup",
    zh: {
      title: "快捷面板",
      alt: "HamHome 扩展快捷面板截图",
    },
    en: {
      title: "Quick Panel",
      alt: "HamHome extension quick panel screenshot",
    },
  },
  bookmarkLibrary: {
    file: "02-bookmark-library.png",
    aspect: "desktop",
    zh: {
      title: "书签库",
      alt: "HamHome 书签库截图",
    },
    en: {
      title: "Bookmark Library",
      alt: "HamHome bookmark library screenshot",
    },
  },
  bookmarkBulkActions: {
    file: "03-bookmark-bulk-actions.png",
    aspect: "desktop",
    zh: {
      title: "批量整理",
      alt: "HamHome 批量整理书签截图",
    },
    en: {
      title: "Bulk Actions",
      alt: "HamHome bulk bookmark actions screenshot",
    },
  },
  contentPanel: {
    file: "04-content-panel.png",
    aspect: "desktop",
    zh: {
      title: "网页内面板",
      alt: "HamHome 网页内书签面板截图",
    },
    en: {
      title: "In-page Panel",
      alt: "HamHome in-page bookmark panel screenshot",
    },
  },
  aiAgent: {
    file: "05-ai-agent.png",
    aspect: "desktop",
    zh: {
      title: "AI Agent",
      alt: "HamHome AI Agent 插件咨询与管理截图",
    },
    en: {
      title: "AI Agent",
      alt: "HamHome AI Agent extension assistant screenshot",
    },
  },
  workspaces: {
    file: "06-workspaces.png",
    aspect: "desktop",
    zh: {
      title: "工作空间",
      alt: "HamHome 工作空间截图",
    },
    en: {
      title: "Workspaces",
      alt: "HamHome workspaces screenshot",
    },
  },
  tabGroups: {
    file: "07-tab-groups.png",
    aspect: "desktop",
    zh: {
      title: "Tab 分组规则",
      alt: "HamHome Tab 分组规则截图",
    },
    en: {
      title: "Tab Group Rules",
      alt: "HamHome Tab Group rules screenshot",
    },
  },
  importExportSync: {
    file: "08-import-export-sync.png",
    aspect: "desktop",
    zh: {
      title: "导入导出与同步",
      alt: "HamHome 导入导出与同步截图",
    },
    en: {
      title: "Import, Export, and Sync",
      alt: "HamHome import, export, and sync screenshot",
    },
  },
  visualGallery: {
    file: "10-visual-gallery.png",
    aspect: "desktop",
    zh: {
      title: "视觉画廊",
      alt: "HamHome 视觉画廊截图，按页面截图浏览收藏",
    },
    en: {
      title: "Visual Gallery",
      alt: "HamHome visual gallery screenshot showing saved page screenshots",
    },
  },
  imageClipSave: {
    file: "11-image-clip-save.png",
    aspect: "popup",
    zh: {
      title: "图片剪藏",
      alt: "HamHome 右键保存图片剪藏的页内浮窗截图",
    },
    en: {
      title: "Image Clip",
      alt: "HamHome in-page panel saving an image clip from the context menu",
    },
  },
  healthCenter: {
    file: "12-health-center.png",
    aspect: "desktop",
    zh: {
      title: "书签健康中心",
      alt: "HamHome 书签健康中心截图，展示失效、跳转与重复书签",
    },
    en: {
      title: "Bookmark Health Center",
      alt: "HamHome Bookmark Health Center showing broken, redirected, and duplicate bookmarks",
    },
  },
  trash: {
    file: "13-trash.png",
    aspect: "desktop",
    zh: {
      title: "回收站",
      alt: "HamHome 回收站截图，展示可恢复书签与剩余保留天数",
    },
    en: {
      title: "Trash",
      alt: "HamHome Trash screenshot with restorable bookmarks and remaining retention days",
    },
  },
};

/** Site-relative screenshot path without the deployment base path. */
export function getExtensionScreenshotPath(
  id: ExtensionScreenshotId,
  options: { isEn: boolean; isDark: boolean },
): string {
  const locale = options.isEn ? "en" : "zh";
  const theme = options.isDark ? "dark" : "light";

  return `/screenshots/extension/${locale}-${theme}/${EXTENSION_SCREENSHOTS[id].file}`;
}

export function getExtensionScreenshotSrc(
  id: ExtensionScreenshotId,
  options: { isEn: boolean; isDark: boolean },
): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return `${basePath}${getExtensionScreenshotPath(id, options)}`;
}
