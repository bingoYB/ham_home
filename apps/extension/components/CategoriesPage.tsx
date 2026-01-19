/**
 * CategoriesPage 分类管理页面
 * 支持树形展示、预设分类方案选择、AI 生成分类、批量删除
 */
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FolderOpen, 
  Folder,
  MoreVertical, 
  Sparkles, 
  Download, 
  Loader2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Check,
  X,
  Square,
  CheckSquare,
} from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Label,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Checkbox,
  cn,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { aiClient } from '@/lib/ai/client';
import { 
  getPresetCategoriesGeneral,
  getPresetCategoriesProfessional,
  flattenCategories,
  type PresetCategoryScheme
} from '@/lib/preset-categories';
import type { LocalCategory, AIGeneratedCategory, HierarchicalCategory } from '@/types';

// 带子分类的分类节点
interface CategoryTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;
  children: CategoryTreeNode[];
  bookmarkCount: number;
}

export function CategoriesPage() {
  const { t, i18n } = useTranslation(['common', 'settings']);
  const { categories, bookmarks, addCategory, updateCategory, deleteCategory, bulkAddCategories } = useBookmarks();
  
  // 根据当前语言获取预设分类
  const currentLang = i18n.language;
  const presetCategoriesGeneral = useMemo(() => getPresetCategoriesGeneral(currentLang), [currentLang]);
  const presetCategoriesProfessional = useMemo(() => getPresetCategoriesProfessional(currentLang), [currentLang]);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LocalCategory | null>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  
  // 展开状态
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);

  // AI 生成分类状态
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedCategories, setAiGeneratedCategories] = useState<AIGeneratedCategory[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // 构建分类树
  const categoryTree = useMemo(() => {
    const getBookmarkCount = (categoryId: string): number => {
      return bookmarks.filter(b => b.categoryId === categoryId).length;
    };

    const buildTree = (parentId: string | null): CategoryTreeNode[] => {
      return categories
        .filter(c => c.parentId === parentId)
        .sort((a, b) => a.order - b.order)
        .map(c => ({
          ...c,
          children: buildTree(c.id),
          bookmarkCount: getBookmarkCount(c.id),
        }));
    };

    return buildTree(null);
  }, [categories, bookmarks]);

  // 切换展开状态
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 切换选择状态
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map(c => c.id)));
    }
  }, [categories, selectedIds.size]);

  // 添加分类
  const handleAdd = async () => {
    if (!categoryName.trim()) return;
    
    try {
      await addCategory(categoryName.trim(), parentCategoryId);
      setCategoryName('');
      setParentCategoryId(null);
      setShowAddDialog(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('common:common.error'));
    }
  };

  // 编辑分类
  const handleEdit = async () => {
    if (!selectedCategory || !categoryName.trim()) return;
    
    try {
      await updateCategory(selectedCategory.id, { name: categoryName.trim() });
      setShowEditDialog(false);
      setSelectedCategory(null);
      setCategoryName('');
    } catch (error) {
      alert(error instanceof Error ? error.message : t('common:common.error'));
    }
  };

  // 删除分类
  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    try {
      await deleteCategory(selectedCategory.id);
      setShowDeleteDialog(false);
      setSelectedCategory(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('common:common.error'));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      for (const id of selectedIds) {
        await deleteCategory(id);
      }
      setSelectedIds(new Set());
      setShowBatchDeleteDialog(false);
      setIsBatchMode(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('common:common.error'));
    }
  };

  const openAddDialog = (parentId: string | null = null) => {
    setParentCategoryId(parentId);
    setCategoryName('');
    setShowAddDialog(true);
  };

  const openEditDialog = (category: LocalCategory) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (category: LocalCategory) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  // 应用预设分类方案
  const handleApplyPreset = async (scheme: PresetCategoryScheme) => {
    const presetCategories = scheme === 'general' 
      ? presetCategoriesGeneral 
      : presetCategoriesProfessional;
    
    const flatCategories = flattenCategories(presetCategories);
    
    try {
      if (bulkAddCategories) {
        await bulkAddCategories(flatCategories);
      } else {
        for (const cat of flatCategories.filter(c => !c.parentId)) {
          await addCategory(cat.name);
        }
      }
      setShowPresetDialog(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('common:common.error'));
    }
  };

  // AI 生成分类
  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) return;
    
    setAiGenerating(true);
    setAiError(null);
    setAiGeneratedCategories(null);
    
    try {
      await aiClient.loadConfig();
      if (!aiClient.isConfigured()) {
        throw new Error(t('settings:settings.categories.preset.aiConfigError', 'Please configure AI service in settings first'));
      }
      
      const result = await aiClient.generateCategories(aiDescription);
      setAiGeneratedCategories(result);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : t('common:common.error'));
    } finally {
      setAiGenerating(false);
    }
  };

  // 应用 AI 生成的分类
  const handleApplyAICategories = async () => {
    if (!aiGeneratedCategories) return;
    
    const flatCategories = flattenAICategories(aiGeneratedCategories);
    
    try {
      if (bulkAddCategories) {
        await bulkAddCategories(flatCategories);
      } else {
        for (const cat of flatCategories.filter(c => !c.parentId)) {
          await addCategory(cat.name);
        }
      }
      setShowPresetDialog(false);
      setAiGeneratedCategories(null);
      setAiDescription('');
    } catch (error) {
      alert(error instanceof Error ? error.message : t('common:common.error'));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* 页面头部操作 */}
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2">
          {isBatchMode ? (
            <>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === categories.length ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    {t('settings:settings.categories.deselectAll')}
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {t('settings:settings.categories.selectAll')}
                  </>
                )}
              </Button>
              {selectedIds.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowBatchDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings:settings.categories.deleteSelected')} ({selectedIds.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => {
                setIsBatchMode(false);
                setSelectedIds(new Set());
              }}>
                <X className="h-4 w-4 mr-2" />
                {t('settings:settings.dialogs.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsBatchMode(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('settings:settings.categories.batchDelete')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowPresetDialog(true)}>
                <Download className="h-4 w-4 mr-2" />
                {t('settings:settings.categories.usePreset')}
              </Button>
              <Button size="sm" onClick={() => openAddDialog(null)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('settings:settings.categories.newCategory')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 分类树形列表 */}
      <Card>
        <CardContent className="p-0">
          {categoryTree.length > 0 ? (
            <div className="divide-y">
              {categoryTree.map((node) => (
                <CategoryTreeItem
                  key={node.id}
                  node={node}
                  level={0}
                  expandedIds={expandedIds}
                  selectedIds={selectedIds}
                  isBatchMode={isBatchMode}
                  onToggleExpand={toggleExpand}
                  onToggleSelect={toggleSelect}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  onAddSub={openAddDialog}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>{t('settings:settings.categories.noCategories')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加分类对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings:settings.categories.dialogs.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('settings:settings.categories.categoryName')}</Label>
              <Input
                id="name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder={t('settings:settings.categories.categoryNamePlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('settings:settings.categories.dialogs.cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={!categoryName.trim()}>
              {t('settings:settings.categories.dialogs.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑分类对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings:settings.categories.dialogs.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">{t('settings:settings.categories.categoryName')}</Label>
              <Input
                id="editName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder={t('settings:settings.categories.categoryNamePlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('settings:settings.categories.dialogs.cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={!categoryName.trim()}>
              {t('settings:settings.categories.dialogs.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings:settings.categories.dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:settings.categories.dialogs.deleteDescription', { name: selectedCategory?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings:settings.categories.dialogs.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('settings:settings.categories.dialogs.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings:settings.categories.dialogs.batchDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:settings.categories.dialogs.batchDeleteDescription', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings:settings.categories.dialogs.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive hover:bg-destructive/90">
              {t('settings:settings.categories.dialogs.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 预设分类选择对话框 */}
      <Dialog open={showPresetDialog} onOpenChange={(open) => {
        setShowPresetDialog(open);
        if (!open) {
          setAiGeneratedCategories(null);
          setAiDescription('');
          setAiError(null);
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('settings:settings.categories.preset.title')}</DialogTitle>
            <DialogDescription>
              {t('settings:settings.categories.preset.description')}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="preset" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preset">
                <Download className="h-4 w-4 mr-2" />
                {t('settings:settings.categories.preset.presetTab')}
              </TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="h-4 w-4 mr-2" />
                {t('settings:settings.categories.preset.aiTab')}
              </TabsTrigger>
            </TabsList>
            
            {/* 预设分类 Tab - 左右布局 */}
            <TabsContent value="preset" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 方案一：通用型 */}
                <Card className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>📁</span>
                      {t('settings:settings.categories.preset.general')}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t('settings:settings.categories.preset.generalDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <div className="bg-muted/30 rounded-lg p-3 max-h-[320px] overflow-y-auto">
                      <PresetCategoryTree 
                        categories={presetCategoriesGeneral} 
                      />
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0">
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => handleApplyPreset('general')}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('settings:settings.categories.preset.apply')}
                    </Button>
                  </div>
                </Card>
                
                {/* 方案二：专业型 */}
                <Card className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>💼</span>
                      {t('settings:settings.categories.preset.professional')}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t('settings:settings.categories.preset.professionalDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <div className="bg-muted/30 rounded-lg p-3 max-h-[320px] overflow-y-auto">
                      <PresetCategoryTree 
                        categories={presetCategoriesProfessional} 
                      />
                    </div>
                  </CardContent>
                  <div className="p-4 pt-0">
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => handleApplyPreset('professional')}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('settings:settings.categories.preset.apply')}
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>
            
            {/* AI 生成 Tab */}
            <TabsContent value="ai" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings:settings.categories.preset.aiInputLabel')}</Label>
                  <Textarea
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder={t('settings:settings.categories.preset.aiInputPlaceholder')}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                
                <Button 
                  onClick={handleAIGenerate} 
                  disabled={!aiDescription.trim() || aiGenerating}
                  className="w-full"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('settings:settings.categories.preset.aiGenerating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('settings:settings.categories.preset.aiGenerate')}
                    </>
                  )}
                </Button>
                
                {aiError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    {aiError}
                  </div>
                )}
                
                {aiGeneratedCategories && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{t('settings:settings.categories.preset.aiRecommended')}</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleAIGenerate}
                        disabled={aiGenerating}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-1", aiGenerating && "animate-spin")} />
                        {t('settings:settings.categories.preset.retry')}
                      </Button>
                    </div>
                    
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <AIGeneratedCategoryTree categories={aiGeneratedCategories} />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setAiGeneratedCategories(null);
                          setAiDescription('');
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('settings:settings.dialogs.cancel')}
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={handleApplyAICategories}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {t('settings:settings.categories.preset.apply')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== 树形节点组件 ==========

interface CategoryTreeItemProps {
  node: CategoryTreeNode;
  level: number;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  isBatchMode: boolean;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (category: LocalCategory) => void;
  onDelete: (category: LocalCategory) => void;
  onAddSub: (parentId: string) => void;
  t: (key: string, options?: any) => string;
}

function CategoryTreeItem({
  node,
  level,
  expandedIds,
  selectedIds,
  isBatchMode,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onDelete,
  onAddSub,
  t,
}: CategoryTreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedIds.has(node.id);
  const paddingLeft = level * 24 + 12;

  return (
    <>
      <div 
        className={cn(
          "flex items-center py-2.5 px-3 hover:bg-muted/50 group transition-colors",
          isSelected && "bg-primary/10"
        )}
        style={{ paddingLeft }}
      >
        {/* 批量选择复选框 */}
        {isBatchMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(node.id)}
            className="mr-2"
          />
        )}

        {/* 展开/折叠按钮 */}
        <button
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className={cn(
            "w-5 h-5 flex items-center justify-center mr-1 rounded hover:bg-muted",
            !hasChildren && "invisible"
          )}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </button>

        {/* 文件夹图标 */}
        {hasChildren || level === 0 ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 mr-2 text-amber-500" />
          ) : (
            <Folder className="h-4 w-4 mr-2 text-amber-500" />
          )
        ) : (
          <div className="w-4 h-4 mr-2" />
        )}

        {/* 分类名称 */}
        <span className={cn(
          "flex-1 text-sm",
          level === 0 && "font-medium"
        )}>
          {node.name}
        </span>

        {/* 书签数量 */}
        <span className="text-xs text-muted-foreground mr-2">
          {node.bookmarkCount}
        </span>

        {/* 操作菜单 */}
        {!isBatchMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('settings:settings.categories.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddSub(node.id)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('settings:settings.categories.addSubcategory')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(node)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('settings:settings.categories.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 子分类 */}
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              selectedIds={selectedIds}
              isBatchMode={isBatchMode}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSub={onAddSub}
              t={t}
            />
          ))}
        </>
      )}
    </>
  );
}

// ========== 预设分类树形展示（全展开） ==========

interface PresetCategoryTreeProps {
  categories: HierarchicalCategory[];
  level?: number;
}

function PresetCategoryTree({ categories, level = 0 }: PresetCategoryTreeProps) {
  return (
    <div className={level > 0 ? 'ml-4 border-l border-muted-foreground/20 pl-3' : ''}>
      {categories.map((cat) => {
        const hasChildren = cat.children && cat.children.length > 0;
        
        return (
          <div key={cat.id} className="py-1">
            <div className="flex items-center gap-2 text-sm">
              {hasChildren ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <div className="w-3" />
              )}
              <span className="text-base">{cat.icon}</span>
              <span className={level === 0 ? 'font-medium' : ''}>{cat.name}</span>
            </div>
            {hasChildren && (
              <PresetCategoryTree 
                categories={cat.children!} 
                level={level + 1} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ========== AI 生成分类预览 ==========

function AIGeneratedCategoryTree({ categories, level = 0 }: { categories: AIGeneratedCategory[]; level?: number }) {
  return (
    <div className={level > 0 ? 'ml-4 border-l border-muted-foreground/20 pl-3' : ''}>
      {categories.map((cat, index) => (
        <div key={index} className="py-1">
          <div className="flex items-center gap-2 text-sm">
            {cat.children && cat.children.length > 0 ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <div className="w-3" />
            )}
            <Folder className="h-3.5 w-3.5 text-amber-500" />
            <span className={level === 0 ? 'font-medium' : ''}>{cat.name}</span>
          </div>
          {cat.children && cat.children.length > 0 && (
            <AIGeneratedCategoryTree categories={cat.children} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

// ========== 辅助函数 ==========

function flattenAICategories(
  categories: AIGeneratedCategory[],
  parentId: string | null = null,
  idPrefix = 'ai'
): Array<{ id: string; name: string; parentId: string | null }> {
  const result: Array<{ id: string; name: string; parentId: string | null }> = [];
  
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const id = `${idPrefix}-${i}`;
    
    result.push({
      id,
      name: category.name,
      parentId,
    });
    
    if (category.children) {
      result.push(...flattenAICategories(category.children, id, `${id}`));
    }
  }
  
  return result;
}
