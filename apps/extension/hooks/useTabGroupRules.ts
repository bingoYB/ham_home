import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@hamhome/ui";
import { useTranslation } from "react-i18next";
import type {
  CreateTabGroupRuleInput,
  TabGroupRule,
  TabGroupAutoGroupSettings,
  TabGroupRuleColor,
  TabGroupRuleMatchCondition,
  TabGroupRuleMatchType,
} from "@/types";
import { tabGroupRulesStorage } from "@/lib/storage/tab-group-rules-storage";
import { tabGroupRuleService } from "@/lib/services/tab-group-rule-service";

export interface TabGroupRuleFormState {
  name: string;
  enabled: boolean;
  groupTitle: string;
  color: TabGroupRuleColor;
  collapsed: boolean;
  matchers: TabGroupRuleMatcherFormState[];
}

export interface TabGroupRuleMatcherFormState {
  id?: string;
  clientId: string;
  matchType: TabGroupRuleMatchType;
  matchCondition: TabGroupRuleMatchCondition;
  pattern: string;
}

export interface TabGroupRuleGroup {
  key: string;
  name: string;
  enabled: boolean;
  groupTitle: string;
  color: TabGroupRuleColor;
  collapsed: boolean;
  rules: TabGroupRule[];
}

function createClientId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function createMatcher(rule?: TabGroupRule): TabGroupRuleMatcherFormState {
  const isLegacyRegex = rule?.matchType === "regex";

  return {
    id: rule?.id,
    clientId: rule?.id ?? createClientId(),
    matchType: isLegacyRegex ? "urlContains" : rule?.matchType ?? "domain",
    matchCondition: rule?.matchCondition ?? (isLegacyRegex ? "regex" : "contains"),
    pattern: rule?.pattern ?? "",
  };
}

function createDefaultForm(): TabGroupRuleFormState {
  return {
    name: "",
    enabled: true,
    groupTitle: "",
    color: "blue",
    collapsed: false,
    matchers: [createMatcher()],
  };
}

function getRuleGroupKey(rule: TabGroupRule): string {
  return [rule.name, rule.groupTitle, rule.color, String(rule.collapsed)].join("\u001f");
}

function groupTabGroupRules(rules: TabGroupRule[]): TabGroupRuleGroup[] {
  const groups = new Map<string, TabGroupRuleGroup>();

  for (const rule of rules) {
    const key = getRuleGroupKey(rule);
    const group = groups.get(key);
    if (group) {
      group.rules.push(rule);
      group.enabled = group.enabled || rule.enabled;
      continue;
    }

    groups.set(key, {
      key,
      name: rule.name,
      enabled: rule.enabled,
      groupTitle: rule.groupTitle,
      color: rule.color,
      collapsed: rule.collapsed,
      rules: [rule],
    });
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    rules: [...group.rules].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
  }));
}

function toFormState(group: TabGroupRuleGroup): TabGroupRuleFormState {
  return {
    name: group.name,
    enabled: group.enabled,
    groupTitle: group.groupTitle,
    color: group.color,
    collapsed: group.collapsed,
    matchers: group.rules.map(createMatcher),
  };
}

