import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Badge,
    Button,
} from '@hamhome/ui';

interface TagCloudProps {
    sortedTags: string[];
    tagStats: Record<string, number>;
    maxUsage: number;
}

const PAGE_SIZE = 100;

export function TagCloud({ sortedTags, tagStats, maxUsage }: TagCloudProps) {
    const { t } = useTranslation(['common', 'bookmark']);
    const [limit, setLimit] = useState(PAGE_SIZE);

    const visibleTags = sortedTags.slice(0, limit);
    const hasMore = limit < sortedTags.length;

    const handleLoadMore = useCallback(() => {
        setLimit(prev => prev + PAGE_SIZE);
    }, []);

    // 获取标签颜色（根据使用频率）
    const getTagColor = (count: number) => {
        const maxCount = Math.max(maxUsage, 1);
        const ratio = count / maxCount;

        if (ratio > 0.7) return 'bg-primary text-primary-foreground';
        if (ratio > 0.4) return 'bg-primary/70 text-primary-foreground';
        if (ratio > 0.2) return 'bg-primary/50 text-primary-foreground';
        return 'bg-muted text-muted-foreground';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{t('bookmark:tags.cloud.title')}</CardTitle>
                <CardDescription>{t('bookmark:tags.cloud.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {sortedTags.length > 0 ? (
                    <div>
                        <div className="flex flex-wrap gap-2">
                            {visibleTags.map(tag => (
                                <Badge
                                    key={tag}
                                    className={`px-3 py-1.5 text-sm cursor-default ${getTagColor(tagStats[tag] || 0)}`}
                                >
                                    {tag}
                                    <span className="ml-1.5 opacity-70">({tagStats[tag]})</span>
                                </Badge>
                            ))}
                        </div>
                        {hasMore && (
                            <div className="mt-6 text-center">
                                <Button variant="outline" onClick={handleLoadMore}>
                                    {t('common:common:loadMore') || 'Load More'}
                                </Button>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {t('bookmark:tags.cloud.showing', { count: visibleTags.length, total: sortedTags.length }) || `${visibleTags.length} / ${sortedTags.length}`}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        {t('bookmark:tags.empty')}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
