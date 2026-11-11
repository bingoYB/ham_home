import { useTranslation } from 'react-i18next';
import {
  Button, Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@hamhome/ui';
import type { ImportFailure } from '@/types/bookmark-import';

interface ImportFailuresDialogProps {
  failures: readonly ImportFailure[];
}

export function ImportFailuresDialog({ failures }: ImportFailuresDialogProps) {
  const { t } = useTranslation('settings');
  const importCount = failures.filter((failure) => failure.stage === 'import').length;
  const aiCount = failures.length - importCount;
  if (!failures.length) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-amber-700 dark:text-amber-400">
          {t('settings.importExport.failures.view', { count: failures.length })}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('settings.importExport.failures.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.importExport.failures.description', { importCount, aiCount })}
          </DialogDescription>
        </DialogHeader>
        <ol className="min-h-0 space-y-3 overflow-y-auto pr-1" aria-label={t('settings.importExport.failures.title')}>
          {failures.map((failure, index) => (
            <li key={`${index}-${failure.stage}`} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words font-medium">
                  {index + 1}. {failure.title || t('settings.importExport.failures.untitled')}
                </p>
                <span className="shrink-0 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                  {t(`settings.importExport.failures.stages.${failure.stage}`)}
                </span>
              </div>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {failure.url || t('settings.importExport.failures.noUrl')}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-destructive">
                {t('settings.importExport.failures.reason', {
                  reason: failure.message || t(`settings.importExport.failures.reasons.${failure.code}`),
                })}
              </p>
              {failure.stage === 'ai' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('settings.importExport.failures.aiSaved')}
                </p>
              )}
            </li>
          ))}
        </ol>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('settings.importExport.failures.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
