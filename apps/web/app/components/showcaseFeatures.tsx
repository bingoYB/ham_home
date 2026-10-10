import {
  Bot,
  Boxes,
  Brain,
  HeartPulse,
  Highlighter,
  Layers3,
  LibraryBig,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ExtensionScreenshotId } from "./extensionScreenshots";

export interface ShowcaseFeature {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  screenshotIds: ExtensionScreenshotId[];
  bullets: string[];
}

interface ShowcaseCopy {
  title: string;
  description: string;
  bullets: string[];
}

interface ShowcaseDefinition {
  id: string;
  icon: ReactNode;
  screenshotIds: ExtensionScreenshotId[];
  en: ShowcaseCopy;
  zh: ShowcaseCopy;
}

const SHOWCASE_DEFINITIONS: ShowcaseDefinition[] = [
  {
    id: "ai-save",
    icon: <Brain className="h-5 w-5" />,
    screenshotIds: ["popupSave", "contentPanel"],
    en: {
      title: "Save pages in place, with AI, snapshots, and screenshots",
      description:
        "Saving happens right on the page: HamHome extracts the content, suggests a summary, category, and tags, and can keep a local HTML or Markdown snapshot plus a screenshot of the visible page.",
      bullets: [
        "Shortcut, context menu, and toolbar entry points, all handled in-page",
        "Snapshots for offline reading, page screenshots for visual reference, each toggled per save",
        "Private domains and automatic privacy detection skip AI analysis and screenshots",
      ],
    },
    zh: {
      title: "在当前页面完成保存：AI、快照与页面截图",
      description:
        "保存直接在当前页面完成：提取正文与元信息，推荐摘要、分类和标签，并可保存本地 HTML/Markdown 快照和当前可见区域的页面截图。",
      bullets: [
        "快捷键、右键菜单、工具栏入口都在页面内完成保存",
        "快照用于离线阅读，页面截图保留视觉现场，每次保存可单独开关",
        "隐私域名和自动隐私检测会跳过 AI 分析与页面截图",
      ],
    },
  },
  {
    id: "rich-clip",
    icon: <Highlighter className="h-5 w-5" />,
    screenshotIds: ["imageClipSave", "bookmarkLibrary"],
    en: {
      title: "Clip the passage or image that matters",
      description:
        "Right-click selected text or an image to save just that piece. Clips keep their source page, get AI tags, and show up in the library as text and image cards.",
      bullets: [
        "Text clips keep the exact quote and reopen the source at that passage",
        "Image clips keep the image URL, source page, size, format, and dominant colors",
        "Multimodal AI titles and tags image clips (can be turned off); private pages are never sent",
        "Filter the library by content type: bookmarks, images, or text",
      ],
    },
    zh: {
      title: "只收藏真正需要的那段文字或那张图",
      description:
        "选中文字或图片后右键即可单独保存。剪藏会保留来源页面，由 AI 补充标签，并以文字卡片、图片卡片的形式出现在收藏库中。",
      bullets: [
        "文字剪藏保留原文，打开时直接定位到来源页中的那一段",
        "图片剪藏记录图片地址、来源页、尺寸、格式与主色",
        "多模态 AI 为图片生成标题、摘要和标签（可在设置中关闭），隐私页面始终不会发送",
        "收藏库可按内容类型筛选：书签、图片或文本",
      ],
    },
  },
  {
    id: "bookmark-manage",
    icon: <LibraryBig className="h-5 w-5" />,
    screenshotIds: ["bookmarkBulkActions", "visualGallery"],
    en: {
      title: "Browse the library as cards, a list, or a visual gallery",
      description:
        "Switch between masonry cards, a compact list, and a gallery of saved page screenshots. Narrow things down by category, tags, content type, time range, or custom filters, then act on many bookmarks at once.",
      bullets: [
        "The visual gallery shows the screenshot captured when each page was saved",
        "Custom date ranges and saved custom filters, picked from a calendar",
        "Batch tag, move, delete, sync snapshots, or re-run AI analysis",
      ],
    },
    zh: {
      title: "卡片、列表、视觉画廊，三种方式浏览收藏",
      description:
        "在瀑布流卡片、紧凑列表和按页面截图展示的视觉画廊之间切换；按分类、标签、内容类型、时间范围或自定义筛选器定位，再批量整理。",
      bullets: [
        "视觉画廊展示每个页面保存时截取的截图",
        "支持自定义时间范围与自定义筛选器，日期直接在日历中选择",
        "批量打标签、迁移分类、删除、同步快照或重新 AI 整理",
      ],
    },
  },
  {
    id: "health-trash",
    icon: <HeartPulse className="h-5 w-5" />,
    screenshotIds: ["healthCenter", "trash"],
    en: {
      title: "Keep the library healthy, and undo deletions for 30 days",
      description:
        "The Bookmark Health Center checks links and finds duplicates. Deleted bookmarks wait in Trash for 30 days before they are purged for good.",
      bullets: [
        "Broken links are kept apart from sign-in walls, rate limits, server errors, and timeouts",
        "Adopt a redirect's new URL or clean up duplicate groups in one click",
        "Run checks manually, or schedule them weekly or monthly",
        "Restore anything from Trash within 30 days; permanent deletions sync to your other devices",
      ],
    },
    zh: {
      title: "定期体检收藏库，误删 30 天内可找回",
      description:
        "书签健康中心检查链接状态并识别重复书签；删除的书签先进入回收站，保留 30 天后才会彻底清除。",
      bullets: [
        "区分真正失效与需要登录、访问受限、服务异常和超时，不误判死链",
        "一键采用跳转后的新地址，或按组清理重复书签",
        "可随时手动体检，也可设置每周或每月自动检查",
        "回收站 30 天内随时恢复；彻底删除会同步到其他设备",
      ],
    },
  },
  {
    id: "agent-control",
    icon: <Bot className="h-5 w-5" />,
    screenshotIds: ["aiAgent"],
    en: {
      title: "Use natural language to search, summarize and manage",
      description:
        "The Agent can read HamHome's feature and settings context, explain how the extension works, open views, inspect status, run tools, and handle safe configuration changes.",
      bullets: [
        "Understands extension features, settings, status, and saved data",
        "Opens pages, runs supported tools, and shows process traces",
        "Reduces manual setup and navigation; credentials stay manual",
      ],
    },
    zh: {
      title: "用自然语言查找、总结和管理收藏",
      description:
        "Agent 可以读取 HamHome 的功能与配置上下文，解释插件怎么用，打开页面，检查状态，执行工具，并处理安全白名单内的配置调整。",
      bullets: [
        "理解插件功能、设置项、当前状态和已保存数据",
        "可打开页面、执行支持的工具，并展示过程步骤",
        "减少手动配置和页面跳转，凭据仍由你手动填写",
      ],
    },
  },
  {
    id: "workspace-manage",
    icon: <Boxes className="h-5 w-5" />,
    screenshotIds: ["workspaces"],
    en: {
      title: "Save open tabs as restorable workspaces",
      description:
        "Workspaces preserve tab order, pinned state, domains, favicons, and native Tab Group metadata, then restore all or selected pages later.",
      bullets: [
        "Independent workspace categories and tags",
        "Duplicate detection and bookmark conversion candidates",
        "Restore into current or new windows while skipping duplicate URLs",
      ],
    },
    zh: {
      title: "把打开的标签页保存成可恢复工作空间",
      description:
        "工作空间会保留页面顺序、固定状态、域名、favicon 和原生 Tab Group 信息，稍后可恢复全部或选中页面。",
      bullets: [
        "工作空间拥有独立分类和标签",
        "识别重复页面，并推荐适合转为书签的页面",
        "恢复到当前窗口或新窗口时可跳过重复 URL",
      ],
    },
  },
  {
    id: "tab-groups",
    icon: <Layers3 className="h-5 w-5" />,
    screenshotIds: ["tabGroups"],
    en: {
      title: "Automate native browser Tab Groups",
      description:
        "Create rules by domain, URL, title, case-insensitive title, or regex. Unmatched tabs can fall back to domain grouping or AI grouping.",
      bullets: [
        "Manual rules always run first",
        "Group title, color, collapsed state, order, and match conditions",
        "AI grouping uses metadata and custom instructions; native automation runs on Chrome/Edge",
      ],
    },
    zh: {
      title: "自动整理浏览器原生 Tab Group",
      description:
        "可按域名、URL、标题、忽略大小写标题或正则创建规则。未命中时还可选择按根域名或 AI 自动分组。",
      bullets: [
        "手动规则始终优先匹配",
        "可配置组名、颜色、折叠状态、排序和匹配条件",
        "AI 分组参考页面元数据与自定义要求；原生自动分组在 Chrome/Edge 运行",
      ],
    },
  },
  {
    id: "import-export",
    icon: <Upload className="h-5 w-5" />,
    screenshotIds: ["importExportSync"],
    en: {
      title: "Import, export, sync, and move data on your terms",
      description:
        "Import browser bookmarks, export JSON/HTML backups, write HamHome bookmarks back to the browser bar, and sync structured data through WebDAV.",
      bullets: [
        "JSON backup includes bookmarks, clips, workspaces, and Tab Group config",
        "WebDAV sync (Basic or Digest auth) matches bookmarks by URL, so repeated syncs don't create duplicates",
        "Deletions sync as lightweight tombstones; page screenshots stay on this device",
        "Obsidian flow can turn Markdown snapshots into notes",
      ],
    },
    zh: {
      title: "导入、导出、同步和迁移都由你控制",
      description:
        "可导入浏览器书签、导出 JSON/HTML 备份、反向写回浏览器书签栏，也可以通过 WebDAV 同步结构化数据。",
      bullets: [
        "JSON 备份包含书签、剪藏、工作空间和 Tab 分组配置",
        "WebDAV 支持 Basic / Digest 认证，按网址对齐书签，多设备同步不再产生重复",
        "删除以轻量墓碑同步到其他设备；页面截图只保存在本机",
        "Obsidian 流程可将 Markdown 快照发送为笔记",
      ],
    },
  },
];

export function getShowcaseFeatures(isEn: boolean): ShowcaseFeature[] {
  return SHOWCASE_DEFINITIONS.map(({ en, zh, ...feature }) => ({
    ...feature,
    ...(isEn ? en : zh),
  }));
}
