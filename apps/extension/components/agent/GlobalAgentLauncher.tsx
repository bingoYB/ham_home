import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { Button, ScrollArea, cn } from "@hamhome/ui";
import { useGlobalAgent } from "@/hooks/useGlobalAgent";
import { getBackgroundService } from "@/lib/services/background-service-client";
import { isContentScriptContext } from "@/utils/browser-api";
import type { AgentProcessStep, ChatMessage, Source, Suggestion } from "@/types";

function formatSessionTitle(title: string): string {
  return title.length > 24 ? `${title.slice(0, 24)}...` : title;
}

function StepIcon({ step }: { step: AgentProcessStep }) {
  if (step.status === "failed") {
    return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  }
  if (step.status === "running") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />;
  }
  if (step.type === "tool") {
    return <Wrench className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />;
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
}

function ProcessSteps({
  steps,
  title,
}: {
  steps?: AgentProcessStep[];
  title: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps?.length) {
    return null;
  }

  return (
    <div className="mb-2.5 rounded-xl border border-white/10 bg-background/50 p-2.5 shadow-inner">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 transition-colors hover:text-foreground"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-indigo-500" />
          {title}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-2.5 space-y-2 border-t border-border/40 pt-2.5">
          {steps.map((step) => (
            <div key={step.id} className="grid grid-cols-[18px_1fr] gap-2.5 text-xs">
              <div className="pt-0.5">
                <StepIcon step={step} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-foreground/90">
                    {step.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-foreground/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                    {step.status}
                  </span>
                </div>
                {step.content && (
                  <p className="mt-1 truncate text-[11px] text-muted-foreground/90">
                    {step.content}
                  </p>
                )}
                {typeof step.output === "string" && (
                  <pre className="mt-1.5 max-h-24 overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-border/40 bg-muted/30 p-2 text-[10px] leading-relaxed text-muted-foreground">
                    {step.output}
                  </pre>
                )}
                {step.error && (
                  <p className="mt-1.5 text-[11px] text-destructive">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Sources({
  sources,
  title,
}: {
  sources?: Source[];
  title: string;
}) {
  if (!sources?.length) {
    return null;
  }

  return (
    <div className="mt-3.5 space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {sources.slice(0, 5).map((source) => (
          <button
            key={source.bookmarkId}
            type="button"
            onClick={() => window.open(source.url, "_blank")}
            className="group block w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-left text-xs transition-all hover:border-indigo-500/30 hover:bg-indigo-50/50 hover:shadow-sm dark:hover:bg-indigo-500/10"
          >
            <span className="line-clamp-1 font-medium text-foreground/90 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {source.index}. {source.title}
            </span>
            <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/70">
              {source.url}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  processTitle,
  sourcesTitle,
}: {
  message: ChatMessage;
  processTitle: string;
  sourcesTitle: string;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all",
          isUser
            ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/20"
            : "rounded-2xl rounded-tl-sm border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/80 to-blue-50/80 dark:from-indigo-950/40 dark:to-blue-950/40 text-foreground shadow-sm backdrop-blur-md",
        )}
      >
        {!isUser && <ProcessSteps steps={message.steps} title={processTitle} />}
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-all prose-p:leading-relaxed prose-pre:p-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && <Sources sources={message.sources} title={sourcesTitle} />}
      </div>
    </div>
  );
}

function SuggestionChips({
  suggestions,
  onClick,
}: {
  suggestions: Suggestion[];
  onClick: (suggestion: Suggestion) => void;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {suggestions.slice(0, 4).map((suggestion) => (
        <button
          key={`${suggestion.action}-${suggestion.label}`}
          type="button"
          onClick={() => onClick(suggestion)}
          className="rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground/80 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-indigo-500/30 hover:text-indigo-600 hover:shadow dark:hover:text-indigo-400"
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 插件 app 页面右下角全局 Agent 入口，负责展示会话、过程步骤与输入框。
 */
export function GlobalAgentLauncher({ inline = false }: { inline?: boolean }) {
  const { t } = useTranslation("ai");
  const agent = useGlobalAgent();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isBusy = ["thinking", "searching", "writing"].includes(agent.status);
  const activeSessionTitle = useMemo(
    () =>
      agent.sessions.find((session) => session.id === agent.currentSessionId)
        ?.title || t("agent.newSession"),
    [agent.currentSessionId, agent.sessions, t],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [agent.messages, agent.currentAnswer, agent.currentSteps, agent.isOpen]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await agent.submit();
  };

  if (!agent.isOpen) {
    const containerClass = inline 
      ? "w-full" 
      : "fixed bottom-6 right-6 z-50 animate-in fade-in zoom-in-95 duration-300";
    
    const formClass = cn(
      "group flex items-center rounded-full border border-indigo-500/20 bg-background/80 shadow-xl shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30 hover:shadow-2xl focus-within:border-indigo-500/50 focus-within:bg-background/95 focus-within:shadow-indigo-500/20",
      inline ? "h-12 w-full pl-4 pr-1" : "h-14 pl-5 pr-1.5"
    );

    const inputClass = cn(
      "bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition-all duration-300",
      inline ? "flex-1 w-full mr-2" : "w-56 focus:w-80"
    );

    return (
      <div className={containerClass}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const currentQuery = agent.query.trim();
            if (currentQuery) {
              void (async () => {
                const newSessionId = await agent.createSession();
                await agent.submit(currentQuery, newSessionId);
              })();
            } else {
              agent.open();
            }
          }}
          className={formClass}
        >
          <input
            type="text"
            value={agent.query}
            onChange={(e) => agent.setQuery(e.target.value)}
            placeholder={t("agent.placeholder") || "Ask AI anything..."}
            className={inputClass}
          />
          <button
            type="submit"
            onClick={(e) => {
              if (!agent.query.trim()) {
                e.preventDefault();
                agent.open();
              }
            }}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95",
              inline ? "h-10 w-10" : "h-11 w-11"
            )}
            aria-label={t("agent.open")}
          >
            <Sparkles className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-[420px] max-w-[calc(100%-2rem)]">
      <div className="flex h-[min(660px,calc(100vh-2rem))] flex-col overflow-hidden rounded-2xl border border-white/20 bg-background/80 shadow-[0_0_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-8 zoom-in-95 duration-300 ease-out dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] dark:ring-white/10">
        <header className="border-b border-white/10 bg-transparent px-4 py-3 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-sm font-bold text-transparent">
                {t("agent.title")}
              </div>
              <div className="truncate text-xs font-medium text-muted-foreground/70">
                {activeSessionTitle}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-foreground/5"
              onClick={agent.createSession}
              title={t("agent.newSession")}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-foreground/5 hover:text-destructive"
              onClick={() => {
                if (agent.currentSessionId) {
                  void agent.deleteSession(agent.currentSessionId);
                }
              }}
              disabled={!agent.currentSessionId || agent.sessions.length <= 1}
              title={t("agent.deleteSession")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-foreground/5"
              onClick={agent.close}
              title={t("agent.close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative mt-3">
            <select
              value={agent.currentSessionId || ""}
              onChange={(event) => void agent.switchSession(event.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-transparent bg-foreground/5 px-3 pr-8 text-xs font-medium text-foreground outline-none transition-colors hover:bg-foreground/10 focus:border-indigo-500/30 focus:bg-background focus:ring-2 focus:ring-indigo-500/20"
              aria-label={t("agent.sessionSelect")}
            >
              {agent.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatSessionTitle(session.title)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2 h-4 w-4 text-muted-foreground/70" />
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-5">
            {agent.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center space-y-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="max-w-[200px] text-sm leading-relaxed text-muted-foreground">
                  {t("agent.empty")}
                </p>
              </div>
            )}
            {agent.messages.map((message, index) => (
              <MessageBubble
                key={`${message.timestamp}-${index}`}
                message={message}
                processTitle={t("agent.process")}
                sourcesTitle={t("agent.sources")}
              />
            ))}
            {agent.currentAnswer && (
              <MessageBubble
                message={{
                  role: "assistant",
                  content: agent.currentAnswer,
                  timestamp: Date.now(),
                  sources: agent.sources,
                  steps: agent.currentSteps,
                }}
                processTitle={t("agent.process")}
                sourcesTitle={t("agent.sources")}
              />
            )}
            {isBusy && !agent.currentAnswer && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border/40 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <span>{t(`agent.status.${agent.status}`)}</span>
                </div>
              </div>
            )}
            {agent.error && (
              <div className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-sm">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Error
                </div>
                <div className="mt-1 opacity-90">{agent.error}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <SuggestionChips
          suggestions={agent.suggestions}
          onClick={async (suggestion) => {
            if (suggestion.action === "navigate") {
              const view = typeof suggestion.payload?.view === "string" ? suggestion.payload.view : "settings";
              console.log("[GlobalAgent] navigating to:", view, "isContentScript:", isContentScriptContext());
              
              if (!isContentScriptContext()) {
                try {
                  window.location.hash = view;
                  window.dispatchEvent(new HashChangeEvent("hashchange"));
                  console.log("[GlobalAgent] Hash updated manually to:", view);
                } catch (e) {
                  console.error("[GlobalAgent] Hash update error:", e);
                }
              } else {
                try {
                  await getBackgroundService().openOptionsPage(view);
                  console.log("[GlobalAgent] openOptionsPage called via bg to:", view);
                } catch (e) {
                  console.error("[GlobalAgent] openOptionsPage failed:", e);
                }
              }
              agent.close();
            } else if (suggestion.action === "copyAllLinks") {
              // Copy to clipboard from sources
              const links = agent.sources.map(s => s.url).filter(Boolean).join("\n");
              if (links) {
                void navigator.clipboard.writeText(links);
                // Optional: We can add a toast here, but currently no toast imported. We just close for now.
                agent.close();
              }
            } else {
              void agent.sendSuggestion(suggestion);
            }
          }}
        />

        <form onSubmit={handleSubmit} className="border-t border-white/10 bg-background/50 p-3 backdrop-blur-md dark:border-white/5">
          <div className="flex items-end gap-2">
            <textarea
              value={agent.query}
              onChange={(event) => agent.setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void agent.submit();
                }
              }}
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-transparent bg-muted/50 px-4 py-3 text-sm leading-relaxed outline-none transition-all placeholder:text-muted-foreground/60 focus:border-indigo-500/30 focus:bg-background focus:ring-2 focus:ring-indigo-500/20"
              placeholder={t("agent.placeholder")}
              disabled={isBusy}
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              disabled={isBusy || !agent.query.trim()}
              title={t("agent.send")}
            >
              {isBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
