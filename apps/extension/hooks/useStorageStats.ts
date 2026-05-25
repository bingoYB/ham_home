import { useState, useEffect, useCallback } from "react";
import { snapshotStorage } from "@/lib/storage/snapshot-storage";
import { getBackgroundService } from "@/lib/services";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type { EmbeddingConfig } from "@/types";

export interface SnapshotStats {
  count: number;
  totalSize: number;
}

export interface UseStorageStatsReturn {
  snapshotStats: SnapshotStats | null;
  vectorStats: VectorStoreStats | null;
  isLoadingSnapshotStats: boolean;
  isLoadingVectorStats: boolean;
  loadSnapshotStats: () => Promise<void>;
  loadVectorStats: (embeddingEnabled: boolean) => Promise<void>;
}

export function useStorageStats(): UseStorageStatsReturn {
  const [snapshotStats, setSnapshotStats] = useState<SnapshotStats | null>(null);
  const [vectorStats, setVectorStats] = useState<VectorStoreStats | null>(null);
  const [isLoadingSnapshotStats, setIsLoadingSnapshotStats] = useState(false);
  const [isLoadingVectorStats, setIsLoadingVectorStats] = useState(false);

  const loadSnapshotStats = useCallback(async () => {
    setIsLoadingSnapshotStats(true);
    try {
      const stats = await snapshotStorage.getStorageUsage();
      setSnapshotStats(stats);
    } catch (error) {
      console.error("[useStorageStats] Failed to load snapshot stats:", error);
      setSnapshotStats(null);
    } finally {
      setIsLoadingSnapshotStats(false);
    }
  }, []);

  const loadVectorStats = useCallback(async (embeddingEnabled: boolean) => {
    if (!embeddingEnabled) {
      setVectorStats(null);
      return;
    }
    setIsLoadingVectorStats(true);
    try {
      const bgService = getBackgroundService();
      const stats = await bgService.getVectorStats();
      setVectorStats(stats);
    } catch (error) {
      console.error("[useStorageStats] Failed to load vector stats:", error);
      setVectorStats(null);
    } finally {
      setIsLoadingVectorStats(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshotStats();
  }, [loadSnapshotStats]);

  return {
    snapshotStats,
    vectorStats,
    isLoadingSnapshotStats,
    isLoadingVectorStats,
    loadSnapshotStats,
    loadVectorStats,
  };
}