export interface WebDAVConfig {
  enabled: boolean;
  url: string;
  username: string;
  password?: string;
  e2ePassword?: string;
}

export interface SyncStatus {
  lastSyncTime: number; // 0 means never synced
  syncVersion: string; // The version string from remote sys.json
  status: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}
