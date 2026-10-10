/**
 * TabLifecycleOnboarding - first visit of the tab center / first time turning on
 * auto archive: shows what would happen before anything is closed.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from "@hamhome/ui";
import type {
  OnboardingOutcome,
  UseTabLifecycleOnboardingResult,
} from "@/hooks/useTabLifecycleOnboarding";

interface TabLifecycleOnboardingProps {
  open: boolean;
  onboarding: UseTabLifecycleOnboardingResult;
  onOpenChange: (open: boolean) => void;
  onDone: (outcome: OnboardingOutcome) => void;
}

function ChoiceCard({ selected, title, description, onSelect }: { selected: boolean; title: string; description: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

export function TabLifecycleOnboarding({ open, onboarding, onOpenChange, onDone }: TabLifecycleOnboardingProps) {
  const { t } = useTranslation("bookmark");
  const [outcome, setOutcome] = useState<OnboardingOutcome | null>(null);
  const { summary, step } = onboarding;

  const finish = async () => {
    setOutcome(await onboarding.finish());
    onboarding.setStep(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="tab-onboarding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            {t("tabCenter.onboarding.title")}
          </DialogTitle>
          <DialogDescription>{t(`tabCenter.onboarding.steps.${step}`)}</DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-3 text-sm leading-relaxed">
              {t("tabCenter.onboarding.summary", {
                tabs: summary.tabs,
                windows: summary.windows,
                stale: summary.stale,
                duplicates: summary.duplicateGroups,
              })}
              {summary.estimated && (
                <p className="mt-1 text-xs text-muted-foreground">{t("tabCenter.onboarding.estimated")}</p>
              )}
            </div>
            <div className="space-y-2" role="radiogroup">
              <ChoiceCard
                selected={onboarding.plan === "recommended"}
                title={t("tabCenter.onboarding.plan.recommended")}
                description={t("tabCenter.onboarding.plan.recommendedDesc")}
                onSelect={() => onboarding.setPlan("recommended")}
              />
              <ChoiceCard
                selected={onboarding.plan === "custom"}
                title={t("tabCenter.onboarding.plan.custom")}
                description={t("tabCenter.onboarding.plan.customDesc")}
                onSelect={() => onboarding.setPlan("custom")}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2" role="radiogroup" aria-label={t("tabCenter.onboarding.existing.label")}>
              <ChoiceCard
                selected={onboarding.existingTabs === "fromToday"}
                title={t("tabCenter.onboarding.existing.fromToday")}
                description={t("tabCenter.onboarding.existing.fromTodayDesc")}
                onSelect={() => onboarding.setExistingTabs("fromToday")}
              />
              <ChoiceCard
                selected={onboarding.existingTabs === "tidyNow"}
                title={t("tabCenter.onboarding.existing.tidyNow")}
                description={t("tabCenter.onboarding.existing.tidyNowDesc")}
                onSelect={() => onboarding.setExistingTabs("tidyNow")}
              />
            </div>
            <div className="space-y-2 rounded-xl border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                {t("tabCenter.onboarding.protection.title")}
              </p>
              <p className="text-xs text-muted-foreground">{t("tabCenter.rules.protection.alwaysOn")}</p>
              {onboarding.recommendedDomains.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium">{t("tabCenter.onboarding.protection.recommended")}</p>
                  {onboarding.recommendedDomains.map((domain) => (
                    <label key={domain} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={onboarding.selectedDomains.has(domain)} onCheckedChange={() => onboarding.toggleDomain(domain)} />
                      {domain}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium">{t("tabCenter.onboarding.done")}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {step < 2 ? (
            <Button
              variant="ghost"
              onClick={async () => {
                await onboarding.skip();
                onOpenChange(false);
              }}
            >
              {t("tabCenter.onboarding.skip")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {step === 1 && (
              <Button variant="outline" onClick={() => onboarding.setStep(0)}>
                {t("tabCenter.onboarding.back")}
              </Button>
            )}
            {step === 0 && <Button onClick={() => onboarding.setStep(1)}>{t("tabCenter.onboarding.next")}</Button>}
            {step === 1 && (
              <Button onClick={() => void finish()} disabled={onboarding.saving} data-testid="tab-onboarding-enable">
                {onboarding.saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {t("tabCenter.onboarding.enable")}
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  if (outcome) onDone(outcome);
                }}
              >
                {t("tabCenter.onboarding.start")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TabLifecycleOnboarding;
