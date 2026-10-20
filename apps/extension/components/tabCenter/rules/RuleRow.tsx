/**
 * RuleRow - label + description on the left, a control on the right.
 */
import type { ReactNode } from "react";
import { Label, cn } from "@hamhome/ui";

interface RuleRowProps {
  label: string;
  description?: string;
  htmlFor?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function RuleRow({ label, description, htmlFor, disabled, children }: RuleRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 py-3", disabled && "opacity-60")}>
      <div className="min-w-0 flex-1 space-y-0.5">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default RuleRow;
