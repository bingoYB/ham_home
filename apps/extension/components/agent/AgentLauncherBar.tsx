import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@hamhome/ui";

interface AgentLauncherBarProps {
  inline: boolean;
  query: string;
  busy: boolean;
  onQueryChange: (query: string) => void;
  onOpen: () => void;
  onSubmit: (query: string) => void;
}

export function AgentLauncherBar({ inline, query, busy, onQueryChange, onOpen, onSubmit }: AgentLauncherBarProps) {
  const { t } = useTranslation("ai");
  const trimmedQuery = query.trim();
  const canSubmit = Boolean(trimmedQuery) && !busy;
  const actionLabel = t(canSubmit ? "agent.send" : "agent.open");

  return (
    <form
      className={cn(
        "group flex items-center rounded-full border border-indigo-500/20 bg-background/80 shadow-xl shadow-black/5 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 ease-out-strong hover:border-indigo-500/30 hover:shadow-2xl focus-within:border-indigo-500/50 focus-within:bg-background/95 focus-within:shadow-indigo-500/20",
        inline
          ? "h-12 w-full pl-4 pr-1"
          : "fixed bottom-6 right-6 z-50 h-14 max-w-[calc(100vw-3rem)] pl-5 pr-1.5 origin-bottom-right animate-in fade-in-0 zoom-in-95 duration-200",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(trimmedQuery);
        else onOpen();
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t("agent.placeholder")}
        aria-label={t("agent.placeholder")}
        disabled={busy}
        className={cn(
          "min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition-[width] duration-300 ease-out-strong",
          inline ? "mr-2 w-full flex-1" : "w-56 focus:w-80",
        )}
      />
      <button
        type="submit"
        title={actionLabel}
        aria-label={actionLabel}
        className={cn(
          "flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 transition-[scale,box-shadow] duration-200 ease-out-strong hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95",
          inline ? "size-10" : "size-11",
        )}
      >
        <Sparkles className="size-5 transition-transform duration-300 ease-spring group-hover:rotate-12 group-hover:scale-110" />
      </button>
    </form>
  );
}
