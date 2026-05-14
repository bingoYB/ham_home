import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@hamhome/ui";
import type { AIChatLabels, AISearchStatus } from "./types";

export interface AIChatStatusIndicatorProps {
  status: AISearchStatus;
  error?: string | null;
  onRetry?: () => void;
  labels: AIChatLabels;
}

export function AIChatStatusIndicator({
  status,
  error,
  onRetry,
  labels,
}: AIChatStatusIndicatorProps) {
  if (status === "idle" || status === "done") return null;

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error || labels.status.error}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            {labels.retry}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{labels.status[status]}</span>
    </div>
  );
}
