/**
 * Popup App - 主入口
 * 双视图切换：保存面板 / 书签列表
 */
import { useState, useEffect } from 'react';
import { Bookmark, List, Settings, Loader2 } from 'lucide-react';
import { Button, cn } from '@hamhome/ui';
import { SavePanel } from '@/components/SavePanel';
import { BookmarkList } from '@/components/BookmarkList';
import { useCurrentPage } from '@/hooks/useCurrentPage';
import { bookmarkStorage } from '@/lib/storage';
import type { LocalBookmark } from '@/types';
import '../../style.css';

type ViewType = 'save' | 'list';

export function App() {
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
    <div className="w-[400px] h-[520px] flex flex-col bg-background text-foreground">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐹</span>
          <span className="font-semibold text-lg">HamHome</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={view === 'save' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('save')}
            className="h-8 px-3"
          >
            <Bookmark className="h-4 w-4 mr-1" />
            收藏
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            className="h-8 px-3"
          >
            <List className="h-4 w-4 mr-1" />
            列表
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => chrome.runtime.openOptionsPage()}
            className="h-8 w-8 p-0"
            title="设置"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        {view === 'save' && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">正在获取页面内容...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
                <div className="text-4xl">😅</div>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView('list')}
                >
                  查看书签列表
                </Button>
              </div>
            ) : pageContent ? (
              <SavePanel
                pageContent={pageContent}
                existingBookmark={existingBookmark}
                onSaved={refreshBookmarkStatus}
              />
            ) : null}
          </>
        )}
        {view === 'list' && <BookmarkList />}
      </main>

      {/* 底部状态栏 */}
      <footer className="px-4 py-2 border-t text-xs text-muted-foreground text-center shrink-0">
        快捷键: ⌘/Ctrl + Shift + E
      </footer>
    </div>
  );
}
