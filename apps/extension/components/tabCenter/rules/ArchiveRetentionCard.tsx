/**
 * ArchiveRetentionCard - how long archived tabs are kept, and clearing the archive.
 */
import { useTranslation } from "react-i18next";
import { History, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  confirm,
} from "@hamhome/ui";
import { ARCHIVE_MAX_ENTRIES, ARCHIVE_RETENTION_OPTIONS } from "@/lib/tabs/tab-archive.utils";
import type { TabArchiveRetentionDays } from "@/types";
import { RuleRow } from "./RuleRow";

interface ArchiveRetentionCardProps {
  retentionDays: TabArchiveRetentionDays;
  entryCount: number;
  onChange: (retentionDays: TabArchiveRetentionDays) => void;
  onClear: () => Promise<void>;
}

export function ArchiveRetentionCard({ retentionDays, entryCount, onChange, onClear }: ArchiveRetentionCardProps) {
  const { t } = useTranslation(["bookmark", "common"]);

  const clear = async () => {
    const accepted = await confirm({
      title: t("bookmark:tabCenter.rules.retention.clearTitle"),
      description: t("bookmark:tabCenter.rules.retention.clearDescription", { count: entryCount }),
      confirmText: t("bookmark:tabCenter.rules.retention.clearConfirm"),
      cancelText: t("common:common.cancel"),
      variant: "destructive",
    });
    if (accepted) await onClear();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("bookmark:tabCenter.rules.retention.title")}</CardTitle>
        </div>
        <CardDescription>
          {t("bookmark:tabCenter.rules.retention.description", { max: ARCHIVE_MAX_ENTRIES.toLocaleString() })}
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <RuleRow label={t("bookmark:tabCenter.rules.retention.keep")}>
          <Select
            value={String(retentionDays)}
            onValueChange={(value) => onChange(value === "null" ? null : (Number(value) as 30 | 90 | 180))}
          >
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ARCHIVE_RETENTION_OPTIONS.map((days) => (
                <SelectItem key={String(days)} value={String(days)}>
                  {days == null ? t("bookmark:tabCenter.rules.retention.forever") : t("bookmark:tabCenter.rules.retention.days", { count: days })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RuleRow>
        <RuleRow label={t("bookmark:tabCenter.rules.retention.clear")} description={t("bookmark:tabCenter.rules.retention.count", { count: entryCount })}>
          <Button variant="outline" size="sm" className="text-destructive" disabled={entryCount === 0} onClick={() => void clear()}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t("bookmark:tabCenter.rules.retention.clear")}
          </Button>
        </RuleRow>
      </CardContent>
    </Card>
  );
}

export default ArchiveRetentionCard;
