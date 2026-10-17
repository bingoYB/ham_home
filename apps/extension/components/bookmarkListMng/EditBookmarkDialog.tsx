/**
 * 编辑书签弹窗组件
 * bookmark 为 null 时是新建模式：用于没有可采集页面的环境（Web 版）手动录入书签
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Link2,
  FileText,
  AlignLeft,
  FolderOpen,
  Tag as TagIcon,
  Bookmark,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Label,
} from '@hamhome/ui';
import { TagInput } from '@/components/common/TagInput';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useSavePanel } from '@/components/SavePanel/useSavePanel';
import { capabilities } from '@/lib/platform';
import type { LocalBookmark, PageContent } from '@/types';

interface EditBookmarkDialogProps {
  /** 要编辑的书签；null 表示新建 */
  bookmark: LocalBookmark | null;
  onSaved: () => void;
  onClose: () => void;
}

export function EditBookmarkDialog({ bookmark, onSaved, onClose }: EditBookmarkDialogProps) {
  const { t } = useTranslation(['common', 'bookmark']);

  // 从 bookmark 构建 pageContent（新建时为空表单）
  const pageContent: PageContent = useMemo(
    () => ({
      url: bookmark?.url ?? '',
      title: bookmark?.title ?? '',
      content: bookmark?.content || '',
      htmlContent: '',
      textContent: bookmark?.description || '',
      excerpt: bookmark?.description || '',
      favicon: bookmark?.favicon || '',
    }),
    [bookmark],
  );

  // 使用 useSavePanel hook
  const {
    url,
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    aiRecommendedCategory,
    saving,
    actionError,
    setUrl,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    applyAIRecommendedCategory,
    save,
  } = useSavePanel({
    pageContent,
    existingBookmark: bookmark,
    onSaved,
  });

  const isCreating = bookmark === null;
  // Only checked when typing a URL by hand: a captured page always has a valid one
  const urlInvalid = isCreating && url.trim() !== '' && !/^https?:\/\/\S+$/i.test(url.trim());

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? t('bookmark:bookmark.addBookmark') : t('bookmark:bookmark.editBookmark')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* 链接 */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-url" className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4 text-cyan-500" />
              {t('bookmark:savePanel.urlLabel')}
            </Label>
            <Input
              id="edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('bookmark:savePanel.urlPlaceholder')}
              className="h-9 shadow-none font-mono text-xs"
            />
            {urlInvalid && (
              <p className="text-xs text-destructive">{t('bookmark:savePanel.urlInvalid')}</p>
            )}
          </div>

          {/* 标题 */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-blue-500" />
              {t('bookmark:savePanel.titleLabel')}
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('bookmark:savePanel.titlePlaceholder')}
              className="h-9 text-sm shadow-none"
            />
          </div>

          {/* 摘要 */}
          <div className="space-y-1.5">
            <Label
              htmlFor="edit-description"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <AlignLeft className="h-4 w-4 text-orange-500" />
              {t('bookmark:savePanel.descriptionLabel')}
            </Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                capabilities.ai
                  ? t('bookmark:savePanel.descriptionPlaceholder')
                  : t('bookmark:savePanel.descriptionPlaceholderManual')
              }
              rows={3}
              className="text-sm resize-none shadow-none"
            />
          </div>

          {/* 分类 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <FolderOpen className="h-4 w-4 text-emerald-500" />
              {t('bookmark:savePanel.categoryLabel')}
            </Label>
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              categories={categories}
              aiRecommendedCategory={aiRecommendedCategory}
              onApplyAICategory={applyAIRecommendedCategory}
              className="[&_button]:shadow-none"
            />
          </div>

          {/* 标签 */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <TagIcon className="h-4 w-4 text-purple-500" />
              {t('bookmark:savePanel.tagsLabel')}
            </Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder={t('bookmark:savePanel.tagPlaceholder')}
              maxTags={10}
              suggestions={allTags}
              className="[&_input]:shadow-none"
            />
          </div>
        </div>

        {actionError && (
          <div className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 break-words">
              {actionError.message || t('bookmark:bookmark.saveFailed')}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('bookmark:savePanel.cancel')}
          </Button>
          <Button onClick={save} disabled={saving || !title.trim() || !url.trim() || urlInvalid}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('bookmark:savePanel.saving')}
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                {isCreating ? t('bookmark:savePanel.saveBookmark') : t('bookmark:savePanel.updateBookmark')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
