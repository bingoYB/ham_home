
import type {
  ActiveSkill,
  AgentSkill,
  AgentTool,
  DiscoverSkillInput,
  DiscoverSkillResult,
  FindSkillInput,
  FindSkillResult,
  MountedSkillTool,
  RegisterConflictStrategy,
  SkillListOptions,
  SkillMatchResult,
  SkillMatcher,
  SkillMetadata,
  SkillPromptIndexItem,
  SkillPromptIndexOptions,
  SkillRegisterOptions,
  SkillRequestContext,
  SkillReconcileResult,
  SkillStore,
  SkillToolDefinition,
  SkillViewInput,
  SkillViewResult,
} from "../core/types";

export interface AgentSkillRuntimeOptions {
  matcher?: SkillMatcher;
  store?: SkillStore;
  events?: {
    emit(event:
      | { type: "skill.registered"; skillId: string; source?: AgentSkill["source"] }
      | { type: "skill.unregistered"; skillId: string }
      | { type: "skill.reconciled"; result: SkillReconcileResult }
      | { type: "skill.mounted"; skillId: string; reason: string }
      | { type: "skill.unmounted"; skillId: string }
      | { type: "skill.tool.mounted"; skillId: string; toolName: string; reason: string }
      | { type: "skill.tool.unmounted"; skillId: string; toolName: string }
      | { type: "skill.matched"; matches: SkillMatchResult[] }): void;
  };
}

/**
 * Local Skill store used when the host app does not provide persistence.
 *
 * Example:
 * ```ts
 * const store = new InMemorySkillStore();
 * store.put({ id: "orders", name: "Orders", description: "Order guidance." });
 * const skills = store.list({ tags: ["checkout"] });
 * ```
 */
export class InMemorySkillStore implements SkillStore {
  private readonly skills = new Map<string, { skill: AgentSkill; enabled: boolean }>();

  put(skill: AgentSkill): void {
    this.skills.set(skill.id, { skill, enabled: true });
  }

  get(skillId: string): AgentSkill | undefined {
    return this.skills.get(skillId)?.skill;
  }

  list(options: SkillListOptions = {}): AgentSkill[] {
    return [...this.skills.values()]
      .filter((record) => options.enabled === undefined || record.enabled === options.enabled)
      .map((record) => record.skill)
      .filter((skill) => !options.source || skill.source?.type === options.source)
      .filter((skill) => !options.tags || hasAny(skill.tags, new Set(options.tags)));
  }

  delete(skillId: string): void {
    this.skills.delete(skillId);
  }
}

/**
 * Handles Skill registration, request-time matching, tool mounting and discovery.
 *
 * Example:
 * ```ts
 * const runtime = new AgentSkillRuntime({ knowledge });
 * runtime.register(orderSkill);
 * const result = await runtime.reconcile({ pageId: "orders.create", userInput: "创建订单" });
 * ```
 */
export class AgentSkillRuntime {
  private readonly skills = new Map<string, { skill: AgentSkill; enabled: boolean }>();
  private readonly active = new Map<string, ActiveSkill>();
  private readonly matcher: SkillMatcher;
  private readonly store?: SkillStore;
  private readonly events?: AgentSkillRuntimeOptions["events"];

  constructor(options: AgentSkillRuntimeOptions = {}) {
    this.matcher = options.matcher ?? defaultSkillMatcher;
    this.store = options.store;
    this.events = options.events;
  }

  register(skill: AgentSkill, options: SkillRegisterOptions = {}): () => void {
    const id = resolveSkillId(skill.id, this.skills, options.onConflict);
    const normalized = id === skill.id ? skill : { ...skill, id };

    if (this.skills.has(id) && options.onConflict !== "replace") {
      throw new Error(`Skill "${id}" is already registered.`);
    }

    this.skills.set(id, { skill: normalized, enabled: options.enabled ?? true });
    void this.store?.put(normalized);
    this.events?.emit({ type: "skill.registered", skillId: id, source: normalized.source });
    return () => {
      this.unregister(id);
    };
  }

  registerMany(skills: AgentSkill[], options: SkillRegisterOptions = {}): () => void {
    const unregisters = skills.map((skill) => this.register(skill, options));
    return () => unregisters.forEach((unregister) => unregister());
  }

