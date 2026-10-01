import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@hamhome/utils";
import type { AgentProcessStep, AgentToolApprovalRequest } from "@/types";
import { getBackgroundService } from "@/lib/services";

/** Often enough for streamed text to read smoothly; each poll is one message to the service worker. */
const POLL_INTERVAL_MS = 300;

export interface UseAgentTurnProgressReturn {
  /** High-risk tool call of the running turn waiting for the user's decision */
  pendingApproval: AgentToolApprovalRequest | null;
  /** Process steps of the running turn so far */
  steps: AgentProcessStep[];
  /** Answer text the running turn is streaming */
  draftAnswer: string;
  isResponding: boolean;
  /** Start watching a new turn; returns the turn id to send with it. */
  watchTurn: () => string;
  stopWatching: () => void;
  /** Whether the watched turn streamed any answer text. */
  hasStreamedAnswer: () => boolean;
  /** Ask the background to stop the watched turn. */
  cancelTurn: () => Promise<void>;
  respond: (approved: boolean) => Promise<void>;
}

/**
 * Watch the running agent turn: its live process steps, the answer text it
 * streams, and high-risk tool calls that need the user's approval. Polling
 * also keeps the MV3 service worker alive while the turn runs.
 */
export function useAgentTurnProgress(): UseAgentTurnProgressReturn {
  const [pendingApproval, setPendingApproval] =
    useState<AgentToolApprovalRequest | null>(null);
  const [steps, setSteps] = useState<AgentProcessStep[]>([]);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnIdRef = useRef<string | null>(null);
  const streamedRef = useRef(false);
  // Bumped on every watch/stop so late poll responses of a finished turn are dropped.
  const generationRef = useRef(0);
  const answeredIdsRef = useRef(new Set<string>());

  const stopWatching = useCallback(() => {
    generationRef.current += 1;
    turnIdRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPendingApproval(null);
    setSteps([]);
    setDraftAnswer("");
  }, []);

  const watchTurn = useCallback(() => {
    stopWatching();
    answeredIdsRef.current.clear();
    streamedRef.current = false;
    const generation = generationRef.current;
    const turnId = generateId();
    turnIdRef.current = turnId;
    let isPolling = false;

    timerRef.current = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const progress = await getBackgroundService().globalAgentGetTurnProgress(turnId);
        if (generation !== generationRef.current || !progress) return;
        setSteps(progress.steps);
        setDraftAnswer(progress.draftAnswer);
        if (progress.draftAnswer) {
          streamedRef.current = true;
        }
        const request = progress.pendingApproval;
        setPendingApproval(
          request && !answeredIdsRef.current.has(request.id) ? request : null,
        );
      } catch (error) {
        console.error("[useAgentTurnProgress] Failed to poll turn progress:", error);
      } finally {
        isPolling = false;
      }
    }, POLL_INTERVAL_MS);

    return turnId;
  }, [stopWatching]);

  const hasStreamedAnswer = useCallback(() => streamedRef.current, []);

  const cancelTurn = useCallback(async () => {
    const turnId = turnIdRef.current;
    if (!turnId) return;
    try {
      await getBackgroundService().globalAgentCancelTurn(turnId);
    } catch (error) {
      console.error("[useAgentTurnProgress] Failed to stop the turn:", error);
    }
  }, []);

  const respond = useCallback(
    async (approved: boolean) => {
      if (!pendingApproval) return;
      answeredIdsRef.current.add(pendingApproval.id);
      setIsResponding(true);
      try {
        await getBackgroundService().globalAgentResolveApproval(pendingApproval.id, approved);
      } catch (error) {
        console.error("[useAgentTurnProgress] Failed to send decision:", error);
      } finally {
        setPendingApproval(null);
        setIsResponding(false);
      }
    },
    [pendingApproval],
  );

  useEffect(() => stopWatching, [stopWatching]);

  return {
    pendingApproval,
    steps,
    draftAnswer,
    isResponding,
    watchTurn,
    stopWatching,
    hasStreamedAnswer,
    cancelTurn,
    respond,
  };
}
