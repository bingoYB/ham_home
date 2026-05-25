import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { configStorage } from "@/lib/storage/config-storage";
import { getBackgroundService } from "@/lib/services";
import type { QueueProgress } from "@/lib/embedding/embedding-queue";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type { EmbeddingConfig } from "@/types";
import { browser } from "wxt/browser";

export interface UseEmbeddingConfigReturn {
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
  showFullRebuildDialog: boolean;
  showClearVectorsDialog: boolean;
  isClearing: boolean;
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
  loadVectorStats: () => Promise<void>;
}

export function useEmbeddingConfig(): UseEmbeddingConfigReturn {
  const { t } = useTranslation(["common", "settings"]);

  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig>({
    enabled: false,
    provider: "openai",
    model: "text-embedding-3-small",
    batchSize: 16,
  });
  const [localEmbeddingApiKey, setLocalEmbeddingApiKey] = useState("");
  const [localEmbeddingBaseUrl, setLocalEmbeddingBaseUrl] = useState("");
  const [localEmbeddingModel, setLocalEmbeddingModel] = useState("");
  const [embeddingTestResult, setEmbeddingTestResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [isEmbeddingTesting, setIsEmbeddingTesting] = useState(false);
  const [vectorStats, setVectorStats] = useState<VectorStoreStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildProgress, setRebuildProgress] = useState<QueueProgress | null>(
    null,
  );
  const [showFullRebuildDialog, setShowFullRebuildDialog] = useState(false);
  const [showClearVectorsDialog, setShowClearVectorsDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadVectorStats = useCallback(async () => {
    if (!embeddingConfig.enabled) {
      setVectorStats(null);
      return;
    }
    setIsLoadingStats(true);
    try {
      const bgService = getBackgroundService();
      const stats = await bgService.getVectorStats();
      setVectorStats(stats);
    } catch (error) {
      console.error("[useEmbeddingConfig] Failed to load vector stats:", error);
      setVectorStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [embeddingConfig.enabled]);

  useEffect(() => {
    const loadEmbeddingConfig = async () => {
      try {
        const config = await configStorage.getEmbeddingConfig();
        setEmbeddingConfig(config);
        setLocalEmbeddingApiKey(config.apiKey || "");
        setLocalEmbeddingBaseUrl(config.baseUrl || "");
        setLocalEmbeddingModel(config.model || "");
      } catch (error) {
        console.error("[useEmbeddingConfig] Failed to load embedding config:", error);
      }
    };
    loadEmbeddingConfig();
  }, []);

  useEffect(() => {
    loadVectorStats();
  }, [loadVectorStats]);

  useEffect(() => {
    const handleMessage = (message: {
      type: string;
      payload?: QueueProgress;
    }) => {
      if (message.type === "EMBEDDING_PROGRESS" && message.payload) {
        const progress = message.payload;
        setRebuildProgress(progress);

        if (progress.percentage >= 100) {
          setIsRebuilding(false);
          setRebuildProgress(null);
          loadVectorStats();
        }
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [loadVectorStats]);

  const updateEmbeddingConfigHandler = async (updates: Partial<EmbeddingConfig>) => {
    try {
      const updated = await configStorage.setEmbeddingConfig(updates);
      setEmbeddingConfig(updated);
    } catch (error) {
      console.error("[useEmbeddingConfig] Failed to update embedding config:", error);
    }
  };

  const handleTestEmbeddingConnection = async () => {
    setIsEmbeddingTesting(true);
    setEmbeddingTestResult(null);

    try {
      await updateEmbeddingConfigHandler({});
      const bgService = getBackgroundService();
      const result = await bgService.testEmbeddingConnection();

      if (result.success) {
        setEmbeddingTestResult({
          status: "success",
          message: t("settings:settings.ai.embedding.testSuccess", {
            dimensions: result.dimensions,
          }),
        });
      } else {
        setEmbeddingTestResult({
          status: "error",
          message: t("settings:settings.ai.embedding.testFailed", {
            error: result.error,
          }),
        });
      }
    } catch (error) {
      setEmbeddingTestResult({
        status: "error",
        message: t("settings:settings.ai.embedding.testFailed", {
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      });
    } finally {
      setIsEmbeddingTesting(false);
    }
  };

  const handleIncrementalRebuild = async () => {
    setIsRebuilding(true);
    setRebuildProgress(null);

    try {
      const bgService = getBackgroundService();
      await bgService.startEmbeddingRebuildIncremental();
    } catch (error) {
      console.error("[useEmbeddingConfig] Failed to start incremental rebuild:", error);
      setIsRebuilding(false);
      setRebuildProgress(null);
    }
  };

  const handleFullRebuild = async () => {
    setShowFullRebuildDialog(false);
    setIsRebuilding(true);
    setRebuildProgress(null);

    try {
      const bgService = getBackgroundService();
      await bgService.startEmbeddingRebuild();
    } catch (error) {
      console.error("[useEmbeddingConfig] Failed to start full rebuild:", error);
      setIsRebuilding(false);
      setRebuildProgress(null);
    }
  };

  const handleClearVectors = async () => {
    setShowClearVectorsDialog(false);
    setIsClearing(true);

    try {
      const bgService = getBackgroundService();
      await bgService.clearVectorStore();
      await loadVectorStats();
    } catch (error) {
      console.error("[useEmbeddingConfig] Failed to clear vectors:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return {
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
    showFullRebuildDialog,
    showClearVectorsDialog,
    isClearing,
    setLocalEmbeddingApiKey,
    setLocalEmbeddingBaseUrl,
    setLocalEmbeddingModel,
    setShowFullRebuildDialog,
    setShowClearVectorsDialog,
    updateEmbeddingConfig: updateEmbeddingConfigHandler,
    onTestEmbeddingConnection: handleTestEmbeddingConnection,
    onIncrementalRebuild: handleIncrementalRebuild,
    onFullRebuild: handleFullRebuild,
    onClearVectors: handleClearVectors,
    loadVectorStats,
  };
}