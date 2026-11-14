import { webdavClientAdapter, toSyncError, SyncError } from './webdav-client';
import { syncConfigStorage, type SyncContentRepairState } from './sync-config-storage';
import { bookmarkStorage } from '../storage/bookmark-storage';
import { configStorage } from '../storage/config-storage';
import { workspaceStorage } from '../storage/workspace-storage';
import { tabGroupRulesStorage } from '../storage/tab-group-rules-storage';
import { bookmarkClipStorage } from '../storage/bookmark-clip-storage';
import { bookmarkTombstoneStorage } from '../storage/bookmark-tombstone-storage';
import { readLaterStorage } from '../storage/read-later-storage';
import { tabLifecycleConfigStorage } from '../storage/tab-lifecycle-config-storage';
import {
  mergeReadLaterEntries,
  reconcileEntriesWithBookmarks,
} from '../read-later/read-later.utils';
import { normalizeTabLifecycleSettings } from '../tabs/tab-lifecycle-settings.utils';
import { syncTombstoneStorage } from '../storage/sync-tombstone-storage';
import {
  mergeSyncTombstones,
  emptySyncTombstones,
  SYNC_TOMBSTONE_KINDS,
  type SyncTombstoneKind,
  type SyncTombstones,
} from './sync-tombstones';
import {
  SyncSys,
  RemoteBookmarkMeta,
  RemoteBookmarkMetaSchema,
  RemoteSettingsSchema,
  RemoteSettings,
  RemoteCategorySchema,
  RemoteBookmarkDeletion,
  RemoteBookmarkDeletionSchema,
  RemoteBookmarkClipSchema,
  RemoteWorkspaceSchema,
  RemoteWorkspaceCategorySchema,
  RemoteTabGroupConfigFileSchema,
  RemoteTabGroupRule,
  RemoteReadLaterFileSchema,
  RemoteTabLifecycleConfigFileSchema,
  RemoteTabGroupRuleSchema,
  RemoteDeletionsFileSchema,
} from './sync-schema';
import type {
  BookmarkTombstone,
  LocalBookmark,
  LocalCategory,
  LocalSettings,
  Workspace,
  WorkspaceCategory,
  TabGroupRule,
  TabGroupAutoGroupSettings,
  BookmarkClip,
  ReadLaterEntry,
  ReadLaterEntryMap,
} from '@/types';
import { buildDuplicateGroups } from '../bookmarks/bookmark-dedup';
import {
  mergeTombstones,
  pruneExpiredTombstones,
} from '../bookmarks/bookmark-retention';
import { nanoid } from 'nanoid';
import pLimit from 'p-limit';
import { contentFingerprint, decodeContentChunk, encodeContentChunk } from './sync-codec';
import { parseRemoteItems, requireListField, withPreservedItems } from './remote-parse';
import { applyDeletions } from './lww-merge';
import { mergeCategoryHierarchy } from './category-merge';

const SYNC_ROOT = '/HamHomeSync';
const SYS_JSON = `${SYNC_ROOT}/sys.json`;
const SETTINGS_JSON = `${SYNC_ROOT}/settings.json`;
const CATEGORIES_JSON = `${SYNC_ROOT}/categories.json`;
const WORKSPACES_JSON = `${SYNC_ROOT}/workspaces.json`;
const TAB_GROUP_CONFIG_JSON = `${SYNC_ROOT}/tab-group-config.json`;
const DELETIONS_JSON = `${SYNC_ROOT}/deletions.json`;
const META_JSON = `${SYNC_ROOT}/bookmarks/meta.json`;
const CLIPS_JSON = `${SYNC_ROOT}/bookmarks/clips.json`;
// Read later state and lifecycle settings use their own files: older clients do not know them, so they cannot strip new fields
const READ_LATER_JSON = `${SYNC_ROOT}/bookmarks/read-later.json`;
const TAB_LIFECYCLE_CONFIG_JSON = `${SYNC_ROOT}/tab-lifecycle-config.json`;
const CHUNKS_DIR = `${SYNC_ROOT}/bookmarks/chunks`;

const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
/** Bookmarks whose content is re-downloaded per sync by the one-time repair pass. */
const CONTENT_REPAIR_BATCH = 200;
const TRANSFER_CONCURRENCY = 5;

/**
 * 单条书签在一次同步中的合并结论
 */
interface BookmarkSyncEntry {
  /** 合并后的元数据，最终写入远端 meta.json */
  meta: RemoteBookmarkMeta;
  /** 需要把 meta 回写到本地存储 */
  applyToLocal: boolean;
  /** meta 相对远端已变化，需要重写 meta.json */
  uploadMeta: boolean;
  /** 需要上传本地正文 chunk */
  uploadContent: boolean;
}

/** State shared by the modules of one sync run. */
interface SyncRun {
  /** Merged deletion records of categories, workspaces, workspace categories and rules. */
  tombstones: SyncTombstones;
  /** Deletion records cancelled during this run because the item was edited afterwards. */
  revived: Record<SyncTombstoneKind, Set<string>>;
}

type ChunkDownload = { status: 'ok'; content: string } | { status: 'missing' } | { status: 'failed' };

const categoryStamp = (c: { createdAt: number; updatedAt?: number }) => c.updatedAt ?? c.createdAt;

function tombstoneMap(list: readonly BookmarkTombstone[]): Map<string, number> {
  return new Map(list.map(({ id, deletedAt }) => [id, deletedAt]));
}

function sameTombstoneSets(a: SyncTombstones, b: Partial<SyncTombstones>): boolean {
  const key = (list: readonly BookmarkTombstone[] | undefined) =>
    JSON.stringify([...(list ?? [])].sort((x, y) => x.id.localeCompare(y.id)));
  return SYNC_TOMBSTONE_KINDS.every((kind) => key(a[kind]) === key(b[kind]));
}

export class SyncEngine {
  private isSyncing = false;

  constructor() {}

  /** True while a sync (or a remote wipe) is running; local writes in that window are the engine's own. */
  get isBusy(): boolean {
    return this.isSyncing;
  }

  private emptyRun(): SyncRun {
    return {
      tombstones: emptySyncTombstones(),
      revived: { categories: new Set(), workspaces: new Set(), workspaceCategories: new Set(), tabGroupRules: new Set() },
    };
  }

  /** Reads a remote JSON file; a corrupt lock file is simply replaced. */
  private async readSys(): Promise<SyncSys | null> {
    try {
      return await webdavClientAdapter.getJSON<SyncSys>(SYS_JSON);
    } catch (err) {
      if (toSyncError(err).code === 'invalidRemoteData') return null;
      throw err;
    }
  }

