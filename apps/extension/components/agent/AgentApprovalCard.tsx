import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import { Button } from "@hamhome/ui";
import type { AgentToolApprovalRequest } from "@/types";

export interface AgentApprovalCardProps {
  approval: AgentToolApprovalRequest;
  /** Disables both buttons while the decision is being sent */
  isResponding?: boolean;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * Inline card in the agent chat asking the user to approve a high-risk tool call.
 */
export function AgentApprovalCard({
  approval,
  isResponding = false,
  onApprove,
  onReject,
}: AgentApprovalCardProps) {
  const { t } = useTranslation("ai");
  const minutes = Math.max(1, Math.round((approval.expiresAt - Date.now()) / 60_000));

  return (
    <div
      role="alertdialog"
      aria-label={t("agent.approval.title")}
      className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-amber-500/30 bg-amber-50/80 p-3.5 text-sm shadow-sm backdrop-blur-sm dark:bg-amber-950/30"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <ShieldAlert className="h-4 w-4" />
        {t("agent.approval.title")}
      </div>
      <div className="mt-2 font-medium text-foreground">{approval.title}</div>
      {approval.target && (
        <div className="mt-0.5 break-all text-foreground/80">{approval.target}</div>
      )}
      {approval.detail && (
        <p className="mt-1.5 text-xs text-muted-foreground">{approval.detail}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground/80">
          {t("agent.approval.timeoutHint", { minutes })}
        </span>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isResponding}
            onClick={onReject}
          >
            {t("agent.approval.reject")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isResponding}
            onClick={onApprove}
          >
            {t("agent.approval.approve")}
          </Button>
        </div>
      </div>
    </div>
  );
}
