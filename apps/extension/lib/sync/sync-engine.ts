import { webdavClientAdapter } from './webdav-client';
import { syncConfigStorage } from './sync-config-storage';
import { bookmarkStorage } from '../storage/bookmark-storage';
import { configStorage } from '../storage/config-storage';
import { z } from 'zod';
import { 
  SyncSysSchema, 
  SyncSys, 
  RemoteBookmarkMeta, 
  RemoteSettingsSchema, 
  RemoteSettings, 
  RemoteCategorySchema, 
  RemoteCategory, 
  RemoteBookmarksFileSchema 
} from './sync-schema';
import type { LocalBookmark, LocalCategory, LocalSettings } from '@/types';
import { nanoid } from 'nanoid';
import pLimit from 'p-limit';
import { strFromU8, strToU8, gzipSync, unzipSync } from 'fflate';

const SYNC_ROOT = '/HamHomeSync';
const SYS_JSON = `${SYNC_ROOT}/sys.json`;
const SETTINGS_JSON = `${SYNC_ROOT}/settings.json`;
const CATEGORIES_JSON = `${SYNC_ROOT}/categories.json`;
const META_JSON = `${SYNC_ROOT}/bookmarks/meta.json`;
const CHUNKS_DIR = `${SYNC_ROOT}/bookmarks/chunks`;

