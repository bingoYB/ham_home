/**
 * AIChatSuggestions - AI 后续建议
 */
import {
  Copy,
  Tag,
  FolderOpen,
  ChevronRight,
  Clock,
  Globe,
  Folder,
  Search,
  Keyboard,
  Copy as Duplicate,
} from 'lucide-react';
import { Button, cn } from '@hamhome/ui';
import type { Suggestion, SuggestionActionType } from '@/types';

export interface AIChatSuggestionsProps {
  /** 建议列表 */
  suggestions: Suggestion[];
  /** 点击建议回调 */
  onSuggestionClick?: (suggestion: Suggestion) => void;
}

/**
 * 获取建议操作的图标
 */
function getSuggestionIcon(action: SuggestionActionType) {
  switch (action) {
    case 'copyAllLinks':
      return Copy;
    case 'batchAddTags':
      return Tag;
    case 'batchMoveCategory':
      return FolderOpen;
    case 'showMore':
      return ChevronRight;
    case 'timeFilter':
      return Clock;
    case 'domainFilter':
      return Globe;
    case 'categoryFilter':
      return Folder;
    case 'semanticOnly':
    case 'keywordOnly':
      return Search;
    case 'findDuplicates':
      return Duplicate;
    case 'text':
    default:
      return Keyboard;
  }
}

/**
 * 判断是否为可直接执行的操作
 */
function isDirectAction(action: SuggestionActionType): boolean {
  return ['copyAllLinks', 'batchAddTags', 'batchMoveCategory', 'showMore', 'findDuplicates'].includes(action);
}

export function AIChatSuggestions({
  suggestions,
  onSuggestionClick,
}: AIChatSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => {
          const Icon = getSuggestionIcon(suggestion.action);
          const isDirect = isDirectAction(suggestion.action);
          
          return (
            <Button
              key={idx}
              variant={isDirect ? 'secondary' : 'outline'}
              size="sm"
              className={cn(
                'h-7 text-xs gap-1.5',
                isDirect && 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
              )}
              onClick={() => onSuggestionClick?.(suggestion)}
            >
              {isDirect && <Icon className="h-3 w-3" />}
              {suggestion.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
