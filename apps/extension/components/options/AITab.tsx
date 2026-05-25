import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from "@hamhome/ui";
import { ProviderSelect } from "./ProviderSelect";
import { ModelSelector } from "./ModelSelector";
import { AIConnectionTest } from "./AIConnectionTest";
import { AdvancedSettings } from "./AdvancedSettings";
import { PresetTags } from "./PresetTags";
import { EmbeddingConfigCard } from "./EmbeddingConfig";
import type { AIConfig, AIProvider, EmbeddingConfig } from "@/types";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type { QueueProgress } from "@/lib/embedding/embedding-queue";

interface AITabProps {
  aiConfig: AIConfig;
  embeddingConfig: EmbeddingConfig;
  localApiKey: string;
  localBaseUrl: string;
  localModel: string;
  modelSelectorOpen: boolean;
  isFetchingModels: boolean;
  remoteModels: string[];
  modelFetchResult: { status: "success" | "error"; message: string } | null;
  isTesting: boolean;
  testResult: { status: "success" | "error" | "warning"; message: string } | null;
  isAdvancedOpen: boolean;
  newTag: string;
  recommendedModels: string[];
  vectorStats: VectorStoreStats | null;
  isLoadingStats: boolean;
  isRebuilding: boolean;
  rebuildProgress: QueueProgress | null;
  isClearing: boolean;
  showFullRebuildDialog: boolean;
  showClearVectorsDialog: boolean;
  localEmbeddingApiKey: string;
  localEmbeddingBaseUrl: string;
  localEmbeddingModel: string;
  isEmbeddingTesting: boolean;
  embeddingTestResult: { status: "success" | "error"; message: string } | null;
  setLocalApiKey: (val: string) => void;
  setLocalBaseUrl: (val: string) => void;
  setLocalModel: (val: string) => void;
  setModelSelectorOpen: (val: boolean) => void;
  setIsAdvancedOpen: (val: boolean) => void;
  setNewTag: (val: string) => void;
  setShowFullRebuildDialog: (val: boolean) => void;
  setShowClearVectorsDialog: (val: boolean) => void;
  setLocalEmbeddingApiKey: (val: string) => void;
  setLocalEmbeddingBaseUrl: (val: string) => void;
  setLocalEmbeddingModel: (val: string) => void;
  updateAIConfig: (updates: Partial<AIConfig>) => void;
  updateEmbeddingConfig: (updates: Partial<EmbeddingConfig>) => void;
  onTestConnection: () => void;
  onFetchModels: () => void;
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTestEmbeddingConnection: () => void;
  onIncrementalRebuild: () => void;
  onFullRebuild: () => void;
  onClearVectors: () => void;
  formatBytes: (bytes: number) => string;
}