export function useTabGroupRules() {
  const { t } = useTranslation("bookmark");
  const [rules, setRules] = useState<TabGroupRule[]>([]);
  const [form, setForm] = useState<TabGroupRuleFormState>(() => createDefaultForm());
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [aiAutoGroupEnabled, setAiAutoGroupEnabled] = useState(false);
  const [aiAutoGroupInstructions, setAiAutoGroupInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const autoGroupSettingsLoadedRef = useRef(false);
  const lastSavedAiAutoGroupInstructionsRef = useRef("");

  const supported = useMemo(
    () => tabGroupRuleService.isTabGroupsSupported(),
    [],
  );
  const groups = useMemo(() => groupTabGroupRules(rules), [rules]);

  const applyAutoGroupSettings = useCallback((settings: TabGroupAutoGroupSettings) => {
    setAiAutoGroupEnabled(settings.aiAutoGroupEnabled);
    setAiAutoGroupInstructions(settings.aiAutoGroupInstructions);
    lastSavedAiAutoGroupInstructionsRef.current = settings.aiAutoGroupInstructions;
    autoGroupSettingsLoadedRef.current = true;
  }, []);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await tabGroupRulesStorage.getRules());
      applyAutoGroupSettings(await tabGroupRulesStorage.getAutoGroupSettings());
    } finally {
      setLoading(false);
    }
  }, [applyAutoGroupSettings]);

  useEffect(() => {
    void loadRules();
    return tabGroupRulesStorage.watchRules((nextRules) => {
      if (nextRules) setRules(nextRules);
    });
  }, [loadRules]);

  useEffect(() => {
    return tabGroupRulesStorage.watchAutoGroupSettings(applyAutoGroupSettings);
  }, [applyAutoGroupSettings]);

  useEffect(() => {
    if (!autoGroupSettingsLoadedRef.current) return;

    if (aiAutoGroupInstructions === lastSavedAiAutoGroupInstructionsRef.current) return;

    const timeoutId = window.setTimeout(() => {
      lastSavedAiAutoGroupInstructionsRef.current = aiAutoGroupInstructions;
      void tabGroupRulesStorage.setAutoGroupSettings({
        aiAutoGroupInstructions,
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [aiAutoGroupInstructions]);

  const resetForm = useCallback(() => {
    setForm(createDefaultForm());
    setEditingGroupKey(null);
  }, []);

  const startCreateRule = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const editRuleGroup = useCallback((group: TabGroupRuleGroup) => {
    setForm(toFormState(group));
    setEditingGroupKey(group.key);
  }, []);

  const saveRule = useCallback(async () => {
    const normalizedName = form.name.trim();
    const groupTitle = form.groupTitle.trim();
    const matchers = form.matchers.map((matcher) => ({
      ...matcher,
      pattern: matcher.pattern.trim(),
    }));
    if (!normalizedName || !groupTitle || matchers.some((matcher) => !matcher.pattern)) {
      toast.error(t("tabGroups.messages.requiredFields"));
      return false;
    }
    if (matchers.length === 0) {
      toast.error(t("tabGroups.messages.atLeastOneMatcher"));
      return false;
    }

    setSaving(true);
    try {
      const commonInput = {
        enabled: form.enabled,
        name: normalizedName,
        groupTitle,
        color: form.color,
        collapsed: form.collapsed,
      };

      if (editingGroupKey) {
        const existingGroup = groups.find((group) => group.key === editingGroupKey);
        const existingIds = new Set(existingGroup?.rules.map((rule) => rule.id) ?? []);
        const nextIds = new Set(matchers.map((matcher) => matcher.id).filter(Boolean));
        const maxOrder = Math.max(-1, ...rules.map((rule) => rule.order));

        for (const rule of existingGroup?.rules ?? []) {
          if (!nextIds.has(rule.id)) {
            await tabGroupRulesStorage.deleteRule(rule.id);
          }
        }

        let createdCount = 0;
        for (const [index, matcher] of matchers.entries()) {
          const input: CreateTabGroupRuleInput = {
            ...commonInput,
            matchType: matcher.matchType,
            matchCondition: matcher.matchCondition,
            pattern: matcher.pattern,
            order: existingIds.has(matcher.id ?? "")
              ? existingGroup?.rules.find((rule) => rule.id === matcher.id)?.order ?? index
              : maxOrder + createdCount + 1,
          };
          if (matcher.id && existingIds.has(matcher.id)) {
            await tabGroupRulesStorage.updateRule(matcher.id, input);
          } else {
            await tabGroupRulesStorage.addRule(input);
            createdCount += 1;
          }
        }
        toast.success(t("tabGroups.messages.updateSuccess"));
      } else {
        const maxOrder = Math.max(-1, ...rules.map((rule) => rule.order));
        for (const [index, matcher] of matchers.entries()) {
          await tabGroupRulesStorage.addRule({
            ...commonInput,
            matchType: matcher.matchType,
            matchCondition: matcher.matchCondition,
            pattern: matcher.pattern,
            order: maxOrder + index + 1,
          });
        }
        toast.success(t("tabGroups.messages.createSuccess"));
      }
      resetForm();
      await loadRules();
      return true;
    } finally {
      setSaving(false);
    }
  }, [editingGroupKey, form, groups, loadRules, resetForm, rules, t]);

  const deleteRule = useCallback(async (ruleId: string) => {
    await tabGroupRulesStorage.deleteRule(ruleId);
    toast.success(t("tabGroups.messages.deleteSuccess"));
  }, [t]);

  const toggleRule = useCallback(async (rule: TabGroupRule) => {
    await tabGroupRulesStorage.updateRule(rule.id, { enabled: !rule.enabled });
  }, []);

  const deleteRuleGroup = useCallback(async (group: TabGroupRuleGroup) => {
    for (const rule of group.rules) {
      await tabGroupRulesStorage.deleteRule(rule.id);
    }
    toast.success(t("tabGroups.messages.deleteSuccess"));
  }, [t]);

  const toggleRuleGroup = useCallback(async (group: TabGroupRuleGroup) => {
    for (const rule of group.rules) {
      await tabGroupRulesStorage.updateRule(rule.id, { enabled: !group.enabled });
    }
  }, []);

  const updateAiAutoGroupEnabled = useCallback(async (enabled: boolean) => {
    setAiAutoGroupEnabled(enabled);
    lastSavedAiAutoGroupInstructionsRef.current = aiAutoGroupInstructions;
    await tabGroupRulesStorage.setAutoGroupSettings({
      aiAutoGroupEnabled: enabled,
      aiAutoGroupInstructions,
    });
  }, [aiAutoGroupInstructions]);

  const updateAiAutoGroupInstructions = useCallback((instructions: string) => {
    setAiAutoGroupInstructions(instructions);
  }, []);

  const saveAiAutoGroupInstructions = useCallback(async () => {
    const normalized = aiAutoGroupInstructions.trim();
    setAiAutoGroupInstructions(normalized);
    lastSavedAiAutoGroupInstructionsRef.current = normalized;
    await tabGroupRulesStorage.setAutoGroupSettings({
      aiAutoGroupInstructions: normalized,
    });
  }, [aiAutoGroupInstructions]);

  return {
    rules,
    groups,
    form,
    setForm,
    editingGroupKey,
    loading,
    saving,
    supported,
    aiAutoGroupEnabled,
    aiAutoGroupInstructions,
    saveRule,
    resetForm,
    startCreateRule,
    editRuleGroup,
    deleteRule,
    toggleRule,
    deleteRuleGroup,
    toggleRuleGroup,
    updateAiAutoGroupEnabled,
    updateAiAutoGroupInstructions,
    saveAiAutoGroupInstructions,
  };
}