  /**
   * Try acquire lock
   *
   * Best-effort marker shared with older clients. The read/write sequence is not
   * atomic, so it cannot guarantee mutual exclusion between simultaneous devices.
   */
  private async acquireLock(token: string): Promise<boolean> {
    const sys = await this.readSys();

    const now = Date.now();
    if (sys && sys.lock_status === 'locked') {
      const timeDiff = now - sys.lock_timestamp;
      if (timeDiff < LOCK_TIMEOUT_MS) {
        console.warn(`Sync is locked by another client. Locked for ${timeDiff}ms`);
        return false;
      }
      console.warn(`Replacing an abandoned sync marker (${timeDiff}ms).`);
    }

    const newSys: SyncSys = {
      version: 1,
      sync_version: sys?.sync_version || nanoid(),
      last_sync_time: sys?.last_sync_time || 0,
      lock_status: 'locked',
      lock_timestamp: now,
      lock_owner: token,
    };
    await webdavClientAdapter.putJSON(SYS_JSON, newSys);

    const confirmed = await this.readSys();
    if (!confirmed || confirmed.lock_status !== 'locked' || confirmed.lock_owner !== token) {
      console.warn('Another client acquired the sync lock at the same time. Backing off.');
      return false;
    }
    return true;
  }

  /**
   * Release lock and update sync version
   */
  private async releaseLock(token: string, completed: boolean): Promise<SyncSys | null> {
    try {
      const sys = await this.readSys();
      if (!sys || sys.lock_status !== 'locked' || sys.lock_owner !== token) {
        // Another client may have taken over, including older clients without an owner.
        throw new SyncError('conflict', 'Sync marker was taken over or removed by another client');
      }
      sys.lock_status = 'unlocked';
      sys.lock_owner = undefined;
      if (completed) {
        sys.sync_version = nanoid();
        sys.last_sync_time = Date.now();
      }
      await webdavClientAdapter.putJSON(SYS_JSON, sys);
      return sys;
    } catch (err) {
      console.error('Failed to release lock', err);
      throw err;
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

    this.isSyncing = true;
    try {
      const config = await syncConfigStorage.getConfig();
      if (!config.enabled || !config.url) return;
      await syncConfigStorage.setStatus({ status: 'syncing', errorCode: undefined, errorMessage: '' });
      // Always re-init: the adapter reuses the client unless the credentials changed,
      // otherwise an updated password would never reach the server.
      webdavClientAdapter.init(config);

      // Verify credentials before writing anything remote
      await webdavClientAdapter.checkAuth(SYS_JSON);

      // Release any journaled server lock from an earlier version before using the marker protocol.
      await webdavClientAdapter.recoverPreviousLock(SYNC_ROOT);
      await webdavClientAdapter.ensureDirectory(SYNC_ROOT);

      let synced: SyncSys | null = null;
      const lockToken = nanoid();
      const locked = await this.acquireLock(lockToken);
      if (!locked) throw new SyncError('conflict', 'Another client is holding the sync marker');

      let completed = false;
      let failure: unknown;
      try {
        await webdavClientAdapter.ensureDirectory(CHUNKS_DIR);
        console.log('WebDAV Lock acquired, starting sync...');
        // Deletions first: if the run stops halfway, other devices still learn about them
        // before any module file that no longer contains the deleted items.
        const run = await this.syncDeletions();
        await this.syncSettings();
        await this.syncCategories(run);
        await this.syncWorkspaces(run);
        await this.syncTabGroupConfig(run);
        await this.syncTabLifecycleConfig();
        const deletedBookmarkIds = await this.syncBookmarks();
        await this.syncBookmarkClips(deletedBookmarkIds);
        await this.syncReadLater();
        await this.finishDeletions(run);
        console.log('WebDAV Sync complete.');
        completed = true;
      } catch (err) {
        failure = err;
        throw err;
      } finally {
        try { synced = await this.releaseLock(lockToken, completed); }
        catch (err) {
          if (!failure) throw err;
          console.error('Failed to clear the sync marker after a sync failure', err);
        }
      }
      // Publish success only after the marker was released successfully.
      const result = synced as SyncSys | null;
      await syncConfigStorage.setStatus({ status: 'idle', errorCode: undefined, errorMessage: '',
        ...(result ? { lastSyncTime: result.last_sync_time, syncVersion: result.sync_version } : {}) });

    } catch (err: any) {
      const error = toSyncError(err);
      console.error('WebDAV Sync failed:', error);
      // A failed auth handshake may have been negotiated against stale state, start clean next time
      if (error.code === 'auth') {
        webdavClientAdapter.reset();
      }
      await syncConfigStorage.setStatus({
        status: 'error',
        errorCode: error.code,
        errorMessage: error.message,
      });
    } finally {
      this.isSyncing = false;
    }
  }

  // ============ Deletions of categories / workspaces / rules ============

  /**
   * Merges the local and remote deletion records and publishes the result.
   */
  private async syncDeletions(): Promise<SyncRun> {
    const raw = await webdavClientAdapter.getJSON<unknown>(DELETIONS_JSON);
    let remote: Partial<SyncTombstones> = {};
    let extra: Record<string, unknown> = {};
    if (raw !== null) {
      const parsed = RemoteDeletionsFileSchema.loose().safeParse(raw);
      if (!parsed.success) {
        throw new SyncError('invalidRemoteData', 'Unexpected structure in remote file deletions.json');
      }
      const { categories, workspaces, workspaceCategories, tabGroupRules, ...rest } = parsed.data;
      remote = { categories, workspaces, workspaceCategories, tabGroupRules };
      // Keys written by newer versions survive our rewrite.
      extra = rest;
    }

    const local = await syncTombstoneStorage.getAll();
    const merged = mergeSyncTombstones(local, remote);
    await syncTombstoneStorage.replaceAll(merged);

    const hasAny = SYNC_TOMBSTONE_KINDS.some((kind) => merged[kind].length > 0);
    if ((raw === null && hasAny) || (raw !== null && !sameTombstoneSets(merged, remote))) {
      await webdavClientAdapter.putJSON(DELETIONS_JSON, { ...extra, version: 1, ...merged });
    }

    const run = this.emptyRun();
    run.tombstones = merged;
    return run;
  }

  /**
   * Drops deletion records of items that were edited after the delete, and records the
   * descendants removed while applying remote deletions.
   */
  private async finishDeletions(run: SyncRun): Promise<void> {
    // Re-read: deletions recorded while this run applied remote changes must not be lost.
    const latest = mergeSyncTombstones(await syncTombstoneStorage.getAll(), run.tombstones);
    for (const kind of SYNC_TOMBSTONE_KINDS) {
      const revived = run.revived[kind];
      if (revived.size > 0) latest[kind] = latest[kind].filter(({ id }) => !revived.has(id));
    }
    await syncTombstoneStorage.replaceAll(latest);
    if (!sameTombstoneSets(latest, run.tombstones)) {
      await webdavClientAdapter.putJSON(DELETIONS_JSON, { version: 1, ...latest });
    }
  }

  private areSettingsEqual(local: LocalSettings, remote: RemoteSettings): boolean {
    return (
      local.autoSaveSnapshot === remote.autoSaveSnapshot &&
      local.autoSaveScreenshot === remote.autoSaveScreenshot &&
      local.screenshotPrivatePagePolicy === remote.screenshotPrivatePagePolicy &&
      local.bookmarkHealthSchedule === remote.bookmarkHealthSchedule &&
      local.enableOmniboxSearch === remote.enableOmniboxSearch &&
      local.defaultCategory === remote.defaultCategory &&
      local.theme === remote.theme &&
      local.language === remote.language &&
      local.shortcut === remote.shortcut &&
      local.enableSidePanel === remote.enableSidePanel &&
      local.usePopupSavePanel === remote.usePopupSavePanel &&
      local.panelPosition === remote.panelPosition &&
      local.panelShortcut === remote.panelShortcut
    );
  }

  private areAutoGroupSettingsEqual(
    local: TabGroupAutoGroupSettings,
    remote: TabGroupAutoGroupSettings,
  ): boolean {
    return (
      local.aiAutoGroupEnabled === remote.aiAutoGroupEnabled &&
      local.aiAutoGroupInstructions === remote.aiAutoGroupInstructions &&
      local.domainAutoGroupEnabled === remote.domainAutoGroupEnabled
    );
  }

  private async syncSettings() {
    console.log('Syncing settings...');
    const localSettings = await configStorage.getSettings();
    const remoteSettingsRaw = await webdavClientAdapter.getJSON<unknown>(SETTINGS_JSON);

    if (remoteSettingsRaw === null) {
      // Remote empty, push local
      await webdavClientAdapter.putJSON(SETTINGS_JSON, localSettings);
      return;
    }

    const parsed = RemoteSettingsSchema.safeParse(remoteSettingsRaw);
    if (!parsed.success) {
      // Most likely written by a newer version (new enum values). Overwriting it would
      // throw that version's settings away, so leave both sides untouched.
      console.warn('Remote settings.json is not readable by this version; skipping settings sync', parsed.error);
      return;
    }
    const remoteSettings = parsed.data;

    if (localSettings.updatedAt > remoteSettings.updatedAt) {
      await webdavClientAdapter.putJSON(SETTINGS_JSON, localSettings);
      return;
    }

    if (localSettings.updatedAt < remoteSettings.updatedAt) {
      await configStorage.importRawSettings(remoteSettings);
      return;
    }

    if (!this.areSettingsEqual(localSettings, remoteSettings)) {
      await webdavClientAdapter.putJSON(SETTINGS_JSON, localSettings);
    }
  }

  /**
   * Bookmark categories.
   *
   * Last-Write-Wins by updatedAt (createdAt for older data), deletion records applied on
   * both sides, and local-only categories folded into a remote one with the same name and
   * parent (categories created independently on two devices).
   */
  private async syncCategories(run: SyncRun = this.emptyRun()) {
    console.log('Syncing categories...');
    const localCategories = await bookmarkStorage.getCategories();
    const remoteRaw = await webdavClientAdapter.getJSON<unknown>(CATEGORIES_JSON);
    const { valid: remoteCategories, invalid } =
      remoteRaw === null
        ? { valid: [], invalid: [] }
        : parseRemoteItems(remoteRaw, RemoteCategorySchema, 'categories.json');

    const deletions = tombstoneMap(run.tombstones.categories);
    const localSide = applyDeletions(localCategories, deletions, categoryStamp);
    localSide.revivedIds.forEach((id) => run.revived.categories.add(id));

    // Removing a category also removes its sub-categories; treat those as deleted too so
    // their remote copies are not imported straight back.
    let localKept = localSide.kept;
    if (localSide.deleted.length > 0) {
      const removed = new Set<string>();
      for (const category of localSide.deleted) {
        if (removed.has(category.id)) continue;
        (await bookmarkStorage.deleteCategory(category.id)).forEach((id) => removed.add(id));
      }
      const now = Date.now();
      for (const id of removed) if (!deletions.has(id)) deletions.set(id, now);
      localKept = localKept.filter((category) => !removed.has(category.id));
    }

    const remoteSide = applyDeletions(remoteCategories as LocalCategory[], deletions, categoryStamp);
    remoteSide.revivedIds.forEach((id) => run.revived.categories.add(id));

    const { merged, applyToLocal, mapping, changed } = mergeCategoryHierarchy(
      localKept,
      remoteSide.kept,
      Date.now(),
    );

    for (const remoteCat of applyToLocal) {
      await bookmarkStorage.importRawCategory(remoteCat);
    }
    // Import targets before moving bookmark references away from the old IDs.
    if (Object.keys(mapping).length > 0) {
      await bookmarkStorage.mergeCategories(mapping);
    }

    if (changed || remoteSide.deleted.length > 0 || remoteRaw === null) {
      await webdavClientAdapter.putJSON(CATEGORIES_JSON, withPreservedItems(merged, invalid));
    }
  }

  private async syncWorkspaces(run: SyncRun = this.emptyRun()) {
    console.log('Syncing workspaces...');
    const [localWorkspacesAll, localCategories] = await Promise.all([
      workspaceStorage.getWorkspaces(),
      workspaceStorage.getCategories(),
    ]);
    const remoteRaw = await webdavClientAdapter.getJSON<unknown>(WORKSPACES_JSON);

    let remoteWorkspacesAll: Workspace[] = [];
    let remoteCategories: WorkspaceCategory[] = [];
    let invalidWorkspaces: unknown[] = [];
    let invalidCategories: unknown[] = [];
    if (remoteRaw !== null) {
      const workspaces = parseRemoteItems(
        requireListField(remoteRaw, 'workspaces', 'workspaces.json'),
        RemoteWorkspaceSchema,
        'workspaces.json',
      );
      const categories = parseRemoteItems(
        requireListField(remoteRaw, 'categories', 'workspaces.json'),
        RemoteWorkspaceCategorySchema,
        'workspaces.json',
      );
      remoteWorkspacesAll = workspaces.valid as Workspace[];
      remoteCategories = categories.valid as WorkspaceCategory[];
      invalidWorkspaces = workspaces.invalid;
      invalidCategories = categories.invalid;
    }

    const {
      merged: mergedCategories,
      mapping: workspaceCategoryMapping,
      changed: categoriesChanged,
    } = await this.mergeWorkspaceCategories(localCategories, remoteCategories, run);

    // Deleted workspaces
    const deletions = tombstoneMap(run.tombstones.workspaces);
    const stamp = (workspace: Workspace) => workspace.updatedAt;
    const localSide = applyDeletions(localWorkspacesAll, deletions, stamp);
    const remoteSide = applyDeletions(remoteWorkspacesAll, deletions, stamp);
    [...localSide.revivedIds, ...remoteSide.revivedIds].forEach((id) => run.revived.workspaces.add(id));
    for (const workspace of localSide.deleted) {
      await workspaceStorage.deleteWorkspace(workspace.id);
    }

    const localMap = new Map(localSide.kept.map((workspace) => [workspace.id, workspace]));
    const remoteMap = new Map(remoteSide.kept.map((workspace) => [workspace.id, workspace]));
    const mergedWorkspaces: Workspace[] = [];
    let workspacesChanged = remoteRaw === null || remoteSide.deleted.length > 0;

    for (const [id, localWorkspace] of localMap) {
      const remoteWorkspace = remoteMap.get(id);
      if (!remoteWorkspace) {
        const normalizedLocal = this.remapWorkspaceCategory(localWorkspace, workspaceCategoryMapping);
        mergedWorkspaces.push(normalizedLocal);
        if (normalizedLocal.categoryId !== localWorkspace.categoryId) {
          await workspaceStorage.importRawWorkspace(normalizedLocal);
        }
        workspacesChanged = true;
        continue;
      }

      if (localWorkspace.updatedAt > remoteWorkspace.updatedAt) {
        const normalizedLocal = this.remapWorkspaceCategory(localWorkspace, workspaceCategoryMapping);
        mergedWorkspaces.push(normalizedLocal);
        if (normalizedLocal.categoryId !== localWorkspace.categoryId) {
          await workspaceStorage.importRawWorkspace(normalizedLocal);
        }
        workspacesChanged = true;
      } else {
        mergedWorkspaces.push(remoteWorkspace);
        if (localWorkspace.updatedAt < remoteWorkspace.updatedAt) {
          await workspaceStorage.importRawWorkspace(remoteWorkspace);
        }
      }
    }

    for (const [id, remoteWorkspace] of remoteMap) {
      if (!localMap.has(id)) {
        mergedWorkspaces.push(remoteWorkspace);
        await workspaceStorage.importRawWorkspace(remoteWorkspace);
      }
    }

    if (categoriesChanged || workspacesChanged) {
      await webdavClientAdapter.putJSON(WORKSPACES_JSON, {
        workspaces: withPreservedItems(mergedWorkspaces, invalidWorkspaces),
        categories: withPreservedItems(mergedCategories, invalidCategories),
      });
    }
  }

  private async mergeWorkspaceCategories(
    localCategoriesAll: WorkspaceCategory[],
    remoteCategoriesAll: WorkspaceCategory[],
    run: SyncRun,
  ): Promise<{ merged: WorkspaceCategory[]; mapping: Record<string, string>; changed: boolean }> {
    const deletions = tombstoneMap(run.tombstones.workspaceCategories);
    const localSide = applyDeletions(localCategoriesAll, deletions, categoryStamp);
    const remoteSide = applyDeletions(remoteCategoriesAll, deletions, categoryStamp);
    [...localSide.revivedIds, ...remoteSide.revivedIds].forEach((id) => run.revived.workspaceCategories.add(id));
    for (const category of localSide.deleted) {
      await workspaceStorage.deleteCategory(category.id);
    }

    const { merged, applyToLocal, mapping, changed } = mergeCategoryHierarchy(
      localSide.kept,
      remoteSide.kept,
      Date.now(),
    );

    for (const remoteCategory of applyToLocal) {
      await workspaceStorage.importRawCategory(remoteCategory);
    }
    if (Object.keys(mapping).length > 0) {
      await workspaceStorage.mergeCategories(mapping);
    }

    return { merged, mapping, changed: changed || remoteSide.deleted.length > 0 };
  }

  private remapWorkspaceCategory(
    workspace: Workspace,
    mapping: Record<string, string>,
  ): Workspace {
    if (!workspace.categoryId || !mapping[workspace.categoryId]) {
      return workspace;
    }

    return {
      ...workspace,
      categoryId: mapping[workspace.categoryId],
      updatedAt: Date.now(),
    };
  }

  private async syncTabGroupConfig(run: SyncRun = this.emptyRun()) {
    console.log('Syncing tab group config...');
    const [localRulesAll, localAutoGroupSettings] = await Promise.all([
      tabGroupRulesStorage.getRules(),
      tabGroupRulesStorage.getAutoGroupSettings(),
    ]);
    const remoteRaw = await webdavClientAdapter.getJSON<unknown>(TAB_GROUP_CONFIG_JSON);

    let remoteRulesAll: TabGroupRule[] = [];
    let invalidRules: unknown[] = [];
    let remoteAutoGroupSettings = localAutoGroupSettings;
    // Settings written by a newer version that this one cannot read are written back untouched.
    let unreadableAutoGroupSettings: unknown = undefined;
    let remoteExtra: Record<string, unknown> = {};
    if (remoteRaw !== null) {
      const rules = parseRemoteItems(
        requireListField(remoteRaw, 'rules', 'tab-group-config.json'),
        RemoteTabGroupRuleSchema,
        'tab-group-config.json',
      );
      remoteRulesAll = rules.valid as TabGroupRule[];
      invalidRules = rules.invalid;
      const settings = RemoteTabGroupConfigFileSchema.shape.autoGroupSettings.safeParse(
        (remoteRaw as Record<string, unknown>).autoGroupSettings,
      );
      if (settings.success) {
        remoteAutoGroupSettings = settings.data;
      } else {
        console.warn('Remote auto group settings are not readable by this version', settings.error);
        unreadableAutoGroupSettings = (remoteRaw as Record<string, unknown>).autoGroupSettings;
      }
      remoteExtra = Object.fromEntries(
        Object.entries(remoteRaw as Record<string, unknown>).filter(([key]) => key !== 'rules' && key !== 'autoGroupSettings'),
      );
    }

    const deletions = tombstoneMap(run.tombstones.tabGroupRules);
    const stamp = (rule: TabGroupRule) => rule.updatedAt;
    const localSide = applyDeletions(localRulesAll, deletions, stamp);
    const remoteSide = applyDeletions(remoteRulesAll, deletions, stamp);
    [...localSide.revivedIds, ...remoteSide.revivedIds].forEach((id) => run.revived.tabGroupRules.add(id));
    for (const rule of localSide.deleted) {
      await tabGroupRulesStorage.deleteRule(rule.id);
    }

    const localMap = new Map(localSide.kept.map((rule) => [rule.id, rule]));
    const remoteMap = new Map(remoteSide.kept.map((rule) => [rule.id, rule]));
    const mergedRules: TabGroupRule[] = [];
    let changed = remoteRaw === null || remoteSide.deleted.length > 0;

    for (const [id, localRule] of localMap) {
      const remoteRule = remoteMap.get(id);
      if (!remoteRule) {
        mergedRules.push(localRule);
        changed = true;
        continue;
      }

      if (localRule.updatedAt > remoteRule.updatedAt) {
        mergedRules.push(localRule);
        changed = true;
      } else {
        mergedRules.push(remoteRule);
        if (localRule.updatedAt < remoteRule.updatedAt) {
          await tabGroupRulesStorage.importRawRule(remoteRule);
        }
      }
    }

    for (const [id, remoteRule] of remoteMap) {
      if (!localMap.has(id)) {
        mergedRules.push(remoteRule);
        await tabGroupRulesStorage.importRawRule(remoteRule);
      }
    }

    const autoGroupSettingsChanged =
      unreadableAutoGroupSettings === undefined && (
      localAutoGroupSettings.updatedAt > remoteAutoGroupSettings.updatedAt ||
      (
        localAutoGroupSettings.updatedAt === remoteAutoGroupSettings.updatedAt &&
        !this.areAutoGroupSettingsEqual(localAutoGroupSettings, remoteAutoGroupSettings)
      ));

    if (unreadableAutoGroupSettings === undefined && localAutoGroupSettings.updatedAt < remoteAutoGroupSettings.updatedAt) {
      await tabGroupRulesStorage.importRawAutoGroupSettings(remoteAutoGroupSettings);
    }

    if (changed || autoGroupSettingsChanged) {
      await webdavClientAdapter.putJSON(TAB_GROUP_CONFIG_JSON, {
        ...remoteExtra,
        rules: withPreservedItems(mergedRules, invalidRules),
        autoGroupSettings:
          unreadableAutoGroupSettings !== undefined
            ? unreadableAutoGroupSettings
            : autoGroupSettingsChanged
              ? localAutoGroupSettings
              : remoteAutoGroupSettings,
      });
    }
  }

  /**
   * 书签同步
   *
   * 分两步对齐身份，缺一不可：
   * 1. 按 ID 做 Last-Write-Wins，合并同一条书签在各设备上的不同版本
   * 2. 按规范化 URL 收敛：各设备独立收藏同一网址时会生成不同的 ID，
   *    只按 ID 合并会让每台设备的书签数成倍增长（issue #17）
   *
   * Content travels in per-bookmark chunks. The meta carries a content fingerprint so a
   * device downloads a chunk only when it differs from its local copy, and uploads one
   * only when the remote copy is out of date.
   *
   * @returns IDs of bookmarks deleted for good (their clips must not be re-imported)
   */
  private async syncBookmarks(): Promise<Set<string>> {
    console.log('Syncing bookmarks...');
    // 含软删除墓碑，否则本地删除永远不会传播到其他设备
    const localBookmarks = await bookmarkStorage.getBookmarksForSync();
    const remoteMetaFile = await webdavClientAdapter.getJSON<unknown>(META_JSON);

    let remoteMeta: RemoteBookmarkMeta[] = [];
    let remoteDeletions: RemoteBookmarkDeletion[] = [];
    let invalidMeta: unknown[] = [];
    if (remoteMetaFile !== null) {
      const bookmarks = parseRemoteItems(
        requireListField(remoteMetaFile, 'bookmarks', 'bookmarks/meta.json'),
        RemoteBookmarkMetaSchema,
        'bookmarks/meta.json',
      );
      remoteMeta = bookmarks.valid;
      invalidMeta = bookmarks.invalid;
      // Unreadable deletion records carry no data worth keeping.
      remoteDeletions = parseRemoteItems(
        requireListField(remoteMetaFile, 'deletions', 'bookmarks/meta.json'),
        RemoteBookmarkDeletionSchema,
        'bookmarks/meta.json',
      ).valid;
    }

    const localMap = new Map(localBookmarks.map(b => [b.id, b]));
    const remoteMap = new Map(remoteMeta.map(b => [b.id, b]));

    // 墓碑先于书签合并：被彻底删除的记录不能再参与后面的 LWW，
    // 否则本地残留的副本会被当成「远端没有的新书签」重新上传
    const deletions = await this.reconcileDeletions(localMap, remoteMap, remoteDeletions);

    const entries = this.mergeBookmarkEntries(localMap, remoteMap);
    const mergedDuplicates = this.reconcileDuplicateBookmarks(entries);
    if (mergedDuplicates > 0) {
      console.log(`Merged ${mergedDuplicates} duplicated bookmark(s) by URL`);
    }

    const contents = await bookmarkStorage.getContentsMap();

    // ---- Pull phase: metadata and content chunks that are newer remotely ----
    const repairState = await syncConfigStorage.getContentRepairState();
    const { toDownload, repairBatch, repairRemaining } = this.planContentDownloads(
      entries,
      localMap,
      remoteMap,
      contents,
      repairState,
    );
    const downloads = await this.downloadChunks(toDownload);

    const toImport: LocalBookmark[] = [];
    const contentUpdates: Record<string, string> = {};
    for (const [id, result] of downloads) {
      if (result.status === 'ok') {
        contentUpdates[id] = result.content;
        contents[id] = result.content;
      }
    }
    for (const entry of entries.values()) {
      if (!entry.applyToLocal) continue;
      const existing = localMap.get(entry.meta.id);
      // 本地从未存在的墓碑不必落盘，避免回收站里凭空多出别的设备删掉的书签
      if (!existing && entry.meta.isDeleted) continue;
      toImport.push(this.toLocalBookmark(entry.meta, existing));
    }
    await bookmarkStorage.importRawBookmarks(
      toImport,
      contentUpdates,
      Object.fromEntries([...new Set([...localMap.keys(), ...entries.keys()])].map(id => [id, localMap.get(id) ?? null])),
    );
    await this.updateContentRepairState(repairState, repairBatch, repairRemaining, downloads);

    // ---- Push phase ----
    const finalMeta: RemoteBookmarkMeta[] = [];
    const chunksToUpload: Array<{ id: string, content: string }> = [];
    let metaChanged =
      remoteMetaFile === null ||
      entries.size !== remoteMap.size ||
      deletions.length !== remoteDeletions.length;

    for (const entry of entries.values()) {
      if (entry.uploadContent && !entry.meta.isDeleted) {
        const remote = remoteMap.get(entry.meta.id);
        const content = contents[entry.meta.id];
        const hash = contentFingerprint(content);
        // Without local content (e.g. never downloaded) keep pointing at the remote chunk.
        entry.meta = { ...entry.meta, contentHash: hash ?? remote?.contentHash };
        if (content && hash !== remote?.contentHash) {
          chunksToUpload.push({ id: entry.meta.id, content });
        }
      }

      finalMeta.push(entry.meta);
      if (entry.uploadMeta) {
        metaChanged = true;
      }
    }

    if (chunksToUpload.length > 0) {
      console.log(`Uploading ${chunksToUpload.length} chunks...`);
      const limit = pLimit(TRANSFER_CONCURRENCY);
      const uploads = await Promise.allSettled(chunksToUpload.map(item => limit(async () => {
        await webdavClientAdapter.putJSON(`${CHUNKS_DIR}/${item.id}.gz.txt`, encodeContentChunk(item.content));
      })));
      const failed = uploads.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failed) throw failed.reason;
    }

    // Write meta.json last safely
    if (metaChanged || chunksToUpload.length > 0) {
      console.log('Updating remote meta.json...');
      await webdavClientAdapter.putJSON(META_JSON, {
        bookmarks: withPreservedItems(finalMeta, invalidMeta),
        deletions,
      });
    }

    return new Set(deletions.map(({ id }) => id));
  }

