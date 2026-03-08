import { z } from 'zod';

// ============ Schema Declarations ============

export const SyncSysSchema = z.object({
  version: z.number().int().positive(), // schema version
  sync_version: z.string(), // generated nanoid on each successful sync
  last_sync_time: z.number(), // timestamp
  lock_status: z.enum(['locked', 'unlocked']),
  lock_timestamp: z.number(), // to check for deadlocks
});

export type SyncSys = z.infer<typeof SyncSysSchema>;

export const RemoteBookmarkMetaSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  description: z.string(),
  categoryId: z.string().nullable(),
  tags: z.array(z.string()),
  favicon: z.string().optional(),
  hasSnapshot: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  isDeleted: z.boolean().optional(),
});

export type RemoteBookmarkMeta = z.infer<typeof RemoteBookmarkMetaSchema>;

export const RemoteBookmarksFileSchema = z.object({
  bookmarks: z.array(RemoteBookmarkMetaSchema),
});

export type RemoteBookmarksFile = z.infer<typeof RemoteBookmarksFileSchema>;

// Settings schema corresponds to LocalSettings from @/types
export const RemoteSettingsSchema = z.object({
  autoSaveSnapshot: z.boolean(),
  defaultCategory: z.string().nullable(),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.enum(['zh', 'en']),
  shortcut: z.string(),
  panelPosition: z.enum(['left', 'right']),
  panelShortcut: z.string(),
});

export type RemoteSettings = z.infer<typeof RemoteSettingsSchema>;

// Category schema corresponds to LocalCategory from @/types
export const RemoteCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  order: z.number(),
  createdAt: z.number(),
});

export type RemoteCategory = z.infer<typeof RemoteCategorySchema>;
