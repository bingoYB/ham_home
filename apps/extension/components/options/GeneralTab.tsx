import { useTranslation } from "react-i18next";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import {
  Button,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hamhome/ui";
import { isFirefox, getBrowserSpecificURL, safeCreateTab } from "@/utils/browser-api";
import type { CustomFilter, LocalSettings } from "@/types";

interface GeneralTabProps {
  language: string;
  switchLanguage: (lng: string) => void;
  availableLanguages: readonly string[];
  appSettings: LocalSettings;
  updateAppSettings: (updates: Partial<LocalSettings>) => void;
  shortcuts: any[];
  refreshShortcuts: () => void;
  customFilters: CustomFilter[];
  onAddFilter: () => void;
  onEditFilter: (filter: CustomFilter) => void;
  onDeleteFilter: (filter: CustomFilter) => void;
  handleAutoSaveSnapshotChange: (checked: boolean) => void;
}

export function GeneralTab({
  language,
  switchLanguage,
  availableLanguages,
  appSettings,
  updateAppSettings,
  shortcuts,
  refreshShortcuts,
  customFilters,
  onAddFilter,
  onEditFilter,
  onDeleteFilter,
  handleAutoSaveSnapshotChange,
}: GeneralTabProps) {
  const { t } = useTranslation(["common", "settings"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings:settings.general.title")}</CardTitle>
        <CardDescription>
          {t("settings:settings.general.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 语言设置 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings:settings.language")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:settings.descriptions.language")}
            </p>
          </div>
          <Select value={language} onValueChange={switchLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lng) => (
                <SelectItem key={lng} value={lng}>
                  {t(`common:common.languages.${lng}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 自动保存快照 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings:settings.general.autoSaveSnapshot")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:settings.general.autoSaveSnapshotDesc")}
            </p>
          </div>
          <Switch
            checked={appSettings.autoSaveSnapshot}
            onCheckedChange={handleAutoSaveSnapshotChange}
          />
        </div>

        {/* Omnibox 搜索 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings:settings.general.enableOmniboxSearch")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:settings.general.enableOmniboxSearchDesc")}
            </p>
          </div>
          <Switch
            checked={appSettings.enableOmniboxSearch}
            onCheckedChange={(checked) =>
              updateAppSettings({ enableOmniboxSearch: checked })
            }
          />
        </div>

        {/* 主题设置 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="theme">{t("settings:settings.theme")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:settings.descriptions.theme")}
            </p>
          </div>
          <Select
            value={appSettings.theme}
            onValueChange={(value: "system" | "light" | "dark") =>
              updateAppSettings({ theme: value })
            }
          >
            <SelectTrigger id="theme" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                {t("settings:settings.themeOptions.system")}
              </SelectItem>
              <SelectItem value="light">
                {t("settings:settings.themeOptions.light")}
              </SelectItem>
              <SelectItem value="dark">
                {t("settings:settings.themeOptions.dark")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 快捷键设置 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("settings:settings.general.shortcut")}</Label>
              <p className="text-sm text-muted-foreground">
                {isFirefox()
                  ? t("settings:settings.general.shortcutDescFirefox")
                  : t("settings:settings.general.shortcutDesc")}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const url = getBrowserSpecificURL("shortcuts");
                await safeCreateTab(url);
                setTimeout(refreshShortcuts, 500);
              }}
            >
              <span>{t("settings:settings.general.shortcutButton")}</span>
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {shortcuts.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t("settings:settings.general.currentShortcuts")}
              </p>
              <div className="space-y-3">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.name} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    {shortcut.shortcut ? (
                      <div className="flex items-center gap-1">
                        {shortcut.formattedShortcut.split(" + ").map((key: string, idx: number) => (
                          <kbd
                            key={idx}
                            className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium font-mono bg-background border border-border rounded-md shadow-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        {t("settings:settings.general.shortcutNotSet")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 面板位置 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="panelPosition">{t("settings:settings.general.panelPosition")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("settings:settings.general.panelPositionDesc")}
            </p>
          </div>
          <Select
            value={appSettings.panelPosition}
            onValueChange={(value: "left" | "right") =>
              updateAppSettings({ panelPosition: value })
            }
          >
            <SelectTrigger id="panelPosition" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{t("settings:settings.general.panelPositionOptions.left")}</SelectItem>
              <SelectItem value="right">{t("settings:settings.general.panelPositionOptions.right")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 自定义筛选器管理 */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label className="text-base font-semibold mb-1 block">
              {t("settings:settings.general.customFilters.title")}
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              {t("settings:settings.general.customFilters.description")}
            </p>
          </div>

          {customFilters.length === 0 ? (
            <div className="p-6 border border-dashed rounded-lg text-center bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">
                {t("settings:settings.general.customFilters.noFilters")}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {t("settings:settings.general.customFilters.noFiltersDesc")}
              </p>
              <Button onClick={onAddFilter} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t("settings:settings.general.customFilters.addFilter")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {customFilters.length} {t("settings:settings.general.customFilters.title")}
                </span>
                <Button onClick={onAddFilter} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("settings:settings.general.customFilters.addFilter")}
                </Button>
              </div>
              <div className="space-y-2">
                {customFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{filter.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("settings:settings.general.customFilters.conditionsCount", {
                          count: filter.conditions.length,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditFilter(filter)}
                        className="h-8 px-2"
                      >
                        {t("settings:settings.general.customFilters.edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteFilter(filter)}
                        className="h-8 px-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
