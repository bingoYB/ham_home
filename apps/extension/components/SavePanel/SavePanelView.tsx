/**
 * SavePanelView
 * 可复用的保存面板展示层，可通过 props 注入 demo 数据。
 */
import {
  AlertCircle,
  Loader2,
  Bookmark,
  FileText,
  Camera,
  Highlighter,
  Image as ImageIcon,
  Link as LinkIcon,
  StickyNote,
  FolderOpen,
  Tag as TagIcon,
  AlignLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Textarea,
  Label,
  Switch,
  cn,
} from "@hamhome/ui";
import { TagInput } from "@/components/common/TagInput";
import { getClipImageBookmarkUrl, isSubjectClip } from "@/utils/clip-context";
import { CategorySelect } from "@/components/common/CategorySelect";
import { AIStatus, type AIStatusType } from "./AIStatus";
import type {
  LocalBookmark,
  LocalCategory,
  SaveFlowClipContext,
} from "@/types";
import type {
  SavePanelActionError,
  SavePanelAssetStatus,
  SavePanelObsidianStatus,
  SavePanelSnapshotStatus,
} from "./useSavePanel";

export interface SavePanelViewProps {
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  categories: LocalCategory[];
  allTags: string[];
  existingBookmark: LocalBookmark | null;
  aiRecommendedCategory: string | null;
  aiStatus: AIStatusType;
  aiError: string | null;
  saving: boolean;
  saveSnapshot: boolean;
  snapshotStatus: SavePanelSnapshotStatus;
  snapshotError: string | null;
  saveScreenshot: boolean;
  screenshotStatus: SavePanelAssetStatus;
  screenshotError: string | null;
  initialClip?: SaveFlowClipContext;
  clipNote: string;
  clipStatus: SavePanelAssetStatus;
  clipError: string | null;
  syncToObsidian: boolean;
  obsidianStatus: SavePanelObsidianStatus;
  obsidianError: string | null;
  /** 保存/删除失败信息，展示在面板内 */
  actionError: SavePanelActionError | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
  onSaveSnapshotChange: (value: boolean) => void;
  onSaveScreenshotChange: (value: boolean) => void;
  onClipNoteChange: (value: string) => void;
  onSyncToObsidianChange: (value: boolean) => void;
  onLoadSuggestions: () => void;
  onApplyAICategory: () => void;
  onRetry: () => void;
  onConfigureAI?: () => void;
  onSave: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  hideSnapshotOptions?: boolean;
  /** Popover portal 容器（在 shadow root 中渲染时必须传入） */
  portalContainer?: HTMLElement;
}