  /**
   * Decides which content chunks to download in this run:
   * - bookmarks new to this device;
   * - bookmarks whose remote content fingerprint differs from the local content;
   * - one batch of the one-time repair of content lost to the old chunk decoding bug.
   */
  private planContentDownloads(
    entries: Map<string, BookmarkSyncEntry>,
    localMap: Map<string, LocalBookmark>,
    remoteMap: Map<string, RemoteBookmarkMeta>,
    contents: Record<string, string>,
    repairState: SyncContentRepairState,
  ): { toDownload: string[]; repairBatch: string[]; repairRemaining: number } {
    const toDownload = new Set<string>();
    for (const entry of entries.values()) {
      const remote = remoteMap.get(entry.meta.id);
      if (!entry.applyToLocal || entry.meta.isDeleted || !remote || remote.isDeleted) continue;
      const local = localMap.get(entry.meta.id);
      if (!local) {
        toDownload.add(entry.meta.id);
      } else if (remote.contentHash && remote.contentHash !== contentFingerprint(contents[entry.meta.id])) {
        toDownload.add(entry.meta.id);
      }
    }

    if (repairState.done) return { toDownload: [...toDownload], repairBatch: [], repairRemaining: 0 };

    const attempted = new Set(repairState.attempted);
    const candidates: string[] = [];
    for (const [id, local] of localMap) {
      const remote = remoteMap.get(id);
      if (local.isDeleted || contents[id] || !remote || remote.isDeleted) continue;
      if (toDownload.has(id) || attempted.has(id)) continue;
      candidates.push(id);
    }
    const repairBatch = candidates.slice(0, CONTENT_REPAIR_BATCH);
    repairBatch.forEach((id) => toDownload.add(id));
    return { toDownload: [...toDownload], repairBatch, repairRemaining: candidates.length - repairBatch.length };
  }