const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export class SyncEngine {
  private isSyncing = false;

  constructor() {}

  /**
   * Compress string to base64 gzip
   */
  private compressStr(str: string): string {
    const zipped = gzipSync(strToU8(str));
    let binary = '';
    for (let i = 0; i < zipped.length; i++) {
        binary += String.fromCharCode(zipped[i]);
    }
    return btoa(binary);
  }

  /**
   * Decompress base64 gzip to string
   */
  private decompressStr(b64: string): string {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const unzipped = unzipSync(bytes);
    // fflate unzipSync returns Uint8Array when passing Uint8Array
    return strFromU8(unzipped as unknown as Uint8Array);
  }

  /**
   * Try acquire lock
   */
  private async acquireLock(): Promise<boolean> {
    try {
      let sys: SyncSys | null = null;
      sys = await webdavClientAdapter.getJSON<SyncSys>(SYS_JSON);
      
      const now = Date.now();
      if (sys && sys.lock_status === 'locked') {
        const timeDiff = now - sys.lock_timestamp;
        if (timeDiff < LOCK_TIMEOUT_MS) {
          console.warn(`Sync is locked by another client. Locked for ${timeDiff}ms`);
          return false;
        } else {
          console.warn(`Lock timeout exceeded (${timeDiff}ms). Breaking lock.`);
        }
      }

      // Create new sys state or update
      const newSys: SyncSys = {
        version: 1,
        sync_version: sys?.sync_version || nanoid(),
        last_sync_time: sys?.last_sync_time || 0,
        lock_status: 'locked',
        lock_timestamp: now,
      };

      await webdavClientAdapter.putJSON(SYS_JSON, newSys);
      return true;
    } catch (err: any) {
      if (err.status === 404) {
        const newSys: SyncSys = {
          version: 1,
          sync_version: nanoid(),
          last_sync_time: 0,
          lock_status: 'locked',
          lock_timestamp: Date.now(),
        };
        await webdavClientAdapter.putJSON(SYS_JSON, newSys);
        return true;
      }
      throw err;
    }
  }

  /**
   * Release lock and update sync version
   */
  private async releaseLock(): Promise<void> {
    try {
      const sys = await webdavClientAdapter.getJSON<SyncSys>(SYS_JSON);
      if (sys) {
        sys.lock_status = 'unlocked';
        sys.sync_version = nanoid();
        sys.last_sync_time = Date.now();
        await webdavClientAdapter.putJSON(SYS_JSON, sys);
        
        await syncConfigStorage.setStatus({ 
          status: 'idle', 
          lastSyncTime: sys.last_sync_time, 
          syncVersion: sys.sync_version 
        });
      }
    } catch (err) {
      console.error('Failed to release lock', err);
    }
  }

  /**
   * Main Sync workflow
   */
  async doSync(): Promise<void> {
    if (this.isSyncing) {
      console.warn('Sync is already in progress');
      return;
    }

    const config = await syncConfigStorage.getConfig();
    if (!config.enabled || !config.url) {
      console.log('WebDAV sync is disabled or not configured');
      return;
    }

    this.isSyncing = true;
    await syncConfigStorage.setStatus({ status: 'syncing' });

    try {
      if (!webdavClientAdapter.isInitialized) {
        webdavClientAdapter.init(config);
      }

      await webdavClientAdapter.ensureDirectory(SYNC_ROOT);
      await webdavClientAdapter.ensureDirectory(`${SYNC_ROOT}/bookmarks`);
      await webdavClientAdapter.ensureDirectory(CHUNKS_DIR);

      const locked = await this.acquireLock();
      if (!locked) {
        await syncConfigStorage.setStatus({ status: 'idle' });
        return;
      }

      try {
        console.log('WebDAV Lock acquired, starting sync...');
        await this.syncSettings();
        await this.syncCategories();
        await this.syncBookmarks();
        console.log('WebDAV Sync complete.');
      } finally {
        await this.releaseLock();
      }

    } catch (err: any) {
      console.error('WebDAV Sync failed:', err);
      await syncConfigStorage.setStatus({ status: 'error', errorMessage: err.message || String(err) });
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncSettings() {
    console.log('Syncing settings...');
    const localSettings = await configStorage.getSettings();
    let remoteSettingsRaw = await webdavClientAdapter.getJSON<any>(SETTINGS_JSON);
    
    let remoteSettings: RemoteSettings | null = null;
    if (remoteSettingsRaw) {
      const parsed = RemoteSettingsSchema.safeParse(remoteSettingsRaw);
      if (parsed.success) {
        remoteSettings = parsed.data;
      }
    }

    if (!remoteSettings) {
      // Remote empty, push local
      await webdavClientAdapter.putJSON(SETTINGS_JSON, localSettings);
    } else {
      // Simplistic Settings Merge: We'll assume Remote wins if exists for now, 
      // or you can add a local timestamp to Settings.
      // For simplicity: download remote settings and apply
      await configStorage.setSettings(remoteSettings as Partial<LocalSettings>);
    }
  }

  private async syncCategories() {
    console.log('Syncing categories...');
    const localCategories = await bookmarkStorage.getCategories();
    let remoteCatsRaw = await webdavClientAdapter.getJSON<any>(CATEGORIES_JSON);
    
    let remoteCategories: RemoteCategory[] = [];
    if (remoteCatsRaw && Array.isArray(remoteCatsRaw)) {
      const parsed = z.array(RemoteCategorySchema).safeParse(remoteCatsRaw);
      if (parsed.success) {
        remoteCategories = parsed.data;
      }
    }

    const localMap = new Map(localCategories.map(c => [c.id, c]));
    const remoteMap = new Map(remoteCategories.map(c => [c.id, c]));

    const remoteSignatureMap = new Map(remoteCategories.map(c => [`${c.name}_${c.parentId || ''}`, c]));
    const categoryMapping: Record<string, string> = {}; // local ID -> remote ID

    const mergedCategories: LocalCategory[] = [];
    let hasChanges = false;

    // Last-Write-Wins (createdAt acts like updatedAt if category doesn't update, or simpler: just Remote wins conflicts on categories)
    // Actually categories don't have updatedAt currently. We simply merge by union.
    for (const [id, localCat] of localMap) {
      if (!remoteMap.has(id)) {
        const signature = `${localCat.name}_${localCat.parentId || ''}`;
        if (remoteSignatureMap.has(signature)) {
          // Found duplicate with same name and parent but different id
          const matchingRemote = remoteSignatureMap.get(signature)!;
          categoryMapping[id] = matchingRemote.id;
          hasChanges = true; // Use the remote structure instead
        } else {
          mergedCategories.push(localCat);
          hasChanges = true;
        }
      } else {
        const remoteCat = remoteMap.get(id)!;
        // Merge rule: we can pick remote as Truth
        mergedCategories.push(remoteCat as LocalCategory);
      }
    }

    // Process mapped duplicates locally
    if (Object.keys(categoryMapping).length > 0) {
      await bookmarkStorage.mergeCategories(categoryMapping);
    }

    for (const [id, remoteCat] of remoteMap) {
      if (!localMap.has(id) && !categoryMapping[id]) {
        mergedCategories.push(remoteCat as LocalCategory);
        // Needs to apply to local
        try {
          await bookmarkStorage.importRawCategory(remoteCat as LocalCategory);
        } catch (e) {
             // Handle exist error
        }
      }
    }

    if (hasChanges || !remoteCatsRaw) {
      await webdavClientAdapter.putJSON(CATEGORIES_JSON, mergedCategories);
    }
  }

  private async syncBookmarks() {
    console.log('Syncing bookmarks...');
    const localBookmarks = await bookmarkStorage.getBookmarks({}, false); // get without content
    let remoteMetaFile = await webdavClientAdapter.getJSON<any>(META_JSON);
    
    let remoteMeta: RemoteBookmarkMeta[] = [];
    if (remoteMetaFile) {
      const parsed = RemoteBookmarksFileSchema.safeParse(remoteMetaFile);
      if (parsed.success) {
        remoteMeta = parsed.data.bookmarks;
      } else {
        console.warn('Failed to parse remote meta.json', parsed.error);
        // Disaster threshold protection check might go here
      }
    }

    const localMap = new Map(localBookmarks.map(b => [b.id, b]));
    const remoteMap = new Map(remoteMeta.map(b => [b.id, b]));
    
    const toUploadMeta: RemoteBookmarkMeta[] = [];
    const chunksToUpload: Array<{ id: string, content: string }> = [];
    
    const localDeletions: string[] = [];

    // Diff loop
    for (const [id, local] of localMap) {
      const remote = remoteMap.get(id);
      
      if (!remote) {
        // Local only -> Upload
        const { content } = await this.pickLocalBookmarkWithContent(id, local);
        toUploadMeta.push(this.toRemoteMeta(local));
        if (content) {
            chunksToUpload.push({ id, content });
        }
      } else {
        // Exists in both, Check timestamps
        if (local.updatedAt > remote.updatedAt) {
          // Local newer -> Upload
          const { content } = await this.pickLocalBookmarkWithContent(id, local);
          toUploadMeta.push(this.toRemoteMeta(local));
          if (content) {
            chunksToUpload.push({ id, content });
          }
        } else if (local.updatedAt < remote.updatedAt) {
          // Remote newer -> Apply to Local
          await this.applyRemoteToLocal(remote);
          toUploadMeta.push(remote);
        } else {
          // Same version
          toUploadMeta.push(remote);
        }
      }
    }

    for (const [id, remote] of remoteMap) {
      if (!localMap.has(id)) {
        // Remote only -> Download
        await this.applyRemoteToLocal(remote);
        toUploadMeta.push(remote);
      }
    }

    // Push phase
    if (chunksToUpload.length > 0) {
      console.log(`Uploading ${chunksToUpload.length} chunks...`);
      // Concurrency control using p-limit
      const limit = pLimit(5); // max 5 concurrent uploads
      
      const uploadTasks = chunksToUpload.map(item => limit(async () => {
        const chunkPath = `${CHUNKS_DIR}/${item.id}.gz.txt`; // compressed chunk
        const compressed = this.compressStr(JSON.stringify({ content: item.content }));
        await webdavClientAdapter.putJSON(chunkPath, { data: compressed });
      }));

      await Promise.all(uploadTasks);
    }

    // Write meta.json last safely
    if (chunksToUpload.length > 0 || localMap.size !== remoteMap.size || toUploadMeta.length > remoteMeta.length) {
      console.log('Updating remote meta.json...');
      await webdavClientAdapter.putJSON(META_JSON, { bookmarks: toUploadMeta });
    }
  }

  private toRemoteMeta(local: LocalBookmark): RemoteBookmarkMeta {
    return {
      id: local.id,
      url: local.url,
      title: local.title,
      description: local.description,
      categoryId: local.categoryId,
      tags: local.tags,
      favicon: local.favicon,
      hasSnapshot: local.hasSnapshot,
      createdAt: local.createdAt,
      updatedAt: local.updatedAt,
      isDeleted: local.isDeleted
    };
  }

  private async pickLocalBookmarkWithContent(id: string, cachedLocal?: LocalBookmark): Promise<{ meta: RemoteBookmarkMeta, content?: string }> {
     const full = await bookmarkStorage.getBookmarkById(id);
     if (!full) {
        return { meta: this.toRemoteMeta(cachedLocal!) };
     }
     return { meta: this.toRemoteMeta(full), content: full.content };
  }

  private async applyRemoteToLocal(remote: RemoteBookmarkMeta) {
    if (remote.isDeleted) {
       // local soft delete
       await bookmarkStorage.deleteBookmark(remote.id, false);
       return;
    }

    const exists = await bookmarkStorage.getBookmarkById(remote.id);
    if (!exists) {
      // Fetch chunk
      const chunkPath = `${CHUNKS_DIR}/${remote.id}.gz.txt`;
      let contentStr = '';
      try {
        const chunkRaw = await webdavClientAdapter.getJSON<any>(chunkPath);
        if (chunkRaw && chunkRaw.data) {
           const decompressed = this.decompressStr(chunkRaw.data);
           const chunkJson = JSON.parse(decompressed);
           contentStr = chunkJson.content || '';
        }
      } catch (e) {
         console.warn(`Failed to fetch chunk for ${remote.id}`, e);
      }

      await bookmarkStorage.importRawBookmark({
         id: remote.id,
         url: remote.url,
         title: remote.title,
         description: remote.description,
         categoryId: remote.categoryId,
         tags: remote.tags,
         favicon: remote.favicon,
         hasSnapshot: remote.hasSnapshot,
         createdAt: remote.createdAt,
         updatedAt: remote.updatedAt,
         isDeleted: remote.isDeleted,
         content: contentStr
      });
    } else {
       // Update metadata exactly mirroring remote timestamps
       await bookmarkStorage.importRawBookmark({
          ...exists, // keeps existing content if any
          ...remote  // overwrites meta, INCLUDING createdAt, updatedAt, id
       });
       // If remote has fresh chunks, we might want logic to redownload them if they changed,
       // but typically updating the meta alone is fine unless the user completely redid content scraping.
    }
  }

}

export const syncEngine = new SyncEngine();
