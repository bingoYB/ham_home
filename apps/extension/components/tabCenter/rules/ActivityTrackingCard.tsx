/**
 * ActivityTrackingCard - local tab activity tracking: what it is for, where it is
 * stored, and turning it off (which stops it and wipes the records).
 */
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Switch, confirm } from "@hamhome/ui";
import { RuleRow } from "./RuleRow";

interface ActivityTrackingCardProps {
  enabled: boolean;
  onChange: (enabled: boolean) => Promise<void>;
}

export function ActivityTrackingCard({ enabled, onChange }: ActivityTrackingCardProps) {
  const { t } = useTranslation(["bookmark", "common"]);

  const toggle = async (next: boolean) => {
    if (!next) {
      const accepted = await confirm({
        title: t("bookmark:tabCenter.rules.tracking.offTitle"),
        description: t("bookmark:tabCenter.rules.tracking.offDescription"),
        confirmText: t("bookmark:tabCenter.rules.tracking.offConfirm"),
        cancelText: t("common:common.cancel"),
        variant: "destructive",
      });
      if (!accepted) return;
    }
    await onChange(next);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("bookmark:tabCenter.rules.tracking.title")}</CardTitle>
        </div>
        <CardDescription>{t("bookmark:tabCenter.rules.tracking.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RuleRow
          label={t("bookmark:tabCenter.rules.tracking.label")}
          description={t("bookmark:tabCenter.rules.tracking.privacy")}
          htmlFor="tab-activity-tracking"
        >
          <Switch id="tab-activity-tracking" checked={enabled} onCheckedChange={(value) => void toggle(value)} />
        </RuleRow>
      </CardContent>
    </Card>
  );
}

export default ActivityTrackingCard;
