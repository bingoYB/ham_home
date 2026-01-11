/**
 * Popup App - 主入口
 * 参考 NewBookmarkModal 设计风格优化
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, List, Settings, Loader2, Sparkles } from 'lucide-react';
import { Button, cn, Toaster } from '@hamhome/ui';
import { SavePanel } from '@/components/SavePanel';
import { BookmarkList } from '@/components/BookmarkList';
import { useCurrentPage } from '@/hooks/useCurrentPage';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import type { LocalBookmark } from '@/types';
import '../../style.css';

type ViewType = 'save' | 'list';

export function App() {
  const { t } = useTranslation(['common', 'bookmark']);
  const [view, setView] = useState<ViewType>('save');
  const [existingBookmark, setExistingBookmark] = useState<LocalBookmark | null>(
    null
  );
  const { pageContent, loading, error } = useCurrentPage();

  // 检查当前页面是否已收藏
  useEffect(() => {
    if (pageContent?.url) {
      bookmarkStorage.getBookmarkByUrl(pageContent.url).then(setExistingBookmark);
    }
  }, [pageContent?.url]);

  // 刷新书签状态
  const refreshBookmarkStatus = async () => {
    if (pageContent?.url) {
      const bookmark = await bookmarkStorage.getBookmarkByUrl(pageContent.url);
      setExistingBookmark(bookmark);
    }
  };

  return (
    <div className="w-[420px] h-[560px] flex flex-col bg-background text-foreground">
      {/* 顶部 Header - 渐变背景 */}
      <header className="shrink-0 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 border-b border-border">
        <div className="px-4 py-3">
          {/* Logo 和标题 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-sm">
                <span className="text-lg">🐹</span>
              </div>
              <span className="font-semibold text-lg text-foreground">HamHome</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('app.html#settings') })}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title={t('common:common.openSettings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* 视图切换标签 */}
          <div className="flex gap-1 p-1 bg-background/50 rounded-lg">
            <button
              onClick={() => setView('save')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                view === 'save'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Bookmark className="h-4 w-4" />
              {t('bookmark:popup.save')}
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                view === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" />
              {t('bookmark:popup.bookmarkList')}
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        {view === 'save' && (
          <>
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState error={error} onViewList={() => setView('list')} />
            ) : pageContent ? (
              <SavePanel
                pageContent={pageContent}
                existingBookmark={existingBookmark}
                onSaved={() => {
                  refreshBookmarkStatus();
                  // 保存成功后关闭 popup
                  window.close();
                }}
                onClose={() => window.close()}
                onDelete={() => window.close()}
              />
            ) : null}
          </>
        )}
        {view === 'list' && <BookmarkList />}
      </main>

      {/* 底部状态栏 */}
      <footer className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground text-center shrink-0">
        <div className="flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" />
          <span>{t('bookmark:popup.shortcut')}: ⌘/Ctrl + Shift + E</span>
        </div>
      </footer>

      <Toaster position="top-center" />
    </div>
  );
}

// 加载状态
function LoadingState() {
  const { t } = useTranslation('bookmark');
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground">{t('popup.loadingPage')}</p>
        <p className="text-sm text-muted-foreground mt-1">{t('popup.pleaseWait')}</p>
      </div>
    </div>
  );
}

// 错误状态
interface ErrorStateProps {
  error: string;
  onViewList: () => void;
}

function ErrorState({ error, onViewList }: ErrorStateProps) {
  const { t } = useTranslation('bookmark');
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
        <span className="text-4xl">😅</span>
      </div>
      <div>
        <p className="font-medium text-foreground mb-1">{t('popup.cannotGetPage')}</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onViewList}
        className="mt-2"
      >
        <List className="h-4 w-4 mr-2" />
        {t('popup.viewBookmarkList')}
      </Button>
    </div>
  );
}
