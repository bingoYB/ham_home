/**
 * AIChatSuggestions - AI 后续建议
 */
import { Button } from '@hamhome/ui';

export interface AIChatSuggestionsProps {
  /** 建议列表 */
  suggestions: string[];
  /** 点击建议回调 */
  onSuggestionClick?: (suggestion: string) => void;
}

export function AIChatSuggestions({
  suggestions,
  onSuggestionClick,
}: AIChatSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSuggestionClick?.(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
