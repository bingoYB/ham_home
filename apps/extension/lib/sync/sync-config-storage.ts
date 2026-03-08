import type { WebDAVConfig, SyncStatus } from '@/types';

// Simple fixed key for AES-GCM local storage obfuscation
// Obfuscates plain text passwords against casual local storage inspection
const AES_KEY = 'HamHome-WebDAV-Fixed-Enc-Key-999';

async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(AES_KEY.padEnd(32, '0')),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  return keyMaterial;
}

async function encrypt(text: string): Promise<string> {
  if (!text) return text;
  try {
    const key = await deriveKey();
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );
    // Return iv + encrypted data in base64
    const encryptedArray = new Uint8Array(encrypted);
    const result = new Uint8Array(iv.length + encryptedArray.length);
    result.set(iv, 0);
    result.set(encryptedArray, iv.length);
    return btoa(String.fromCharCode(...result));
  } catch (err) {
    console.error('Encrypt failed', err);
    return text;
  }
}

async function decrypt(cipherText: string): Promise<string> {
  if (!cipherText) return cipherText;
  try {
    const key = await deriveKey();
    const dec = new TextDecoder();
    const data = new Uint8Array(atob(cipherText).split('').map(c => c.charCodeAt(0)));
    const iv = data.slice(0, 12);
    const encryptedText = data.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedText
    );
    return dec.decode(decrypted);
  } catch (err) {
    // maybe password is plain text
    return cipherText;
  }
}

const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
  enabled: false,
  url: '',
  username: '',
  password: '',
  e2ePassword: ''
};

const DEFAULT_SYNC_STATUS: SyncStatus = {
  lastSyncTime: 0,
  syncVersion: '',
  status: 'idle'
};

const webdavConfigItem = storage.defineItem<WebDAVConfig>('local:webdavConfig', {
  fallback: DEFAULT_WEBDAV_CONFIG,
});

const syncStatusItem = storage.defineItem<SyncStatus>('local:syncStatus', {
  fallback: DEFAULT_SYNC_STATUS,
});

class SyncConfigStorage {
  async getConfig(): Promise<WebDAVConfig> {
    const config = await webdavConfigItem.getValue();
    const result = { ...config };
    if (result.password) {
      result.password = await decrypt(result.password);
    }
    if (result.e2ePassword) {
      result.e2ePassword = await decrypt(result.e2ePassword);
    }
    return result;
  }

  async setConfig(config: Partial<WebDAVConfig>): Promise<WebDAVConfig> {
    const current = await this.getConfig();
    const updated = { ...current, ...config };
    
    const toSave = { ...updated };
    if (toSave.password) {
      toSave.password = await encrypt(toSave.password);
    }
    if (toSave.e2ePassword) {
      toSave.e2ePassword = await encrypt(toSave.e2ePassword);
    }

    await webdavConfigItem.setValue(toSave);
    return updated;
  }

  async getStatus(): Promise<SyncStatus> {
    return syncStatusItem.getValue();
  }

  async setStatus(status: Partial<SyncStatus>): Promise<SyncStatus> {
    const current = await syncStatusItem.getValue();
    const updated = { ...current, ...status };
    await syncStatusItem.setValue(updated);
    return updated;
  }

  watchConfig(callback: (config: WebDAVConfig) => void): () => void {
    return webdavConfigItem.watch(async (newValue: WebDAVConfig | null) => {
      const config = newValue ? { ...newValue } : { ...DEFAULT_WEBDAV_CONFIG };
      if (config.password) {
        config.password = await decrypt(config.password);
      }
      if (config.e2ePassword) {
        config.e2ePassword = await decrypt(config.e2ePassword);
      }
      callback(config);
    });
  }

  watchStatus(callback: (status: SyncStatus) => void): () => void {
    return syncStatusItem.watch((newValue: SyncStatus | null) => {
      callback(newValue ?? { ...DEFAULT_SYNC_STATUS });
    });
  }
}

export const syncConfigStorage = new SyncConfigStorage();
