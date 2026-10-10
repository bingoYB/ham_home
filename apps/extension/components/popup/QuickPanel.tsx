/**
 * QuickPanel - Popup 快捷面板
 *
 * 保存书签已改为在页面内完成，Popup 不再承载 AI 分析与保存表单，
 * 只提供快捷开关与入口：保存当前页、保存所有窗口、最近保存、常用设置等。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import { useTranslation } from "react-i18next";
import {
  AppWindow,
  Bookmark,
  BookOpen,
  ChevronRight,
  Keyboard,
  Loader2,
  Search,
  Settings,
  List,
  Zap,
} from "lucide-react";
import { Button, Switch, cn, toast } from "@hamhome/ui";
import { QuickActions } from "@/components/common/QuickActions";
import { PopupRecentSection } from "@/components/popup/PopupRecentSection";
import { PopupTabsCard } from "@/components/popup/PopupTabsCard";
import { PopupTriagePanel } from "@/components/popup/PopupTriagePanel";
import { useBookmarks } from "@/contexts";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useOpenTabActions } from "@/hooks/useOpenTabActions";
import { useOpenTabsSnapshot } from "@/hooks/useOpenTabsSnapshot";
import { useRecentAutoArchive } from "@/hooks/useRecentAutoArchive";
import { useTabLifecycleSettings } from "@/hooks/useTabLifecycleSettings";
import { isNonBookmarkableUrl } from "@/lib/privacy";
import {
  buildReadLaterItems,
  isEntryPending,
  sortReadLaterItems,
} from "@/lib/read-later/read-later.utils";
import { sortTabsByLeastRecentlyUsed } from "@/lib/tabs/tab-snapshot.utils";
import { getBackgroundService } from "@/lib/services";
import {
  getBrowserSpecificURL,
  getExtensionURL,
  safeSendMessageToTab,
} from "@/utils/browser-api";
import { APP_WEBSITE_URL } from "@/lib/constants/app-info";
import type { ReadLaterItem } from "@/lib/read-later/read-later.utils";

/** 最近保存展示条数 */
const RECENT_LIMIT = 5;

interface QuickPanelProps {
  /** 页内保存不可用时回退到 Popup 内保存表单 */
  onFallbackToSaveView: () => void;
}

export function QuickPanel({ onFallbackToSaveView }: QuickPanelProps) {
  const { t } = useTranslation(["common", "bookmark", "settings"]);
  const { bookmarks, allBookmarks, readLaterEntries, appSettings, updateAppSettings } =
    useBookmarks();
  const { shortcuts } = useShortcuts();
  const [saving, setSaving] = useState(false);
  const [readingLater, setReadingLater] = useState(false);
  const [unsupportedPage, setUnsupportedPage] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const { snapshot } = useOpenTabsSnapshot();
  const recentArchive = useRecentAutoArchive();
  const lifecycle = useTabLifecycleSettings();
  const tabActions = useOpenTabActions();

  const readLaterQueue = useMemo(
    () =>
      sortReadLaterItems(
        buildReadLaterItems(readLaterEntries, allBookmarks).filter((item) =>
          isEntryPending(item.entry),
        ),
        "newest",
      ),
    [allBookmarks, readLaterEntries],
  );
  const triageTabs = useMemo(
    () =>
      sortTabsByLeastRecentlyUsed(
        (snapshot?.tabs ?? []).filter((tab) => tab.protection.length === 0),
      ),
    [snapshot],
  );

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

  /** Read later & close: the background extracts, saves and closes the tab; the page shows an undo toast */
  const handleReadLater = useCallback(async () => {
    setReadingLater(true);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url || isNonBookmarkableUrl(tab.url)) {
        setUnsupportedPage(true);
        return;
      }
      const result = await getBackgroundService().readLaterTab(tab.id, { source: "manual" });
      if (!result.ok) {
        toast.error(t("bookmark:readLater.addFailed"));
        return;
      }
      if (!result.closed) {
        toast.success(
          result.alreadyQueued
            ? t("bookmark:tabFeedback.readLater.alreadyQueuedShort")
            : t("bookmark:tabFeedback.readLater.added"),
        );
        return;
      }
      window.close();
    } catch (error) {
      console.error("[QuickPanel] Failed to read later:", error);
      toast.error(t("bookmark:readLater.addFailed"));
    } finally {
      setReadingLater(false);
    }
  }, [t]);

  const openReadLaterItem = useCallback((item: ReadLaterItem) => {
    getBackgroundService()
      .readLaterOpen(item.entry.bookmarkId)
      .then(() => window.close())
      .catch((error: unknown) => {
        console.error("[QuickPanel] Failed to open read later item:", error);
      });
  }, []);

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
          {/* Top: brand and settings */}
          <header className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">HamHome</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openTab(getExtensionURL("app.html#settings"))}
              title={t("common:common.settings")}
              aria-label={t("common:common.settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </header>

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
                icon={
                  readingLater ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BookOpen className="h-3.5 w-3.5" />
                  )
                }
                iconClassName="bg-violet-500/15 text-violet-500"
                label={t("bookmark:popup.readLaterAndClose")}
                hint={formatShortcut("read-later-close")}
                disabled={readingLater || unsupportedPage}
                onClick={handleReadLater}
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
                label={t("bookmark:popup.openHamHome")}
                onClick={() => openTab(getExtensionURL("app.html"))}
              />
            </div>

            {/* 保存磁贴被禁用时说明原因，否则用户不知道为何点不动 */}
            {unsupportedPage && (
              <p className="text-xs text-muted-foreground">
                {t("bookmark:popup.cannotSavePage")}
              </p>
            )}
          </section>

          {/* Tabs: budget, tabs to tidy up, auto archived today */}
          <PopupTabsCard
            snapshot={snapshot}
            recent={recentArchive.summary}
            needsConsent={
              lifecycle.pendingConsents.autoArchive || lifecycle.pendingConsents.autoMakeRoom
            }
            onboardingDone={!!lifecycle.state.onboardingCompletedAt}
            triageOpen={triageOpen}
            onToggleTriage={() => setTriageOpen((open) => !open)}
            onViewArchive={() => openTab(getExtensionURL("app.html#tabs?view=archive"))}
            onRestoreRecent={() => {
              void recentArchive.restoreAll().then((count) =>
                toast.success(t("bookmark:tabCenter.archive.restored", { count })),
              );
            }}
            onConfirmPending={() => void tabActions.confirmPending()}
            onOpenTabCenter={() => openTab(getExtensionURL("app.html#tabs"))}
          />
          {triageOpen && (
            <PopupTriagePanel
              tabs={triageTabs}
              onReadLater={(tabId) => void tabActions.readLater([tabId])}
              onBookmark={(tabId) => void tabActions.bookmark([tabId])}
              onArchive={(tabId) => void tabActions.archive([tabId])}
              onViewAll={() => openTab(getExtensionURL("app.html#tabs"))}
            />
          )}

          {/* Recent saves / Read later */}
          <PopupRecentSection
            recentBookmarks={recentBookmarks}
            readLaterItems={readLaterQueue.slice(0, RECENT_LIMIT)}
            readLaterCount={readLaterQueue.length}
            onOpenBookmark={(bookmark) => openTab(bookmark.url)}
            onOpenReadLater={openReadLaterItem}
            onViewAll={(tab) =>
              openTab(getExtensionURL(tab === "readLater" ? "app.html#read-later" : "app.html"))
            }
          />

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