  private async updateContentRepairState(
    state: SyncContentRepairState,
    batch: string[],
    remaining: number,
    downloads: Map<string, ChunkDownload>,
  ): Promise<void> {
    if (state.done) return;
    // Network failures are retried next time; found or missing chunks are settled.
    const settled = batch.filter((id) => downloads.get(id)?.status !== 'failed');
    const failed = batch.length - settled.length;
    if (remaining === 0 && failed === 0) {
      await syncConfigStorage.setContentRepairState({ done: true, attempted: [] });
      return;
    }
    if (settled.length > 0) {
      await syncConfigStorage.setContentRepairState({ done: false, attempted: [...state.attempted, ...settled] });
    }
  }

  private async downloadChunks(ids: string[]): Promise<Map<string, ChunkDownload>> {
    const results = new Map<string, ChunkDownload>();
    if (ids.length === 0) return results;
    console.log(`Downloading ${ids.length} chunks...`);
    const limit = pLimit(TRANSFER_CONCURRENCY);
    await Promise.all(ids.map((id) => limit(async () => {
      results.set(id, await this.downloadChunk(id));
    })));
    return results;
  }

  /**
   * Downloads one content chunk. A missing or corrupt chunk is final ('missing'); a
   * transport error is 'failed' and leaves the local content untouched.
   */
  private async downloadChunk(id: string): Promise<ChunkDownload> {
    let raw: unknown;
    try {
      raw = await webdavClientAdapter.getJSON<unknown>(`${CHUNKS_DIR}/${id}.gz.txt`);
    } catch (err) {
      if (toSyncError(err).code === 'invalidRemoteData') return { status: 'missing' };
      console.warn(`Failed to fetch chunk for ${id}`, err);
      return { status: 'failed' };
    }
    if (raw === null) return { status: 'missing' };
    try {
      return { status: 'ok', content: decodeContentChunk(raw) };
    } catch (err) {
      console.warn(`Unreadable chunk for ${id}`, err);
      return { status: 'missing' };
    }
  }

