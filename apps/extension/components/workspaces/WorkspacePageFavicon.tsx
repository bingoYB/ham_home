import { Globe } from "lucide-react";
import { cn } from "@hamhome/ui";

interface WorkspacePageFaviconProps {
  favicon?: string;
  className?: string;
}

export function WorkspacePageFavicon({
  favicon,
  className,
}: WorkspacePageFaviconProps) {
  const baseClassName = cn("h-5 w-5 shrink-0 rounded-none", className);

  if (favicon) {
    return <img src={favicon} alt="" className={cn(baseClassName, "object-contain")} />;
  }

  return (
    <span
      className={cn(
        baseClassName,
        "inline-flex items-center justify-center bg-muted text-muted-foreground",
      )}
    >
      <Globe className="h-3.5 w-3.5" />
    </span>
  );
}