  unregister(skillId: string): boolean {
    const existed = this.skills.delete(skillId);
    this.active.delete(skillId);
    void this.store?.delete(skillId);
    if (existed) {
      this.events?.emit({ type: "skill.unregistered", skillId });
    }
    return existed;
  }

  list(): AgentSkill[] {
    return [...this.skills.values()].map((record) => record.skill);
  }

  listActive(): ActiveSkill[] {
    return [...this.active.values()];
  }

  get(skillId: string): AgentSkill | undefined {
    return this.skills.get(skillId)?.skill;
  }

  async resolve(input: SkillRequestContext): Promise<SkillMatchResult[]> {
    const matches = [...this.skills.values()]
      .filter((record) => record.enabled)
      .map((record) => this.matcher(record.skill, input))
      .filter((match): match is SkillMatchResult => Boolean(match))
      .sort((left, right) => right.score - left.score);

    this.events?.emit({ type: "skill.matched", matches });
    return matches;
  }

  async reconcile(input: SkillRequestContext): Promise<SkillReconcileResult> {
    const matches = await this.resolve(input);
    const previousSkillIds = new Set(this.active.keys());
    const previousToolNames = new Set(this.listActive().flatMap((skill) => skill.mountedTools));
    const nextActive = new Map<string, ActiveSkill>();
    const mountedTools: MountedSkillTool[] = [];

    // Reconcile builds a fresh request-time snapshot instead of mutating the
    // global ToolRegistry, so page/Skill switches cannot leak stale tools.
    for (const match of matches) {
      const previous = this.active.get(match.skill.id);
      const activeSkill: ActiveSkill = {
        skill: match.skill,
        mountedAt: previous?.mountedAt ?? Date.now(),
        reason: match.reason,
        mountedTools: [],
      };

      for (const mountedTool of resolveSkillTools(match, input)) {
        activeSkill.mountedTools.push(mountedTool.toolName);
        mountedTools.push(mountedTool);
      }

      nextActive.set(match.skill.id, activeSkill);
    }

    // Diff previous and next snapshots for eventing and optional cleanup.
    const mountedSkillIds = [...nextActive.keys()].filter((skillId) => !previousSkillIds.has(skillId));
    const unmountedSkillIds = [...previousSkillIds].filter((skillId) => !nextActive.has(skillId));
    const nextToolNames = new Set(mountedTools.map((tool) => tool.toolName));
    const mountedToolNames = [...nextToolNames].filter((toolName) => !previousToolNames.has(toolName));
    const unmountedToolNames = [...previousToolNames].filter((toolName) => !nextToolNames.has(toolName));

    this.active.clear();
    nextActive.forEach((value, key) => this.active.set(key, value));

    for (const skillId of mountedSkillIds) {
      this.events?.emit({ type: "skill.mounted", skillId, reason: nextActive.get(skillId)?.reason ?? "matched" });
    }
    for (const skillId of unmountedSkillIds) {
      this.events?.emit({ type: "skill.unmounted", skillId });
    }
    for (const tool of mountedTools) {
      if (mountedToolNames.includes(tool.toolName)) {
        this.events?.emit({ type: "skill.tool.mounted", skillId: tool.skillId, toolName: tool.toolName, reason: tool.reason });
      }
    }
    for (const toolName of unmountedToolNames) {
      this.events?.emit({ type: "skill.tool.unmounted", skillId: findSkillIdByToolName(toolName, this.active) ?? "unknown", toolName });
    }

    const result: SkillReconcileResult = {
      activeSkills: [...nextActive.values()],
      mountedTools,
      mountedSkillIds,
      unmountedSkillIds,
      mountedToolNames,
      unmountedToolNames,
    };
    this.events?.emit({ type: "skill.reconciled", result });
    return result;
  }

