import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  HeartPulse,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Progress,
  ScrollArea,
  cn,
  confirm,
  toast,
} from "@hamhome/ui";
import { BatchSelectionToolbar } from "@/components/common/BatchSelectionToolbar";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useBookmarkSelection } from "@/hooks/useBookmarkSelection";
import {
  useDuplicateBookmarks,
  type DuplicateRole,
} from "@/hooks/useDuplicateBookmarks";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import {
  bookmarkClipStorage,
  type BookmarkClipSubjectIndex,
} from "@/lib/storage/bookmark-clip-storage";
import { bookmarkHealthStorage } from "@/lib/storage/bookmark-health-storage";
import { filterBookmarkHealthTargets } from "@/lib/health/bookmark-health-utils";
import { getBackgroundService } from "@/lib/services";
import type {
  BookmarkHealthRecord,
  BookmarkHealthStatus,
  LocalBookmark,
} from "@/types";

type HealthFilter = "all" | "attention" | "broken" | "duplicates" | "unchecked";

const ATTENTION_STATUSES = new Set<BookmarkHealthStatus>([
  "redirected",
  "broken",
  "auth_required",
  "rate_limited",
  "server_error",
  "network_error",
  "unsupported",
]);

function getVisibleIssues(record?: BookmarkHealthRecord): string[] {
  if (!record) return [];
  const ignored = new Set(record.ignoredIssueCodes ?? []);
  return record.issueCodes.filter((issue) => !ignored.has(issue));
}

