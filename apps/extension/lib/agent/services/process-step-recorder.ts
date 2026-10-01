import type { AgentEvent } from "@hamhome/agent";
import type { AgentProcessStep } from "@/types";
import { getToolDisplayName } from "../tools/tool-display-names";

function safeJsonSummary(value: unknown, maxLength = 600): string {
  const seen = new WeakSet<object>();
  try {
    const redacted = JSON.stringify(
      value,
      (key, rawValue) => {
        if (
          ["apiKey", "baseUrl", "password", "username", "privacyDomains"].includes(
            key,
          )
        ) {
          return "[redacted]";
        }
        if (typeof rawValue === "object" && rawValue !== null) {
          if (seen.has(rawValue)) {
            return "[circular]";
          }
          seen.add(rawValue);
        }
        return rawValue;
      },
      2,
    );

    return (redacted || String(value)).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

function getFriendlyIterationName(iteration: number, language: "zh" | "en") {
  return language === "zh" ? `思考与分析 (第 ${iteration} 轮)` : `Thinking & Planning (Round ${iteration})`;
}

function describeCompaction(droppedMessages: number, summarized: boolean, language: "zh" | "en") {
  if (language === "zh") {
    return {
      title: "整理较早的对话",
      content: summarized ? `已将较早的 ${droppedMessages} 条消息整理为摘要` : `较早的 ${droppedMessages} 条消息未发送给模型`,
    };
  }
  return {
    title: "Condensed earlier conversation",
    content: summarized
      ? `Summarized ${droppedMessages} earlier messages`
      : `${droppedMessages} earlier messages were not sent to the model`,
  };
}

/** A rejected or expired approval surfaces as a ToolPermissionError from the SDK. */
function describeToolFailure(error: Error, language: "zh" | "en"): string {
  if (error.name !== "ToolPermissionError") {
    return error.message;
  }

  return language === "zh" ? "未获得你的确认，已取消执行" : "Not approved, so it did not run";
}

/**
 * Turns agent events into the process steps shown under an answer.
 *
 * Example:
 * ```ts
 * const recorder = createProcessStepRecorder("en");
 * const off = agent.on(recorder.record);
 * recorder.snapshot(); // steps so far, safe to send to the UI
 * const steps = recorder.finish();
 * ```
 */
export function createProcessStepRecorder(language: "zh" | "en") {
  const steps: AgentProcessStep[] = [];
  // Running tool steps keyed by tool call id; by tool name (in call order)
  // only when the model did not provide an id.
  const runningToolIds = new Map<string, string[]>();
  const toolStepKey = (event: { toolCallId?: string; toolName: string }) =>
    event.toolCallId ?? event.toolName;

  const addStep = (
    step: Omit<AgentProcessStep, "id" | "timestamp">,
  ): AgentProcessStep => {
    const nextStep: AgentProcessStep = {
      ...step,
      id: `step_${steps.length + 1}`,
      timestamp: Date.now(),
    };
    steps.push(nextStep);
    return nextStep;
  };

  const completeToolStep = (
    event: { toolCallId?: string; toolName: string },
    update: Partial<AgentProcessStep>,
  ) => {
    const { toolName } = event;
    const key = toolStepKey(event);
    const ids = runningToolIds.get(key) || [];
    const stepId = ids.shift();
    if (!stepId) {
      addStep({
        type: "tool",
        title: getToolDisplayName(toolName, language),
        toolName,
        status: update.status || "completed",
        ...update,
      });
      return;
    }

    const step = steps.find((item) => item.id === stepId);
    if (step) {
      Object.assign(step, update);
    }
    runningToolIds.set(key, ids);
  };

  const record = (event: AgentEvent) => {
    if (event.type === "agent.iteration.started") {
      addStep({
        type: "iteration",
        title: getFriendlyIterationName(event.iteration, language),
        status: "completed",
      });
      return;
    }

    if (event.type === "context.compacted") {
      addStep({
        type: "message",
        ...describeCompaction(event.droppedMessages, event.summarized, language),
        status: "completed",
      });
      return;
    }

    if (event.type === "skill.mounted") {
      addStep({
        type: "skill",
        title: event.skillId,
        content: event.reason,
        status: "completed",
      });
      return;
    }

    if (event.type === "tool.call.started") {
      const step = addStep({
        type: "tool",
        title: getToolDisplayName(event.toolName, language),
        toolName: event.toolName,
        input: safeJsonSummary(event.input, 280),
        status: "running",
      });
      const key = toolStepKey(event);
      runningToolIds.set(key, [...(runningToolIds.get(key) || []), step.id]);
      return;
    }

    if (event.type === "tool.call.completed") {
      completeToolStep(event, {
        status: "completed",
        output: safeJsonSummary(event.output),
      });
      return;
    }

    if (event.type === "tool.call.failed") {
      completeToolStep(event, {
        status: "failed",
        error: describeToolFailure(event.error, language),
      });
    }
  };

  const finish = () => {
    for (const step of steps) {
      if (step.status === "running") {
        step.status = "completed";
      }
    }
    return steps;
  };

  /** Copies of the steps so far; later events do not change them. */
  const snapshot = (): AgentProcessStep[] => steps.map((step) => ({ ...step }));

  return { record, snapshot, finish };
}