  getPromptIndex(options: SkillPromptIndexOptions = {}): SkillPromptIndexItem[] {
    const activeIds = new Set(this.active.keys());
    const activeOnly = options.activeOnly ?? false;
    const includeWhenToUse = options.includeWhenToUse ?? true;
    const items = this.list()
      .filter((skill) => !activeOnly || activeIds.has(skill.id))
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        whenToUse: includeWhenToUse ? skill.whenToUse : undefined,
        active: activeIds.has(skill.id),
      }));

    return typeof options.maxItems === "number" ? items.slice(0, options.maxItems) : items;
  }

  buildPromptIndex(options: SkillPromptIndexOptions = {}): string {
    const items = this.getPromptIndex({ activeOnly: true, includeWhenToUse: true, ...options });
    if (items.length === 0) {
      return "";
    }

    const lines = [
      "Current global and page-active skills are listed below as a prompt index.",
      "Only skill metadata is shown here. Call skill_view with a skillId before relying on a skill's detailed rules, documents, or tool guidance.",
      "Call discoverSkill only when the current skills and tools do not appear able to satisfy the user's request; it searches inactive skills from other contexts.",
      "",
      "Available skills:",
    ];

    for (const item of items) {
      lines.push(`- ${item.id}: ${item.description}`);
      if (item.whenToUse) {
        lines.push(`  When to use: ${item.whenToUse}`);
      }
    }

    return lines.join("\n");
  }

  view(input: SkillViewInput, options: { allowInactive?: boolean } = {}): SkillViewResult | undefined {
    const skill = this.get(input.skillId);
    if (!skill) {
      return undefined;
    }

    const activeIds = new Set(this.active.keys());
    const active = activeIds.has(skill.id);
    if (!active && !options.allowInactive) {
      return undefined;
    }

    return {
      skill: toSkillMetadata(skill),
      active,
      documents: input.includeDocuments === false ? undefined : skill.documents,
      tools: input.includeTools === false ? undefined : (skill.tools ?? []).map(({ tool }) => omitToolExecute(tool)),
      metadata: skill.metadata,
    };
  }

  async discover(input: DiscoverSkillInput): Promise<DiscoverSkillResult[]> {
    const topK = input.topK ?? 5;
    const context: SkillRequestContext = {
      pageId: input.pageId,
      moduleId: input.moduleId,
      url: input.url,
      intent: input.intent,
      userInput: input.query,
      tags: input.tags,
    };
    const activeIds = new Set(this.active.keys());
    return this.list()
      .filter((skill) => skill.modelInvocable !== false)
      .filter((skill) => !activeIds.has(skill.id))
      .map((skill) => scoreSkillForDiscovery(skill, context, activeIds.has(skill.id)))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
      .map((result) => ({ ...result, active: false }));
  }

  async find(input: FindSkillInput): Promise<FindSkillResult[]> {
    const discovered = await this.discover(input);
    return discovered;
  }
}

/**
 * Creates the default model-visible Skill detail viewer.
 *
 * Example:
 * ```ts
 * const skillView = createSkillViewTool(agent);
 * await skillView.execute({ skillId: "orders" }, context);
 * ```
 */
export function createSkillViewTool(agent: { skills: AgentSkillRuntime }, options: { allowInactive?: boolean } = {}): AgentTool {
  return {
    name: "skill_view",
    description: "View the detailed documents and tool metadata for a currently active skill.",
    parameters: {
      type: "object",
      properties: {
        skillId: { type: "string", description: "The id of the active skill to inspect." },
        includeDocuments: { type: "boolean", description: "Whether to include skill documents. Defaults to true." },
        includeTools: { type: "boolean", description: "Whether to include skill tool metadata. Defaults to true." },
      },
      required: ["skillId"],
      additionalProperties: false,
    },
    metadata: {
      readOnly: true,
      riskLevel: "low",
    },
    execute: async (input) => {
      const args = input as SkillViewInput;
      const result = agent.skills.view(
        {
          skillId: args.skillId,
          includeDocuments: args.includeDocuments ?? true,
          includeTools: args.includeTools ?? true,
        },
        options,
      );

      return result ?? { error: `Skill is not active or does not exist: ${args.skillId}` };
    },
  };
}

/**
 * Creates the default model-visible inactive Skill discovery tool.
 *
 * Example:
 * ```ts
 * const discoverSkill = createDiscoverSkillTool(agent);
 * await discoverSkill.execute({ query: "how do I export orders?" }, context);
 * ```
 */
export function createDiscoverSkillTool(agent: { skills: AgentSkillRuntime }): AgentTool {
  return {
    name: "discoverSkill",
    description: "Discover inactive platform skills when the current active skills and tools cannot satisfy the user's request.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Specific description of the capability or workflow to search for." },
        pageId: { type: "string" },
        moduleId: { type: "string" },
        url: { type: "string" },
        intent: { type: "string" },
        topK: { type: "number" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    metadata: {
      readOnly: true,
      riskLevel: "low",
    },
    execute: async (input, context) => {
      const args = input as DiscoverSkillInput;
      return agent.skills.discover({
        query: args.query,
        pageId: args.pageId ?? context.pageId,
        moduleId: args.moduleId ?? context.moduleId,
        url: args.url ?? context.url,
        intent: args.intent ?? context.intent,
        tags: args.tags,
        topK: args.topK ?? 5,
      });
    },
  };
}