export function BookmarkHealthPage() {
  const { t } = useTranslation(["bookmark", "common"]);
  const { bookmarks, deleteBookmark, refreshBookmarks } = useBookmarks();
  const [records, setRecords] = useState<BookmarkHealthRecord[]>([]);
  const [subjectIndex, setSubjectIndex] =
    useState<BookmarkClipSubjectIndex>({});
  const [filter, setFilter] = useState<HealthFilter>("all");
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const scanStartedAtRef = useRef(0);

  useEffect(() => {
    void bookmarkHealthStorage.getAll().then(setRecords);
    return bookmarkHealthStorage.watch(setRecords);
  }, []);

  useEffect(() => {
    void bookmarkClipStorage.getSubjectIndex().then(setSubjectIndex);
    return bookmarkClipStorage.watchSubjectIndex(setSubjectIndex);
  }, []);

  const healthBookmarks = useMemo(
    () => filterBookmarkHealthTargets(bookmarks, subjectIndex),
    [bookmarks, subjectIndex],
  );

  // 重复项实时计算，不依赖体检结果，未体检也能直接清理
  const { roles: duplicateRoles, redundantIds } =
    useDuplicateBookmarks(healthBookmarks);
  const { selectedIds, toggleSelect, deselectAll, toggleSelectAll } =
    useBookmarkSelection();

  const recordMap = useMemo(
    () => new Map(records.map((record) => [record.bookmarkId, record])),
    [records],
  );

  const getCurrentRecord = useCallback(
    (bookmark: LocalBookmark) => {
      const record = recordMap.get(bookmark.id);
      return record?.sourceUrl === bookmark.url ? record : undefined;
    },
    [recordMap],
  );

  const stats = useMemo(() => {
    let healthy = 0;
    let attention = 0;
    let unchecked = 0;
    for (const bookmark of healthBookmarks) {
      const record = getCurrentRecord(bookmark);
      if (!record) unchecked += 1;
      else if (record.status === "healthy" && getVisibleIssues(record).length === 0) healthy += 1;
      else attention += 1;
    }
    return { total: healthBookmarks.length, healthy, attention, unchecked };
  }, [getCurrentRecord, healthBookmarks]);

  const scannedDuringRun = useMemo(() => {
    if (!scanning) return 0;
    return healthBookmarks.filter(
      (bookmark) =>
        (getCurrentRecord(bookmark)?.checkedAt ?? 0) >= scanStartedAtRef.current,
    ).length;
  }, [getCurrentRecord, healthBookmarks, records, scanning]);

  const filteredBookmarks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return healthBookmarks.filter((bookmark) => {
      if (
        keyword &&
        !`${bookmark.title} ${bookmark.url}`.toLowerCase().includes(keyword)
      ) {
        return false;
      }
      const record = getCurrentRecord(bookmark);
      const visibleIssues = getVisibleIssues(record);
      if (filter === "unchecked") return !record;
      if (filter === "broken") return record?.status === "broken";
      if (filter === "duplicates") return duplicateRoles.has(bookmark.id);
      if (filter === "attention") {
        return !!record &&
          (ATTENTION_STATUSES.has(record.status) || visibleIssues.length > 0);
      }
      return true;
    });
  }, [duplicateRoles, filter, getCurrentRecord, healthBookmarks, query]);

  // 勾选只对当前可见列表有意义，换筛选条件后重新开始
  useEffect(() => {
    deselectAll();
  }, [deselectAll, filter]);

  const runScan = useCallback(async (bookmarkIds?: string[]) => {
    scanStartedAtRef.current = Date.now();
    setScanning(true);
    try {
      await getBackgroundService().scanBookmarkHealth(bookmarkIds);
      toast.success(t("bookmark:healthCenter.scanComplete"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("bookmark:healthCenter.scanFailed"),
      );
    } finally {
      setScanning(false);
    }
  }, [t]);

  const acceptRedirect = useCallback(
    async (bookmark: LocalBookmark, record: BookmarkHealthRecord) => {
      if (!record.finalUrl) return;
      await bookmarkStorage.updateBookmark(bookmark.id, { url: record.finalUrl });
      await bookmarkHealthStorage.delete(bookmark.id);
      await refreshBookmarks();
      toast.success(t("bookmark:healthCenter.redirectApplied"));
    },
    [refreshBookmarks, t],
  );

  const removeBookmark = useCallback(
    async (bookmark: LocalBookmark) => {
      const accepted = await confirm({
        title: t("bookmark:bookmark.deleteTitle"),
        description: t("bookmark:bookmark.deleteConfirm", { title: bookmark.title }),
        confirmText: t("common:common.delete"),
        cancelText: t("common:common.cancel"),
        variant: "destructive",
      });
      if (accepted) await deleteBookmark(bookmark.id);
    },
    [deleteBookmark, t],
  );

  /** 批量软删除：标记 isDeleted 并刷新 updatedAt，删除才能同步到其他设备 */
  const removeBookmarks = useCallback(
    async (ids: string[]) => {
      try {
        await bookmarkStorage.batchDeleteBookmarks(ids);
        await bookmarkHealthStorage.deleteMany(ids);
        deselectAll();
        await refreshBookmarks();
        toast.success(
          t("bookmark:healthCenter.batch.deleteSuccess", { count: ids.length }),
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("bookmark:healthCenter.batch.deleteFailed"),
        );
      }
    },
    [deselectAll, refreshBookmarks, t],
  );

  const removeSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const accepted = await confirm({
      title: t("bookmark:bookmark.batch.deleteTitle"),
      description: t("bookmark:bookmark.batch.deleteConfirm", {
        count: selectedIds.size,
      }),
      confirmText: t("common:common.delete"),
      cancelText: t("common:common.cancel"),
      variant: "destructive",
    });
    if (accepted) await removeBookmarks(Array.from(selectedIds));
  }, [removeBookmarks, selectedIds, t]);

  const cleanDuplicates = useCallback(async () => {
    if (redundantIds.length === 0) {
      toast.info(t("bookmark:healthCenter.batch.noDuplicates"));
      return;
    }
    const accepted = await confirm({
      title: t("bookmark:healthCenter.batch.cleanDuplicatesTitle"),
      description: t("bookmark:healthCenter.batch.cleanDuplicatesConfirm", {
        count: redundantIds.length,
      }),
      confirmText: t("common:common.delete"),
      cancelText: t("common:common.cancel"),
      variant: "destructive",
    });
    if (accepted) await removeBookmarks(redundantIds);
  }, [redundantIds, removeBookmarks, t]);

  return (
    <ScrollArea
      type="auto"
      className="h-full bg-background"
      viewportClassName="[&>div]:block!"
    >
      {/* pb-24：给右下角悬浮的 Agent 入口留末尾空白，留白跟着内容滚动 */}
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-6 pb-24">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <HeartPulse className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("bookmark:healthCenter.title")}
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("bookmark:healthCenter.description")}
            </p>
          </div>
          <Button
            onClick={() => void runScan()}
            disabled={scanning || healthBookmarks.length === 0}
          >
            {scanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {scanning
              ? t("bookmark:healthCenter.scanning")
              : t("bookmark:healthCenter.scanAll")}
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("bookmark:healthCenter.stats.total")} value={stats.total} icon={HeartPulse} />
          <StatCard label={t("bookmark:healthCenter.stats.healthy")} value={stats.healthy} icon={CheckCircle2} tone="good" />
          <StatCard label={t("bookmark:healthCenter.stats.attention")} value={stats.attention} icon={ShieldAlert} tone="warning" />
          <StatCard label={t("bookmark:healthCenter.stats.unchecked")} value={stats.unchecked} icon={AlertTriangle} />
        </div>

        {scanning && (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex justify-between text-sm">
                <span>{t("bookmark:healthCenter.progress")}</span>
                <span className="text-muted-foreground">
                  {scannedDuringRun}/{healthBookmarks.length}
                </span>
              </div>
              <Progress
                value={
                  (scannedDuringRun / Math.max(1, healthBookmarks.length)) * 100
                }
              />
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "attention", "broken", "duplicates", "unchecked"] as const).map(
              (value) => (
                <Button
                  key={value}
                  variant={filter === value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFilter(value)}
                >
                  {t(`bookmark:healthCenter.filters.${value}`)}
                </Button>
              ),
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("bookmark:healthCenter.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        <BatchSelectionToolbar
          visibleIds={filteredBookmarks.map((bookmark) => bookmark.id)}
          selectedCount={selectedIds.size}
          onToggleSelectAll={toggleSelectAll}
        >
          {redundantIds.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => void cleanDuplicates()}>
              <Copy className="mr-2 h-4 w-4" />
              {t("bookmark:healthCenter.batch.cleanDuplicates", {
                count: redundantIds.length,
              })}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => void removeSelected()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("bookmark:bookmark.batch.delete")}
          </Button>
        </BatchSelectionToolbar>

        <div className="space-y-2">
          {filteredBookmarks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              {t("bookmark:healthCenter.empty")}
            </div>
          ) : (
            filteredBookmarks.map((bookmark) => {
              const record = getCurrentRecord(bookmark);
              return (
                <HealthRow
                  key={bookmark.id}
                  bookmark={bookmark}
                  record={record}
                  scanning={scanning}
                  selected={selectedIds.has(bookmark.id)}
                  duplicateRole={duplicateRoles.get(bookmark.id)}
                  onToggleSelect={() => toggleSelect(bookmark.id)}
                  onScan={() => void runScan([bookmark.id])}
                  onAcceptRedirect={() => record && void acceptRedirect(bookmark, record)}
                  onDelete={() => void removeBookmark(bookmark)}
                />
              );
            })
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "good" | "warning";
}

function StatCard({ label, value, icon: Icon, tone }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground",
            tone === "good" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            tone === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface HealthRowProps {
  bookmark: LocalBookmark;
  record?: BookmarkHealthRecord;
  scanning: boolean;
  selected: boolean;
  duplicateRole?: DuplicateRole;
  onToggleSelect: () => void;
  onScan: () => void;
  onAcceptRedirect: () => void;
  onDelete: () => void;
}

function HealthRow({
  bookmark,
  record,
  scanning,
  selected,
  duplicateRole,
  onToggleSelect,
  onScan,
  onAcceptRedirect,
  onDelete,
}: HealthRowProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const issues = getVisibleIssues(record);
  const status = record?.status ?? "unchecked";
  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4 [content-visibility:auto] [contain-intrinsic-size:88px]",
        selected && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <Checkbox
          className="mt-1 shrink-0"
          checked={selected}
          onCheckedChange={onToggleSelect}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-medium">{bookmark.title}</h2>
            <HealthBadge status={status} />
            {duplicateRole && <DuplicateBadge role={duplicateRole} />}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{bookmark.url}</p>
          {record?.finalUrl && record.finalUrl !== bookmark.url && (
            <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{record.finalUrl}</span>
            </div>
          )}
          {issues.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {issues.map((issue) => (
                <Badge key={issue} variant="outline" className="text-[11px] font-normal">
                  {issue.startsWith("duplicate_url:")
                    ? t("bookmark:healthCenter.issues.duplicate_url")
                    : t(`bookmark:healthCenter.issues.${issue}`, { defaultValue: issue })}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {record?.status === "redirected" && record.finalUrl && (
            <Button variant="outline" size="sm" onClick={onAcceptRedirect}>
              {t("bookmark:healthCenter.useRedirect")}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => window.open(bookmark.url, "_blank")}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled={scanning} onClick={onScan}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {record && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("bookmark:healthCenter.checkedAt", {
            date: new Date(record.checkedAt).toLocaleString(),
          })}
          {record.httpStatus ? ` · HTTP ${record.httpStatus}` : ""}
          {record.responseTimeMs ? ` · ${record.responseTimeMs}ms` : ""}
        </p>
      )}
    </article>
  );
}

function DuplicateBadge({ role }: { role: DuplicateRole }) {
  const { t } = useTranslation("bookmark");
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-[11px] font-normal",
        role === "canonical"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      )}
    >
      {t(`healthCenter.duplicateRole.${role}`)}
    </Badge>
  );
}

function HealthBadge({ status }: { status: BookmarkHealthStatus }) {
  const { t } = useTranslation("bookmark");
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-[11px] font-normal",
        status === "healthy" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        status === "broken" && "border-destructive/30 bg-destructive/10 text-destructive",
        (status === "redirected" || status === "auth_required" || status === "rate_limited" || status === "server_error") &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      )}
    >
      {t(`healthCenter.status.${status}`)}
    </Badge>
  );
}

export default BookmarkHealthPage;
