/**
 * 保存面板组件
 * UI 层：负责 JSX 渲染、样式布局、事件绑定
 */
import { Loader2, Check, Bookmark, Lightbulb, Sparkles } from 'lucide-react';
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
} from '@hamhome/ui';
import { TagInput } from '@/components/common/TagInput';
import { AIStatus } from './AIStatus';
import { useSavePanel } from '@/hooks/useSavePanel';
import type { PageContent, LocalBookmark, CategorySuggestion } from '@/types';

interface SavePanelProps {
  pageContent: PageContent;
  existingBookmark: LocalBookmark | null;
  onSaved: () => void;
}

export function SavePanel({
  pageContent,
  existingBookmark,
  onSaved,
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
    saving,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    runAIAnalysis,
    applyTagSuggestion,
    applyCategorySuggestion,
    save,
  } = useSavePanel({
    pageContent,
    existingBookmark,
    onSaved,
  });

  return (
    <div className="p-4 space-y-4">
      {/* AI 状态提示 */}
      <AIStatus status={aiStatus} error={aiError} onRetry={runAIAnalysis} />

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
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCategoryChange={setCategoryId}
        onTagsChange={setTags}
        onLoadSuggestions={runAIAnalysis}
      />

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        <Button
          className="flex-1"
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
              {existingBookmark ? '更新书签' : '保存'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ========== 子组件 ==========

function ExistingBookmarkBanner() {
  return (
    <div className="flex items-center gap-2 p-2 bg-accent rounded-md text-sm">
      <Check className="h-4 w-4 text-green-500" />
      <span>此页面已收藏，可更新信息</span>
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
    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-3 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
        <Sparkles className="h-4 w-4" />
        <span>智能推荐</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>

      {/* 分类推荐 */}
      {categorySuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-blue-600 dark:text-blue-400">
            推荐分类：
          </div>
          <div className="flex flex-wrap gap-2">
            {categorySuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onApplyCategory(suggestion)}
                className="group flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-blue-900 rounded-md border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                title={suggestion.reason}
              >
                <Lightbulb className="h-3 w-3 text-blue-500" />
                <span className="text-xs font-medium">
                  {suggestion.categoryName}
                </span>
                <span className="text-xs text-muted-foreground">
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
          <div className="text-xs text-blue-600 dark:text-blue-400">
            推荐标签：
          </div>
          <div className="flex flex-wrap gap-2">
            {tagSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onApplyTag(suggestion.tag)}
                className="group flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-blue-900 rounded-md border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                title={suggestion.reason}
              >
                <span className="text-xs font-medium">{suggestion.tag}</span>
                <span className="text-xs text-muted-foreground">+</span>
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
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
  onLoadSuggestions: () => void;
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
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
  onLoadSuggestions,
}: BookmarkFormProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-medium">
          标题
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="输入标题"
          className="h-8"
        />
      </div>

      <div className="space-y-1.5">
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

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">分类</Label>
          {!existingBookmark && categorySuggestionsCount > 0 && (
            <button
              onClick={onLoadSuggestions}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
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
          <SelectTrigger className="h-8">
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
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">标签</Label>
          {!existingBookmark && tagSuggestionsCount === 0 && (
            <button
              onClick={onLoadSuggestions}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
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
