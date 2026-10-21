/**
 * ReadLaterStats - queue health: unread count, items expiring within three days
 * and the 30-day completion rate (read / (read + expired)).
 */
import { useTranslation } from "react-i18next";
import { AlarmClock, CheckCircle2, Inbox } from "lucide-react";

interface ReadLaterStatsProps {
  unread: number;
  expiringSoon: number;
  completion: { read: number; expired: number; rate: number | null };
  onShowExpiring: () => void;
}

export function ReadLaterStats({ unread, expiringSoon, completion, onShowExpiring }: ReadLaterStatsProps) {
  const { t } = useTranslation("bookmark");

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border bg-card px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5">
        <Inbox className="h-4 w-4 text-primary" />
        {t("readLater.stats.unread", { count: unread })}
      </span>
      {expiringSoon > 0 && (
        <button
          type="button"
          onClick={onShowExpiring}
          className="flex items-center gap-1.5 text-amber-700 hover:underline dark:text-amber-400"
          data-testid="read-later-expiring-soon"
        >
          <AlarmClock className="h-4 w-4" />
          {t("readLater.stats.expiringSoon", { count: expiringSoon })}
        </button>
      )}
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        {completion.rate == null
          ? t("readLater.stats.noCompletion")
          : t("readLater.stats.completion", {
              rate: Math.round(completion.rate * 100),
              read: completion.read,
              expired: completion.expired,
            })}
      </span>
    </div>
  );
}

export default ReadLaterStats;
