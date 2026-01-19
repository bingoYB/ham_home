/**
 * MainContent 主内容区组件
 * 展示书签列表，支持筛选、视图切换和批量操作
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  LayoutGrid,
  List,
  Tag,
  ExternalLink,
  Trash2,
  Calendar,
  Link2,
  X,
  ChevronDown,
  Folder,
  FolderX,
  Copy,
  Edit,
  FileText,
  AlignLeft,
  FolderOpen,
  Tag as TagIcon,
  Bookmark,
  Loader2,
  MoreHorizontal,
  Share2,
} from 'lucide-react';
import {
  Input,
  Button,
  Badge,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  ScrollArea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Label,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Masonry,
  masonryCompute,
  MasonryComputeMode,
  cn,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { CategoryFilterDropdown } from '@/components/common/CategoryTree';
import { TagInput } from '@/components/common/TagInput';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useSavePanel } from '@/components/SavePanel/useSavePanel';
import { AIStatus } from '@/components/SavePanel';
import type { LocalBookmark, PageContent } from '@/types';

type ViewMode = 'grid' | 'list';

// 分类颜色
const CATEGORY_COLOR = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';

interface MainContentProps {
  currentView: string;
  onViewChange?: (view: string) => void;
}

export function MainContent({ currentView, onViewChange }: MainContentProps) {
  const { t, i18n } = useTranslation(['common', 'bookmark']);
  const { bookmarks, categories, allTags, deleteBookmark, refreshBookmarks } = useBookmarks();
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // 删除确认弹窗状态
  const [deleteTarget, setDeleteTarget] = useState<LocalBookmark | null>(null);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  
  // 编辑弹窗状态
  const [editingBookmark, setEditingBookmark] = useState<LocalBookmark | null>(null);

  // 瀑布流容器 ref 和配置
  const masonryContainerRef = useRef<HTMLDivElement>(null);
  const [masonryConfig, setMasonryConfig] = useState({ cols: 4, columnSize: 356 });

  // 计算瀑布流列数和卡片宽度
  const computeMasonryLayout = useCallback(() => {
    if (!masonryContainerRef.current) return;
    // 获取容器宽度，减去左右边距48px p-6宽度: 0.25rem*6 = 1.5rem = 24px
    const containerWidth = masonryContainerRef.current.clientWidth - 48;
    const result = masonryCompute({
      containerWidth,
      benchWidth: 356,
      mode: MasonryComputeMode.PREFER,
      itemGap: 16,
      maxCol: 12,
      minCol: 1,
    });

    if (result) {
      setMasonryConfig({ cols: result.cols, columnSize: result.columnSize });
    }
  }, []);

  // 监听容器宽度变化
  useEffect(() => {
    computeMasonryLayout();
    const resizeObserver = new ResizeObserver(() => {
      computeMasonryLayout();
    });
    if (masonryContainerRef.current) {
      resizeObserver.observe(masonryContainerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [computeMasonryLayout]);

  // 过滤书签
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      // 关键词搜索
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          b.title.toLowerCase().includes(query) ||
          b.description.toLowerCase().includes(query) ||
          b.url.toLowerCase().includes(query) ||
          b.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      
      // 标签筛选
      if (selectedTags.length > 0) {
        const hasAllTags = selectedTags.every((tag) => b.tags.includes(tag));
        if (!hasAllTags) return false;
      }
      
      // 分类筛选
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'uncategorized') {
          if (b.categoryId) return false;
        } else if (b.categoryId !== selectedCategory) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [bookmarks, searchQuery, selectedTags, selectedCategory]);

  // 获取分类全路径（用 > 连接）
  const getCategoryPath = (categoryId: string | null): string => {
    if (!categoryId) return t('bookmark:bookmark.uncategorized');
    
    const path: string[] = [];
    let currentId: string | null = categoryId;
    
    while (currentId) {
      const cat = categories.find((c) => c.id === currentId);
      if (!cat) break;
      path.unshift(cat.name);
      currentId = cat.parentId;
    }
    
    return path.length > 0 ? path.join(' > ') : t('bookmark:bookmark.uncategorized');
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return t('common:common.today') || '今天';
    if (days === 1) return t('common:common.yesterday') || '昨天';
    if (days < 7) return `${days}d ago`;
    
    return new Intl.DateTimeFormat(i18n.language, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).format(new Date(timestamp));
  };

  // 打开书签
  const openBookmark = (url: string) => {
    window.open(url, '_blank');
  };

  // 处理编辑完成
  const handleEditSaved = () => {
    refreshBookmarks();
    setEditingBookmark(null);
  };

  // 删除书签 - 打开确认弹窗
  const handleDelete = (bookmark: LocalBookmark) => {
    setDeleteTarget(bookmark);
  };

  // 确认删除单个书签
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteBookmark(deleteTarget.id);
    selectedIds.delete(deleteTarget.id);
    setSelectedIds(new Set(selectedIds));
    setDeleteTarget(null);
  };

  // 批量删除 - 打开确认弹窗
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setShowBatchDeleteDialog(true);
  };

  // 确认批量删除
  const confirmBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteBookmark(id);
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setShowBatchDeleteDialog(false);
  };

  // 切换选择
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBookmarks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBookmarks.map((b) => b.id)));
    }
  };

  // 切换标签选择
  const toggleTagSelection = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // 清除所有筛选
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCategory('all');
  };

  const hasFilters = searchQuery || selectedTags.length > 0 || selectedCategory !== 'all';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* 筛选栏 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 pt-6">
        <div className="flex items-center justify-between gap-4">
          {/* 左侧：搜索框 */}
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('bookmark:bookmark.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border/50 focus:bg-muted"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 右侧：筛选和视图切换 */}
          <div className="flex items-center gap-2">
            {/* 标签筛选 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedTags.length > 0 ? 'secondary' : 'outline'}
                  size="sm"
                  className={cn("gap-2", selectedTags.length > 0 ? '' : 'hover:text-card-foreground')}
                >
                  <Tag className="h-4 w-4" />
                  {selectedTags.length > 0
                    ? t('bookmark:bookmark.filter.selectedTags', { count: selectedTags.length })
                    : t('bookmark:bookmark.filter.tags')}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {allTags.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">
                        {t('bookmark:tags.empty')}
                      </p>
                    ) : (
                      allTags.map((tag) => (
                        <div
                          key={tag}
                          onClick={() => toggleTagSelection(tag)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left cursor-pointer"
                        >
                          <Checkbox checked={selectedTags.includes(tag)} />
                          <span className="truncate">{tag}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                {selectedTags.length > 0 && (
                  <div className="border-t border-border mt-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => setSelectedTags([])}
                    >
                      {t('bookmark:bookmark.filter.clearFilter')}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* 分类筛选 */}
            <CategoryFilterDropdown
              categories={categories}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />

            {/* 视图切换 */}
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
                title={t('bookmark:bookmark.view.grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
                title={t('bookmark:bookmark.view.list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 筛选状态和批量操作 */}
        {(hasFilters || isSelectionMode || selectedIds.size > 0) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            {/* 左侧：当前分类和筛选标签 */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCategory !== 'all' && (
                <Badge
                  variant="secondary"
                  className={`text-xs px-2 py-1 gap-1.5 cursor-pointer group/cat border`}
                >
                  {selectedCategory === 'uncategorized' ? (
                    <FolderX className="h-3 w-3" />
                  ) : (
                    <Folder className="h-3 w-3" />
                  )}
                  {selectedCategory === 'uncategorized'
                    ? t('bookmark:bookmark.uncategorized')
                    : categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                  <X
                    className="h-3 w-3 opacity-0 group-hover/cat:opacity-100 transition-opacity hover:text-foreground cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory('all');
                    }}
                  />
                </Badge>
              )}
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-1 gap-1.5 cursor-pointer bg-gradient-to-r from-violet-500/90 to-indigo-500/90 dark:from-violet-600/80 dark:to-indigo-600/80 text-white border-0 shadow-sm group/tag"
                >
                  {tag}
                  <X
                    className="h-3 w-3 hover:bg-white/20 rounded-full cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTagSelection(tag);
                    }}
                  />
                </Badge>
              ))}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground h-6 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  {t('bookmark:bookmark.filter.clearFilter')}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {filteredBookmarks.length} {t('bookmark:bookmark.title')}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {filteredBookmarks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-muted-foreground"
                >
                  {selectedIds.size === filteredBookmarks.length
                    ? t('bookmark:bookmark.batch.deselectAll')
                    : t('bookmark:bookmark.batch.selectAll')}
                </Button>
              )}
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {t('bookmark:bookmark.batch.selected', { count: selectedIds.size })}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBatchDelete}
                    className="bg-red-500 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-700 dark:text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('bookmark:bookmark.batch.delete')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 书签列表 */}
      <div ref={masonryContainerRef} className="flex-1 overflow-auto p-6">
        {filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg">
              {hasFilters ? t('bookmark:bookmark.emptyFilter') : t('bookmark:bookmark.empty')}
            </p>
            {hasFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                {t('bookmark:bookmark.filter.clearFilter')}
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <Masonry
            brickId="id"
            bricks={filteredBookmarks}
            gutter={16}
            columnSize={masonryConfig.columnSize}
            columnNum={masonryConfig.cols}
            render={(bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                categoryName={getCategoryPath(bookmark.categoryId)}
                formatDate={formatDate}
                onOpen={() => openBookmark(bookmark.url)}
                onDelete={() => handleDelete(bookmark)}
                onEdit={() => setEditingBookmark(bookmark)}
                isSelected={selectedIds.has(bookmark.id)}
                onToggleSelect={() => toggleSelect(bookmark.id)}
                columnSize={masonryConfig.columnSize}
                t={t}
              />
            )}
          />
        ) : (
          <div className="space-y-2 w-full min-w-0">
            {filteredBookmarks.map((bookmark) => (
              <BookmarkListItem
                key={bookmark.id}
                bookmark={bookmark}
                categoryName={getCategoryPath(bookmark.categoryId)}
                formatDate={formatDate}
                onOpen={() => openBookmark(bookmark.url)}
                onDelete={() => handleDelete(bookmark)}
                onEdit={() => setEditingBookmark(bookmark)}
                isSelected={selectedIds.has(bookmark.id)}
                onToggleSelect={() => toggleSelect(bookmark.id)}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editingBookmark && (
        <EditBookmarkDialog
          bookmark={editingBookmark}
          onSaved={handleEditSaved}
          onClose={() => setEditingBookmark(null)}
        />
      )}

      {/* 单个删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bookmark:bookmark.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bookmark:bookmark.deleteConfirm', { title: deleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认弹窗 */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bookmark:bookmark.batch.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bookmark:bookmark.batch.deleteConfirm', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ========== 编辑书签弹窗组件 ==========

interface EditBookmarkDialogProps {
  bookmark: LocalBookmark;
  onSaved: () => void;
  onClose: () => void;
}

function EditBookmarkDialog({ bookmark, onSaved, onClose }: EditBookmarkDialogProps) {
  const { t } = useTranslation(['common', 'bookmark']);
  
  // 从 bookmark 构建 pageContent
  const pageContent: PageContent = {
    url: bookmark.url,
    title: bookmark.title,
    content: bookmark.content || '',
    textContent: bookmark.description || '',
    excerpt: bookmark.description || '',
    favicon: bookmark.favicon || '',
  };

  // 使用 useSavePanel hook
  const {
    url,
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    aiStatus,
    aiError,
    aiRecommendedCategory,
    saving,
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('bookmark:bookmark.editBookmark')}</DialogTitle>
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
            <Label htmlFor="edit-description" className="flex items-center gap-2 text-sm font-medium">
              <AlignLeft className="h-4 w-4 text-orange-500" />
              {t('bookmark:savePanel.descriptionLabel')}
            </Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('bookmark:savePanel.descriptionPlaceholder')}
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('bookmark:savePanel.cancel')}
          </Button>
          <Button onClick={save} disabled={saving || !title.trim() || !url.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('bookmark:savePanel.saving')}
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                {t('bookmark:savePanel.updateBookmark')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 书签卡片组件
interface BookmarkItemProps {
  bookmark: LocalBookmark;
  categoryName: string;
  formatDate: (timestamp: number) => string;
  onOpen: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  columnSize?: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function BookmarkCard({
  bookmark,
  categoryName,
  formatDate,
  onOpen,
  onDelete,
  onEdit,
  isSelected,
  onToggleSelect,
  columnSize = 356,
  t,
}: BookmarkItemProps) {
  const hostname = new URL(bookmark.url).hostname;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookmark.url);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: bookmark.title,
        url: bookmark.url,
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      style={{ width: columnSize }}
      className={`group bg-card rounded-2xl border transition-shadow hover:shadow-lg ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-border/80'
      }`}
    >
      <div className="p-4">
        {/* 顶部：checkbox、分类、创建时间、更多操作 */}
        <div className="flex items-center gap-2 mb-3 text-muted-foreground text-xs">
          {/* Checkbox */}
          <div
            className="flex items-center hover:text-foreground transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
          >
            <Checkbox checked={isSelected} className="h-4 w-4" />
          </div>
          
          {/* 分类 */}
          <div className="flex-1 min-w-0">
            <Badge 
              variant="secondary" 
              className={`text-xs px-2 py-0.5 gap-1 max-w-full ${CATEGORY_COLOR}`}
              title={categoryName}
            >
              <Folder className="h-3 w-3 shrink-0" />
              <span className="truncate">{categoryName}</span>
            </Badge>
          </div>
          
          {/* 创建时间 */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(bookmark.createdAt)}</span>
          </div>
          
          {/* 更多操作 - 靠右 */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('bookmark:bookmark.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('bookmark:bookmark.copyLink')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('bookmark:bookmark.share')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('bookmark:bookmark.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 主体内容：点击打开链接 */}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {/* 图标 + 标题描述 */}
          <div className="flex gap-3">
            {/* 左侧图标 */}
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {bookmark.favicon ? (
                <img
                  src={bookmark.favicon}
                  alt=""
                  className="w-6 h-6 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Link2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* 标题和描述 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-1">
                {bookmark.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {bookmark.description || hostname}
              </p>
            </div>
          </div>
        </a>

        {/* 底部：所有标签 */}
        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
            {bookmark.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 书签列表项组件
function BookmarkListItem({
  bookmark,
  categoryName,
  formatDate,
  onOpen,
  onDelete,
  onEdit,
  isSelected,
  onToggleSelect,
  t,
}: BookmarkItemProps) {
  const hostname = new URL(bookmark.url).hostname;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookmark.url);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: bookmark.title,
        url: bookmark.url,
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      className={`group flex items-center gap-4 p-4 rounded-xl border transition-[shadow,background-color] hover:shadow-md ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
      }`}
    >
      {/* 选择框 */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </div>

      {/* 图标 */}
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="w-5 h-5 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Link2 className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* 内容 - 点击打开链接 */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-0 flex-grow min-w-0"
      >
        <h3 className="font-medium text-foreground truncate" title={bookmark.title}>
          {bookmark.title}
        </h3>
        {bookmark.description && (
          <p className="text-xs text-muted-foreground truncate mt-1" title={bookmark.description}>
            {bookmark.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="truncate max-w-[200px]">{hostname}</span>
          <span className="shrink-0">•</span>
          <span className="shrink-0 truncate max-w-[100px]">{categoryName}</span>
          <span className="shrink-0">•</span>
          <span className="shrink-0 whitespace-nowrap">{formatDate(bookmark.createdAt)}</span>
        </div>
      </a>

      {/* 标签 - 支持两行展示 */}
      {bookmark.tags.length > 0 && (
        <div className="hidden lg:flex flex-wrap items-center gap-1.5 max-w-[240px] max-h-[52px] overflow-hidden">
          {bookmark.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* 更多操作下拉菜单 */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onOpen}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('bookmark:bookmark.open')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {t('bookmark:bookmark.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              {t('bookmark:bookmark.copyLink')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {t('bookmark:bookmark.share')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('bookmark:bookmark.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
