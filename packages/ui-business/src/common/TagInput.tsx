import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge, Input, cn } from "@hamhome/ui";

export interface TagInputLabels {
  maxTags: (count: number) => string;
  tagCount: (count: number, max: number) => string;
  removeTag: (tag: string) => string;
}

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
  className?: string;
  labels?: Partial<TagInputLabels>;
}

const defaultLabels: TagInputLabels = {
  maxTags: (count) => `最多 ${count} 个标签`,
  tagCount: (count, max) => `${count}/${max} 个标签`,
  removeTag: (tag) => `删除标签 ${tag}`,
};

export function TagInput({
  value,
  onChange,
  placeholder = "输入标签后按回车",
  maxTags = 10,
  suggestions = [],
  className,
  labels,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const resolvedLabels = { ...defaultLabels, ...labels };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeTag = (index: number) => {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag(inputValue);
      return;
    }

    if (event.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      !value.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      inputValue.length > 0,
  );

  return (
    <div className={cn("space-y-2", className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag, index) => (
            <Badge
              key={tag}
              variant="secondary"
              className="pl-2 pr-1 py-0.5 flex items-center gap-1 cursor-default bg-linear-to-r from-violet-500/90 to-indigo-500/90 dark:from-violet-600/80 dark:to-indigo-600/80 text-white border-0 shadow-sm"
            >
              <span className="text-xs font-medium">{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                aria-label={resolvedLabels.removeTag(tag)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            value.length >= maxTags ? resolvedLabels.maxTags(maxTags) : placeholder
          }
          disabled={value.length >= maxTags}
          className="text-sm"
        />

        {filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-32 overflow-auto">
            {filteredSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {resolvedLabels.tagCount(value.length, maxTags)}
      </p>
    </div>
  );
}
