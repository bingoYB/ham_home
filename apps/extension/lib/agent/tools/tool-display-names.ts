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
  list_open_tabs: { zh: "查看打开的标签页", en: "List open tabs" },
  get_tab_lifecycle_status: { zh: "读取标签页概况", en: "Read tab overview" },
  search_tab_archive: { zh: "搜索标签页归档", en: "Search tab archive" },
  restore_archived_tabs: { zh: "恢复归档的标签页", en: "Restore archived tabs" },
  move_tabs_to_read_later: { zh: "稍后读并关闭标签页", en: "Read later & close tabs" },
  archive_tabs: { zh: "归档并关闭标签页", en: "Archive & close tabs" },
  list_read_later: { zh: "查看稍后读", en: "List Read later" },
  update_read_later_status: { zh: "更新稍后读状态", en: "Update Read later items" },
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
