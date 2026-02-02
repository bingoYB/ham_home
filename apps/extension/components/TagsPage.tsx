/**
 * TagsPage 标签管理页面
 */
import { useBookmarks } from '@/contexts/BookmarkContext';
import { useTagStats } from '../hooks/useTagStats';
import { TagStatsCards } from './tags/TagStatsCards';
import { TagCloud } from './tags/TagCloud';


export function TagsPage() {
  const { bookmarks, allTags } = useBookmarks();

  const {
    tagStats,
    sortedTags,
    maxUsage,
    avgPerBookmark,
    mostUsedKey
  } = useTagStats(bookmarks, allTags);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <TagStatsCards
        totalTagsCount={allTags.length}
        avgPerBookmark={avgPerBookmark}
        mostUsed={mostUsedKey}
        maxUsage={maxUsage}
      />

      <TagCloud
        sortedTags={sortedTags}
        tagStats={tagStats}
        maxUsage={maxUsage}
      />
    </div>
  );
}