/**
 * @deprecated Use `createDiscoverSkillTool()` for inactive Skill discovery.
 */
export function createFindSkillTool(agent: { skills: AgentSkillRuntime }): AgentTool {
  return createDiscoverSkillTool(agent);
}

/**
 * Creates a standard usage-guide Skill from help documents and optional tools.
 *
 * Example:
 * ```ts
 * const skill = createUsageGuideSkill({
 *   id: "orders",
 *   name: "Orders",
 *   description: "Help users create orders.",
 *   documents: [{ id: "create", kind: "procedure", title: "Create orders", content: "..." }],
 * });
 * ```
 */
export function createUsageGuideSkill(options: {
  id: string;
  name: string;
  description: string;
  documents: AgentSkill["documents"];
  match?: AgentSkill["match"];
  tools?: SkillToolDefinition[];
}): AgentSkill {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    whenToUse: "Use this skill when the user asks how to use this platform, where a feature is, what a button means, or how to complete an operation.",
    match: options.match,
    documents: options.documents,
    tools: options.tools,
    modelInvocable: true,
    userInvocable: true,
  };
}

/**
 * Matches a Skill against the host-provided request context.
 *
 * Declared dimensions are ANDed together, values inside one dimension are ORed,
 * and an undefined `match` rule makes the Skill globally available.
 *
 * Example:
 * ```ts
 * const result = defaultSkillMatcher(skill, { pageId: "orders.create", userInput: "创建订单" });
 * if (result) console.log(result.score, result.matchedBy);
 * ```
 */
export function defaultSkillMatcher(skill: AgentSkill, context: SkillRequestContext): SkillMatchResult | undefined {
  const rule = skill.match;
  if (!rule || Object.values(rule).every((value) => !value || value.length === 0)) {
    return {
      skill,
      score: 1,
      reason: "global",
      matchedBy: [],
    };
  }

  const matchedBy: SkillMatchResult["matchedBy"] = [];
  let score = 0;

  const checks: Array<[keyof NonNullable<AgentSkill["match"]>, boolean, SkillMatchResult["matchedBy"][number], number]> = [
    ["pageIds", matchString(rule.pageIds, context.pageId), "pageId", 40],
    ["moduleIds", matchString(rule.moduleIds, context.moduleId), "moduleId", 25],
    ["urlPatterns", matchUrl(rule.urlPatterns, context.url), "url", 20],
    ["domScopes", matchMetadataValues(rule.domScopes, context.metadata?.domScopes), "domScope", 12],
    ["intents", matchString(rule.intents, context.intent), "intent", 16],
    ["keywords", matchKeywords(rule.keywords, [context.userInput, context.intent]), "keyword", 12],
    ["tags", matchTags(rule.tags, context.tags), "tag", 8],
  ];

  for (const [field, matched, source, weight] of checks) {
    const values = rule[field];
    if (!values || values.length === 0) {
      continue;
    }
    if (!matched) {
      return undefined;
    }
    matchedBy.push(source);
    score += weight;
  }

  return {
    skill,
    score,
    reason: matchedBy.length > 0 ? `matched by ${matchedBy.join(", ")}` : "matched",
    matchedBy,
  };
}

function resolveSkillTools(match: SkillMatchResult, context: SkillRequestContext): MountedSkillTool[] {
  return (match.skill.tools ?? [])
    .filter((definition) => !definition.match || Boolean(defaultRuleMatcher(definition.match, context)))
    .map((definition) => ({
      skillId: match.skill.id,
      toolName: definition.tool.name,
      tool: definition.tool,
      reason: definition.match ? "tool match" : match.reason,
    }));
}

function defaultRuleMatcher(rule: NonNullable<AgentSkill["match"]>, context: SkillRequestContext): boolean {
  const pseudoSkill: AgentSkill = { id: "tool", name: "tool", description: "tool", match: rule };
  return Boolean(defaultSkillMatcher(pseudoSkill, context));
}

