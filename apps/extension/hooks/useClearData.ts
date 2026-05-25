import { useState, useCallback } from "react";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { snapshotStorage } from "@/lib/storage/snapshot-storage";
import { getBackgroundService } from "@/lib/services";
import { syncEngine } from "@/lib/sync/sync-engine";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import type { QueueProgress } from "@/lib/embedding/embedding-queue";
import type { VectorStoreStats } from "@/lib/storage/vector-store";

export interface SnapshotStats {
  count: number;
  totalSize: number;
}

export interface UseClearDataReturn {
  isClearingAll: boolean;
  isClearingBookmarks: boolean;
  isClearingSnapshots: boolean;
  isClearingRemote: boolean;
  showClearDialog: boolean;
  showClearBookmarkDialog: boolean;
  showClearSnapshotDialog: boolean;
  showClearRemoteDialog: boolean;
  setShowClearDialog: (val: boolean) => void;
  setShowClearBookmarkDialog: (val: boolean) => void;
  setShowClearSnapshotDialog: (val: boolean) => void;
  setShowClearRemoteDialog: (val: boolean) => void;
  onClearAllData: () => Promise<void>;
  onClearBookmarkData: () => Promise<void>;
  onClearSnapshotData: () => Promise<void>;
  onClearRemoteData: () => Promise<void>;
  onExport: (format: "json" | "html") => void;
  loadSnapshotStats: () => Promise<SnapshotStats | null>;
  loadVectorStats: () => Promise<VectorStoreStats | null>;
}

export function useClearData(): UseClearDataReturn {
  const { clearAllData, clearBookmarkData, exportData } = useBookmarks();

  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearingBookmarks, setIsClearingBookmarks] = useState(false);
  const [isClearingSnapshots, setIsClearingSnapshots] = useState(false);
  const [isClearingRemote, setIsClearingRemote] = useState(false);

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showClearBookmarkDialog, setShowClearBookmarkDialog] = useState(false);
  const [showClearSnapshotDialog, setShowClearSnapshotDialog] = useState(false);
  const [showClearRemoteDialog, setShowClearRemoteDialog] = useState(false);

  const loadSnapshotStats = useCallback(async () => {
    try {
      return await snapshotStorage.getStorageUsage();
    } catch (error) {
      console.error("[useClearData] Failed to load snapshot stats:", error);
      return null;
    }
  }, []);

  const loadVectorStats = useCallback(async () => {
    try {
      const bgService = getBackgroundService();
      return await bgService.getVectorStats();
    } catch (error) {
      console.error("[useClearData] Failed to load vector stats:", error);
      return null;
    }
  }, []);

  const handleClearData = async () => {
    setShowClearDialog(false);
    setIsClearingAll(true);
    try {
      await clearAllData();
      await snapshotStorage.clearAllSnapshots();
      await workspaceStorage.clearAllData();
      const bgService = getBackgroundService();
      await bgService.clearVectorStore();
    } catch (error) {
      console.error("[useClearData] Failed to clear all data:", error);
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleClearBookmarkData = async () => {
    setShowClearBookmarkDialog(false);
    setIsClearingBookmarks(true);
    try {
      await clearBookmarkData();
    } catch (error) {
      console.error("[useClearData] Failed to clear bookmark data:", error);
    } finally {
      setIsClearingBookmarks(false);
    }
  };

  const handleClearSnapshotData = async () => {
    setShowClearSnapshotDialog(false);
    setIsClearingSnapshots(true);
    try {
      await snapshotStorage.clearAllSnapshots();
    } catch (error) {
      console.error("[useClearData] Failed to clear snapshots:", error);
    } finally {
      setIsClearingSnapshots(false);
    }
  };

  const handleClearRemoteData = async () => {
    setShowClearRemoteDialog(false);
    setIsClearingRemote(true);
    try {
      await syncEngine.clearRemoteData();
    } catch (error) {
      console.error("[useClearData] Failed to clear remote data:", error);
    } finally {
      setIsClearingRemote(false);
    }
  };

  const handleExport = (format: "json" | "html") => {
    exportData(format);
  };

  return {
    isClearingAll,
    isClearingBookmarks,
    isClearingSnapshots,
    isClearingRemote,
    showClearDialog,
    showClearBookmarkDialog,
    showClearSnapshotDialog,
    showClearRemoteDialog,
    setShowClearDialog,
    setShowClearBookmarkDialog,
    setShowClearSnapshotDialog,
    setShowClearRemoteDialog,
    onClearAllData: handleClearData,
    onClearBookmarkData: handleClearBookmarkData,
    onClearSnapshotData: handleClearSnapshotData,
    onClearRemoteData: handleClearRemoteData,
    onExport: handleExport,
    loadSnapshotStats,
    loadVectorStats,
  };
}