export function AITab({
  aiConfig,
  embeddingConfig,
  localApiKey,
  localBaseUrl,
  localModel,
  modelSelectorOpen,
  isFetchingModels,
  remoteModels,
  modelFetchResult,
  isTesting,
  testResult,
  isAdvancedOpen,
  newTag,
  recommendedModels,
  vectorStats,
  isLoadingStats,
  isRebuilding,
  rebuildProgress,
  isClearing,
  showFullRebuildDialog,
  showClearVectorsDialog,
  localEmbeddingApiKey,
  localEmbeddingBaseUrl,
  localEmbeddingModel,
  isEmbeddingTesting,
  embeddingTestResult,
  setLocalApiKey,
  setLocalBaseUrl,
  setLocalModel,
  setModelSelectorOpen,
  setIsAdvancedOpen,
  setNewTag,
  setShowFullRebuildDialog,
  setShowClearVectorsDialog,
  setLocalEmbeddingApiKey,
  setLocalEmbeddingBaseUrl,
  setLocalEmbeddingModel,
  updateAIConfig,
  updateEmbeddingConfig,
  onTestConnection,
  onFetchModels,
  onAddTag,
  onRemoveTag,
  onKeyDown,
  onTestEmbeddingConnection,
  onIncrementalRebuild,
  onFullRebuild,
  onClearVectors,
  formatBytes,
}: AITabProps) {
  const { t } = useTranslation(["settings"]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings:settings.ai.title")}</CardTitle>
          <CardDescription>{t("settings:settings.ai.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProviderSelect
            value={aiConfig.provider}
            onChange={(value: AIProvider) => updateAIConfig({ provider: value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("settings:settings.ai.apiKey")}</Label>
              <Input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                onBlur={(e) => updateAIConfig({ apiKey: e.target.value })}
                placeholder={aiConfig.provider === "ollama" ? t("settings:settings.ai.noApiKeyNeeded") : "sk-..."}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings:settings.ai.baseUrl")}</Label>
              <Input
                type="url"
                value={localBaseUrl}
                onChange={(e) => setLocalBaseUrl(e.target.value)}
                onBlur={(e) => updateAIConfig({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
          </div>

          <ModelSelector
            value={localModel}
            remoteModels={remoteModels}
            recommendedModels={recommendedModels}
            isFetchingModels={isFetchingModels}
            modelFetchResult={modelFetchResult}
            open={modelSelectorOpen}
            onOpenChange={setModelSelectorOpen}
            onSelect={(model) => {
              setLocalModel(model);
              updateAIConfig({ model });
            }}
            onChange={setLocalModel}
            onBlur={(model) => updateAIConfig({ model })}
            onFetchModels={onFetchModels}
          />

          <AIConnectionTest
            isTesting={isTesting}
            testResult={testResult}
            onTest={onTestConnection}
            disabled={!aiConfig.apiKey && aiConfig.provider !== "ollama"}
          />

          <AdvancedSettings
            aiConfig={aiConfig}
            isOpen={isAdvancedOpen}
            onOpenChange={setIsAdvancedOpen}
            onUpdate={updateAIConfig}
          />

          <PresetTags
            tags={aiConfig.presetTags || []}
            newTag={newTag}
            onNewTagChange={setNewTag}
            onAdd={onAddTag}
            onRemove={onRemoveTag}
            onKeyDown={onKeyDown}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">{t("settings:settings.ai.embedding.enabled")}</Label>
        <Switch
          checked={embeddingConfig.enabled}
          onCheckedChange={(checked) => updateEmbeddingConfig({ enabled: checked })}
        />
      </div>

      <EmbeddingConfigCard
        embeddingConfig={embeddingConfig}
        localEmbeddingApiKey={localEmbeddingApiKey}
        localEmbeddingBaseUrl={localEmbeddingBaseUrl}
        localEmbeddingModel={localEmbeddingModel}
        embeddingTestResult={embeddingTestResult}
        isEmbeddingTesting={isEmbeddingTesting}
        vectorStats={vectorStats}
        isLoadingStats={isLoadingStats}
        isRebuilding={isRebuilding}
        rebuildProgress={rebuildProgress}
        isClearing={isClearing}
        showFullRebuildDialog={showFullRebuildDialog}
        showClearVectorsDialog={showClearVectorsDialog}
        setLocalEmbeddingApiKey={setLocalEmbeddingApiKey}
        setLocalEmbeddingBaseUrl={setLocalEmbeddingBaseUrl}
        setLocalEmbeddingModel={setLocalEmbeddingModel}
        setShowFullRebuildDialog={setShowFullRebuildDialog}
        setShowClearVectorsDialog={setShowClearVectorsDialog}
        updateEmbeddingConfig={updateEmbeddingConfig}
        onTestEmbeddingConnection={onTestEmbeddingConnection}
        onIncrementalRebuild={onIncrementalRebuild}
        onFullRebuild={onFullRebuild}
        onClearVectors={onClearVectors}
        formatBytes={formatBytes}
      />
    </div>
  );
}