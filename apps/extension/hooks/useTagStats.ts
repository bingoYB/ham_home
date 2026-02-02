import { useMemo } from 'react';
import { LocalBookmark } from '../types';

interface UseTagStatsResult {
    tagStats: Record<string, number>;
    sortedTags: string[];
    maxUsage: number;
    avgPerBookmark: number;
    mostUsedKey: string;
}

/**
 * 统计标签数据的 Hook
 * @param bookmarks 书签列表
 * @param allTags 所有标签列表
 */
export function useTagStats(bookmarks: LocalBookmark[], allTags: string[]): UseTagStatsResult {
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

    // 计算最大使用次数
    const maxUsage = useMemo(() => {
        return Math.max(...Object.values(tagStats), 0);
    }, [tagStats]);

    // 计算平均每书签标签数
    const avgPerBookmark = useMemo(() => {
        return bookmarks.length > 0
            ? bookmarks.reduce((sum, b) => sum + b.tags.length, 0) / bookmarks.length
            : 0;
    }, [bookmarks]);

    // 计算最常用标签
    const mostUsedKey = sortedTags[0] || '';

    return {
        tagStats,
        sortedTags,
        maxUsage,
        avgPerBookmark,
        mostUsedKey
    };
}
