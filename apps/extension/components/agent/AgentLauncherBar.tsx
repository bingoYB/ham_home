import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@hamhome/ui";
import { AgentAvatar } from "@/components/agent/AgentAvatar";

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

  return (
    <form
      className={cn(
        "flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2 shadow-sm focus-within:border-ring",
        inline
          ? "w-full"
          : "fixed bottom-4 right-4 z-50 w-64 max-w-[calc(100vw-2rem)] shadow-lg focus-within:w-80 motion-safe:transition-[width] sm:bottom-6 sm:right-6",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmedQuery && !busy) onSubmit(trimmedQuery);
        else onOpen();
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        title={t("agent.open")}
        aria-label={t("agent.open")}
        className="group/avatar shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <AgentAvatar busy={busy} />
      </button>
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t("agent.launcherPlaceholder")}
        aria-label={t("agent.launcherPlaceholder")}
        disabled={busy}
        className="h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      {trimmedQuery && !busy && (
        <button
          type="submit"
          title={t("agent.send")}
          aria-label={t("agent.send")}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowUp className="size-4" />
        </button>
      )}
    </form>
  );
}
