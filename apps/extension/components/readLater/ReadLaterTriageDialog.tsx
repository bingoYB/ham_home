/**
 * ReadLaterTriageDialog - go through the queue one card at a time with the keyboard:
 * R read, S keep in library, D mark read, X delete, J / K next / previous.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookmarkPlus, Check, ChevronLeft, ChevronRight, ExternalLink, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { ReadLaterItem } from "@/lib/read-later/read-later.utils";

interface ReadLaterTriageDialogProps {
  open: boolean;
  items: ReadLaterItem[];
  onOpenChange: (open: boolean) => void;
  onRead: (bookmarkId: string) => void;
  onKeep: (bookmarkId: string) => void;
  onMarkRead: (bookmarkId: string) => void;
  onRemove: (bookmarkId: string) => void;
}

export function ReadLaterTriageDialog({
  open,
  items,
  onOpenChange,
  onRead,
  onKeep,
  onMarkRead,
  onRemove,
}: ReadLaterTriageDialogProps) {
  const { t } = useTranslation("bookmark");
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(0, items.length - 1));
  const item = items[safeIndex];
  const addedAgo = useRelativeTime(item?.entry.addedAt);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const next = () => setIndex((value) => Math.min(value + 1, items.length - 1));
  const previous = () => setIndex((value) => Math.max(value - 1, 0));

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!item || event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.target as HTMLElement).closest("input, textarea")) return;
    const key = event.key.toLowerCase();
    const id = item.entry.bookmarkId;
    const actions: Record<string, () => void> = {
      r: () => {
        onRead(id);
        next();
      },
      // Kept items stay in the unread view, so move on to the next one
      s: () => {
        if (!item.entry.queueOnly) return;
        onKeep(id);
        next();
      },
      d: () => onMarkRead(id),
      x: () => onRemove(id),
      j: next,
      k: previous,
    };
    const action = actions[key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onKeyDown={handleKeyDown} data-testid="read-later-triage">
        <DialogHeader>
          <DialogTitle>{t("readLater.triage.title")}</DialogTitle>
          <DialogDescription>{t("readLater.triage.description")}</DialogDescription>
        </DialogHeader>

        {!item ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("readLater.triage.done")}</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {safeIndex + 1} / {items.length} · {item.domain} · {t("readLater.addedAt", { time: addedAgo })}
              </p>
              <h3 className="mt-2 text-base font-semibold leading-snug">{item.bookmark.title}</h3>
              {item.bookmark.description && (
                <p className="mt-2 line-clamp-5 text-sm text-muted-foreground">{item.bookmark.description}</p>
              )}
              {item.entry.note && <p className="mt-2 text-sm">“{item.entry.note}”</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <TriageButton label={t("readLater.triage.read")} hint="R" onClick={() => { onRead(item.entry.bookmarkId); next(); }} icon={<ExternalLink className="h-4 w-4" />} />
              <TriageButton label={t("readLater.triage.keep")} hint="S" onClick={() => { onKeep(item.entry.bookmarkId); next(); }} icon={<BookmarkPlus className="h-4 w-4" />} disabled={!item.entry.queueOnly} />
              <TriageButton label={t("readLater.triage.markRead")} hint="D" onClick={() => onMarkRead(item.entry.bookmarkId)} icon={<Check className="h-4 w-4" />} />
              <TriageButton label={t("readLater.triage.remove")} hint="X" onClick={() => onRemove(item.entry.bookmarkId)} icon={<Trash2 className="h-4 w-4" />} />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Button variant="ghost" size="sm" onClick={previous} disabled={safeIndex === 0}>
                <ChevronLeft className="h-4 w-4" /> K
              </Button>
              <span>{t("readLater.triage.keys")}</span>
              <Button variant="ghost" size="sm" onClick={next} disabled={safeIndex >= items.length - 1}>
                J <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TriageButtonProps {
  label: string;
  hint: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

function TriageButton({ label, hint, icon, onClick, disabled }: TriageButtonProps) {
  return (
    <Button variant="outline" className="h-auto flex-col gap-1 py-2.5" onClick={onClick} disabled={disabled}>
      {icon}
      <span className="text-xs">{label}</span>
      <kbd className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{hint}</kbd>
    </Button>
  );
}

export default ReadLaterTriageDialog;
