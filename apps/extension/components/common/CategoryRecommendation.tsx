import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@hamhome/ui';

interface CategoryRecommendationProps {
  category: string;
  applying?: boolean;
  error?: string | null;
  onApply?: () => void;
}

export function CategoryRecommendation({ category, applying = false, error, onApply }: CategoryRecommendationProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 py-1.5 px-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sparkles className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-700 dark:text-amber-300 break-words">
            {t('bookmark:savePanel.aiRecommendedCategory')}
            <span className="font-medium">{category}</span>
          </span>
        </div>
        {onApply && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={applying}
            aria-busy={applying}
            className="h-6 shrink-0 px-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            onClick={onApply}
          >
            {applying && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {t(applying ? 'bookmark:savePanel.applyingCategory' : 'bookmark:savePanel.apply')}
          </Button>
        )}
      </div>
      {error && (
        <div role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}
    </div>
  );
}
