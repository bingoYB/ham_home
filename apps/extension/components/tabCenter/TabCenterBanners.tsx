/**
 * Banners above the tab center views:
 * - automatic closing turned on by another device, waiting for this device's consent;
 * - "confirm" mode: tabs past the idle threshold waiting to be archived.
 */
import { useTranslation } from "react-i18next";
import { AlarmClock, ShieldAlert } from "lucide-react";
import { Button } from "@hamhome/ui";
import type { PendingArchiveConfirmation } from "@/types";

interface ConsentBannerProps {
  autoArchive: boolean;
  autoMakeRoom: boolean;
  onAccept: (kind: "autoArchive" | "autoMakeRoom") => void;
}

export function ConsentBanner({ autoArchive, autoMakeRoom, onAccept }: ConsentBannerProps) {
  const { t } = useTranslation("bookmark");
  if (!autoArchive && !autoMakeRoom) return null;
  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100" data-testid="tab-consent-banner">
      {autoArchive && (
        <div className="flex flex-wrap items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t("tabCenter.consent.autoArchive")}</span>
          <Button size="sm" variant="outline" onClick={() => onAccept("autoArchive")}>
            {t("tabCenter.consent.enableHere")}
          </Button>
        </div>
      )}
      {autoMakeRoom && (
        <div className="flex flex-wrap items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t("tabCenter.consent.autoMakeRoom")}</span>
          <Button size="sm" variant="outline" onClick={() => onAccept("autoMakeRoom")}>
            {t("tabCenter.consent.enableHere")}
          </Button>
        </div>
      )}
    </div>
  );
}

interface PendingConfirmBannerProps {
  pending: PendingArchiveConfirmation[];
  onConfirm: () => void;
  onKeep: () => void;
}

export function PendingConfirmBanner({ pending, onConfirm, onKeep }: PendingConfirmBannerProps) {
  const { t } = useTranslation("bookmark");
  if (pending.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100" data-testid="tab-pending-confirm">
      <AlarmClock className="h-4 w-4 shrink-0" />
      <span className="flex-1">{t("tabCenter.pending.message", { count: pending.length })}</span>
      <Button size="sm" variant="outline" onClick={onKeep}>
        {t("tabCenter.pending.keep")}
      </Button>
      <Button size="sm" onClick={onConfirm}>
        {t("tabCenter.pending.archive")}
      </Button>
    </div>
  );
}
