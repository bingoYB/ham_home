/**
 * TagsPage 标签管理页面
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Hash } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';

export function TagsPage() {
  const { t } = useTranslation(['common', 'bookmark']);
  const { bookmarks, allTags } = useBookmarks();

  // 统计每个标签的使用次数
  const tagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    bookmarks.forEach(b => {
      b.tags.forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });
    return stats;
  }, [bookmarks]);

  // 按使用次数排序
  const sortedTags = useMemo(() => {
    return [...allTags].sort((a, b) => (tagStats[b] || 0) - (tagStats[a] || 0));
  }, [allTags, tagStats]);

  // 获取标签颜色（根据使用频率）
  const getTagColor = (count: number) => {
    const maxCount = Math.max(...Object.values(tagStats), 1);
    const ratio = count / maxCount;
    
    if (ratio > 0.7) return 'bg-primary text-primary-foreground';
    if (ratio > 0.4) return 'bg-primary/70 text-primary-foreground';
    if (ratio > 0.2) return 'bg-primary/50 text-primary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">{t('bookmark:tags.title')}</h1>
        <p className="text-muted-foreground">{t('bookmark:tags.description')}</p>
      </div>

      {/* 标签统计 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('bookmark:tags.stats.title')}</CardTitle>
          <CardDescription>{t('bookmark:tags.stats.totalTags', { count: allTags.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('bookmark:tags.stats.totalCount')}</span>
              </div>
              <p className="text-2xl font-semibold">{allTags.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('bookmark:tags.stats.avgPerBookmark')}</span>
              </div>
              <p className="text-2xl font-semibold">
                {bookmarks.length > 0 
                  ? (bookmarks.reduce((sum, b) => sum + b.tags.length, 0) / bookmarks.length).toFixed(1)
                  : '0'
                }
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">{t('bookmark:tags.stats.mostUsed')}</span>
              </div>
              <p className="text-lg font-semibold truncate">
                {sortedTags[0] || '-'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">{t('bookmark:tags.stats.maxUsage')}</span>
              </div>
              <p className="text-2xl font-semibold">
                {Math.max(...Object.values(tagStats), 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 标签云 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('bookmark:tags.cloud.title')}</CardTitle>
          <CardDescription>{t('bookmark:tags.cloud.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sortedTags.map(tag => (
                <Badge
                  key={tag}
                  className={`px-3 py-1.5 text-sm cursor-default ${getTagColor(tagStats[tag] || 0)}`}
                >
                  {tag}
                  <span className="ml-1.5 opacity-70">({tagStats[tag]})</span>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t('bookmark:tags.empty')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

