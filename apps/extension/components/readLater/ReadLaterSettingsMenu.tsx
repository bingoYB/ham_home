/**
 * ReadLaterSettingsMenu - read later options in the page's top menu:
 * close the tab on add, expiry period, AI TL;DR and snapshot on add.
 */
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hamhome/ui";
import { READ_LATER_EXPIRY_OPTIONS } from "@/lib/tabs/tab-lifecycle-settings.utils";
import type { ReadLaterAutoSummary, ReadLaterSettings } from "@/types";

interface ReadLaterSettingsMenuProps {
  settings: ReadLaterSettings;
  onChange: (patch: Partial<ReadLaterSettings>) => void;
}

const SUMMARY_OPTIONS: ReadLaterAutoSummary[] = ["manual-only", "all", "off"];

export function ReadLaterSettingsMenu({ settings, onChange }: ReadLaterSettingsMenuProps) {
  const { t } = useTranslation("bookmark");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" data-testid="read-later-settings">
          <Settings2 className="h-4 w-4" />
          {t("readLater.settings.title")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuCheckboxItem
          checked={settings.closeTabOnAdd}
          onCheckedChange={(checked) => onChange({ closeTabOnAdd: checked === true })}
        >
          {t("readLater.settings.closeTabOnAdd")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={settings.saveSnapshotOnAdd}
          onCheckedChange={(checked) => onChange({ saveSnapshotOnAdd: checked === true })}
        >
          {t("readLater.settings.saveSnapshotOnAdd")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("readLater.settings.expireAfter")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(settings.expireAfterDays)}
          onValueChange={(value) =>
            onChange({ expireAfterDays: value === "null" ? null : (Number(value) as 14 | 30 | 60) })
          }
        >
          {READ_LATER_EXPIRY_OPTIONS.map((days) => (
            <DropdownMenuRadioItem key={String(days)} value={String(days)}>
              {days == null ? t("readLater.settings.never") : t("readLater.settings.days", { count: days })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("readLater.settings.autoSummary")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.autoSummary}
          onValueChange={(value) => onChange({ autoSummary: value as ReadLaterAutoSummary })}
        >
          {SUMMARY_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {t(`readLater.settings.summary.${option}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ReadLaterSettingsMenu;
