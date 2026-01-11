/**
 * 编辑书签弹窗组件
 * UI 层：负责 JSX 渲染、样式布局、事件绑定
 */
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hamhome/ui';
import { Loader2, Trash2 } from 'lucide-react';
import { TagInput } from '@/components/common/TagInput';
import { useEditBookmark } from './useEditBookmark';
import type { LocalBookmark } from '@/types';

interface EditBookmarkDialogProps {
  bookmark: LocalBookmark | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EditBookmarkDialog({
  bookmark,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: EditBookmarkDialogProps) {
  const {
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    saving,
    deleting,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    save,
    deleteBookmark,
  } = useEditBookmark({
    bookmark,
    open,
    onSaved,
    onDeleted,
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px]">
        <DialogHeader>
          <DialogTitle>编辑书签</DialogTitle>
        </DialogHeader>

        <EditBookmarkForm
          title={title}
          description={description}
          categoryId={categoryId}
          tags={tags}
          categories={categories}
          allTags={allTags}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onCategoryChange={setCategoryId}
          onTagsChange={setTags}
        />

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="destructive"
            onClick={deleteBookmark}
            disabled={deleting || saving}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="ml-2">删除</span>
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || deleting}
            >
              取消
            </Button>
            <Button
              onClick={save}
              disabled={saving || deleting || !title.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== 子组件 ==========

interface EditBookmarkFormProps {
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  categories: { id: string; name: string }[];
  allTags: string[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
}

function EditBookmarkForm({
  title,
  description,
  categoryId,
  tags,
  categories,
  allTags,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
}: EditBookmarkFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">标题</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="输入标题"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">摘要</Label>
        <Textarea
          id="edit-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="输入摘要"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>分类</Label>
        <Select
          value={categoryId || 'uncategorized'}
          onValueChange={(v) =>
            onCategoryChange(v === 'uncategorized' ? null : v)
          }
        >
          <SelectTrigger>
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

      <div className="space-y-2">
        <Label>标签</Label>
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
