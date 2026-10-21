/**
 * TabAITriageDialog - AI tidy-up suggestions grouped by destination (keep, read
 * later, bookmark, workspace, close). Only titles and cleaned URLs are sent; every
 * group and every tab can be unchecked before applying.
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw, Settings2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hamhome/ui";
import { useTabAITriage } from "@/hooks/useTabAITriage";
import type { OpenTabInfo, OpenTabsSnapshot } from "@/types";
import { TriageGroupSection } from "./aiTriage/TriageGroupSection";

interface TabAITriageDialogProps {
  open: boolean;
  snapshot: OpenTabsSnapshot;
  tabs: Map<number, OpenTabInfo>;
  onOpenChange: (open: boolean) => void;
  onOpenAISettings: () => void;
}

export function TabAITriageDialog({ open, snapshot, tabs, onOpenChange, onOpenAISettings }: TabAITriageDialogProps) {
  const { t } = useTranslation("bookmark");
  const triage = useTabAITriage(snapshot);
  const { status, result, run } = triage;
  const wasOpen = useRef(false);

  // Ask when the dialog opens; a finished result stays until it is applied
  useEffect(() => {
    if (open && !wasOpen.current && status === "idle") void run();
    wasOpen.current = open;
  }, [open, run, status]);

  const notes = result
    ? [
        result.cachedCount > 0 ? t("tabCenter.aiTriage.cached", { count: result.cachedCount }) : null,
        result.skippedCount > 0 ? t("tabCenter.aiTriage.skipped", { count: result.skippedCount }) : null,
        result.failedCount > 0 ? t("tabCenter.aiTriage.partialFailure", { count: result.failedCount }) : null,
      ].filter(Boolean)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" data-testid="ai-triage-dialog">
        <DialogHeader>
          <DialogTitle>{t("tabCenter.aiTriage.title")}</DialogTitle>
          <DialogDescription>
            {result
              ? t("tabCenter.aiTriage.description", { count: result.analyzedCount })
              : t("tabCenter.aiTriage.privacy")}
          </DialogDescription>
        </DialogHeader>

        {status === "loading" || status === "idle" ? (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            {t("tabCenter.aiTriage.loading", { count: snapshot.tabs.length })}
          </div>
        ) : status === "notConfigured" ? (
          <div className="space-y-3 py-6 text-center text-sm" data-testid="ai-triage-not-configured">
            <p>{t("tabCenter.aiTriage.notConfigured")}</p>
            <p className="text-xs text-muted-foreground">{t("tabCenter.aiTriage.notConfiguredHint")}</p>
            <Button size="sm" onClick={onOpenAISettings}>
              <Settings2 className="mr-1.5 h-4 w-4" />
              {t("tabCenter.aiTriage.openSettings")}
            </Button>
          </div>
        ) : status === "error" ? (
          <div className="space-y-3 py-6 text-center text-sm">
            <p className="text-destructive">{t("tabCenter.aiTriage.failed")}</p>
            {triage.error && <p className="break-all text-xs text-muted-foreground">{triage.error}</p>}
          </div>
        ) : triage.groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("tabCenter.aiTriage.nothing")}</p>
        ) : (
          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {notes.length > 0 && <p className="text-xs text-muted-foreground">{notes.join(" · ")}</p>}
            {triage.groups.map((group) => (
              <TriageGroupSection
                key={group.destination}
                group={group}
                tabs={tabs}
                selected={triage.selected}
                onToggle={triage.toggle}
              />
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" disabled={status === "loading" || triage.applying} onClick={() => void run()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t("tabCenter.aiTriage.rerun")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("tabCenter.tidyUp.cancel")}
            </Button>
            <Button
              disabled={status !== "ready" || triage.applying || triage.selected.size === 0}
              onClick={async () => {
                if (await triage.apply()) onOpenChange(false);
              }}
              data-testid="ai-triage-apply"
            >
              {triage.applying && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("tabCenter.aiTriage.apply", { count: triage.selected.size })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
