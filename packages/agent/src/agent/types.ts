import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import type { BaseMemory } from "../memory";
import type { MCPRegistry } from "../mcp";
import type { TaskManagerOptions, TaskManagerEventMap, TaskRunResult } from "../scheduler";
import type { SkillDefinition, SkillLoader } from "../skill";
import type { ToolRegistry } from "../tools";
import type { ProviderName } from "./providers";

export type AgentInput = string | ModelMessage | ModelMessage[];

export interface AgentModelConfig {
  /** LLM 提供商名称，支持所有内置 provider 或任意字符串（走 custom 兼容模式） */
  provider?: ProviderName | (string & {});
  model: string | LanguageModel;
  apiKey?: string;
  apikey?: string;
  baseURL?: string;
  baseUrl?: string;
  baseurl?: string;
}

export interface GenerateOptions {
  model: LanguageModel;
  messages: ModelMessage[];
  tools?: ToolSet;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  toolCalls?: any[];
  toolResults?: any[];
  responseMessages?: ModelMessage[];
  finishReason?: string;
  llmSteps?: Array<{
    text: string;
    toolCalls?: any[];
    toolResults?: any[];
    responseMessages?: ModelMessage[];
    finishReason?: string;
  }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface StreamCallbacks {
  onText?: (text: string) => void;
  onToolCall?: (toolCall: any) => void;
  onFinish?: (result: GenerateResult) => void;
}

export interface AgentRuntimeContext {
  agentName: string;
  runId: string;
  metadata: Record<string, unknown>;
  startedAt: string;
  signal?: AbortSignal;
}

export interface AgentOptions extends AgentModelConfig {
  name?: string;
  memory?: BaseMemory;
  tools?: ToolRegistry;
  skills?: SkillLoader;
  mcp?: MCPRegistry;
  systemPrompt?: string | (() => string | Promise<string>);
  workspace?: string;
}

export interface AgentRunOptions extends Partial<AgentModelConfig> {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  maxIterations?: number;
  continueOnToolError?: boolean;
  toolNames?: string[];
  additionalTools?: ToolSet;
  includeMCPTools?: boolean;
  includeMCPControlTools?: boolean;
  metadata?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AgentStepResult extends GenerateResult {
  stepNumber: number;
  messages: ModelMessage[];
  context: AgentRuntimeContext;
}

export interface AgentLoopStep {
  stepNumber: number;
  result: AgentStepResult;
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    input: unknown;
  }>;
  toolResults: Array<{
    toolCallId: string;
    toolName: string;
    input: unknown;
    output: unknown;
    isError?: boolean;
  }>;
}

export interface AgentRunResult extends GenerateResult {
  runId: string;
  messages: ModelMessage[];
  context: AgentRuntimeContext;
  steps: AgentLoopStep[];
  iterations: number;
}

export interface AgentStreamCallbacks extends StreamCallbacks {
  onStart?: (context: AgentRuntimeContext) => void;
}

export interface AgentEventMap
  extends TaskManagerEventMap<Record<string, unknown>> {
  "agent:before_run": {
    input: ModelMessage[];
    options: AgentRunOptions;
    context: AgentRuntimeContext;
  };
  "agent:after_run": {
    input: ModelMessage[];
    result: AgentRunResult;
    options: AgentRunOptions;
    context: AgentRuntimeContext;
  };
  "agent:loop_start": {
    input: ModelMessage[];
    options: AgentRunOptions;
    context: AgentRuntimeContext;
    messages: ModelMessage[];
  };
  "agent:loop_step": {
    step: AgentLoopStep;
    options: AgentRunOptions;
    context: AgentRuntimeContext;
    messages: ModelMessage[];
  };
  "agent:loop_finish": {
    result: AgentRunResult;
    options: AgentRunOptions;
    context: AgentRuntimeContext;
  };
  "agent:error": {
    input: ModelMessage[];
    options: AgentRunOptions;
    context: AgentRuntimeContext;
    error: unknown;
  };
  "llm:before": {
    options: GenerateOptions;
    context: AgentRuntimeContext;
    stepNumber?: number;
  };
  "llm:after": {
    options: GenerateOptions;
    result: GenerateResult;
    context: AgentRuntimeContext;
    stepNumber?: number;
  };
  "llm:error": {
    options: GenerateOptions;
    context: AgentRuntimeContext;
    error: unknown;
    stepNumber?: number;
  };
  "tool:before": {
    toolName: string;
    input: unknown;
    context: AgentRuntimeContext;
  };
  "tool:after": {
    toolName: string;
    input: unknown;
    output: unknown;
    context: AgentRuntimeContext;
  };
  "tool:error": {
    toolName: string;
    input: unknown;
    error: unknown;
    context: AgentRuntimeContext;
  };
  "skill:before": {
    skillName: string;
    context: AgentRuntimeContext;
  };
  "skill:after": {
    skillName: string;
    content: string;
    context: AgentRuntimeContext;
  };
  "skill:error": {
    skillName: string;
    error: unknown;
    context: AgentRuntimeContext;
  };
}

export interface AgentTaskSharedState extends Record<string, unknown> {
  agentName: string;
  runAgent: (input: AgentInput, options?: AgentRunOptions) => Promise<AgentRunResult>;
}

export interface AgentTaskManagerOptions
  extends Omit<
    TaskManagerOptions<Record<string, unknown>>,
    "dispatcher" | "sharedState"
  > {
  sharedState?: Record<string, unknown>;
}

export type AgentWorkflowResult = TaskRunResult<Record<string, unknown>>;

export type { SkillDefinition };
