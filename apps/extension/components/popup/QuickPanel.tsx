/**
 * QuickPanel - Popup 快捷面板
 *
 * 保存书签已改为在页面内完成，Popup 不再承载 AI 分析与保存表单，
 * 只提供快捷开关与入口：保存当前页、保存所有窗口、最近保存、常用设置等。
 */
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { useTranslation } from "react-i18next";
import {
  AppWindow,
  Bookmark,
  BookmarkX,
  ChevronRight,
  Keyboard,
  Loader2,
  Search,
  Settings,
  List,
  Zap,
} from "lucide-react";
import { Switch, cn, toast } from "@hamhome/ui";
import { QuickActions } from "@/components/common/QuickActions";
import { useBookmarks } from "@/contexts";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { isNonBookmarkableUrl } from "@/lib/privacy";
import { getBackgroundService } from "@/lib/services";
import {
  getBrowserSpecificURL,
  getExtensionURL,
  safeSendMessageToTab,
} from "@/utils/browser-api";
import { APP_WEBSITE_URL } from "@/lib/constants/app-info";
import type { LocalBookmark } from "@/types";

/** 最近保存展示条数 */
const RECENT_LIMIT = 5;

interface QuickPanelProps {
  /** 页内保存不可用时回退到 Popup 内保存表单 */
  onFallbackToSaveView: () => void;
}

export function QuickPanel({ onFallbackToSaveView }: QuickPanelProps) {
  const { t } = useTranslation(["common", "bookmark", "settings"]);
  const { bookmarks, appSettings, updateAppSettings } = useBookmarks();
  const { shortcuts } = useShortcuts();
  const [saving, setSaving] = useState(false);
  const [unsupportedPage, setUnsupportedPage] = useState(false);

  // 检测当前页面是否可以保存
  useEffect(() => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        setUnsupportedPage(!tab?.url || isNonBookmarkableUrl(tab.url));
      })
      .catch(() => setUnsupportedPage(false));
  }, []);

  const formatShortcut = useCallback(
    (name: string) => {
      const info = shortcuts.find((item) => item.name === name);
      return info?.formattedShortcut || info?.shortcut || "";
    },
    [shortcuts],
  );

  /**
   * 触发页内保存流程；用户选择在弹窗内保存，
   * 或页面无法注入 content script 时改用 Popup 内保存表单
   */
  const handleSaveCurrentPage = useCallback(async () => {
    setSaving(true);
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id || !tab.url || isNonBookmarkableUrl(tab.url)) {
        setUnsupportedPage(true);
        return;
      }

      if (!appSettings.usePopupSavePanel) {
        const response = await safeSendMessageToTab<{ ok?: boolean }>(tab.id, {
          type: "START_SAVE_FLOW",
          source: "popup",
        });

        if (response?.ok) {
          // 页内浮窗已接管，关闭 Popup 让用户继续浏览
          window.close();
          return;
        }
      }

      onFallbackToSaveView();
    } finally {
      setSaving(false);
    }
  }, [appSettings.usePopupSavePanel, onFallbackToSaveView]);

  const handleSaveWorkspace = useCallback(async () => {
    try {
      await getBackgroundService().saveCurrentWindowWorkspace();
      toast.success(t("bookmark:workspace.saveSuccess"));
    } catch (error) {
      console.error("[QuickPanel] Failed to save workspace:", error);
      toast.error(t("bookmark:workspace.saveFailed"));
    }
  }, [t]);

  const openTab = useCallback((url: string) => {
    getBackgroundService()
      .openTab(url)
      .then(() => window.close())
      .catch((error: unknown) => {
        console.error("[QuickPanel] Failed to open tab:", error);
      });
  }, []);

  const recentBookmarks = [...bookmarks]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, RECENT_LIMIT);

  return (
    // max-h-[600px] 是浏览器给 Popup 的高度上限：撑满后由内容区自己滚动，
    // 否则整个文档滚动，底部状态栏会跟着滚走
    <div className="flex max-h-[600px] w-full flex-col bg-background text-foreground">
      {/* 内容滚动区。这里用原生滚动容器而不是 ScrollArea：外层是 max-height
          收口的弹性盒，ScrollArea 的 viewport 靠 height:100% 撑开，百分比会按
          收口前的内容高度算，结果 viewport 比容器还高，直接把底栏顶出可视区。
          scrollbar-slim 保证滚动条是细条而不是系统默认样式 */}
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 p-4">
          {/* 快捷操作 */}
          <section className="space-y-2">
            <SectionTitle>{t("bookmark:popup.quickActions")}</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <ActionTile
                icon={
                  saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Bookmark className="h-3.5 w-3.5" />
                  )
                }
                iconClassName="bg-emerald-500/15 text-emerald-500"
                label={t("bookmark:popup.saveCurrentPage")}
                hint={formatShortcut("save-bookmark")}
                disabled={saving || unsupportedPage}
                onClick={handleSaveCurrentPage}
              />
              <ActionTile
                icon={<AppWindow className="h-3.5 w-3.5" />}
                iconClassName="bg-amber-500/15 text-amber-500"
                label={t("bookmark:workspace.saveCurrentWindow")}
                hint={formatShortcut("save-workspace")}
                onClick={handleSaveWorkspace}
              />
              <ActionTile
                icon={<List className="h-3.5 w-3.5" />}
                iconClassName="bg-sky-500/15 text-sky-500"
                label={t("common:common.manageBookmarks")}
                onClick={() => openTab(getExtensionURL("app.html"))}
              />
              <ActionTile
                icon={<Settings className="h-3.5 w-3.5" />}
                iconClassName="bg-muted text-muted-foreground"
                label={t("common:common.settings")}
                onClick={() => openTab(getExtensionURL("app.html#settings"))}
              />
            </div>

            {/* 保存磁贴被禁用时说明原因，否则用户不知道为何点不动 */}
            {unsupportedPage && (
              <p className="text-xs text-muted-foreground">
                {t("bookmark:popup.cannotSavePage")}
              </p>
            )}
          </section>

          {/* 最近保存 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionTitle>{t("bookmark:popup.recentSaves")}</SectionTitle>
              <button
                type="button"
                className="flex items-center text-xs text-primary transition-opacity hover:opacity-80"
                onClick={() => openTab(getExtensionURL("app.html"))}
              >
                {t("common:common.viewAll")}
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {recentBookmarks.length > 0 ? (
              <ul className="space-y-0.5 rounded-xl border bg-card p-1">
                {recentBookmarks.map((bookmark) => (
                  <RecentBookmarkItem
                    key={bookmark.id}
                    bookmark={bookmark}
                    onOpen={() => openTab(bookmark.url)}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-0.5 rounded-xl border border-dashed bg-card px-3 py-4 text-center">
                <BookmarkX className="mb-1 h-5 w-5 text-muted-foreground/40" />
                <p className="text-[13px] text-muted-foreground">
                  {t("bookmark:popup.noRecentSaves")}
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  {t("bookmark:popup.noRecentSavesHint")}
                </p>
              </div>
            )}
          </section>

          {/* 常用设置 */}
          <section className="space-y-2">
            <SectionTitle>{t("bookmark:popup.quickSettings")}</SectionTitle>
            <div className="divide-y rounded-xl border bg-card">
              <SettingRow
                icon={<Zap className="h-3.5 w-3.5 text-primary" />}
                label={t("settings:settings.general.autoSaveSnapshot")}
                description={t("bookmark:popup.autoSaveSnapshotDesc")}
                checked={appSettings.autoSaveSnapshot}
                onChange={(checked) =>
                  updateAppSettings({ autoSaveSnapshot: checked })
                }
              />
              <SettingRow
                icon={<Search className="h-3.5 w-3.5 text-primary" />}
                label={t("settings:settings.general.enableOmniboxSearch")}
                description={t("bookmark:popup.omniboxSearchDesc")}
                checked={appSettings.enableOmniboxSearch}
                onChange={(checked) =>
                  updateAppSettings({ enableOmniboxSearch: checked })
                }
              />
              <LinkRow
                icon={<Keyboard className="h-3.5 w-3.5 text-muted-foreground" />}
                label={t("common:common.viewShortcuts")}
                description={t("bookmark:popup.viewShortcutsDesc")}
                onClick={() => openTab(getBrowserSpecificURL("shortcuts"))}
              />
            </div>
          </section>
        </div>
      </div>

      {/* 底部固定状态栏 */}
      <footer className="flex shrink-0 items-center justify-between border-t bg-muted/5 px-4 py-2 text-[12px] text-muted-foreground/60">
        <a
          href={APP_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-primary"
        >
          v{browser.runtime.getManifest().version}
        </a>
        <QuickActions size="sm" showTooltip />
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>;
}

