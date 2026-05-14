import { Button, cn } from "@hamhome/ui";
import { getSuggestionIcon, isDirectAction } from "./ai-search-utils";
import type { Suggestion } from "./types";

export interface AIChatSuggestionsProps {
  suggestions: Suggestion[];
  onSuggestionClick?: (suggestion: Suggestion) => void;
}

export function AIChatSuggestions({
  suggestions,
  onSuggestionClick,
}: AIChatSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const Icon = getSuggestionIcon(suggestion.action);
          const isDirect = isDirectAction(suggestion.action);

          return (
            <Button
              key={index}
              variant={isDirect ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "h-7 text-xs gap-1.5",
                isDirect &&
                  "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
              )}
              onClick={() => onSuggestionClick?.(suggestion)}
            >
              {isDirect && <Icon className="h-3 w-3" />}
              {suggestion.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
