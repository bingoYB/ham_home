import { useCallback, useState, type KeyboardEvent } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { Button, Input, cn } from "@hamhome/ui";
import type { AIChatLabels } from "./types";

export interface AIChatSearchBarProps {
  query: string;
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  showQuickActions?: boolean;
  labels: AIChatLabels;
}

export function AIChatSearchBar({
  query,
  isSearching,
  onQueryChange,
  onSubmit,
  showQuickActions = false,
  labels,
}: AIChatSearchBarProps) {
  const [isQuickActionsVisible, setIsQuickActionsVisible] = useState(true);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey && query.trim()) {
        event.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, query],
  );

  const handleSubmit = useCallback(() => {
    if (query.trim() && !isSearching) onSubmit();
  }, [query, isSearching, onSubmit]);

  const handleQuickActionClick = useCallback(
    (actionQuery: string) => {
      onQueryChange(actionQuery);
      setTimeout(onSubmit, 0);
    },
    [onQueryChange, onSubmit],
  );

  const shouldShowQuickActions =
    showQuickActions && !query.trim() && isQuickActionsVisible;

  return (
    <div className="w-full flex justify-center">
      <div className="w-full relative flex flex-col gap-2 bg-linear-to-r from-indigo-50/80 to-violet-50/80 backdrop-blur-sm dark:from-indigo-950/40 dark:to-violet-950/40 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 ring-1 ring-indigo-500/20 px-4 py-2">
        {shouldShowQuickActions && (
          <div className="flex items-start gap-2 pb-1">
            <div className="flex-1 flex flex-wrap gap-2">
              {labels.quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickActionClick(action.query)}
                  className="px-2.5 py-1.5 rounded-md bg-indigo-100/60 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 dark:border-indigo-700/40 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all duration-200 whitespace-nowrap cursor-pointer"
                >
                  {action.title}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsQuickActionsVisible(false)}
              className="shrink-0 p-1.5 rounded-md text-indigo-400/70 hover:text-indigo-600 dark:text-indigo-500/70 dark:hover:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 transition-all duration-200 cursor-pointer"
              title={labels.dismissQuickActions}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Sparkles className="shrink-0 h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          <Input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={labels.aiPlaceholder}
            className={cn(
              "flex-1 border-0 bg-transparent! shadow-none h-9",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-indigo-400/70 dark:placeholder:text-indigo-500/70",
            )}
            disabled={isSearching}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 rounded-lg h-8 w-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!query.trim() || isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
