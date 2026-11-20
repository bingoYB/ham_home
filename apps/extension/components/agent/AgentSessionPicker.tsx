import { Check, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  Popover, PopoverContent, PopoverTrigger,
} from "@hamhome/ui";
import type { ChatSearchSessionSummary } from "@/types";
import { DEFAULT_SESSION_TITLE } from "@/utils/global-agent-session.utils";
import { formatArchiveTime } from "@/utils/tab-time-format";

interface AgentSessionPickerProps {
  sessions: ChatSearchSessionSummary[];
  currentId: string | null;
  onSelect: (id: string) => void;
  portalContainer?: HTMLElement;
}

export function AgentSessionPicker({ sessions, currentId, onSelect, portalContainer }: AgentSessionPickerProps) {
  const { t, i18n } = useTranslation(["ai", "common"]);
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const displayTitle = (title?: string) =>
    title && title !== DEFAULT_SESSION_TITLE ? title : t("ai:agent.newSession");
  const title = displayTitle(sessions.find((session) => session.id === currentId)?.title);
  const switchLabel = t("ai:agent.sessionSelect");

  if (sessions.length < 2) {
    return <p className="truncate text-xs text-muted-foreground" title={title}>{title}</p>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={switchLabel}
          title={title}
          className="-ml-1 h-6 max-w-full justify-start gap-1 px-1 text-xs text-muted-foreground has-[>svg]:px-1 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        >
          <span className="truncate">{title}</span>
          <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        align="start"
        collisionPadding={8}
        aria-label={switchLabel}
        className="pointer-events-auto w-64 max-w-[calc(100vw-1rem)] p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <Command
          label={t("ai:agent.searchSessions")}
          defaultValue={currentId ?? undefined}
          filter={(_id, search, keywords) =>
            keywords?.some((name) => name.toLowerCase().includes(search.trim().toLowerCase())) ? 1 : 0
          }
        >
          <CommandInput ref={searchRef} placeholder={t("ai:agent.searchSessions")} />
          <CommandList label={switchLabel} className="max-h-[min(16rem,calc(var(--radix-popover-content-available-height)-2.5rem))]">
            <CommandEmpty>{t("common:common.noResults")}</CommandEmpty>
            <CommandGroup>
              {sessions.map((session) => {
                const name = displayTitle(session.title);
                const isCurrent = session.id === currentId;
                return (
                  <CommandItem
                    key={session.id}
                    className="group"
                    value={session.id}
                    keywords={[name]}
                    aria-current={isCurrent || undefined}
                    onSelect={() => {
                      setOpen(false);
                      if (!isCurrent) onSelect(session.id);
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 break-words">{name}</span>
                      {session.updatedAt > 0 && (
                        <span className="text-xs text-muted-foreground group-data-[selected=true]:text-accent-foreground/80">
                          {formatArchiveTime(session.updatedAt, i18n.language)}
                        </span>
                      )}
                    </span>
                    {isCurrent && <Check className="size-4" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
