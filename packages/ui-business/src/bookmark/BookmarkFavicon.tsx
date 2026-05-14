import { Link2 } from "lucide-react";

interface BookmarkFaviconProps {
  src?: string | null;
  size?: "sm" | "md";
}

export function BookmarkFavicon({ src, size = "md" }: BookmarkFaviconProps) {
  const imageClassName = size === "sm" ? "w-5 h-5 rounded" : "w-6 h-6 rounded";

  return (
    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
      {src ? (
        <img
          src={src}
          alt=""
          className={imageClassName}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Link2 className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}
