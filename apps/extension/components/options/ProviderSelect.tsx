import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from "@hamhome/ui";
import type { AIProvider, AIConfig } from "@/types";

interface ProviderSelectProps {
  value: AIProvider;
  onChange: (value: AIProvider) => void;
}

export function ProviderSelect({ value, onChange }: ProviderSelectProps) {
  const { t } = useTranslation(["common", "settings"]);

  return (
    <div className="space-y-2">
      <Label htmlFor="provider">{t("settings:settings.ai.provider")}</Label>
      <Select value={value} onValueChange={(val: AIProvider) => onChange(val)}>
        <SelectTrigger id="provider">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openai">{t("settings:settings.providers.openai")}</SelectItem>
          <SelectItem value="anthropic">{t("settings:settings.providers.anthropic")}</SelectItem>
          <SelectItem value="google">{t("settings:settings.providers.google")}</SelectItem>
          <SelectItem value="azure">{t("settings:settings.providers.azure")}</SelectItem>
          <SelectItem value="deepseek">{t("settings:settings.providers.deepseek")}</SelectItem>
          <SelectItem value="groq">{t("settings:settings.providers.groq")}</SelectItem>
          <SelectItem value="mistral">{t("settings:settings.providers.mistral")}</SelectItem>
          <SelectItem value="moonshot">{t("settings:settings.providers.moonshot")}</SelectItem>
          <SelectItem value="zhipu">{t("settings:settings.providers.zhipu")}</SelectItem>
          <SelectItem value="hunyuan">{t("settings:settings.providers.hunyuan")}</SelectItem>
          <SelectItem value="nvidia">{t("settings:settings.providers.nvidia")}</SelectItem>
          <SelectItem value="siliconflow">{t("settings:settings.providers.siliconflow")}</SelectItem>
          <SelectItem value="ollama">{t("settings:settings.providers.ollama")}</SelectItem>
          <SelectItem value="custom">{t("settings:settings.providers.custom")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}