interface ActionTileProps {
  icon: React.ReactNode;
  /** 图标底色，用于区分不同入口 */
  iconClassName: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}

function ActionTile({
  icon,
  iconClassName,
  label,
  hint,
  disabled,
  onClick,
}: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex items-center gap-2 rounded-xl border bg-card px-2 py-2 text-left",
        "transition-all duration-150 hover:border-primary/40 hover:bg-muted hover:shadow-sm",
        "active:scale-[0.97] active:shadow-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        // 禁用时屏蔽指针事件，连带停掉 hover / active / group-hover 动效
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          "transition-transform duration-150 group-hover:scale-110",
          iconClassName,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        {/* 英文标签较长，允许折行而不是截断 */}
        <span className="line-clamp-2 text-[13px] leading-snug text-foreground">
          {label}
        </span>
        {hint && <Kbd>{hint}</Kbd>}
      </span>
      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex rounded-md bg-muted px-1.5 py-0.5 font-sans text-[10px] font-normal whitespace-nowrap text-muted-foreground">
      {children}
    </kbd>
  );
}

interface RowLayoutProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}

function RowLayout({ icon, label, description, children }: RowLayoutProps) {
  return (
    <>
      <span className="flex w-5 shrink-0 justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-tight text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
          {description}
        </span>
      </span>
      {children}
    </>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SettingRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: SettingRowProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted">
      <RowLayout icon={icon} label={label} description={description}>
        <Switch checked={checked} onCheckedChange={onChange} />
      </RowLayout>
    </label>
  );
}

interface LinkRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

function LinkRow({ icon, label, description, onClick }: LinkRowProps) {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted"
      onClick={onClick}
    >
      <RowLayout icon={icon} label={label} description={description}>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
      </RowLayout>
    </button>
  );
}

interface RecentBookmarkItemProps {
  bookmark: LocalBookmark;
  onOpen: () => void;
}

function RecentBookmarkItem({ bookmark, onOpen }: RecentBookmarkItemProps) {
  const relativeTime = useRelativeTime(bookmark.createdAt);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
      >
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="h-4 w-4 shrink-0 rounded"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm">
          {bookmark.title}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {relativeTime}
        </span>
      </button>
    </li>
  );
}
