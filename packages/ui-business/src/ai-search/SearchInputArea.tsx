import { useCallback, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { Input, cn } from "@hamhome/ui";

export interface SearchInputAreaProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  compact?: boolean;
  className?: string;
  placeholder: string;
}

export function SearchInputArea({
  value,
  onChange,
  onSubmit,
  compact = false,
  className,
  placeholder,
}: SearchInputAreaProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSubmit?.();
      }
    },
    [onSubmit],
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex items-center">
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
        />
        <Input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            compact ? "h-9 pl-9 pr-8" : "h-10 pl-10 pr-10",
            "bg-muted/50 border-border/50",
            "focus:bg-background",
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </button>
        )}
      </div>
    </div>
  );
}
