/**
 * StorageStatCard - one tile of the storage overview grid.
 * Text wraps and the action button may grow taller, so long localized labels
 * never push content past the card edge.
 */
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@hamhome/ui";

interface StorageStatCardProps {
  title: string;
  /** Main figure line, e.g. "1345 bookmarks / 61 categories" */
  primary: string;
  /** Muted detail line, e.g. the occupied size */
  secondary?: string;
  /** Static hint shown at the bottom when the card has no clear action */
  footnote?: string;
  /** Label of the clear button; the button is hidden when omitted */
  clearLabel?: string;
  isClearing?: boolean;
  clearDisabled?: boolean;
  onClear?: () => void;
}

export function StorageStatCard({
  title,
  primary,
  secondary,
  footnote,
  clearLabel,
  isClearing = false,
  clearDisabled = false,
  onClear,
}: StorageStatCardProps) {
  return (
    <div
      data-testid="storage-stat-card"
      className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/30 p-4"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 break-words text-sm text-muted-foreground">
          {primary}
        </p>
        {secondary && (
          <p className="mt-0.5 break-words text-xs text-muted-foreground">
            {secondary}
          </p>
        )}
      </div>
      {clearLabel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={clearDisabled}
          className="h-auto min-h-8 w-full whitespace-normal py-1.5 text-center leading-tight text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          {isClearing ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
          )}
          {clearLabel}
        </Button>
      )}
      {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
}
