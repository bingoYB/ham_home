/**
 * WorkspacePageFavicon - 工作空间页面 favicon 展示
 */
import {
  FaviconIcon,
  type FaviconIconProps,
} from "@hamhome/ui-business/workspace";
import { getSafeFaviconUrl } from "@/utils/bookmark-utils";

export interface WorkspacePageFaviconProps
  extends Omit<FaviconIconProps, "favicon"> {
  favicon?: string;
  url?: string;
}

export function WorkspacePageFavicon({
  favicon,
  url,
  ...props
}: WorkspacePageFaviconProps) {
  const resolvedFavicon = url ? getSafeFaviconUrl(url, favicon) : favicon;

  return (
    <FaviconIcon
      {...props}
      favicon={resolvedFavicon ?? undefined}
    />
  );
}
