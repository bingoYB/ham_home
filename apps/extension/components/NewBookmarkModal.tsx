/**
 * NewBookmarkModal 新建书签弹窗
 * 迁移自 design-example，适配 HamHome 插件
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, Loader2, Link as LinkIcon, FileText, FolderOpen, Tag as TagIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';

interface NewBookmarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewBookmarkModal({ open, onOpenChange }: NewBookmarkModalProps) {
  const { t } = useTranslation(['common', 'bookmark']);
  const { addBookmark, categories, aiConfig } = useBookmarks();
  
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAIAnalyze = async () => {
    if (!url || !title) {
      setError(t('bookmark:modal.errors.urlTitleRequired'));
      return;
    }

    if (!aiConfig.enabled || !aiConfig.apiKey) {
      setError(t('bookmark:modal.errors.configureAI'));
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      // TODO: 调用 AI 分析 API
      // 这里暂时使用模拟数据
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDescription('AI 自动生成的摘要内容...');
      setTags(['AI推荐', '示例标签']);
    } catch (err) {
      setError(t('bookmark:modal.errors.aiFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!url || !title) {
      setError(t('bookmark:modal.errors.urlTitleRequired'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 获取 favicon
      let favicon = '';
      try {
        const urlObj = new URL(url);
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
      } catch {}

      await addBookmark({
        url,
        title,
        description,
        categoryId,
        tags,
        favicon,
        hasSnapshot: false,
      });

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bookmark:saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setTitle('');
    setDescription('');
    setCategoryId(null);
    setTags([]);
    setTagInput('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold">{t('bookmark:modal.title')}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t('bookmark:modal.subtitle')}</p>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[calc(100vh-250px)] overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="h-4 w-4 text-primary" />
              {t('bookmark:modal.url')} *
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-blue-500" />
              {t('bookmark:modal.titleLabel')} *
            </Label>
            <Input
              id="title"
              placeholder={t('bookmark:placeholders.title')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
          </div>

          {/* AI Analyze Button */}
          <Button
            onClick={handleAIAnalyze}
            disabled={isAnalyzing || !url || !title}
            variant="outline"
            className="w-full border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('bookmark:modal.aiAnalyzing')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('bookmark:modal.useAI')}
              </>
            )}
          </Button>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              {t('bookmark:modal.description')}
            </Label>
            <Textarea
              id="description"
              placeholder={t('bookmark:placeholders.description')}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2 text-sm font-medium">
              <FolderOpen className="h-4 w-4 text-emerald-500" />
              {t('bookmark:categories')}
            </Label>
            <Select 
              value={categoryId || 'uncategorized'} 
              onValueChange={(v) => setCategoryId(v === 'uncategorized' ? null : v)}
            >
              <SelectTrigger id="category" className="h-11">
                <SelectValue placeholder={t('bookmark:modal.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">{t('bookmark:uncategorized')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="flex items-center gap-2 text-sm font-medium">
              <TagIcon className="h-4 w-4 text-purple-500" />
              {t('bookmark:tags')}
            </Label>
            <Input
              id="tags"
              placeholder={t('bookmark:modal.tagPlaceholder')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="h-11"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-purple-900 dark:hover:text-purple-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 bg-muted/50 border-t border-border flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            {t('common:common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !url || !title}
            className="flex-1 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-primary-foreground"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('bookmark:modal.saving')}
              </>
            ) : (
              t('bookmark:modal.saveBookmark')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