function scoreSkillForDiscovery(skill: AgentSkill, context: SkillRequestContext, active: boolean): FindSkillResult {
  const metadata = toSkillMetadata(skill);
  const match = defaultSkillMatcher(skill, context);
  const queryTokens = tokenize([context.userInput, context.intent].filter(Boolean).join(" "));
  const targetTokens = tokenize([skill.name, skill.description, skill.whenToUse, (skill.tags ?? []).join(" ")].filter(Boolean).join(" "));
  const lexicalMatches = countMatches(queryTokens, targetTokens);
  // Discovery favors already-active skills, then deterministic context matches,
  // then lightweight lexical evidence from metadata.
  const score = (match?.score ?? 0) + (active ? 20 : 0) + lexicalMatches * 10;
  const reasons = [
    active ? "active" : undefined,
    match?.reason,
    lexicalMatches > 0 ? "metadata keyword" : undefined,
  ].filter(Boolean);

  return {
    skill: metadata,
    score,
    reason: reasons.join(", ") || "metadata",
    active,
  };
}

function toSkillMetadata(skill: AgentSkill): SkillMetadata {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    whenToUse: skill.whenToUse,
    tags: skill.tags,
    userInvocable: skill.userInvocable,
    modelInvocable: skill.modelInvocable,
    source: skill.source,
  };
}

function omitToolExecute(tool: AgentTool): Omit<AgentTool, "execute"> {
  const { execute: _execute, ...metadata } = tool;
  return metadata;
}

function resolveSkillId(id: string, skills: Map<string, unknown>, strategy: RegisterConflictStrategy | undefined): string {
  if (!skills.has(id) || strategy === "replace") {
    return id;
  }
  if (strategy === "namespace") {
    let index = 2;
    let candidate = `${id}.${index}`;
    while (skills.has(candidate)) {
      index += 1;
      candidate = `${id}.${index}`;
    }
    return candidate;
  }
  return id;
}

function findSkillIdByToolName(toolName: string, active: Map<string, ActiveSkill>): string | undefined {
  for (const item of active.values()) {
    if (item.mountedTools.includes(toolName)) {
      return item.skill.id;
    }
  }
  return undefined;
}

function matchString(allowed: string[] | undefined, value: string | undefined): boolean {
  return !allowed || allowed.length === 0 || Boolean(value && allowed.includes(value));
}

function matchTags(allowed: string[] | undefined, values: string[] | undefined): boolean {
  return !allowed || allowed.length === 0 || hasAny(values, new Set(allowed));
}

function matchKeywords(keywords: string[] | undefined, values: Array<string | undefined>): boolean {
  if (!keywords || keywords.length === 0) {
    return true;
  }
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function matchMetadataValues(allowed: string[] | undefined, rawValue: unknown): boolean {
  if (!allowed || allowed.length === 0) {
    return true;
  }
  const values = Array.isArray(rawValue) ? rawValue : typeof rawValue === "string" ? [rawValue] : [];
  return hasAny(values, new Set(allowed));
}

function matchUrl(patterns: string[] | undefined, rawUrl: string | URL | undefined): boolean {
  if (!patterns || patterns.length === 0) {
    return true;
  }
  if (!rawUrl) {
    return false;
  }

  const url = rawUrl instanceof URL ? rawUrl.toString() : String(rawUrl);
  return patterns.some((pattern) => {
    const URLPatternCtor = (globalThis as unknown as {
      URLPattern?: new (init: string) => { test(input: string): boolean };
    }).URLPattern;
    if (typeof URLPatternCtor === "function") {
      try {
        return new URLPatternCtor(pattern).test(url);
      } catch {
        // Fall back to wildcard matching below for non-URLPattern patterns.
      }
    }
    return wildcardMatch(pattern, url);
  });
}

function wildcardMatch(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

function hasAny(values: string[] | undefined, targets: Set<string>): boolean {
  return (values ?? []).some((value) => targets.has(value));
}

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.match(/[\p{L}\p{N}_-]+/gu) ?? [];
  const cjk = [...lower.matchAll(/[\p{Script=Han}]{2,}/gu)].flatMap(([match]) => {
    const grams: string[] = [];
    for (let index = 0; index < match.length - 1; index += 1) {
      grams.push(match.slice(index, index + 2));
    }
    return grams;
  });
  return [...new Set([...words, ...cjk])];
}

function countMatches(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0 || targetTokens.length === 0) {
    return 0;
  }
  const target = new Set(targetTokens);
  return queryTokens.filter((token) => target.has(token)).length;
}
