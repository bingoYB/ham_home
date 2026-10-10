/**
 * ReadLaterCard - one item of the read later queue: title, domain, added time,
 * reading time, TL;DR, "why read" note, expiry hint, state and actions.
 */
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookmarkPlus,
  Check,
  Clock,
  ExternalLink,
  MessageSquareText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge, Button, Checkbox, Input, cn } from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import { getEntryDaysLeft, type ReadLaterItem } from "@/lib/read-later/read-later.utils";
import type { ReadLaterExpireAfterDays } from "@/types";

interface ReadLaterCardProps {
  item: ReadLaterItem;
  selected: boolean;
  expireAfterDays: ReadLaterExpireAfterDays;
  onToggleSelect: () => void;
  onOpen: () => void;
  onMarkRead: () => void;
  onKeep: () => void;
  onRequeue: () => void;
  onRemove: () => void;
  onSaveNote: (note: string) => void;
}

function ReadLaterCardComponent({
  item,
  selected,
  expireAfterDays,
  onToggleSelect,
  onOpen,
  onMarkRead,
  onKeep,
  onRequeue,
  onRemove,
  onSaveNote,
}: ReadLaterCardProps) {
  const { t } = useTranslation("bookmark");
  const { entry, bookmark, domain } = item;
  const addedAgo = useRelativeTime(entry.addedAt);
  const favicon = useSafeFavicon(bookmark.url, bookmark.favicon);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(entry.note ?? "");
  const pending = entry.status === "unread" || entry.status === "reading";
  const daysLeft = pending ? getEntryDaysLeft(entry, expireAfterDays, Date.now()) : undefined;

  const saveNote = () => {
    setEditingNote(false);
    if (note.trim() !== (entry.note ?? "")) onSaveNote(note);
  };

  return (
    <article
      data-testid="read-later-item"
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        selected && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox className="mt-1 shrink-0" checked={selected} onCheckedChange={onToggleSelect} />
        {favicon ? (
          <img src={favicon} alt="" className="mt-0.5 h-5 w-5 shrink-0 rounded" />
        ) : (
          <span className="mt-0.5 h-5 w-5 shrink-0 rounded bg-muted" />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline"
            title={bookmark.title}
          >
            {bookmark.title || bookmark.url}
          </button>
          <ReadLaterMeta
            domain={domain}
            addedAgo={addedAgo}
            minutes={entry.estimatedMinutes}
            daysLeft={daysLeft}
            source={entry.source}
            kept={!entry.queueOnly}
            status={entry.status}
            snapshotMissing={!!entry.snapshotMissing}
          />
          {bookmark.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {bookmark.description}
            </p>
          )}
          {editingNote ? (
            <Input
              autoFocus
              value={note}
              maxLength={200}
              onChange={(event) => setNote(event.target.value)}
              onBlur={saveNote}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveNote();
                if (event.key === "Escape") setEditingNote(false);
              }}
              placeholder={t("readLater.notePlaceholder")}
              className="h-8 text-xs"
            />
          ) : (
            entry.note && (
              <p className="flex items-start gap-1.5 text-xs text-foreground/80">
                <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <span className="line-clamp-2">{entry.note}</span>
              </p>
            )
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction label={t("readLater.actions.open")} onClick={onOpen} icon={<ExternalLink className="h-4 w-4" />} />
          {pending && (
            <IconAction label={t("readLater.actions.markRead")} onClick={onMarkRead} icon={<Check className="h-4 w-4" />} />
          )}
          {!pending && (
            <IconAction label={t("readLater.actions.requeue")} onClick={onRequeue} icon={<RotateCcw className="h-4 w-4" />} />
          )}
          {entry.queueOnly && (
            <IconAction label={t("readLater.actions.keep")} onClick={onKeep} icon={<BookmarkPlus className="h-4 w-4" />} />
          )}
          <IconAction
            label={t("readLater.actions.note")}
            onClick={() => setEditingNote(true)}
            icon={<MessageSquareText className="h-4 w-4" />}
          />
          <IconAction
            label={entry.queueOnly ? t("readLater.actions.delete") : t("readLater.actions.dequeue")}
            onClick={onRemove}
            icon={<Trash2 className="h-4 w-4" />}
            destructive
          />
        </div>
      </div>
    </article>
  );
}

interface ReadLaterMetaProps {
  domain: string;
  addedAgo: string;
  minutes?: number;
  daysLeft?: number;
  source: string;
  kept: boolean;
  status: string;
  snapshotMissing: boolean;
}

function ReadLaterMeta({
  domain,
  addedAgo,
  minutes,
  daysLeft,
  source,
  kept,
  status,
  snapshotMissing,
}: ReadLaterMetaProps) {
  const { t } = useTranslation("bookmark");
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
      <span className="truncate">{domain}</span>
      <span>{t("readLater.addedAt", { time: addedAgo })}</span>
      {minutes != null && (
        <span className="flex items-center gap-0.5">
          <Clock className="h-3 w-3" />
          {t("readLater.minutes", { count: minutes })}
        </span>
      )}
      {daysLeft != null && (
        <span className={cn(daysLeft <= 3 && "font-medium text-amber-600 dark:text-amber-400")}>
          {daysLeft === 0 ? t("readLater.expiresToday") : t("readLater.daysLeft", { count: daysLeft })}
        </span>
      )}
      {status === "reading" && <Badge variant="secondary" className="text-[10px]">{t("readLater.status.reading")}</Badge>}
      {source !== "manual" && (
        <Badge variant="outline" className="text-[10px] font-normal">
          {t(`readLater.sources.${source}`)}
        </Badge>
      )}
      {kept && (
        <Badge variant="outline" className="border-emerald-500/40 text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
          {t("readLater.inLibrary")}
        </Badge>
      )}
      {snapshotMissing && <span>{t("readLater.snapshotMissing")}</span>}
    </div>
  );
}

interface IconActionProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

function IconAction({ label, icon, onClick, destructive }: IconActionProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", destructive && "text-muted-foreground hover:text-destructive")}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </Button>
  );
}

export const ReadLaterCard = memo(ReadLaterCardComponent);
export default ReadLaterCard;