  /**
   * 合并两侧的删除墓碑并落到本地
   *
   * 处理完后 localMap / remoteMap 里不会再有被墓碑覆盖的记录。
   * @returns 合并后应写回远端的墓碑列表
   */
  private async reconcileDeletions(
    localMap: Map<string, LocalBookmark>,
    remoteMap: Map<string, RemoteBookmarkMeta>,
    remoteDeletions: RemoteBookmarkDeletion[],
  ): Promise<BookmarkTombstone[]> {
    const localTombstones = await bookmarkTombstoneStorage.getAll();
    // 过期墓碑不再参与同步，否则永远清不掉
    const merged = pruneExpiredTombstones(
      mergeTombstones(localTombstones, remoteDeletions),
    );

    // 删除之后又在别处编辑过的，按 Last-Write-Wins 判定为「复活」，撤销该墓碑
    const deletions = merged.filter(({ id, deletedAt }) => {
      const local = localMap.get(id);
      const remote = remoteMap.get(id);
      const revivedLocally = !!local && !local.isDeleted && local.updatedAt > deletedAt;
      const revivedRemotely = !!remote && !remote.isDeleted && remote.updatedAt > deletedAt;
      return !revivedLocally && !revivedRemotely;
    });

    const staleLocalIds: string[] = [];
    for (const { id } of deletions) {
      if (localMap.has(id)) staleLocalIds.push(id);
      localMap.delete(id);
      remoteMap.delete(id);
    }

    if (staleLocalIds.length > 0) {
      console.log(`Purging ${staleLocalIds.length} remotely deleted bookmark(s)...`);
      await bookmarkStorage.purgeBookmarks(staleLocalIds);
    }

    // purgeBookmarks 会按本地时间补墓碑，这里用合并结果覆盖，保留期以最早的删除时刻为准
    await bookmarkTombstoneStorage.replaceAll(deletions);

    await this.deleteRemoteChunks(deletions, remoteDeletions);

    return deletions;
  }

