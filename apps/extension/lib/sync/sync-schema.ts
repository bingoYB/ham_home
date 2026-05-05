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

export const RemoteWorkspaceTabPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  domain: z.string(),
  favicon: z.string().optional(),
  pinned: z.boolean().optional(),
  windowId: z.number().optional(),
  index: z.number(),
  aiCategory: z.string().optional(),
  bookmarkId: z.string().optional(),
  convertedToBookmarkAt: z.number().optional(),
  bookmarkConversionStatus: z
    .enum(["not_bookmarked", "converted", "existing", "failed"])
    .optional(),
  bookmarkConversionError: z.string().optional(),
  purpose: z.string().optional(),
  duplicateGroupId: z.string().optional(),
  isDuplicate: z.boolean().optional(),
  tabId: z.number().optional(),
  tabGroupId: z.number().optional(),
  bookmarkRecommendation: z.enum(["recommended", "excluded"]).optional(),
});

export const RemoteWorkspaceTabGroupSchema = z.object({
  id: z.number(),
  title: z.string(),
  color: z.enum([
    "grey",
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan",
    "orange",
  ]),
  collapsed: z.boolean().optional(),
  windowId: z.number().optional(),
});

export const RemoteWorkspaceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  parentId: z.string().nullable(),
  order: z.number(),
  createdAt: z.number(),
});

export const RemoteWorkspaceAnalysisSchema = z.object({
  analyzedAt: z.number(),
  recommendedName: z.string(),
  recommendedTags: z.array(z.string()),
  categoryDistribution: z.array(
    z.object({
      category: z.string(),
      count: z.number(),
    }),
  ),
  totalPageCount: z.number(),
  dedupedPageCount: z.number(),
  duplicateGroups: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      pageIds: z.array(z.string()),
      preferredPageId: z.string(),
    }),
  ),
  bookmarkRecommendedPageIds: z.array(z.string()),
  excludedPageIds: z.array(z.string()),
  aiEnabled: z.boolean(),
});

export const RemoteWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  categoryId: z.string().nullable(),
  tags: z.array(z.string()),
  pages: z.array(RemoteWorkspaceTabPageSchema),
  tabGroups: z.array(RemoteWorkspaceTabGroupSchema).optional(),
  analysis: RemoteWorkspaceAnalysisSchema.optional(),
  isRestored: z.boolean(),
  restoredAt: z.number().optional(),
  convertedToBookmarks: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type RemoteWorkspace = z.infer<typeof RemoteWorkspaceSchema>;
export type RemoteWorkspaceCategory = z.infer<typeof RemoteWorkspaceCategorySchema>;

export const RemoteWorkspacesFileSchema = z.object({
  workspaces: z.array(RemoteWorkspaceSchema),
  categories: z.array(RemoteWorkspaceCategorySchema),
});

export const RemoteTabGroupRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  matchType: z.enum(["domain", "urlContains", "title", "titleIgnoreCase", "regex"]),
  matchCondition: z
    .enum(["contains", "equals", "startsWith", "endsWith", "regex"])
    .optional(),
  pattern: z.string(),
  groupTitle: z.string(),
  color: z.enum([
    "grey",
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan",
    "orange",
  ]),
  collapsed: z.boolean(),
  order: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const RemoteTabGroupAutoGroupSettingsSchema = z.object({
  aiAutoGroupEnabled: z.boolean(),
});

export const RemoteTabGroupConfigFileSchema = z.object({
  rules: z.array(RemoteTabGroupRuleSchema),
  autoGroupSettings: RemoteTabGroupAutoGroupSettingsSchema,
});

export type RemoteTabGroupRule = z.infer<typeof RemoteTabGroupRuleSchema>;
