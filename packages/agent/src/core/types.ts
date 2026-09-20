import type { EmbeddingModel, LanguageModel, LanguageModelUsage } from "ai";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
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

export type AgentEvent =
  | { type: "message.delta"; delta: string }
  | { type: "message.completed"; message: AgentMessage }
  | { type: "tool.call.started"; toolName: string; input: unknown }
  | { type: "tool.call.requires_action"; toolCallId: string; toolName: string; input: unknown; reason?: string }
  | { type: "tool.call.completed"; toolName: string; input: unknown; output: unknown }
  | { type: "tool.call.failed"; toolName: string; input: unknown; error: Error }
  | { type: "agent.iteration.started"; iteration: number }
  | { type: "agent.completed"; result: AgentRunResult }
  | { type: "agent.failed"; error: Error }
  | { type: "tool.registered"; toolName: string; scope?: ToolScope }
  | { type: "tool.unregistered"; toolName: string }
  | { type: "page.changed"; pageId: string; previousPageId?: string }
  | { type: "agent.invocationMode.fixed"; mode: "chat" | "response" }
  | { type: "skill.registered"; skillId: string; source?: SkillSource }
  | { type: "skill.unregistered"; skillId: string }
  | { type: "skill.reconciled"; result: SkillReconcileResult }
  | { type: "skill.mounted"; skillId: string; reason: string }
  | { type: "skill.unmounted"; skillId: string }
  | { type: "skill.tool.mounted"; skillId: string; toolName: string; reason: string }
  | { type: "skill.tool.unmounted"; skillId: string; toolName: string }
  | { type: "skill.matched"; matches: SkillMatchResult[] };

export type EventHandler<TEvent extends AgentEvent = AgentEvent> = (event: TEvent) => void;

export interface AgentRunOptions {
  signal?: AbortSignal;
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
  text: string;
  output?: TOutput;
  rawMessage: AgentMessage;
  toolCalls: ToolCallSummary[];
  usage?: LanguageModelUsage | Record<string, unknown>;
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
  | "fal"
  | "deepinfra"
  | "mistral"
  | "togetherai"
  | "cohere"
  | "fireworks"
  | "deepseek"
  | "cerebras"
  | "perplexity"
  | "luma";

export interface AiSdkProviderConfig {
  provider?: AiSdkProviderName;
  model?: string | LanguageModel;
  apiKey?: string;
  tokenProvider?: TokenProvider;
  baseUrl?: string;
  providerOptions?: Record<string, unknown>;
  invocationMode?: InvocationMode;
}

export interface EmbeddingClientConfig {
  provider?: AiSdkProviderName;
  model: string | EmbeddingModel;
  apiKey?: string;
  tokenProvider?: TokenProvider;
  baseUrl?: string;
  providerOptions?: Record<string, unknown>;
  maxRetries?: number;
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
  contextBuilder?: ContextBuilder;
  dynamicCapabilities?: DynamicCapabilityOptions;
  skillMatcher?: SkillMatcher;
  skillView?: SkillViewToolOptions;
  discoverSkill?: DiscoverSkillToolOptions;
  findSkill?: FindSkillToolOptions;
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
}

export interface CommandRunOptions extends AgentRunOptions {
  model?: string | LanguageModel;
  sessionId?: string;
  ignoreBaseSystemPrompt?: boolean;
}

export interface CommandRunResult<TOutput = unknown> {
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
}

export interface SkillRequestContext {
  pageId?: string;
  moduleId?: string;
  url?: string | URL;
  intent?: string;
  userInput?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SkillPromptIndexOptions {
  activeOnly?: boolean;
  includeWhenToUse?: boolean;
  maxItems?: number;
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
}

export interface ContextBuilder {
  build(input: {
    sessionId: string;
    userInput: string;
    pageId?: string;
    messages: AgentMessage[];
    activeSkills: ActiveSkill[];
    maxTokens?: number;
  }): Promise<AgentMessage[]>;
}
