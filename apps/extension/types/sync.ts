export interface WebDAVConfig {
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
