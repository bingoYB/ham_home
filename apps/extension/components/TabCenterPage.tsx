/**
 * TabCenterPage - the tab center: open tabs, archive and rules, with the first-run
 * onboarding, consent and confirmation banners.
 * Route: #tabs, #tabs?view=archive, #tabs?view=rules
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { ConsentBanner, PendingConfirmBanner } from "@/components/tabCenter/TabCenterBanners";
import { TabCenterHeader, type TabCenterView } from "@/components/tabCenter/TabCenterHeader";
import { OpenTabsView } from "@/components/tabCenter/OpenTabsView";
import { TabArchiveView } from "@/components/tabCenter/TabArchiveView";
import { TabLifecycleOnboarding } from "@/components/tabCenter/TabLifecycleOnboarding";
import { TabRulesView } from "@/components/tabCenter/TabRulesView";
import { TabWeeklyOverviewDialog } from "@/components/tabCenter/TabWeeklyOverviewDialog";
import { useOpenTabActions } from "@/hooks/useOpenTabActions";
import { useOpenTabsSnapshot } from "@/hooks/useOpenTabsSnapshot";
import { useTabArchiveCount } from "@/hooks/useTabArchive";
import { useTabLifecycleOnboarding, type OnboardingOutcome } from "@/hooks/useTabLifecycleOnboarding";
import { useTabLifecycleSettings } from "@/hooks/useTabLifecycleSettings";
import { getBackgroundService } from "@/lib/services";

interface TabCenterPageProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

function readView(currentView: string): TabCenterView {
  const view = new URLSearchParams(currentView.split("?")[1] ?? "").get("view");
  return view === "archive" || view === "rules" ? view : "open";
}

export function TabCenterPage({ currentView, onViewChange }: TabCenterPageProps) {
  const { t } = useTranslation("bookmark");
  const view = readView(currentView);
  const { snapshot, loading } = useOpenTabsSnapshot();
  const lifecycle = useTabLifecycleSettings();
  const archiveCount = useTabArchiveCount().count;
  const actions = useOpenTabActions();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [preselect, setPreselect] = useState<number[]>([]);
  const onboarding = useTabLifecycleOnboarding(snapshot, lifecycle, onboardingOpen);
  const autoOpened = useRef(false);

  // First visit: show the guidance before anything can be turned on. When another
  // device already turned auto archive on, the consent banner asks instead, so its
  // synced settings are kept
  useEffect(() => {
    if (lifecycle.loading || autoOpened.current) return;
    autoOpened.current = true;
    if (!lifecycle.state.onboardingCompletedAt && !lifecycle.settings.autoArchive.enabled) {
      setOnboardingOpen(true);
    }
  }, [lifecycle.loading, lifecycle.settings.autoArchive.enabled, lifecycle.state.onboardingCompletedAt]);

  const setView = (next: TabCenterView) => onViewChange(next === "open" ? "tabs" : `tabs?view=${next}`);

  const enableAutoArchive = () => {
    if (lifecycle.pendingConsents.autoArchive) void lifecycle.acceptConsent("autoArchive");
    else if (!lifecycle.state.onboardingCompletedAt) setOnboardingOpen(true);
    else void lifecycle.setAutoArchiveEnabled(true);
  };

  const handleOnboardingDone = (outcome: OnboardingOutcome) => {
    if (outcome.openRules) setView("rules");
    else if (outcome.tidyTabIds.length > 0) {
      setPreselect(outcome.tidyTabIds);
      setView("open");
    }
  };

  const clearPreselect = useCallback(() => setPreselect([]), []);

  const header = (
    <div className="space-y-4">
      <TabCenterHeader
        view={view}
        openCount={snapshot?.stats.total ?? 0}
        archiveCount={archiveCount}
        onViewChange={setView}
        onOpenOverview={() => setOverviewOpen(true)}
      />
      <ConsentBanner
        autoArchive={lifecycle.pendingConsents.autoArchive}
        autoMakeRoom={lifecycle.pendingConsents.autoMakeRoom}
        onAccept={(kind) => void lifecycle.acceptConsent(kind)}
      />
      {snapshot && (
        <PendingConfirmBanner
          pending={snapshot.pendingConfirm}
          onConfirm={() => void actions.confirmPending()}
          onKeep={() => void actions.keepPending()}
        />
      )}
    </div>
  );

  return (
    <>
      {view === "archive" ? (
        <TabArchiveView header={header} />
      ) : view === "rules" ? (
        <TabRulesView
          header={header}
          snapshot={snapshot}
          lifecycle={lifecycle}
          onEnableAutoArchive={enableAutoArchive}
          onResumeNudge={() => void getBackgroundService().resumeBudgetNudge()}
        />
      ) : snapshot ? (
        <OpenTabsView
          snapshot={snapshot}
          header={header}
          preselectTabIds={preselect}
          onPreselectConsumed={clearPreselect}
          onOpenAISettings={() => onViewChange("settings?tab=ai")}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        </div>
      )}
      <TabWeeklyOverviewDialog
        open={overviewOpen}
        budgetLimit={lifecycle.settings.budget.enabled ? lifecycle.settings.budget.limit : undefined}
        onOpenChange={setOverviewOpen}
      />
      <TabLifecycleOnboarding
        open={onboardingOpen}
        onboarding={onboarding}
        onOpenChange={setOnboardingOpen}
        onDone={handleOnboardingDone}
      />
    </>
  );
}

export default TabCenterPage;
