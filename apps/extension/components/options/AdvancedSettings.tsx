import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Label,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hamhome/ui";
import type { AIConfig } from "@/types";

interface AdvancedSettingsProps {
  aiConfig: AIConfig;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<AIConfig>) => void;
}

export function AdvancedSettings({
  aiConfig,
  isOpen,
  onOpenChange,
  onUpdate,
}: AdvancedSettingsProps) {
  const { t } = useTranslation(["common", "settings"]);

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">{t("settings:settings.ai.advanced")}</Label>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? t("common:common.hide") : t("common:common.show")}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxTokens">{t("settings:settings.ai.maxTokens")}</Label>
            <Input
              id="maxTokens"
              type="number"
              value={aiConfig.maxTokens}
              onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">{t("settings:settings.ai.temperature")}</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={aiConfig.temperature}
              onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
            />
          </div>
          {aiConfig.provider === "openai" && (
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="apiMode">{t("settings:settings.ai.apiMode")}</Label>
              <Select
                value={aiConfig.apiMode || "default"}
                onValueChange={(value) => onUpdate({ apiMode: value === "default" ? undefined : value as 'chat' | 'responses' })}
              >
                <SelectTrigger id="apiMode">
                  <SelectValue placeholder={t("settings:settings.ai.apiModeDefault")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("settings:settings.ai.apiModeDefault")}</SelectItem>
                  <SelectItem value="chat">{t("settings:settings.ai.apiModeChat")}</SelectItem>
                  <SelectItem value="responses">{t("settings:settings.ai.apiModeResponses")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}