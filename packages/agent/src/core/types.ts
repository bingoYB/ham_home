import type { EmbeddingModel, LanguageModel, LanguageModelUsage } from "ai";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonSchemaTypeName = "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";

export type JsonSchema = {
  /** A single type, or a union such as `["string", "null"]` for nullable fields. */
  type?: JsonSchemaTypeName | JsonSchemaTypeName[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: JsonValue[];
  additionalProperties?: boolean | JsonSchema;
  [key: string]: unknown;
};

export type RegisterConflictStrategy = "reject" | "replace" | "namespace";

export type ToolScope =
  | { type: "global" }
  | { type: "page"; pageId: string }
  | { type: "tab"; tabId: string }
  | { type: "frame"; frameId: string }
  | { type: "session"; sessionId: string };

export type InvocationMode = "response" | "chat" | "auto";

export type AgentRole = "user" | "assistant" | "tool" | "system";

/**
 * Multimodal part sent alongside a user message.
 *
 * `image` must be either an http(s) URL or plain base64 content paired with
 * `mediaType`. Do NOT pass a `data:` URL: the AI SDK treats any parsable URL as
 * a remote asset to download and rejects the `data:` scheme.
 *
 * The model provider must support vision input, otherwise the request fails at
 * provider level.
 */
export type AgentContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mediaType?: string };

export interface AgentMessage {
  role: AgentRole;
  content: string;
  /** Multimodal attachments; only meaningful on user messages. */
  attachments?: AgentContentPart[];
  metadata?: Record<string, unknown>;
}

export interface MemoryQueryOptions {
  limit?: number;
  sessionId?: string;
}

export interface MemoryWriteOptions {
  sessionId?: string;
}

