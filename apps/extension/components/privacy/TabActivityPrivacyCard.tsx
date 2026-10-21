/**
 * TabActivityPrivacyCard - discloses what tab activity tracking, the tab archive and
 * the local stats record, where they are kept and how to turn tracking off.
 */
import { useTranslation } from "react-i18next";
import { Activity, Archive, BarChart3, ChevronRight, HardDrive } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hamhome/ui";

interface TabActivityPrivacyCardProps {
  trackingEnabled: boolean;
  onOpenRules: () => void;
}

const ITEMS = [
  { key: "what", icon: <Activity className="mt-0.5 h-5 w-5 text-primary" /> },
  { key: "where", icon: <HardDrive className="mt-0.5 h-5 w-5 text-emerald-500" /> },
  { key: "archive", icon: <Archive className="mt-0.5 h-5 w-5 text-amber-500" /> },
  { key: "stats", icon: <BarChart3 className="mt-0.5 h-5 w-5 text-sky-500" /> },
] as const;

export function TabActivityPrivacyCard({ trackingEnabled, onOpenRules }: TabActivityPrivacyCardProps) {
  const { t } = useTranslation("settings");

  return (
    <Card className="mb-6" data-testid="tab-activity-privacy">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("settings.privacy.tabActivity.title")}</CardTitle>
        </div>
        <CardDescription>
          {trackingEnabled
            ? t("settings.privacy.tabActivity.descriptionOn")
            : t("settings.privacy.tabActivity.descriptionOff")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ITEMS.map((item) => (
          <div key={item.key} className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              {item.icon}
              <div>
                <h4 className="mb-1 font-medium text-foreground">
                  {t(`settings.privacy.tabActivity.${item.key}`)}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(`settings.privacy.tabActivity.${item.key}Desc`)}
                </p>
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={onOpenRules}>
          {t("settings.privacy.tabActivity.manage")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default TabActivityPrivacyCard;