  /**
   * 清理已彻底删除书签的远端正文分片
   *
   * 只处理这次新增的墓碑：已经在远端墓碑表里的，说明别的设备已经删过了。
   * 删不掉不影响同步结果，只是暂时多占一点空间。
   */
  private async deleteRemoteChunks(
    deletions: BookmarkTombstone[],
    remoteDeletions: RemoteBookmarkDeletion[],
  ): Promise<void> {
    const known = new Set(remoteDeletions.map((deletion) => deletion.id));
    const newIds = deletions.filter(({ id }) => !known.has(id)).map(({ id }) => id);
    if (newIds.length === 0) return;

    const limit = pLimit(TRANSFER_CONCURRENCY);
    await Promise.all(
      newIds.map((id) =>
        limit(async () => {
          try {
            await webdavClientAdapter.deleteFile(`${CHUNKS_DIR}/${id}.gz.txt`);
          } catch (err) {
            console.warn(`Failed to delete remote chunk for ${id}`, err);
          }
        }),
      ),
    );
  }

  /**
   * 按 ID 合并本地与远端书签元数据（Last-Write-Wins）
   */
  private mergeBookmarkEntries(
    localMap: Map<string, LocalBookmark>,
    remoteMap: Map<string, RemoteBookmarkMeta>,
  ): Map<string, BookmarkSyncEntry> {
    const entries = new Map<string, BookmarkSyncEntry>();

    for (const [id, local] of localMap) {
      const remote = remoteMap.get(id);

      // 本地独有，或本地版本更新 -> 上传
      if (!remote || local.updatedAt > remote.updatedAt) {
        entries.set(id, {
          meta: this.toRemoteMeta(local),
          applyToLocal: false,
          uploadMeta: true,
          uploadContent: !local.isDeleted,
        });
        continue;
      }

      // 远端版本更新 -> 回写本地
      if (local.updatedAt < remote.updatedAt) {
        entries.set(id, {
          meta: remote,
          applyToLocal: true,
          uploadMeta: false,
          uploadContent: false,
        });
        continue;
      }

      // 同版本，保持不动
      entries.set(id, {
        meta: remote,
        applyToLocal: false,
        uploadMeta: false,
        uploadContent: false,
      });
    }

    // 远端独有 -> 下载
    for (const [id, remote] of remoteMap) {
      if (localMap.has(id)) continue;
      entries.set(id, {
        meta: remote,
        applyToLocal: true,
        uploadMeta: false,
        uploadContent: false,
      });
    }

    return entries;
  }

