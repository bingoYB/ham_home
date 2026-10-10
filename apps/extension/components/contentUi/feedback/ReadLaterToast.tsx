/**
 * ReadLaterToast - "Added to read later · Undo · Add a note" after read later & close.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { Button, Input } from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { TabFeedbackStatus } from "@/hooks/useTabFeedback";

interface ReadLaterToastProps {
  title: string;
  alreadyQueued: boolean;
  addedAt: number;
  canUndo: boolean;
  noteEditable: boolean;
  status: TabFeedbackStatus;
  onUndo: () => void;
  onRenew: () => void;
  onSaveNote: (note: string) => void;
  onHoldChange: (held: boolean) => void;
}

export function ReadLaterToast({
  title,
  alreadyQueued,
  addedAt,
  canUndo,
  noteEditable,
  status,
  onUndo,
  onRenew,
  onSaveNote,
  onHoldChange,
}: ReadLaterToastProps) {
  const { t } = useTranslation("bookmark");
  const addedAgo = useRelativeTime(addedAt);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState("");
  const working = status === "working";

  const headline =
    status === "undone"
      ? t("tabFeedback.undone")
      : status === "failed"
        ? t("tabFeedback.failed")
        : alreadyQueued
          ? t("tabFeedback.readLater.alreadyQueued", { time: addedAgo })
          : t("tabFeedback.readLater.added");

  const startNote = () => {
    setEditingNote(true);
    onHoldChange(true);
  };

  const submitNote = () => {
    onSaveNote(note);
    setEditingNote(false);
    onHoldChange(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{headline}</p>
          <p className="truncate text-xs text-muted-foreground" title={title}>
            {title}
          </p>
        </div>
      </div>

      {editingNote ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            submitNote();
          }}
        >
          <Input
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("tabFeedback.readLater.notePlaceholder")}
            className="h-8 text-xs"
            autoFocus
          />
          <Button type="submit" size="sm" className="h-8 px-2.5 text-xs" disabled={working}>
            {t("tabFeedback.readLater.saveNote")}
          </Button>
        </form>
      ) : (
        status !== "undone" && (
          <div className="flex flex-wrap items-center gap-1">
            {canUndo && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={working}
                onClick={onUndo}
              >
                {working && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {t("tabFeedback.undo")}
              </Button>
            )}
            {alreadyQueued && status !== "done" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={working}
                onClick={onRenew}
              >
                {t("tabFeedback.readLater.renew")}
              </Button>
            )}
            {noteEditable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={working}
                onClick={startNote}
              >
                {t("tabFeedback.readLater.note")}
              </Button>
            )}
            {status === "done" && (
              <span className="text-xs text-muted-foreground">{t("tabFeedback.saved")}</span>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default ReadLaterToast;
