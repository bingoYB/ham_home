import type { Language } from "@/types";

const TOOL_DISPLAY_NAMES: Record<string, Record<Language, string>> = {
  update_safe_plugin_settings: { zh: "更新插件配置", en: "Update plugin settings" },
  get_safe_plugin_settings: { zh: "读取插件配置", en: "Read plugin settings" },
  search_bookmarks: { zh: "检索书签数据", en: "Search bookmarks" },
  get_hamhome_feature_detail: { zh: "查阅功能文档", en: "Read feature docs" },
  skill_view: { zh: "调用功能助手", en: "Call feature assistant" },
  open_extension_view: { zh: "打开功能页面", en: "Open extension page" },
  get_system_stats: { zh: "读取系统状态", en: "Read system stats" },
  delete_bookmark: { zh: "删除书签", en: "Delete bookmark" },
  delete_category: { zh: "删除分类", en: "Delete category" },
  delete_custom_filter: { zh: "删除自定义筛选器", en: "Delete custom filter" },
  delete_tab_group_rule: { zh: "删除标签页分组规则", en: "Delete tab group rule" },
};

/**
 * User-facing name of an agent tool, falling back to the raw tool name.
 *
 * Example:
 * ```ts
 * getToolDisplayName("delete_bookmark", "zh"); // "删除书签"
 * ```
 */
export function getToolDisplayName(toolName: string, language: Language): string {
  return TOOL_DISPLAY_NAMES[toolName]?.[language] || toolName;
}