export interface MemorySession {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryEntry {
  id: string;
  sessionId: string;
  message: AgentMessage;
  createdAt: number;
}

export interface Memory {
  add(message: AgentMessage, options?: MemoryWriteOptions): Promise<void> | void;
  get(options?: MemoryQueryOptions): Promise<AgentMessage[]> | AgentMessage[];
  getEntries?(options?: MemoryQueryOptions): Promise<MemoryEntry[]> | MemoryEntry[];
  createSession?(session?: Partial<MemorySession>): Promise<MemorySession> | MemorySession;
  getSession?(sessionId: string): Promise<MemorySession | undefined> | MemorySession | undefined;
  listSessions?(): Promise<MemorySession[]> | MemorySession[];
  clear(options?: MemoryQueryOptions): Promise<void> | void;
  deleteSession?(sessionId: string): Promise<void> | void;
}

export interface ToolExecutionContext {
  agentId: string;
  sessionId: string;
  /** Id of the run that called the tool; matches `AgentEvent.runId`. */
  runId?: string;
  toolCallId?: string;
  pageId?: string;
  moduleId?: string;
  url?: string;
  intent?: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  parameters?: JsonSchema;
  scope?: ToolScope;
  metadata?: Record<string, unknown>;
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput> | TOutput;
}

export interface ToolCallSummary {
  toolCallId?: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  error?: string;
}

export type PermissionMode = "allow" | "ask" | "deny";

export interface ToolSecurityOptions {
  mode: PermissionMode;
  reason?: string;
}

export interface SecurityPolicy {
  getToolPermission(toolName: string, input: unknown, context: ToolExecutionContext): Promise<ToolSecurityOptions> | ToolSecurityOptions;
  onAsk?: (toolName: string, input: unknown, context: ToolExecutionContext, reason?: string) => Promise<boolean> | boolean;
}

export interface ToolInterceptor {
  beforeExecute?(toolName: string, input: unknown, context: ToolExecutionContext): Promise<unknown> | unknown;
  afterExecute?(toolName: string, input: unknown, output: unknown, context: ToolExecutionContext): Promise<unknown> | unknown;
}

/**
 * Lifecycle event. Events emitted while a run is in progress carry that run's
 * `runId`, so listeners on a shared agent can tell concurrent runs apart; tool
 * call events also carry the model's `toolCallId` when it provides one.
 * Registry events emitted outside a run (`tool.registered`, `page.changed`,
 * ...) have no `runId`.
 */
export type AgentEvent = (
  | { type: "message.delta"; delta: string }
  /** Streamed reasoning ("thinking") text from models that expose it; `runStream()` only. */
  | { type: "reasoning.delta"; delta: string }
  | { type: "message.completed"; message: AgentMessage }
  | { type: "tool.call.started"; toolCallId?: string; toolName: string; input: unknown }
  | { type: "tool.call.requires_action"; toolCallId: string; toolName: string; input: unknown; reason?: string }
  | { type: "tool.call.completed"; toolCallId?: string; toolName: string; input: unknown; output: unknown }
  | { type: "tool.call.failed"; toolCallId?: string; toolName: string; input: unknown; error: Error }
  | { type: "agent.iteration.started"; iteration: number }
  | { type: "agent.completed"; result: AgentRunResult }
  | { type: "agent.failed"; error: Error }
  | { type: "tool.registered"; toolName: string; scope?: ToolScope }
  | { type: "tool.unregistered"; toolName: string }
  | { type: "page.changed"; pageId: string; previousPageId?: string }
  | { type: "agent.invocationMode.fixed"; mode: "chat" | "response" }
  /** Earlier turns no longer fit the context window; `summarized` tells whether they were summarized or dropped. */
  | { type: "context.compacted"; droppedMessages: number; summarized: boolean }
  | { type: "skill.registered"; skillId: string; source?: SkillSource }
  | { type: "skill.unregistered"; skillId: string }
  | { type: "skill.reconciled"; result: SkillReconcileResult }
  | { type: "skill.mounted"; skillId: string; reason: string }
  | { type: "skill.unmounted"; skillId: string }
  | { type: "skill.tool.mounted"; skillId: string; toolName: string; reason: string }
  | { type: "skill.tool.unmounted"; skillId: string; toolName: string }
  | { type: "skill.matched"; matches: SkillMatchResult[] }
) & { runId?: string };

export type EventHandler<TEvent extends AgentEvent = AgentEvent> = (event: TEvent) => void;

export interface AgentRunOptions {
  signal?: AbortSignal;
  /**
   * Id stamped on this run's events, tool contexts and result. Defaults to a
   * generated id; pass your own (e.g. a UI turn id) to correlate them.
   */
  runId?: string;
  /** Multimodal attachments appended to the user message of this run. */
  attachments?: AgentContentPart[];
  maxIterations?: number;
  temperature?: number;
  tools?: string[];
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
  invocationMode?: InvocationMode;
  debug?: boolean;
  skillContext?: SkillRequestContext;
}

export interface AgentRunResult<TOutput = unknown> {
  runId: string;
  text: string;
  output?: TOutput;
  rawMessage: AgentMessage;
  toolCalls: ToolCallSummary[];
  usage?: LanguageModelUsage | Record<string, unknown>;
  /**
   * Skills to keep active in the next turn: the pinned Skills of this run
   * plus the ones the model activated. Pass it back as
   * `skillContext.pinnedSkillIds` when the next turn uses a new agent.
   */
  pinnedSkillIds: string[];
}

export interface ModelGenerateRequest {
  model?: string | LanguageModel;
  systemPrompt?: string;
  messages: AgentMessage[];
  tools: AgentTool[];
  activeToolNames?: string[];
  maxIterations: number;
  temperature?: number;
  signal?: AbortSignal;
  toolContext: ToolExecutionContext;
  outputSchema?: JsonSchema;
  emit?: (event: AgentEvent) => void;
  invocationMode?: "response" | "chat";
}

export interface ModelGenerateResult<TOutput = unknown> {
  text: string;
  output?: TOutput;
  toolCalls: ToolCallSummary[];
  usage?: LanguageModelUsage | Record<string, unknown>;
}

export interface ModelClient {
  generate<TOutput = unknown>(request: ModelGenerateRequest): Promise<ModelGenerateResult<TOutput>>;
  stream?<TOutput = unknown>(request: ModelGenerateRequest): Promise<ModelGenerateResult<TOutput>>;
}

export interface TokenProvider {
  (): Promise<string> | string;
}

export type AiSdkProviderName =
  | "gateway"
  | "vercel"
  | "openai"
  | "openai-compatible"
  | "anthropic"
  | "google"
  | "xai"
  | "azure"
  | "amazon-bedrock"
  | "groq"
  | "deepinfra"
  | "mistral"
  | "togetherai"
  | "cohere"
  | "fireworks"
  | "deepseek"
  | "cerebras"
  | "perplexity";

/**
 * An AI SDK provider the agent can resolve by name. The core runtime bundles no
 * provider: import the definitions you need from `@hamhome/agent/providers`
 * and pass them in `providers`, so unused providers stay out of the bundle.
 *
 * Example:
 * ```ts
 * import { openaiProvider } from "@hamhome/agent/providers";
 * createAgent({ providers: [openaiProvider], provider: "openai", model: "gpt-4.1-mini" });
 * ```
 */
export interface AiSdkProviderDefinition {
  name: AiSdkProviderName;
  /** Model kinds the provider exposes; resolving any other kind fails early. */
  supports: { language: boolean; embedding: boolean };
  /**
   * Creates the AI SDK provider from the factory options: `providerOptions`
   * merged with the resolved `apiKey` and `baseURL`.
   */
  create(options: Record<string, unknown>): unknown;
}

export interface AiSdkProviderConfig {
  provider?: AiSdkProviderName;
  /** Providers that `provider` may name. Not needed when `model` is a model instance. */
  providers?: AiSdkProviderDefinition[];
  model?: string | LanguageModel;
  apiKey?: string;
  tokenProvider?: TokenProvider;
  baseUrl?: string;
  /** Extra settings for the provider factory (e.g. `headers`), not per-call model options. */
  providerOptions?: Record<string, unknown>;
  invocationMode?: InvocationMode;
}

export interface EmbeddingClientConfig {
  provider?: AiSdkProviderName;
  /** Providers that `provider` may name. Not needed when `model` is a model instance. */
  providers?: AiSdkProviderDefinition[];
  model: string | EmbeddingModel;
  apiKey?: string;
  tokenProvider?: TokenProvider;
  baseUrl?: string;
  /** Extra settings for the provider factory (e.g. `headers`), not per-call model options. */
  providerOptions?: Record<string, unknown>;
  maxRetries?: number;
  /**
   * Output vector size for models that support shortened embeddings. Forwarded
   * to OpenAI / Azure / OpenAI-compatible (`dimensions`) and Google
   * (`outputDimensionality`); other providers ignore it.
   */
  dimensions?: number;
}

export interface AgentConfig extends AiSdkProviderConfig {
  agentId?: string;
  sessionId?: string;
  systemPrompt?: string;
  tools?: AgentTool[];
  memory?: Memory;
  modelClient?: ModelClient;
  maxIterations?: number;
  temperature?: number;
  debug?: boolean;
  securityPolicy?: SecurityPolicy;
  interceptors?: ToolInterceptor[];
  skills?: AgentSkill[];
  skillStore?: SkillStore;
  embeddingClient?: EmbeddingClient;
  /** Custom history selection; takes precedence over `contextWindow`. */
  contextBuilder?: ContextBuilder;
  /** Fits the history sent per model call into a token budget. Off by default. */
  contextWindow?: ContextWindowOptions;
  dynamicCapabilities?: DynamicCapabilityOptions;
  skillMatcher?: SkillMatcher;
  skillView?: SkillViewToolOptions;
  discoverSkill?: DiscoverSkillToolOptions;
  findSkill?: FindSkillToolOptions;
  /** Token budget for Skill documents returned by `skill_view` and `activateSkill`. */
  maxSkillContextTokens?: number;
}

export interface PageDefinition {
  pageId: string;
  match?: (location: URL) => boolean;
  tools: AgentTool[];
  systemPrompt?: string;
  skillIds?: string[];
  skills?: AgentSkill[];
  metadata?: Record<string, unknown>;
}

export interface CommandContext {
  agent: unknown;
  pageId?: string;
  sessionId?: string;
}

export type CommandToolSelector = (context: CommandContext) => Array<string | AgentTool>;

export interface AgentCommand<TInput = unknown, TOutput = unknown> {
  name: string;
  description?: string;
  prompt: string | ((input: TInput, context: CommandContext) => string);
  /** Multimodal attachments sent with the rendered prompt. */
  attachments?:
    | AgentContentPart[]
    | ((input: TInput, context: CommandContext) => AgentContentPart[] | undefined);
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  tools?: Array<string | AgentTool> | CommandToolSelector;
  model?: string | LanguageModel;
  maxIterations?: number;
  metadata?: Record<string, unknown>;
  ignoreBaseSystemPrompt?: boolean;
  /**
   * Run inside the conversation: read its history and store the prompt, tool
   * calls and output in it. Defaults to false, so a fixed task runs on a
   * throwaway memory and neither sees nor grows the session.
   */
  useSessionMemory?: boolean;
}

export interface CommandRunOptions extends AgentRunOptions {
  model?: string | LanguageModel;
  /** Session used when the command runs with session memory. Defaults to the active session. */
  sessionId?: string;
  ignoreBaseSystemPrompt?: boolean;
  /** Overrides `AgentCommand.useSessionMemory` for this run. */
  useSessionMemory?: boolean;
}

export interface CommandRunResult<TOutput = unknown> {
  runId: string;
  command: string;
  output: TOutput;
  rawMessage: AgentMessage;
  toolCalls: ToolCallSummary[];
  usage?: LanguageModelUsage | Record<string, unknown>;
}

export interface SimilarityCandidate<T> {
  embedding: number[];
  item: T;
}

export interface SimilarityResult<T> {
  item: T;
  score: number;
}

export interface EmbeddingTestConnectionResult {
  success: boolean;
  message: string;
  latencyMs: number;
  error?: string;
  /** Vector size returned by the model; only set on success. */
  dimensions?: number;
}

export interface EmbeddingClient {
  embed(input: string, options?: { signal?: AbortSignal }): Promise<number[]>;
  embedMany(input: string[], options?: { signal?: AbortSignal }): Promise<number[][]>;
  testConnection(options?: { signal?: AbortSignal }): Promise<EmbeddingTestConnectionResult>;
}

export type SkillSourceType = "app" | "user" | "workspace" | "plugin" | "remote" | "bundled";

export type SkillDocumentKind =
  | "manual"
  | "faq"
  | "page-help"
  | "troubleshooting"
  | "release-note"
  | "policy"
  | "procedure"
  | "reference";

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  version?: string;
  whenToUse?: string;
  tags?: string[];
  match?: SkillMatchRule;
  documents?: SkillDocument[];
  tools?: SkillToolDefinition[];
  pages?: PageDefinition[];
  userInvocable?: boolean;
  modelInvocable?: boolean;
  source?: SkillSource;
  metadata?: Record<string, unknown>;
}

