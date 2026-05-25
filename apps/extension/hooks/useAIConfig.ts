import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useShortcuts } from "@/hooks/useShortcuts";
import { configStorage } from "@/lib/storage/config-storage";
import {
  agentConfigService,
  getProviderModels,
} from "@/lib/agent";
import type { AIConfig, AIProvider } from "@/types";

export interface UseAIConfigReturn {
  aiConfig: AIConfig;
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
  setLocalApiKey: (val: string) => void;
  setLocalBaseUrl: (val: string) => void;
  setLocalModel: (val: string) => void;
  setModelSelectorOpen: (val: boolean) => void;
  setIsAdvancedOpen: (val: boolean) => void;
  setNewTag: (val: string) => void;
  updateAIConfig: (updates: Partial<AIConfig>) => void;
  onTestConnection: () => void;
  onFetchModels: () => void;
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useAIConfig(): UseAIConfigReturn {
  const { t } = useTranslation(["common", "settings"]);
  const { aiConfig, updateAIConfig } = useBookmarks();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [newTag, setNewTag] = useState("");

  const [localApiKey, setLocalApiKey] = useState("");
  const [localBaseUrl, setLocalBaseUrl] = useState("");
  const [localModel, setLocalModel] = useState("");
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [remoteModels, setRemoteModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchResult, setModelFetchResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setLocalApiKey(aiConfig.apiKey || "");
    setLocalBaseUrl(aiConfig.baseUrl || "");
    setLocalModel(aiConfig.model || "");
  }, [aiConfig.apiKey, aiConfig.baseUrl, aiConfig.model]);

  useEffect(() => {
    setRemoteModels([]);
    setModelFetchResult(null);
  }, [aiConfig.provider, localApiKey, localBaseUrl]);

  const recommendedModels = getProviderModels(aiConfig.provider).filter(
    (model) => !remoteModels.includes(model),
  );

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      await updateAIConfig({});
      const result = await agentConfigService.testConnection();

      if (result.success) {
        setTestResult({ status: "success", message: result.message });
      } else {
        setTestResult({ status: "error", message: result.message });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "连接失败，请检查配置";
      setTestResult({ status: "error", message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setModelFetchResult(null);
    setModelSelectorOpen(true);

    try {
      const result = await agentConfigService.listAvailableModels({
        provider: aiConfig.provider,
        apiKey: localApiKey.trim(),
        baseUrl: localBaseUrl.trim(),
      });

      setRemoteModels(result.models);
      setModelFetchResult({
        status: "success",
        message: t("settings:settings.ai.fetchModelsSuccess", {
          count: result.models.length,
        }),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common:common.error");

      setRemoteModels([]);
      setModelFetchResult({
        status: "error",
        message: t("settings:settings.ai.fetchModelsFailed", {
          error: message,
        }),
      });
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = aiConfig.presetTags || [];
      if (!currentTags.includes(newTag.trim())) {
        updateAIConfig({ presetTags: [...currentTags, newTag.trim()] });
        setNewTag("");
      }
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const currentTags = aiConfig.presetTags || [];
    updateAIConfig({
      presetTags: currentTags.filter((_, index) => index !== indexToRemove),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return {
    aiConfig,
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
    setLocalApiKey,
    setLocalBaseUrl,
    setLocalModel,
    setModelSelectorOpen,
    setIsAdvancedOpen,
    setNewTag,
    updateAIConfig,
    onTestConnection: handleTestConnection,
    onFetchModels: handleFetchModels,
    onAddTag: handleAddTag,
    onRemoveTag: handleRemoveTag,
    onKeyDown: handleKeyDown,
  };
}