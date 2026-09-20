import { useState } from "react";
import type { BookmarkSubjectContent } from "./types";

/** 主体内容高度自适应内容本身，但限制在可读区间内 */
export const BOOKMARK_SUBJECT_MIN_HEIGHT = 180;
export const BOOKMARK_SUBJECT_MAX_HEIGHT = 800;
/** 文字主体的行高（对应 leading-6）与上下内边距（对应 py-3） */
const SUBJECT_TEXT_LINE_HEIGHT = 24;
const SUBJECT_TEXT_PADDING_Y = 12;
/** 连同内边距一起放进最大高度的行数，超出的行由省略号收尾 */
const SUBJECT_TEXT_MAX_LINES = Math.floor(
  (BOOKMARK_SUBJECT_MAX_HEIGHT - SUBJECT_TEXT_PADDING_Y * 2) /
    SUBJECT_TEXT_LINE_HEIGHT,
);

interface BookmarkSubjectProps {
  subject: BookmarkSubjectContent;
  /** 图片主体的替代文本 */
  alt?: string;
  /**
   * 主体区是卡片的最后一块内容，底部需要跟随卡片圆角。
   * 否则底边线会在圆角处断开，看起来像卡片缺了圆角。
   */
  roundedBottom?: boolean;
  onOpen?: () => void;
}

/**
 * 书签主体内容展示区（图片剪藏 / 选中文字剪藏）。
 * 图片超出最大高度的部分直接裁掉，文字超出的部分用省略号截断。
 */
export function BookmarkSubject({
  subject,
  alt,
  roundedBottom = false,
  onOpen,
}: BookmarkSubjectProps) {
  // 图片可能失效（防盗链、已删除），失效时退化成占位说明而不是破图
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={
        onOpen &&
        ((event) => {
          event.stopPropagation();
          onOpen();
        })
      }
      onKeyDown={
        onOpen &&
        ((event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onOpen();
        })
      }
      style={{
        minHeight: BOOKMARK_SUBJECT_MIN_HEIGHT,
        maxHeight: BOOKMARK_SUBJECT_MAX_HEIGHT,
      }}
      className={`flex items-start justify-center overflow-hidden border-t border-border/50 bg-muted/30 ${
        // 圆角半径比卡片(rounded-2xl)小一个边框宽度，与卡片内边缘贴合
        roundedBottom ? "rounded-b-[15px]" : "border-b border-border/50"
      } ${onOpen ? "cursor-zoom-in" : ""}`}
    >
      {subject.type === "image" ? (
        imageFailed ? (
          <span className="m-auto px-4 text-center text-xs break-all text-muted-foreground">
            {subject.imageSrc}
          </span>
        ) : (
          <img
            src={subject.imageSrc}
            alt={alt ?? ""}
            loading="lazy"
            // 图片铺满卡片宽度并保持原始比例，过高的部分由容器的
            // max-height + overflow-hidden 裁掉。
            // 不要在这里限制高度：img 同时受 width:100% 和 max-height 约束时
            // 会被压扁变形，object-cover 在高度不确定的情况下不生效。
            className="w-full"
            onError={() => setImageFailed(true)}
          />
        )
      ) : (
        <p
          className="w-full px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-foreground/90"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: SUBJECT_TEXT_MAX_LINES,
            overflow: "hidden",
          }}
        >
          {subject.text}
        </p>
      )}
    </div>
  );
}