export interface SkillMatchRule {
  pageIds?: string[];
  moduleIds?: string[];
  urlPatterns?: string[];
  domScopes?: string[];
  intents?: string[];
  keywords?: string[];
  tags?: string[];
}

export interface SkillSource {
  type: SkillSourceType;
  id?: string;
  url?: string;
  trusted?: boolean;
}

export interface SkillToolDefinition {
  tool: AgentTool;
  match?: SkillMatchRule;
}

export interface SkillMatcher {
  (skill: AgentSkill, context: SkillRequestContext): SkillMatchResult | undefined;
}

export interface SkillDocument {
  id: string;
  kind: SkillDocumentKind;
  title: string;
  content?: string;
  url?: string;
  pageId?: string;
  moduleId?: string;
  urlPatterns?: string[];
  keywords?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SkillPromptIndexItem {
  id: string;
  name: string;
  description: string;
  whenToUse?: string;
  active: boolean;
}

export interface SkillStore {
  put(skill: AgentSkill): Promise<void> | void;
  get(skillId: string): Promise<AgentSkill | undefined> | AgentSkill | undefined;
  list(options?: SkillListOptions): Promise<AgentSkill[]> | AgentSkill[];
  delete(skillId: string): Promise<void> | void;
}

export interface SkillListOptions {
  source?: SkillSourceType;
  tags?: string[];
  enabled?: boolean;
}

export interface SkillRegisterOptions {
  onConflict?: RegisterConflictStrategy;
  enabled?: boolean;
}

export interface DynamicCapabilityOptions {
  enabled?: boolean;
  cleanupKnowledgeOnUnmount?: boolean;
}

export interface FindSkillToolOptions {
  enabled?: boolean;
  keepWhenToolsRestricted?: boolean;
}

export interface SkillViewToolOptions {
  enabled?: boolean;
  keepWhenToolsRestricted?: boolean;
  allowInactive?: boolean;
}

export interface DiscoverSkillToolOptions {
  enabled?: boolean;
  keepWhenToolsRestricted?: boolean;
  /**
   * Also expose `activateSkill`, which mounts a discovered Skill's tools for
   * the rest of the run. Defaults to true.
   */
  allowActivation?: boolean;
}

export interface SkillRequestContext {
  pageId?: string;
  moduleId?: string;
  url?: string | URL;
  intent?: string;
  userInput?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  /**
   * Skills kept active for this run even when the request does not match
   * them, usually `AgentRunResult.pinnedSkillIds` of the previous turn.
   * When set, it replaces what the agent remembers for the session, so pass
   * `[]` to drop every pinned Skill.
   */
  pinnedSkillIds?: string[];
}

export interface SkillPromptIndexOptions {
  activeOnly?: boolean;
  includeWhenToUse?: boolean;
  maxItems?: number;
  /** `buildPromptIndex` only: include the skill_view guidance. Defaults to true. */
  skillViewEnabled?: boolean;
  /** `buildPromptIndex` only: include the discoverSkill guidance. Defaults to true. */
  discoverSkillEnabled?: boolean;
  /** `buildPromptIndex` only: include the activateSkill guidance. Defaults to false. */
  activateSkillEnabled?: boolean;
}

export interface FindSkillInput {
  query: string;
  pageId?: string;
  moduleId?: string;
  url?: string | URL;
  intent?: string;
  tags?: string[];
  activeOnly?: boolean;
  topK?: number;
}

export interface DiscoverSkillInput {
  query: string;
  pageId?: string;
  moduleId?: string;
  url?: string | URL;
  intent?: string;
  tags?: string[];
  topK?: number;
}

export interface SkillViewInput {
  skillId: string;
  includeDocuments?: boolean;
  includeTools?: boolean;
}

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  whenToUse?: string;
  tags?: string[];
  userInvocable?: boolean;
  modelInvocable?: boolean;
  source?: SkillSource;
}

