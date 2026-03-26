/**
 * SavePanelView
 * 可复用的保存面板展示层，可通过 props 注入 demo 数据。
 */
import {
  Loader2,
  Bookmark,
  FileText,
  FolderOpen,
  Tag as TagIcon,
  AlignLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Textarea, Label } from "@hamhome/ui";
import { TagInput } from "@/components/common/TagInput";
import { CategorySelect } from "@/components/common/CategorySelect";
import { AIStatus, type AIStatusType } from "./AIStatus";
import type { LocalBookmark, LocalCategory } from "@/types";

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
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
  onLoadSuggestions: () => void;
  onApplyAICategory: () => void;
  onRetry: () => void;
  onConfigureAI?: () => void;
  onSave: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
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
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
  onLoadSuggestions,
  onApplyAICategory,
  onRetry,
  onConfigureAI,
  onSave,
  onCancel,
  onDelete,
}: SavePanelViewProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 space-y-4">
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
      />

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
}: BookmarkFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
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