  /**
   * 把指向同一网址的多条书签收敛成一条
   *
   * 保留创建时间最早的一条（ID 字典序兜底，保证每台设备独立算出同样的结果），
   * 其余记录合并标签等信息后标记为软删除，用户仍可从回收站找回。
   *
   * @returns 被合并掉的重复书签数量
   */
  private reconcileDuplicateBookmarks(entries: Map<string, BookmarkSyncEntry>): number {
    const groups = buildDuplicateGroups(
      Array.from(entries.values(), (entry) => entry.meta),
    );
    if (groups.length === 0) return 0;

    const now = Date.now();
    let mergedCount = 0;

    for (const group of groups) {
      const canonicalEntry = entries.get(group.canonical.id);
      if (!canonicalEntry) continue;

      const canonical = canonicalEntry.meta;
      const tags = new Set(canonical.tags);
      let title = canonical.title;
      let description = canonical.description;
      let favicon = canonical.favicon;
      let categoryId = canonical.categoryId;

      for (const duplicate of group.duplicates) {
        const duplicateEntry = entries.get(duplicate.id);
        if (!duplicateEntry) continue;

        // 只补全保留项缺失的字段，不覆盖用户已填写的内容
        duplicate.tags.forEach((tag) => tags.add(tag));
        if (!title.trim()) title = duplicate.title;
        if (!description.trim()) description = duplicate.description;
        if (!favicon) favicon = duplicate.favicon;
        if (!categoryId) categoryId = duplicate.categoryId;

        // 快照 / 正文挂在被删记录自己的 ID 下，不能挪给保留项，只做软删除
        duplicateEntry.meta = { ...duplicate, isDeleted: true, updatedAt: now };
        duplicateEntry.applyToLocal = true;
        duplicateEntry.uploadMeta = true;
        duplicateEntry.uploadContent = false;
        mergedCount += 1;
      }

      const mergedTags = Array.from(tags);
      const canonicalChanged =
        title !== canonical.title ||
        description !== canonical.description ||
        favicon !== canonical.favicon ||
        categoryId !== canonical.categoryId ||
        mergedTags.length !== canonical.tags.length;

      if (canonicalChanged) {
        canonicalEntry.meta = {
          ...canonical,
          title,
          description,
          favicon,
          categoryId,
          tags: mergedTags,
          updatedAt: now,
        };
        canonicalEntry.applyToLocal = true;
        canonicalEntry.uploadMeta = true;
      }
    }

    return mergedCount;
  }

  /**
   * Clips (Last-Write-Wins by id).
   *
   * @param deletedBookmarkIds Bookmarks deleted for good. Purging a bookmark hard-deletes its
   *   clips locally, so their remote copies must be dropped instead of re-imported.
   */
  private async syncBookmarkClips(deletedBookmarkIds: Set<string> = new Set()): Promise<void> {
    const localClips = await bookmarkClipStorage.getAllClips();
    const remoteRaw = await webdavClientAdapter.getJSON<unknown>(CLIPS_JSON);
    const parsed =
      remoteRaw === null
        ? { valid: [], invalid: [] }
        : parseRemoteItems(
            requireListField(remoteRaw, 'clips', 'bookmarks/clips.json'),
            RemoteBookmarkClipSchema,
            'bookmarks/clips.json',
          );
    const remoteClips = (parsed.valid as BookmarkClip[]).filter(
      (clip) => !deletedBookmarkIds.has(clip.bookmarkId),
    );
    const orphansDropped = parsed.valid.length - remoteClips.length;
    const localMap = new Map(
      localClips
        .filter((clip) => !deletedBookmarkIds.has(clip.bookmarkId))
        .map((clip) => [clip.id, clip]),
    );
    const remoteMap = new Map(remoteClips.map((clip) => [clip.id, clip]));
    const merged: BookmarkClip[] = [];
    const toImport: BookmarkClip[] = [];
    let changed = remoteRaw === null || orphansDropped > 0;

    for (const [id, local] of localMap) {
      const remote = remoteMap.get(id);
      if (!remote || local.updatedAt >= remote.updatedAt) {
        merged.push(local);
        if (
          !remote ||
          local.updatedAt > remote.updatedAt ||
          JSON.stringify(local) !== JSON.stringify(remote)
        ) {
          changed = true;
        }
      } else {
        merged.push(remote);
        toImport.push(remote);
      }
    }

    for (const [id, remote] of remoteMap) {
      if (localMap.has(id)) continue;
      merged.push(remote);
      toImport.push(remote);
    }

    await bookmarkClipStorage.upsertRawClips(toImport);

    if (changed || localMap.size !== remoteMap.size) {
      await webdavClientAdapter.putJSON(CLIPS_JSON, { clips: withPreservedItems(merged, parsed.invalid) });
    }
  }

  /**
   * Tab lifecycle settings (auto archive, tab budget, read later), last write wins by updatedAt.
   * Synced settings that turn on auto archive / making room still need this device's consent.
   */
  private async syncTabLifecycleConfig(): Promise<void> {
    console.log('Syncing tab lifecycle config...');
    const local = await tabLifecycleConfigStorage.getRawSettings();
    const remoteRaw = await webdavClientAdapter.getJSON<any>(TAB_LIFECYCLE_CONFIG_JSON);
    const parsed = remoteRaw ? RemoteTabLifecycleConfigFileSchema.safeParse(remoteRaw) : null;
    if (remoteRaw && !parsed?.success) {
      // Possibly written by a newer version: never overwrite it with local data
      console.warn('Failed to parse remote tab-lifecycle-config.json', parsed?.error);
      return;
    }
    const remote = parsed?.success ? parsed.data.settings : null;

    if (!remote || local.updatedAt > remote.updatedAt) {
      await webdavClientAdapter.putJSON(TAB_LIFECYCLE_CONFIG_JSON, { version: 1, settings: local });
      return;
    }
    if (local.updatedAt < remote.updatedAt) {
      await tabLifecycleConfigStorage.importRawSettings(remote);
      return;
    }
    // Same version but different content (should not happen): this device wins
    const sameContent =
      JSON.stringify(normalizeTabLifecycleSettings(local)) ===
      JSON.stringify(normalizeTabLifecycleSettings(remote));
    if (!sameContent) {
      await webdavClientAdapter.putJSON(TAB_LIFECYCLE_CONFIG_JSON, { version: 1, settings: local });
    }
  }

