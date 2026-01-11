/**
 * 保存面板组件
 * 参考 NewBookmarkModal 设计风格优化 UI
 */
import { Loader2, Check, Bookmark, Lightbulb, Sparkles, Link as LinkIcon, FileText, FolderOpen, Tag as TagIcon, X } from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Badge,
} from '@hamhome/ui';
import { TagInput } from '@/components/common/TagInput';
import { AIStatus } from './AIStatus';
import { useSavePanel } from './useSavePanel';
import type { PageContent, LocalBookmark, CategorySuggestion } from '@/types';

interface SavePanelProps {
  pageContent: PageContent;
  existingBookmark: LocalBookmark | null;
  onSaved: () => void;
  onClose?: () => void;
  onDelete?: () => void;
}

export function SavePanel({
  pageContent,
  existingBookmark,
  onSaved,
  onClose,
  onDelete,
}: SavePanelProps) {
  const {
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    aiStatus,
    aiError,
    tagSuggestions,
    categorySuggestions,
    showSuggestions,
    loadingSuggestions,
    aiRecommendedCategory,
    saving,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    runAIAnalysis,
    retryAnalysis,
    applyTagSuggestion,
    applyCategorySuggestion,
    applyAIRecommendedCategory,
    save,
    deleteBookmark,
  } = useSavePanel({
    pageContent,
    existingBookmark,
    onSaved,
  });

  return (
    <div className="p-4 space-y-4">
      {/* AI 状态提示 */}
      <AIStatus status={aiStatus} error={aiError} onRetry={retryAnalysis} />

      {/* 已收藏提示 */}
      {existingBookmark && <ExistingBookmarkBanner />}

      {/* 智能推荐区域 */}
      {showSuggestions && !existingBookmark && (
        <SmartSuggestions
          tagSuggestions={tagSuggestions}
          categorySuggestions={categorySuggestions}
          loading={loadingSuggestions}
          onApplyTag={applyTagSuggestion}
          onApplyCategory={applyCategorySuggestion}
        />
      )}

      {/* 表单 */}
      <BookmarkForm
        title={title}
        description={description}
        categoryId={categoryId}
        tags={tags}
        categories={categories}
        allTags={allTags}
        existingBookmark={existingBookmark}
        tagSuggestionsCount={tagSuggestions.length}
        categorySuggestionsCount={categorySuggestions.length}
        loadingSuggestions={loadingSuggestions}
        aiRecommendedCategory={aiRecommendedCategory}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCategoryChange={setCategoryId}
        onTagsChange={setTags}
        onLoadSuggestions={runAIAnalysis}
        onApplyAICategory={applyAIRecommendedCategory}
      />

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        {/* 取消按钮 */}
        <Button
          variant="outline"
          className="flex-1"
          onClick={onClose}
        >
          取消
        </Button>

        {/* 保存按钮 */}
        <Button
          className="flex-1 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-primary-foreground shadow-sm"
          onClick={save}
          disabled={saving || !title.trim()}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 mr-2" />
              {existingBookmark ? '更新书签' : '保存书签'}
            </>
          )}
        </Button>

        {/* 删除按钮（仅已保存书签显示） */}
        {existingBookmark && (
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              deleteBookmark().then(() => {
                onDelete?.();
              });
            }}
            disabled={saving}
          >
            删除
          </Button>
        )}
      </div>
    </div>
  );
}

// ========== 子组件 ==========

function ExistingBookmarkBanner() {
  return (
    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-sm border border-emerald-200 dark:border-emerald-800">
      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <span className="text-emerald-700 dark:text-emerald-300 font-medium">此页面已收藏，可更新信息</span>
    </div>
  );
}

interface SmartSuggestionsProps {
  tagSuggestions: { tag: string; reason?: string }[];
  categorySuggestions: CategorySuggestion[];
  loading: boolean;
  onApplyTag: (tag: string) => void;
  onApplyCategory: (suggestion: CategorySuggestion) => void;
}

function SmartSuggestions({
  tagSuggestions,
  categorySuggestions,
  loading,
  onApplyTag,
  onApplyCategory,
}: SmartSuggestionsProps) {
  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl space-y-3 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <span>智能推荐</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>

      {/* 分类推荐 */}
      {categorySuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            推荐分类
          </div>
          <div className="flex flex-wrap gap-2">
            {categorySuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onApplyCategory(suggestion)}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 transition-all shadow-sm"
                title={suggestion.reason}
              >
                <Lightbulb className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {suggestion.categoryName}
                </span>
                <span className="text-xs text-blue-500/70 dark:text-blue-400/70">
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 标签推荐 */}
      {tagSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            推荐标签
          </div>
          <div className="flex flex-wrap gap-2">
            {tagSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onApplyTag(suggestion.tag)}
                className="group flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 transition-all shadow-sm"
                title={suggestion.reason}
              >
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{suggestion.tag}</span>
                <span className="text-xs text-blue-500/70">+</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface BookmarkFormProps {
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  categories: { id: string; name: string }[];
  allTags: string[];
  existingBookmark: LocalBookmark | null;
  tagSuggestionsCount: number;
  categorySuggestionsCount: number;
  loadingSuggestions: boolean;
  aiRecommendedCategory: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
  onLoadSuggestions: () => void;
  onApplyAICategory: () => void;
}

function BookmarkForm({
  title,
  description,
  categoryId,
  tags,
  categories,
  allTags,
  existingBookmark,
  tagSuggestionsCount,
  categorySuggestionsCount,
  loadingSuggestions,
  aiRecommendedCategory,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
  onLoadSuggestions,
  onApplyAICategory,
}: BookmarkFormProps) {
  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="space-y-2">
        <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-blue-500" />
          标题
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="输入标题"
          className="h-10"
        />
      </div>

      {/* 摘要 */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          摘要
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="输入摘要或等待 AI 生成"
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      {/* 分类 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="h-4 w-4 text-emerald-500" />
            分类
          </Label>
          {!existingBookmark && categorySuggestionsCount === 0 && !aiRecommendedCategory && (
            <button
              onClick={onLoadSuggestions}
              className="text-xs text-primary hover:text-primary/80 font-medium"
              disabled={loadingSuggestions}
            >
              {loadingSuggestions ? '加载中...' : '获取推荐'}
            </button>
          )}
        </div>
        <Select
          value={categoryId || 'uncategorized'}
          onValueChange={(v) =>
            onCategoryChange(v === 'uncategorized' ? null : v)
          }
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uncategorized">未分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* AI 推荐分类（不在已有分类中时显示） */}
        {aiRecommendedCategory && !categoryId && (
          <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                AI 推荐分类：<span className="font-medium">{aiRecommendedCategory}</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              onClick={onApplyAICategory}
            >
              应用
            </Button>
          </div>
        )}
      </div>

      {/* 标签 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <TagIcon className="h-4 w-4 text-purple-500" />
            标签
          </Label>
          {!existingBookmark && tagSuggestionsCount === 0 && (
            <button
              onClick={onLoadSuggestions}
              className="text-xs text-primary hover:text-primary/80 font-medium"
              disabled={loadingSuggestions}
            >
              {loadingSuggestions ? '加载中...' : '获取推荐'}
            </button>
          )}
        </div>
        <TagInput
          value={tags}
          onChange={onTagsChange}
          placeholder="输入标签后回车"
          maxTags={10}
          suggestions={allTags}
        />
      </div>
    </div>
  );
}
