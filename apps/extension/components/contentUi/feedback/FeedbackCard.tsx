/**
 * FeedbackCard - shell of the in-page lifecycle toasts and nudges.
 * Bottom corner opposite to the edge panel; never takes focus on its own.
 */
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button, cn } from "@hamhome/ui";

interface FeedbackCardProps {
  side: "left" | "right";
  /** Accessible role: status for toasts, region for the nudge */
  role: "status" | "region";
  label: string;
  closeLabel: string;
  testId: string;
  className?: string;
  onClose: () => void;
  onHoldChange: (held: boolean) => void;
  children: ReactNode;
}

export function FeedbackCard({
  side,
  role,
  label,
  closeLabel,
  testId,
  className,
  onClose,
  onHoldChange,
  children,
}: FeedbackCardProps) {
  return (
    <div
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      aria-label={label}
      data-hamhome-tab-feedback={testId}
      onMouseEnter={() => onHoldChange(true)}
      onMouseLeave={() => onHoldChange(false)}
      onFocusCapture={() => onHoldChange(true)}
      onBlurCapture={() => onHoldChange(false)}
      className={cn(
        "pointer-events-auto fixed bottom-4 z-[100001] w-[360px] max-w-[calc(100vw-2rem)]",
        side === "right" ? "right-4" : "left-4",
        "overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl",
        "animate-in fade-in slide-in-from-bottom-4 duration-200",
        className,
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">{children}</div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          title={closeLabel}
          aria-label={closeLabel}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default FeedbackCard;