  /**
   * Read later state: aligned by bookmarkId, last write wins by updatedAt; dropped with
   * purged bookmarks (tombstones), moved to the kept bookmark when duplicates merge by URL.
   */
  private async syncReadLater(): Promise<void> {
    console.log('Syncing read later...');
    const remoteRaw = await webdavClientAdapter.getJSON<any>(READ_LATER_JSON);
    const parsed = remoteRaw ? RemoteReadLaterFileSchema.safeParse(remoteRaw) : null;
    if (remoteRaw && !parsed?.success) {
      console.warn('Failed to parse remote read-later.json', parsed?.error);
      return;
    }

    const remote: ReadLaterEntryMap = Object.fromEntries(
      (parsed?.success ? parsed.data.entries : []).map((entry) => [
        entry.bookmarkId,
        entry as unknown as ReadLaterEntry,
      ]),
    );
    const [bookmarks, tombstones] = await Promise.all([
      bookmarkStorage.getBookmarksForSync(),
      bookmarkTombstoneStorage.getAll(),
    ]);

    // Merge into the entries as they are when writing: queue changes made while the
    // remote file was loading (e.g. "Read later & close") are kept, not overwritten
    let remoteChanged = !remoteRaw;
    const merged = await readLaterStorage.replaceWith((local) => {
      const merge = mergeReadLaterEntries(local, remote);
      const reconciled = reconcileEntriesWithBookmarks(
        merge.merged,
        bookmarks,
        tombstones,
        Date.now(),
      );
      remoteChanged = remoteChanged || merge.remoteChanged || reconciled.changed;
      return merge.localChanged || reconciled.changed ? reconciled.entries : null;
    });

    if (remoteChanged) {
      await webdavClientAdapter.putJSON(READ_LATER_JSON, {
        version: 1,
        entries: Object.values(merged),
      });
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
      // 始终显式写出，否则 isDeleted 无法在 JSON 往返后回到 false（恢复书签不会同步）
      isDeleted: local.isDeleted ?? false
    };
  }

  /**
   * Builds the local record for a remote version (keeps the remote timestamps so the next
   * sync does not see it as a local edit).
   *
   * Device-local state is never taken from the remote copy: snapshots are not synced, so
   * `hasSnapshot` stays what this device knows (a remote `true` used to show a "view
   * snapshot" action that could only fail). Remote-only fields such as `contentHash` are
   * not stored locally.
   */
  private toLocalBookmark(remote: RemoteBookmarkMeta, existing: LocalBookmark | undefined): LocalBookmark {
    const isDeleted = remote.isDeleted ?? false;
    const base = {
      id: remote.id,
      url: remote.url,
      title: remote.title,
      description: remote.description,
      categoryId: remote.categoryId,
      tags: remote.tags,
      favicon: remote.favicon,
      createdAt: remote.createdAt,
      updatedAt: remote.updatedAt,
      isDeleted,
    };
    // Trash retention counts from the moment the bookmark entered the trash.
    const deletedAt = !isDeleted
      ? undefined
      : existing?.isDeleted
        ? existing.deletedAt ?? remote.updatedAt
        : remote.updatedAt;

    if (existing) {
      const { content: _content, ...existingMeta } = existing;
      return { ...existingMeta, ...base, hasSnapshot: existing.hasSnapshot, deletedAt };
    }
    return { ...base, hasSnapshot: false, deletedAt };
  }

  /** Inspect/recover locks in the background, serialized with all sync mutations. */
  async inspectRemoteLocks() {
    if (this.isSyncing) throw new SyncError('conflict', 'A WebDAV operation is still running');
    this.isSyncing = true;
    try {
      const config = await syncConfigStorage.getConfig();
      webdavClientAdapter.init(config);
      return await webdavClientAdapter.inspectLocks(SYNC_ROOT);
    } finally { this.isSyncing = false; }
  }

  async unlockRemoteLocks(tokens: string[]): Promise<void> {
    if (this.isSyncing) throw new SyncError('conflict', 'A WebDAV operation is still running');
    this.isSyncing = true;
    try {
      const config = await syncConfigStorage.getConfig();
      webdavClientAdapter.init(config);
      await webdavClientAdapter.unlockLocks(SYNC_ROOT, tokens);
      // The dialog requires the user to stop other devices before resetting the marker.
      const sys = await this.readSys();
      if (sys) await webdavClientAdapter.putJSON(SYS_JSON, { ...sys, lock_status: 'unlocked', lock_owner: undefined });
      await syncConfigStorage.setStatus({ status: 'idle', errorCode: undefined, errorMessage: '' });
    } catch (err) {
      const error = toSyncError(err);
      await syncConfigStorage.setStatus({ status: 'error', errorCode: error.code, errorMessage: error.message });
      throw error;
    } finally { this.isSyncing = false; }
  }

  /** Clear all remote sync data. */
  async clearRemoteData(): Promise<void> {
    if (this.isSyncing) {
      throw new Error('Sync is currently in progress, cannot clear remote data');
    }

    this.isSyncing = true;
    try {
      const config = await syncConfigStorage.getConfig();
      if (!config.enabled || !config.url) throw new Error('WebDAV is not configured');
      webdavClientAdapter.init(config);
      await webdavClientAdapter.checkAuth(SYS_JSON);
      await webdavClientAdapter.recoverPreviousLock(SYNC_ROOT);
      await webdavClientAdapter.ensureDirectory(SYNC_ROOT);
      const lockToken = nanoid();
      if (!await this.acquireLock(lockToken)) throw new SyncError('conflict', 'Another client is holding the sync marker');
      try {
        await webdavClientAdapter.deleteFile(SYNC_ROOT);
      } catch (err) {
        try { await this.releaseLock(lockToken, false); }
        catch (releaseError) { console.error('Failed to clear the sync marker after remote deletion failed', releaseError); }
        throw err;
      }

      // Reset local sync status
      await syncConfigStorage.setStatus({
        status: 'idle',
        lastSyncTime: 0,
        syncVersion: '',
        errorCode: undefined,
        errorMessage: ''
      });
    } catch (err: any) {
      const error = toSyncError(err);
      console.error('Failed to clear remote WebDAV data:', error);
      await syncConfigStorage.setStatus({
        status: 'error',
        errorCode: error.code,
        errorMessage: error.message,
      });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

}

export const syncEngine = new SyncEngine();