export interface FindSkillResult {
  skill: SkillMetadata;
  score: number;
  reason: string;
  active: boolean;
}

export interface DiscoverSkillResult {
  skill: SkillMetadata;
  score: number;
  reason: string;
  active: false;
}

export interface SkillViewResult {
  skill: SkillMetadata;
  active: boolean;
  documents?: SkillDocument[];
  /** Documents left out because they did not fit `maxSkillContextTokens`. */
  omittedDocumentIds?: string[];
  tools?: Array<Omit<AgentTool, "execute">>;
  metadata?: Record<string, unknown>;
}

export interface SkillMatchResult {
  skill: AgentSkill;
  score: number;
  reason: string;
  matchedBy: Array<"pageId" | "moduleId" | "url" | "domScope" | "intent" | "keyword" | "tag">;
}

export interface ActiveSkill {
  skill: AgentSkill;
  mountedAt: number;
  reason: string;
  mountedTools: string[];
}

export interface MountedSkillTool {
  skillId: string;
  toolName: string;
  tool: AgentTool;
  reason: string;
}

export interface SkillReconcileResult {
  activeSkills: ActiveSkill[];
  mountedTools: MountedSkillTool[];
  mountedSkillIds: string[];
  unmountedSkillIds: string[];
  mountedToolNames: string[];
  unmountedToolNames: string[];
  /** Requested pinned Skills that exist, are enabled and model-invocable. */
  pinnedSkillIds: string[];
}

