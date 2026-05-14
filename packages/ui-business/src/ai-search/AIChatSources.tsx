import { ExternalLink } from "lucide-react";
import { Badge, cn } from "@hamhome/ui";
import { formatScore, getScoreColor } from "./ai-search-utils";
import type { AIChatLabels, Source } from "./types";

export interface AIChatSourcesProps {
  sources: Source[];
  onSourceClick: (source: Source) => void;
  labels: AIChatLabels;
}

export function AIChatSources({
  sources,
  onSourceClick,
  labels,
}: AIChatSourcesProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2">{labels.sources}</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.slice(0, 5).map((source) => (
          <button
            key={source.bookmarkId}
            onClick={() => onSourceClick(source)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-muted/50 hover:bg-muted rounded-md transition-colors max-w-[280px]"
            title={source.url}
          >
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
              {source.index}
            </Badge>
            <span className="truncate flex-1">{source.title}</span>
            {source.score !== undefined && (
              <span className={cn("text-[10px] font-medium shrink-0", getScoreColor(source.score))}>
                {formatScore(source.score)}
              </span>
            )}
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
        {sources.length > 5 && (
          <span className="text-xs text-muted-foreground self-center">
            +{sources.length - 5}
          </span>
        )}
      </div>
    </div>
  );
}
