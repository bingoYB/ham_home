/**
 * 剪藏主体弹窗
 * 图片 / 选中文字剪藏点击后展示完整内容，标题、来源、标签等作为附属信息。
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Copy,
  ExternalLink,
  Highlighter,
  Image as ImageIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from "@hamhome/ui";
import type { BookmarkClipSubject } from "@/lib/storage/bookmark-clip-storage";
import type { LocalBookmark } from "@/types";
import { ImageClipMetadata } from "./ImageClipMetadata";

interface BookmarkSubjectDialogProps {
  bookmark: LocalBookmark | null;
  subject: BookmarkClipSubject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookmarkSubjectDialog({
  bookmark,
  subject,
  open,
  onOpenChange,
}: BookmarkSubjectDialogProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const [imageFailed, setImageFailed] = useState(false);
  // 切换到另一条剪藏时重新尝试加载图片
  useEffect(() => setImageFailed(false), [subject?.clipId]);

  if (!bookmark || !subject) return null;

  const isImage = subject.type === "image";
  const Icon = isImage ? ImageIcon : Highlighter;

  const copyText = async () => {
    if (!subject.text) return;
    await navigator.clipboard.writeText(subject.text);
    toast.success(t("bookmark:subject.copied"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium">
            <Icon className="h-4 w-4 text-primary" />
            {t(
              isImage ? "bookmark:subject.imageTitle" : "bookmark:subject.textTitle",
            )}
          </DialogTitle>
          <DialogDescription className="truncate">
            {bookmark.title}
          </DialogDescription>
        </DialogHeader>

        {/* 主体内容占据弹窗主要空间 */}
        <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-6">
          {isImage ? (
            imageFailed ? (
              <p className="break-all text-center text-sm text-muted-foreground">
                {subject.imageSrc}
              </p>
            ) : (
              <div className="mx-auto flex max-w-full flex-col items-center gap-4">
                <img
                  src={subject.imageSrc}
                  alt={bookmark.title}
                  className="max-h-[56vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
                  onError={() => setImageFailed(true)}
                />
                <ImageClipMetadata metadata={subject.imageMetadata} />
              </div>
            )
          ) : (
            <p className="mx-auto max-w-3xl text-sm leading-7 whitespace-pre-wrap text-foreground">
              {subject.text}
            </p>
          )}
        </div>

        {/* 附属信息 */}
        <div className="space-y-3 border-t px-6 py-4">
          {subject.note && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("bookmark:subject.note")}
              </span>
              {": "}
              {subject.note}
            </p>
          )}

          {!isImage && bookmark.description && (
            <p className="text-sm text-muted-foreground">
              {bookmark.description}
            </p>
          )}

          {bookmark.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bookmark.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{t("bookmark:subject.source")}</span>
            <a
              href={subject.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              title={subject.sourceUrl}
              className="min-w-0 max-w-full flex-1 truncate underline-offset-2 hover:text-foreground hover:underline"
            >
              {subject.sourceTitle || subject.sourceUrl}
            </a>
            <span className="shrink-0">
              {new Date(subject.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {!isImage && (
              <Button variant="outline" size="sm" onClick={() => void copyText()}>
                <Copy className="mr-1.5 h-4 w-4" />
                {t("bookmark:subject.copyText")}
              </Button>
            )}
            {isImage && subject.imageSrc && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(subject.imageSrc, "_blank")}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                {t("bookmark:subject.openImage")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(subject.sourceUrl, "_blank")}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              {t("bookmark:subject.openSource")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
