/**
 * TabCenterHeader - title, the weekly overview entry and the open / archive / rules
 * view switch of the tab center.
 */
import { useTranslation } from "react-i18next";
import { BarChart3, PanelsTopLeft } from "lucide-react";
import { Button, Tabs, TabsList, TabsTrigger } from "@hamhome/ui";

export type TabCenterView = "open" | "archive" | "rules";

interface TabCenterHeaderProps {
  view: TabCenterView;
  openCount: number;
  archiveCount: number;
  onViewChange: (view: TabCenterView) => void;
  onOpenOverview: () => void;
}

export function TabCenterHeader({
  view,
  openCount,
  archiveCount,
  onViewChange,
  onOpenOverview,
}: TabCenterHeaderProps) {
  const { t } = useTranslation("bookmark");
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <PanelsTopLeft className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">{t("tabCenter.title")}</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("tabCenter.pageDescription")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onOpenOverview} data-testid="tab-center-overview">
          <BarChart3 className="mr-1.5 h-4 w-4" />
          {t("tabCenter.overview.button")}
        </Button>
        <Tabs value={view} onValueChange={(value) => onViewChange(value as TabCenterView)}>
          <TabsList>
            <TabsTrigger value="open" data-testid="tab-center-view-open">
              {t("tabCenter.views.open")}
              <span className="ml-1.5 text-xs text-muted-foreground">{openCount}</span>
            </TabsTrigger>
            <TabsTrigger value="archive" data-testid="tab-center-view-archive">
              {t("tabCenter.views.archive")}
              <span className="ml-1.5 text-xs text-muted-foreground">{archiveCount}</span>
            </TabsTrigger>
            <TabsTrigger value="rules" data-testid="tab-center-view-rules">
              {t("tabCenter.views.rules")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