export function SavePanelView({
  title,
  description,
  categoryId,
  tags,
  categories,
  allTags,
  existingBookmark,
  aiRecommendedCategory,
  aiStatus,
  aiError,
  saving,
  saveSnapshot,
  snapshotStatus,
  snapshotError,
  saveScreenshot,
  screenshotStatus,
  screenshotError,
  initialClip,
  clipNote,
  clipStatus,
  clipError,
  syncToObsidian,
  obsidianStatus,
  obsidianError,
  actionError,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
  onSaveSnapshotChange,
  onSaveScreenshotChange,
  onClipNoteChange,
  onSyncToObsidianChange,
  onLoadSuggestions,
  onApplyAICategory,
  onRetry,
  onConfigureAI,
  onSave,
  onCancel,
  onDelete,
  hideSnapshotOptions = false,
  portalContainer,
}: SavePanelViewProps) {
  const { t } = useTranslation();

  const subjectClip = initialClip && isSubjectClip(initialClip) ? initialClip : null;

  return (
    <div className="p-4 space-y-4">
      {subjectClip && (
        <ClipSubjectCard
          clip={subjectClip}
          status={clipStatus}
          error={clipError}
        />
      )}

      <BookmarkForm
        title={title}
        description={description}
        categoryId={categoryId}
        tags={tags}
        categories={categories}
        allTags={allTags}
        existingBookmark={existingBookmark}
        isLoading={aiStatus === "loading"}
        aiRecommendedCategory={aiRecommendedCategory}
        aiStatus={aiStatus}
        aiError={aiError}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
        onCategoryChange={onCategoryChange}
        onTagsChange={onTagsChange}
        onLoadSuggestions={onLoadSuggestions}
        onApplyAICategory={onApplyAICategory}
        onRetry={onRetry}
        onConfigureAI={onConfigureAI}
        hideTitleAndDescription={subjectClip?.type === "highlight"}
        portalContainer={portalContainer}
      />

      {initialClip && !subjectClip && (
        <ClipDraftCard
          clip={initialClip}
          note={clipNote}
          status={clipStatus}
          error={clipError}
          disabled={saving}
          onNoteChange={onClipNoteChange}
        />
      )}

      {!hideSnapshotOptions && (
        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-3">
          <ScreenshotOption
            enabled={saveScreenshot}
            status={screenshotStatus}
            error={screenshotError}
            disabled={saving}
            onChange={onSaveScreenshotChange}
          />
          <div className="h-px bg-border/70" />
          <SnapshotOptions
          saveSnapshot={saveSnapshot}
          snapshotStatus={snapshotStatus}
          snapshotError={snapshotError}
          syncToObsidian={syncToObsidian}
          obsidianStatus={obsidianStatus}
          obsidianError={obsidianError}
          disabled={saving}
          onSaveSnapshotChange={onSaveSnapshotChange}
          onSyncToObsidianChange={onSyncToObsidianChange}
          />
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">
            {actionError.message ||
              t(
                actionError.type === "save"
                  ? "bookmark:bookmark.saveFailed"
                  : "bookmark:bookmark.deleteFailed",
              )}
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          {t("bookmark:savePanel.cancel")}
        </Button>

        <Button
          size="sm"
          className="flex-1"
          onClick={onSave}
          disabled={saving || !title?.trim()}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("bookmark:savePanel.saving")}
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 mr-2" />
              {existingBookmark
                ? t("bookmark:savePanel.updateBookmark")
                : t("bookmark:savePanel.saveBookmark")}
            </>
          )}
        </Button>

        {existingBookmark && (
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={onDelete}
            disabled={saving}
          >
            {t("common:common.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}

interface ClipSubjectCardProps {
  clip: SaveFlowClipContext;
  status: SavePanelAssetStatus;
  error: string | null;
}

/**
 * 主体型剪藏卡片（图片 / 选中文字）
 * 剪藏内容本身就是保存主体，置顶展示；图片链接与来源站点作为附属信息。
 */
function ClipSubjectCard({ clip, status, error }: ClipSubjectCardProps) {
  const { t } = useTranslation();
  const sourceUrl = clip.sourceUrl;
  // data: / blob: 图片没有可打开的长期地址，不展示链接行
  const imageUrl = getClipImageBookmarkUrl(clip);

  return (
    <section className="space-y-2">
      {clip.type === "image" && clip.imageSourceUrl ? (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/40 p-2 space-y-2 shadow-2xs">
          <img
            src={clip.imageSourceUrl}
            alt={clip.sourceTitle ?? ""}
            className="max-h-64 w-full rounded-lg object-contain"
          />
          {(imageUrl || sourceUrl) && (
            <div className="space-y-1 border-t border-border/50 pt-2 px-1">
              {imageUrl && (
                <ClipMetaRow
                  icon={
                    <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  }
                  label={t("bookmark:savePanel.clip.imageUrlLabel")}
                  url={imageUrl}
                />
              )}
              {sourceUrl && (
                <ClipMetaRow
                  icon={
                    <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  }
                  label={t("bookmark:savePanel.clip.sourceLabel")}
                  url={sourceUrl}
                  text={clip.sourceTitle}
                />
              )}
            </div>
          )}
        </div>
      ) : clip.text ? (
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Highlighter className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <blockquote className="max-h-44 overflow-y-auto text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words scrollbar-slim">
                {clip.text}
              </blockquote>
            </div>
          </div>
          {sourceUrl && (
            <div className="border-t border-border/50 pt-2">
              <ClipMetaRow
                icon={
                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                }
                label={t("bookmark:savePanel.clip.sourceLabel")}
                url={sourceUrl}
                text={clip.sourceTitle}
              />
            </div>
          )}
        </div>
      ) : null}

      {status !== "idle" && (
        <p
          className={cn(
            "text-xs",
            status === "failed" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error || t(`bookmark:savePanel.clip.status.${status}`)}
        </p>
      )}
    </section>
  );
}

interface ClipMetaRowProps {
  icon: React.ReactNode;
  label: string;
  url: string;
  /** 有标题时优先展示标题，链接放在 title 提示中 */
  text?: string;
}

function ClipMetaRow({ icon, label, url, text }: ClipMetaRowProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      <span className="shrink-0">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        title={url}
        className="min-w-0 flex-1 truncate text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {text || url}
      </a>
    </div>
  );
}

interface ClipDraftCardProps {
  clip: SaveFlowClipContext;
  note: string;
  status: SavePanelAssetStatus;
  error: string | null;
  disabled: boolean;
  onNoteChange: (value: string) => void;
}

function ClipDraftCard({
  clip,
  note,
  status,
  error,
  disabled,
  onNoteChange,
}: ClipDraftCardProps) {
  const { t } = useTranslation();
  const Icon =
    clip.type === "highlight"
      ? Highlighter
      : clip.type === "image"
        ? ImageIcon
        : clip.type === "link"
          ? LinkIcon
          : StickyNote;
  const content = clip.text || clip.targetUrl || clip.imageSourceUrl;

  return (
    <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span>{t(`bookmark:savePanel.clip.types.${clip.type}`)}</span>
        <span className="ml-auto text-[11px] font-normal text-muted-foreground">
          {t("bookmark:savePanel.clip.willSave")}
        </span>
      </div>
      {clip.type === "image" && clip.imageSourceUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-background/80 p-2">
          <img
            src={clip.imageSourceUrl}
            alt=""
            className="h-12 w-16 rounded-md object-cover"
          />
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {clip.imageSourceUrl}
          </p>
        </div>
      ) : content ? (
        <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
          <p className="line-clamp-3 text-xs leading-relaxed text-foreground/90">
            {content}
          </p>
        </div>
      ) : null}
      <Textarea
        value={note}
        disabled={disabled}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder={t("bookmark:savePanel.clip.notePlaceholder")}
        className="min-h-16 resize-none bg-background/80 text-xs"
      />
      {status !== "idle" && (
        <p
          className={cn(
            "text-xs",
            status === "failed" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error || t(`bookmark:savePanel.clip.status.${status}`)}
        </p>
      )}
    </section>
  );
}

interface ScreenshotOptionProps {
  enabled: boolean;
  status: SavePanelAssetStatus;
  error: string | null;
  disabled: boolean;
  onChange: (value: boolean) => void;
}

function ScreenshotOption({
  enabled,
  status,
  error,
  disabled,
  onChange,
}: ScreenshotOptionProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Label
            htmlFor="save-screenshot"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Camera className="h-4 w-4 text-primary" />
            {t("bookmark:savePanel.screenshot.title")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? t("bookmark:savePanel.screenshot.enabledDesc")
              : t("bookmark:savePanel.screenshot.disabledDesc")}
          </p>
        </div>
        <Switch
          id="save-screenshot"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      </div>
      {status !== "idle" && (
        <p
          className={cn(
            "text-xs",
            status === "failed" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error || t(`bookmark:savePanel.screenshot.status.${status}`)}
        </p>
      )}
    </div>
  );
}

interface SnapshotOptionsProps {
  saveSnapshot: boolean;
  snapshotStatus: SavePanelSnapshotStatus;
  snapshotError: string | null;
  syncToObsidian: boolean;
  obsidianStatus: SavePanelObsidianStatus;
  obsidianError: string | null;
  disabled: boolean;
  onSaveSnapshotChange: (value: boolean) => void;
  onSyncToObsidianChange: (value: boolean) => void;
}

function SnapshotOptions({
  saveSnapshot,
  snapshotStatus,
  snapshotError,
  syncToObsidian,
  obsidianStatus,
  obsidianError,
  disabled,
  onSaveSnapshotChange,
  onSyncToObsidianChange,
}: SnapshotOptionsProps) {
  const { t } = useTranslation();
  const statusKey = getSnapshotStatusKey(snapshotStatus);
  const obsidianStatusKey = getObsidianStatusKey(obsidianStatus);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Label
            htmlFor="save-snapshot"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <FileText className="h-4 w-4 text-blue-500" />
            {t("bookmark:savePanel.snapshot.title")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {saveSnapshot
              ? t("bookmark:savePanel.snapshot.enabledDesc")
              : t("bookmark:savePanel.snapshot.disabledDesc")}
          </p>
        </div>
        <Switch
          id="save-snapshot"
          checked={saveSnapshot}
          disabled={disabled}
          onCheckedChange={onSaveSnapshotChange}
        />
      </div>

      {statusKey && (
        <p
          className={`text-xs ${
            snapshotStatus === "failed"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {snapshotError || t(statusKey)}
        </p>
      )}

      {saveSnapshot && (
        <div className="flex items-center justify-between gap-3 pl-6">
          <div className="min-w-0">
            <Label className="text-xs font-medium" htmlFor="sync-obsidian">
              {t("bookmark:savePanel.snapshot.syncToObsidian")}
            </Label>
            {obsidianStatusKey && (
              <p
                className={`mt-1 text-xs ${
                  obsidianStatus === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {obsidianError || t(obsidianStatusKey)}
              </p>
            )}
          </div>
          <Switch
            id="sync-obsidian"
            checked={syncToObsidian}
            disabled={disabled}
            onCheckedChange={onSyncToObsidianChange}
          />
        </div>
      )}
    </div>
  );
}

function getSnapshotStatusKey(status: SavePanelSnapshotStatus): string | null {
  if (status === "idle") return null;
  return `bookmark:savePanel.snapshot.status.${status}`;
}

function getObsidianStatusKey(status: SavePanelObsidianStatus): string | null {
  if (status === "idle") return null;
  return `bookmark:savePanel.snapshot.obsidianStatus.${status}`;
}

interface BookmarkFormProps {
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  categories: LocalCategory[];
  allTags: string[];
  existingBookmark: LocalBookmark | null;
  isLoading: boolean;
  aiRecommendedCategory: string | null;
  aiStatus: AIStatusType;
  aiError: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
  onLoadSuggestions: () => void;
  onApplyAICategory: () => void;
  onRetry: () => void;
  onConfigureAI?: () => void;
  /** 文字剪藏以选中内容为主体，不需要额外的标题与摘要 */
  hideTitleAndDescription?: boolean;
  portalContainer?: HTMLElement;
}

function BookmarkForm({
  title,
  description,
  categoryId,
  tags,
  categories,
  allTags,
  existingBookmark,
  isLoading,
  aiRecommendedCategory,
  aiStatus,
  aiError,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
  onLoadSuggestions,
  onApplyAICategory,
  onRetry,
  onConfigureAI,
  hideTitleAndDescription = false,
  portalContainer,
}: BookmarkFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {!hideTitleAndDescription && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="title"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <FileText className="h-4 w-4 text-blue-500" />
                {t("bookmark:savePanel.titleLabel")}
              </Label>
              {!existingBookmark && (
                <AIStatus
                  status={aiStatus}
                  error={aiError}
                  onRetry={onRetry}
                  onConfigure={onConfigureAI}
                />
              )}
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t("bookmark:savePanel.titlePlaceholder")}
              className="h-9 text-sm shadow-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <AlignLeft className="h-4 w-4 text-orange-500" />
              {t("bookmark:savePanel.descriptionLabel")}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t("bookmark:savePanel.descriptionPlaceholder")}
              rows={2}
              className="text-sm resize-none shadow-none"
            />
          </div>
        </>
      )}

      {/* 隐藏标题时 AI 状态另起一行，避免丢失分析进度与报错入口 */}
      {hideTitleAndDescription && !existingBookmark && (
        <div className="flex justify-end">
          <AIStatus
            status={aiStatus}
            error={aiError}
            onRetry={onRetry}
            onConfigure={onConfigureAI}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="h-4 w-4 text-emerald-500" />
            {t("bookmark:savePanel.categoryLabel")}
          </Label>
          {!existingBookmark && !aiRecommendedCategory && !categoryId && (
            <button
              onClick={onLoadSuggestions}
              className="text-xs text-primary hover:text-primary/80 font-medium"
              disabled={isLoading}
            >
              {isLoading
                ? t("bookmark:savePanel.loading")
                : t("bookmark:savePanel.getSuggestions")}
            </button>
          )}
        </div>
        <CategorySelect
          value={categoryId}
          onChange={onCategoryChange}
          categories={categories}
          aiRecommendedCategory={aiRecommendedCategory}
          onApplyAICategory={onApplyAICategory}
          className="[&_button]:shadow-none"
          portalContainer={portalContainer}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <TagIcon className="h-4 w-4 text-purple-500" />
            {t("bookmark:savePanel.tagsLabel")}
          </Label>
          {!existingBookmark && tags.length === 0 && (
            <button
              onClick={onLoadSuggestions}
              className="text-xs text-primary hover:text-primary/80 font-medium"
              disabled={isLoading}
            >
              {isLoading
                ? t("bookmark:savePanel.loading")
                : t("bookmark:savePanel.getSuggestions")}
            </button>
          )}
        </div>
        <TagInput
          value={tags}
          onChange={onTagsChange}
          placeholder={t("bookmark:savePanel.tagPlaceholder")}
          maxTags={10}
          suggestions={allTags}
          className="[&_input]:shadow-none"
        />
      </div>
    </div>
  );
}
