import { useState, useEffect } from "react";
import { useBookmarks } from "@/contexts/BookmarkContext";
import type { WebDAVConfig } from "@/types";

export interface UseSyncConfigReturn {
  syncConfig: WebDAVConfig | undefined;
  localWebdavUrl: string;
  localWebdavUser: string;
  localWebdavPwd: string;
  localWebdavE2e: string;
  isSyncing: boolean;
  setLocalWebdavUrl: (val: string) => void;
  setLocalWebdavUser: (val: string) => void;
  setLocalWebdavPwd: (val: string) => void;
  setLocalWebdavE2e: (val: string) => void;
  setIsSyncing: (val: boolean) => void;
  updateSyncConfig: (updates: Partial<WebDAVConfig>) => void;
}

export function useSyncConfig(): UseSyncConfigReturn {
  const { syncConfig, updateSyncConfig } = useBookmarks();

  const [localWebdavUrl, setLocalWebdavUrl] = useState("");
  const [localWebdavUser, setLocalWebdavUser] = useState("");
  const [localWebdavPwd, setLocalWebdavPwd] = useState("");
  const [localWebdavE2e, setLocalWebdavE2e] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setLocalWebdavUrl(syncConfig?.url || "");
    setLocalWebdavUser(syncConfig?.username || "");
    setLocalWebdavPwd(syncConfig?.password || "");
    setLocalWebdavE2e(syncConfig?.e2ePassword || "");
  }, [
    syncConfig?.url,
    syncConfig?.username,
    syncConfig?.password,
    syncConfig?.e2ePassword,
  ]);

  return {
    syncConfig,
    localWebdavUrl,
    localWebdavUser,
    localWebdavPwd,
    localWebdavE2e,
    isSyncing,
    setLocalWebdavUrl,
    setLocalWebdavUser,
    setLocalWebdavPwd,
    setLocalWebdavE2e,
    setIsSyncing,
    updateSyncConfig,
  };
}