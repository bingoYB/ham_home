export interface WebDAVSyncStrategy {
  realtimeSyncEnabled: boolean;
  realtimeSyncDelaySeconds: number;
  startupSyncEnabled: boolean;
  startupSyncDelaySeconds: number;
  periodicSyncEnabled: boolean;
  periodicSyncIntervalMinutes: number;
}

// Optional strategy fields keep existing stored configurations compatible.
export interface WebDAVConfig extends Partial<WebDAVSyncStrategy> {
  enabled: boolean;
  url: string;
  username: string;
  password?: string;
  e2ePassword?: string;
}

/** Machine readable reason of a sync failure, produced by lib/sync/webdav-client.ts */
export type SyncErrorCode =
  | 'auth'
  | 'forbidden'
  | 'notFound'
  | 'network'
  | 'server'
  | 'invalidUrl'
  | 'notInitialized'
  | 'unknown';

export interface SyncStatus {
  lastSyncTime: number; // 0 means never synced
  syncVersion: string; // The version string from remote sys.json
  status: 'idle' | 'syncing' | 'error';
  errorCode?: SyncErrorCode;
  errorMessage?: string;
}
