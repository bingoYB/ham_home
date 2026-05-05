import { nanoid } from "nanoid";
import type {
  TabGroupAutoGroupSettings,
  TabGroupAICacheEntry,
  CreateTabGroupRuleInput,
  TabGroupRule,
  UpdateTabGroupRuleInput,
} from "@/types";

const MAX_AI_CACHE_ENTRIES = 500;

const DEFAULT_AUTO_GROUP_SETTINGS: TabGroupAutoGroupSettings = {
  aiAutoGroupEnabled: false,
};

const tabGroupRulesItem = storage.defineItem<TabGroupRule[]>(
  "sync:tabGroupRules",
  {
    fallback: [],
  },
);

const tabGroupAutoGroupSettingsItem = storage.defineItem<TabGroupAutoGroupSettings>(
  "sync:tabGroupAutoGroupSettings",
  {
    fallback: DEFAULT_AUTO_GROUP_SETTINGS,
  },
);

const tabGroupAIGroupCacheItem = storage.defineItem<Record<string, TabGroupAICacheEntry>>(
  "local:tabGroupAIGroupCache",
  {
    fallback: {},
  },
);

function sortRules(rules: TabGroupRule[]): TabGroupRule[] {
  return [...rules].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

class TabGroupRulesStorage {
  async getRules(): Promise<TabGroupRule[]> {
    return sortRules(await tabGroupRulesItem.getValue());
  }

  async setRules(rules: TabGroupRule[]): Promise<void> {
    await tabGroupRulesItem.setValue(sortRules(rules));
  }

  async addRule(input: CreateTabGroupRuleInput): Promise<TabGroupRule> {
    const now = Date.now();
    const rule: TabGroupRule = {
      ...input,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    const rules = await this.getRules();
    await this.setRules([...rules, rule]);
    return rule;
  }

  async updateRule(
    ruleId: string,
    updates: UpdateTabGroupRuleInput,
  ): Promise<TabGroupRule | null> {
    const rules = await this.getRules();
    const updatedRules = rules.map((rule) =>
      rule.id === ruleId
        ? { ...rule, ...updates, updatedAt: Date.now() }
        : rule,
    );
    await this.setRules(updatedRules);
    return updatedRules.find((rule) => rule.id === ruleId) ?? null;
  }

  async deleteRule(ruleId: string): Promise<void> {
    const rules = await this.getRules();
    await this.setRules(rules.filter((rule) => rule.id !== ruleId));
  }

  watchRules(callback: (rules: TabGroupRule[] | null) => void): () => void {
    return tabGroupRulesItem.watch((rules) => callback(rules ? sortRules(rules) : null));
  }

  async getAutoGroupSettings(): Promise<TabGroupAutoGroupSettings> {
    const settings = await tabGroupAutoGroupSettingsItem.getValue();
    return { ...DEFAULT_AUTO_GROUP_SETTINGS, ...settings };
  }

  async setAutoGroupSettings(
    settings: Partial<TabGroupAutoGroupSettings>,
  ): Promise<TabGroupAutoGroupSettings> {
    const current = await this.getAutoGroupSettings();
    const updated = { ...current, ...settings };
    await tabGroupAutoGroupSettingsItem.setValue(updated);
    return updated;
  }

  async importRawRule(rule: TabGroupRule): Promise<void> {
    const rules = await this.getRules();
    const index = rules.findIndex((item) => item.id === rule.id);
    if (index === -1) {
      await this.setRules([...rules, rule]);
      return;
    }

    rules[index] = { ...rules[index], ...rule };
    await this.setRules(rules);
  }

  watchAutoGroupSettings(
    callback: (settings: TabGroupAutoGroupSettings) => void,
  ): () => void {
    return tabGroupAutoGroupSettingsItem.watch((settings) =>
      callback({ ...DEFAULT_AUTO_GROUP_SETTINGS, ...(settings ?? {}) }),
    );
  }

  async getAIGroupCache(urlKey: string): Promise<TabGroupAICacheEntry | null> {
    const cache = await tabGroupAIGroupCacheItem.getValue();
    return cache[urlKey] ?? null;
  }

  async setAIGroupCache(
    urlKey: string,
    entry: Omit<TabGroupAICacheEntry, "updatedAt">,
  ): Promise<void> {
    const cache = await tabGroupAIGroupCacheItem.getValue();
    const nextCache: Record<string, TabGroupAICacheEntry> = {
      ...cache,
      [urlKey]: {
        ...entry,
        updatedAt: Date.now(),
      },
    };
    const entries = Object.entries(nextCache);
    if (entries.length > MAX_AI_CACHE_ENTRIES) {
      entries
        .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
        .slice(MAX_AI_CACHE_ENTRIES)
        .forEach(([key]) => {
          delete nextCache[key];
        });
    }
    await tabGroupAIGroupCacheItem.setValue(nextCache);
  }
}

export const tabGroupRulesStorage = new TabGroupRulesStorage();
