/**
 * 保存面板组件
 * 用于收藏和编辑书签
 */
import { useState, useEffect } from 'react';
import { Loader2, Check, Bookmark } from 'lucide-react';
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
import { AIStatus, type AIStatusType } from './AIStatus';
import { aiClient } from '@/lib/ai/client';
import { bookmarkStorage, snapshotStorage, configStorage } from '@/lib/storage';
import type { PageContent, LocalBookmark, LocalCategory } from '@/types';

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
  const [title, setTitle] = useState(pageContent.title);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiStatus, setAIStatus] = useState<AIStatusType>('idle');
  const [aiError, setAIError] = useState<string | null>(null);

  // 加载分类和标签列表
  useEffect(() => {
    const loadData = async () => {
      const [cats, existingTags] = await Promise.all([
        bookmarkStorage.getCategories(),
        bookmarkStorage.getAllTags(),
      ]);
      setCategories(cats);
      setAllTags(existingTags);
    };
    loadData();
  }, []);

  // 如果已存在书签，填充现有数据
  useEffect(() => {
    if (existingBookmark) {
      setTitle(existingBookmark.title);
      setDescription(existingBookmark.description);
      setCategoryId(existingBookmark.categoryId);
      setTags(existingBookmark.tags);
    }
  }, [existingBookmark]);

  // 自动触发 AI 分析（仅新书签）
  useEffect(() => {
    if (!existingBookmark && pageContent.content) {
      runAIAnalysis();
    }
  }, []);

  const runAIAnalysis = async () => {
    const config = await configStorage.getAIConfig();

    if (!config.enabled) {
      setAIStatus('disabled');
      return;
    }

    setAIStatus('loading');
    setAIError(null);

    try {
      await aiClient.loadConfig();

      if (!aiClient.isConfigured()) {
        setAIStatus('disabled');
        return;
      }

      const result = await aiClient.analyze({
        url: pageContent.url,
        title: pageContent.title,
        content: pageContent.content || pageContent.textContent,
      });

      // 更新表单（仅非空值）
      if (result.title && !existingBookmark) setTitle(result.title);
      if (result.summary) setDescription(result.summary);
      if (result.tags.length > 0) setTags(result.tags);

      // 查找匹配的分类
      if (result.category && categories.length > 0) {
        const matchedCategory = categories.find(
          (c) => c.name.toLowerCase() === result.category.toLowerCase()
        );
        if (matchedCategory) {
          setCategoryId(matchedCategory.id);
        }
      }

      setAIStatus('success');
    } catch (err: unknown) {
      setAIStatus('error');
      setAIError(err instanceof Error ? err.message : '分析失败');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);

    try {
      const settings = await configStorage.getSettings();

      const data = {
        url: pageContent.url,
        title: title.trim(),
        description: description.trim(),
        content: pageContent.content,
        categoryId,
        tags,
        favicon: pageContent.favicon,
        hasSnapshot: false,
      };

      let bookmark: LocalBookmark;

      if (existingBookmark) {
        // 更新现有书签
        bookmark = await bookmarkStorage.updateBookmark(existingBookmark.id, data);
      } else {
        // 创建新书签
        bookmark = await bookmarkStorage.createBookmark(data);
      }

      // 自动保存快照
      if (settings.autoSaveSnapshot && pageContent.content) {
        try {
          // 获取页面 HTML (通过 background script)
          const html = await chrome.runtime.sendMessage({ type: 'GET_PAGE_HTML' });
          if (html) {
            await snapshotStorage.saveSnapshot(bookmark.id, html);
            await bookmarkStorage.updateBookmark(bookmark.id, { hasSnapshot: true });
          }
        } catch (e) {
          console.warn('[SavePanel] Failed to save snapshot:', e);
        }
      }

      onSaved();
    } catch (err: unknown) {
      console.error('[SavePanel] Save failed:', err);
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* AI 状态提示 */}
      <AIStatus status={aiStatus} error={aiError} onRetry={runAIAnalysis} />

      {/* 已收藏提示 */}
      {existingBookmark && (
        <div className="flex items-center gap-2 p-2 bg-accent rounded-md text-sm">
          <Check className="h-4 w-4 text-green-500" />
          <span>此页面已收藏，可更新信息</span>
        </div>
      )}

      {/* 表单 */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-sm font-medium">
            标题
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入摘要或等待 AI 生成"
            rows={3}
            className="text-sm resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">分类</Label>
          <Select
            value={categoryId || 'uncategorized'}
            onValueChange={(v) => setCategoryId(v === 'uncategorized' ? null : v)}
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
          <Label className="text-sm font-medium">标签</Label>
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="输入标签后回车"
            maxTags={10}
            suggestions={allTags}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        <Button
          className="flex-1"
          onClick={handleSave}
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

