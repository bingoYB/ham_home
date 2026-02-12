import { useTranslation } from 'react-i18next';
import { Tag, Hash } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@hamhome/ui';

interface TagStatsCardsProps {
    totalTagsCount: number;
    avgPerBookmark: number;
    mostUsed: string;
    maxUsage: number;
}

export function TagStatsCards({
    totalTagsCount,
    avgPerBookmark,
    mostUsed,
    maxUsage
}: TagStatsCardsProps) {
    const { t } = useTranslation(['common', 'bookmark']);

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-lg">{t('bookmark:tags.stats.title')}</CardTitle>
                <CardDescription>{t('bookmark:tags.stats.totalTags', { count: totalTagsCount })}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-2 mb-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{t('bookmark:tags.stats.totalCount')}</span>
                        </div>
                        <p className="text-2xl font-semibold">{totalTagsCount}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-2 mb-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{t('bookmark:tags.stats.avgPerBookmark')}</span>
                        </div>
                        <p className="text-2xl font-semibold">
                            {avgPerBookmark.toFixed(1)}
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-muted-foreground">{t('bookmark:tags.stats.mostUsed')}</span>
                        </div>
                        <p className="text-lg font-semibold truncate">
                            {mostUsed || '-'}
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-muted-foreground">{t('bookmark:tags.stats.maxUsage')}</span>
                        </div>
                        <p className="text-2xl font-semibold">
                            {maxUsage}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
