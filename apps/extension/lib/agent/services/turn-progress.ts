import type { AgentEvent } from "@hamhome/agent";
import type { AgentTurnProgress } from "@/types";
import { createProcessStepRecorder } from "./process-step-recorder";

/**
 * Tracks the live state of one running turn: its process steps and the answer
 * text the current model step is streaming. A new model step starts a new
 * draft, so text streamed before a tool call is replaced by the next step.
 *
 * Example:
 * ```ts
 * const progress = createTurnProgressTracker("zh");
 * for await (const event of agent.runStream(input)) progress.record(event);
 * progress.snapshot(); // { steps, draftAnswer }
 * ```
 */
export function createTurnProgressTracker(language: "zh" | "en") {
  const recorder = createProcessStepRecorder(language);
  let draftAnswer = "";

  const record = (event: AgentEvent) => {
    recorder.record(event);
    if (event.type === "agent.iteration.started") {
      draftAnswer = "";
    } else if (event.type === "message.delta") {
      draftAnswer += event.delta;
    }
  };

  const snapshot = (): Omit<AgentTurnProgress, "pendingApproval"> => ({
    steps: recorder.snapshot(),
    draftAnswer,
  });

  return { record, snapshot, finish: recorder.finish };
}
