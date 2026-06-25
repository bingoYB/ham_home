import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@hamhome/ui";
import { Loader2, Check, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Sparkles } from "lucide-react";
import { EmbeddingSection } from "./EmbeddingSection";
import type { EmbeddingConfig, AIProvider } from "@/types";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type { QueueProgress } from "@/lib/embedding/embedding-queue";
import { getDefaultBaseUrl, getDefaultEmbeddingModel } from "@/lib/agent/provider-config";

interface EmbeddingConfigProps {
  embeddingConfig: EmbeddingConfig;
  localEmbeddingApiKey: string;
  localEmbeddingBaseUrl: string;
  localEmbeddingModel: string;
  embeddingTestResult: { status: "success" | "error"; message: string } | null;
  isEmbeddingTesting: boolean;
  vectorStats: VectorStoreStats | null;
  isLoadingStats: boolean;
  isRebuilding: boolean;
  rebuildProgress: QueueProgress | null;
  isClearing: boolean;
  showFullRebuildDialog: boolean;
  showClearVectorsDialog: boolean;
  setLocalEmbeddingApiKey: (val: string) => void;
  setLocalEmbeddingBaseUrl: (val: string) => void;
  setLocalEmbeddingModel: (val: string) => void;
  setShowFullRebuildDialog: (val: boolean) => void;
  setShowClearVectorsDialog: (val: boolean) => void;
  updateEmbeddingConfig: (updates: Partial<EmbeddingConfig>) => void;
  onTestEmbeddingConnection: () => void;
  onIncrementalRebuild: () => void;
  onFullRebuild: () => void;
  onClearVectors: () => void;
  formatBytes: (bytes: number) => string;
}

export function EmbeddingConfigCard({
  embeddingConfig,
  localEmbeddingApiKey,
  localEmbeddingBaseUrl,
  localEmbeddingModel,
  embeddingTestResult,
  isEmbeddingTesting,
  vectorStats,
  isLoadingStats,
  isRebuilding,
  rebuildProgress,
  isClearing,
  showFullRebuildDialog,
  showClearVectorsDialog,
  setLocalEmbeddingApiKey,
  setLocalEmbeddingBaseUrl,
  setLocalEmbeddingModel,
  setShowFullRebuildDialog,
  setShowClearVectorsDialog,
  updateEmbeddingConfig,
  onTestEmbeddingConnection,
  onIncrementalRebuild,
  onFullRebuild,
  onClearVectors,
  formatBytes,
}: EmbeddingConfigProps) {
  const { t } = useTranslation(["common", "settings"]);

  if (!embeddingConfig.enabled) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("settings:settings.ai.embedding.title")}
            </CardTitle>
            <CardDescription>
              {t("settings:settings.ai.embedding.description")}
            </CardDescription>
          </div>
          <Switch
            checked={embeddingConfig.enabled}
            onCheckedChange={(checked) => updateEmbeddingConfig({ enabled: checked })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings:settings.ai.provider")}</Label>
            <Select
              value={embeddingConfig.provider}
              onValueChange={(value) => {
                const provider = value as AIProvider;
                const defaultBaseUrl = getDefaultBaseUrl(provider);
                const defaultModel = getDefaultEmbeddingModel(provider);
                setLocalEmbeddingBaseUrl(defaultBaseUrl);
                setLocalEmbeddingModel(defaultModel);
                updateEmbeddingConfig({ provider, baseUrl: defaultBaseUrl, model: defaultModel });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">{t("settings:settings.providers.openai")}</SelectItem>
                <SelectItem value="google">{t("settings:settings.providers.google")}</SelectItem>
                <SelectItem value="azure">{t("settings:settings.providers.azure")}</SelectItem>
                <SelectItem value="mistral">{t("settings:settings.providers.mistral")}</SelectItem>
                <SelectItem value="zhipu">{t("settings:settings.providers.zhipu")}</SelectItem>
                <SelectItem value="hunyuan">{t("settings:settings.providers.hunyuan")}</SelectItem>
                <SelectItem value="nvidia">{t("settings:settings.providers.nvidia")}</SelectItem>
                <SelectItem value="siliconflow">{t("settings:settings.providers.siliconflow")}</SelectItem>
                <SelectItem value="ollama">{t("settings:settings.providers.ollama")}</SelectItem>
                <SelectItem value="custom">{t("settings:settings.providers.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("settings:settings.ai.apiKey")}</Label>
              <Input
                type="password"
                value={localEmbeddingApiKey}
                onChange={(e) => setLocalEmbeddingApiKey(e.target.value)}
                onBlur={(e) => updateEmbeddingConfig({ apiKey: e.target.value })}
                placeholder={embeddingConfig.provider === "ollama" ? t("settings:settings.ai.noApiKeyNeeded") : "sk-..."}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings:settings.ai.baseUrl")}</Label>
              <Input
                type="url"
                value={localEmbeddingBaseUrl}
                onChange={(e) => setLocalEmbeddingBaseUrl(e.target.value)}
                onBlur={(e) => updateEmbeddingConfig({ baseUrl: e.target.value })}
                placeholder={getDefaultBaseUrl(embeddingConfig.provider) || "https://api.openai.com/v1"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("settings:settings.ai.model")}</Label>
            <Input
              value={localEmbeddingModel}
              onChange={(e) => setLocalEmbeddingModel(e.target.value)}
              onBlur={(e) => updateEmbeddingConfig({ model: e.target.value })}
              placeholder={getDefaultEmbeddingModel(embeddingConfig.provider) || "text-embedding-3-small"}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onTestEmbeddingConnection}
              disabled={isEmbeddingTesting || (!embeddingConfig.apiKey && embeddingConfig.provider !== "ollama")}
              className="bg-primary hover:bg-primary/90"
            >
              {isEmbeddingTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings:settings.ai.testing")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("settings:settings.ai.testConnection")}
                </>
              )}
            </Button>
          </div>

          {embeddingTestResult && (
            <div
              className={cn(
                "p-3 rounded-md text-sm flex items-start gap-2",
                embeddingTestResult.status === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400 border border-green-100 dark:border-green-900/30"
                  : "bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400 border border-red-100 dark:border-red-900/30",
              )}
            >
              {embeddingTestResult.status === "success" ? (
                <Check className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              {embeddingTestResult.message}
            </div>
          )}
        </div>

        <EmbeddingSection
          embeddingConfig={embeddingConfig}
          vectorStats={vectorStats}
          isLoadingStats={isLoadingStats}
          isRebuilding={isRebuilding}
          rebuildProgress={rebuildProgress}
          isClearing={isClearing}
          onIncrementalRebuild={onIncrementalRebuild}
          onFullRebuild={() => setShowFullRebuildDialog(true)}
          onClearVectors={() => setShowClearVectorsDialog(true)}
          formatBytes={formatBytes}
        />
      </CardContent>
    </Card>
  );
}