/**
 * Chooses which stored messages are sent with each model call. The agent calls
 * it before every model step with the full session history; what it returns
 * is sent but never stored.
 */
export interface ContextBuilder {
  build(input: ContextBuildInput): Promise<AgentMessage[]>;
}

export interface ContextBuildInput {
  sessionId: string;
  userInput: string;
  pageId?: string;
  messages: AgentMessage[];
  activeSkills: ActiveSkill[];
  maxTokens?: number;
  signal?: AbortSignal;
  /**
   * Runs one plain completion with the agent's model, without tools or
   * history. Provided by the agent, e.g. for summarizing dropped turns.
   */
  generateText?: (request: { systemPrompt: string; prompt: string; signal?: AbortSignal }) => Promise<string>;
  /** Reports turns that no longer fit; the agent emits `context.compacted`. */
  onCompacted?: (info: { droppedMessages: number; summarized: boolean }) => void;
}

/**
 * Token budget for the history sent with each model call. When the history
 * is over budget, the oldest turns go first; the newest turn is always kept.
 */
export interface ContextWindowOptions {
  /** Estimated tokens of history sent per model call. */
  maxTokens: number;
  /** Tool results longer than this are cut down before sending, even under budget. */
  maxToolResultTokens?: number;
  /**
   * Summarize turns that no longer fit with the agent's model instead of
   * dropping them silently. Costs one extra model call whenever more turns
   * fall out of the window. Defaults to false.
   */
  summarize?: boolean;
  /** Replaces the built-in estimate (about 4 characters or 1 CJK character per token). */
  estimateTokens?: (message: AgentMessage) => number;
}
