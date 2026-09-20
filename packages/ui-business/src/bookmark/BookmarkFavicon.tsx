import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";

interface BookmarkFaviconProps {
  src?: string | null;
  /** 书签主体图片（图片剪藏），存在时取代站点图标铺满整个方块 */
  imageSrc?: string | null;
  size?: "sm" | "md";
}

export function BookmarkFavicon({
  src,
  imageSrc,
  size = "md",
}: BookmarkFaviconProps) {
  const imageClassName = size === "sm" ? "w-5 h-5 rounded" : "w-6 h-6 rounded";
  // 图片可能失效（防盗链、已删除），回退到站点图标
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageSrc]);

  const showImage = !!imageSrc && !imageFailed;

  return (
    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
      {showImage ? (
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : src ? (
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
