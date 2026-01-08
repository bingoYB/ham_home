/**
 * 编辑书签弹窗组件
 */
import { useState, useEffect } from 'react';
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
import { bookmarkStorage } from '@/lib/storage';
import type { LocalBookmark, LocalCategory } from '@/types';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 加载分类和标签
  useEffect(() => {
    if (open) {
      Promise.all([
        bookmarkStorage.getCategories(),
        bookmarkStorage.getAllTags(),
      ]).then(([cats, existingTags]) => {
        setCategories(cats);
        setAllTags(existingTags);
      });
    }
  }, [open]);

  // 填充表单数据
  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setDescription(bookmark.description);
      setCategoryId(bookmark.categoryId);
      setTags(bookmark.tags);
    }
  }, [bookmark]);

  const handleSave = async () => {
    if (!bookmark || !title.trim()) return;

    setSaving(true);
    try {
      await bookmarkStorage.updateBookmark(bookmark.id, {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        tags,
      });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('[EditBookmarkDialog] Save error:', err);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!bookmark) return;

    if (!confirm('确定要删除这个书签吗？')) return;

    setDeleting(true);
    try {
      await bookmarkStorage.deleteBookmark(bookmark.id);
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      console.error('[EditBookmarkDialog] Delete error:', err);
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px]">
        <DialogHeader>
          <DialogTitle>编辑书签</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">标题</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">摘要</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入摘要"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>分类</Label>
            <Select
              value={categoryId || 'uncategorized'}
              onValueChange={(v) =>
                setCategoryId(v === 'uncategorized' ? null : v)
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
              onChange={setTags}
              placeholder="输入标签后回车"
              maxTags={10}
              suggestions={allTags}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
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
              onClick={handleSave}
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

