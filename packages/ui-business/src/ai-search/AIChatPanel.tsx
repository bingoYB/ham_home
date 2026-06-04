import { useCallback, useEffect, useRef } from "react";
import { Bot, Plus, Trash2, X } from "lucide-react";
import { Button, ScrollArea, cn } from "@hamhome/ui";
import { AIChatMessage } from "./AIChatMessage";
import { AIChatSearchBar } from "./AIChatSearchBar";
import { AIChatSources } from "./AIChatSources";
import { AIChatStatusIndicator } from "./AIChatStatusIndicator";
import { AIChatSuggestions } from "./AIChatSuggestions";
import type { AIChatLabels, AIChatSession, AISearchStatus, ChatMessage, Source, Suggestion } from "./types";

export interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (val: string) => void;
  onSubmit: () => void;
  messages: ChatMessage[];
  currentAnswer: string;
  status: AISearchStatus;
  error?: string | null;
  sources: Source[];
  onSourceClick: (bookmarkId: string) => void;
  suggestions?: Suggestion[];
  onSuggestionClick?: (suggestion: Suggestion) => void;
  onRetry?: () => void;
  sessions?: AIChatSession[];
  currentSessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  onCreateSession?: () => void;
  onDeleteSession?: (sessionId: string) => void;
  className?: string;
  labels: AIChatLabels;
}

export function AIChatPanel({
  isOpen,
  onClose,
  query,
  onQueryChange,
  onSubmit,
  messages,
  currentAnswer,
  status,
  error,
  sources,
  onSourceClick,
  suggestions = [],
  onSuggestionClick,
  onRetry,
  sessions = [],
  currentSessionId,
  onSessionChange,
  onCreateSession,
  onDeleteSession,
  className,
  labels,
}: AIChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSearching =
    status === "thinking" || status === "searching" || status === "writing";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentAnswer]);

  const handleSourceClick = useCallback(
    (source: Source) => onSourceClick(source.bookmarkId),
    [onSourceClick],
  );

  const renderCurrentAnswerContent = useCallback(
    (content: string) => {
      return content.split("\n").map((line, index) => {
        const parts = line.split(/(\[\d+\])/g);
        return (
          <p key={index} className="mb-2 last:mb-0">
            {parts.map((part, partIndex) => {
              const match = part.match(/^\[(\d+)\]$/);
              if (match) {
                const sourceIndex = Number.parseInt(match[1], 10);
                const source = sources.find((item) => item.index === sourceIndex);
                if (source) {
                  return (
                    <button
                      key={partIndex}
                      onClick={() => handleSourceClick(source)}
                      className="inline-flex items-center justify-center min-w-5 h-5 px-1 mx-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors cursor-pointer"
                      title={source.title}
                    >
                      {sourceIndex}
                    </button>
                  );
                }
              }
              return <span key={partIndex}>{part}</span>;
            })}
          </p>
        );
      });
    },
    [sources, handleSourceClick],
  );

  const showCurrentAnswer =
    status === "thinking" ||
    status === "searching" ||
    status === "writing" ||
    status === "error" ||
    (status === "done" && Boolean(currentAnswer));
  const showQuickActions = !query.trim() && messages.length === 0 && !isOpen;

  return (
    <div
      className={cn(
        "sticky bottom-2 z-2 max-w-[720px] m-auto w-full px-4 flex flex-col items-center rounded-t-xl",
        className,
      )}
    >
      {isOpen && (
        <div className="w-full flex flex-col mb-2 max-h-[50vh] bg-background border border-border rounded-xl shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium">{labels.aiAnswer}</span>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              {sessions.length > 0 && currentSessionId && (
                <select
                  aria-label={labels.sessionSelect}
                  title={labels.sessionSelect}
                  value={currentSessionId}
                  onChange={(event) => onSessionChange?.(event.target.value)}
                  className="h-7 max-w-36 rounded-md border border-border bg-background px-2 text-xs outline-none"
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                </select>
              )}
              {onCreateSession && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onCreateSession}
                  title={labels.newSession}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {currentSessionId && onDeleteSession && sessions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDeleteSession(currentSessionId)}
                  title={labels.deleteSession}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
                title={labels.close}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div ref={scrollRef} className="p-4 space-y-4">
              {messages.map((message, index) => (
                <AIChatMessage
                  key={index}
                  message={message}
                  sources={sources}
                  onSourceClick={handleSourceClick}
                />
              ))}

              {showCurrentAnswer && (
                <div className="flex gap-2">
                  <div className="shrink-0 rounded-full flex items-center justify-center h-7 w-7 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-lg px-3 py-2 max-w-[80%]">
                      {status === "error" ? (
                        <AIChatStatusIndicator
                          status={status}
                          error={error}
                          onRetry={onRetry}
                          labels={labels}
                        />
                      ) : currentAnswer ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {renderCurrentAnswerContent(currentAnswer)}
                        </div>
                      ) : (
                        <AIChatStatusIndicator
                          status={status}
                          error={error}
                          onRetry={onRetry}
                          labels={labels}
                        />
                      )}
                    </div>
                    {status === "done" && currentAnswer && (
                      <AIChatSources
                        sources={sources}
                        onSourceClick={handleSourceClick}
                        labels={labels}
                      />
                    )}
                  </div>
                </div>
              )}

              {status === "done" && !currentAnswer && messages.length > 0 && (
                <>
                  <AIChatSources
                    sources={sources}
                    onSourceClick={handleSourceClick}
                    labels={labels}
                  />
                  <AIChatSuggestions
                    suggestions={suggestions}
                    onSuggestionClick={onSuggestionClick}
                  />
                </>
              )}

              {status === "done" && currentAnswer && (
                <AIChatSuggestions
                  suggestions={suggestions}
                  onSuggestionClick={onSuggestionClick}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <AIChatSearchBar
        query={query}
        isSearching={isSearching}
        onQueryChange={onQueryChange}
        onSubmit={onSubmit}
        showQuickActions={showQuickActions}
        labels={labels}
      />
    </div>
  );
}
