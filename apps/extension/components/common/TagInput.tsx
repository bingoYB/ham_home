/**
 * TagInput 组件
 * 标签输入框，支持回车添加、点击删除
 */
import { useState, type KeyboardEvent, type ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { Badge, Input, cn } from '@hamhome/ui';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
  className?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = '输入标签后按回车',
  maxTags = 10,
  suggestions = [],
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // 删除最后一个标签
      removeTag(value.length - 1);
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return; // 避免重复
    if (value.length >= maxTags) return; // 超过最大数量

    onChange([...value, trimmed]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    const newTags = [...value];
    newTags.splice(index, 1);
    onChange(newTags);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // 过滤已选中的建议
  const filteredSuggestions = suggestions.filter(
    (s) =>
      !value.includes(s) &&
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      inputValue.length > 0
  );

  return (
    <div className={cn('space-y-2', className)}>
      {/* 已添加的标签 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag, index) => (
            <Badge
              key={tag}
              variant="secondary"
              className="pl-2 pr-1 py-0.5 flex items-center gap-1 cursor-default bg-gradient-to-r from-violet-500/90 to-indigo-500/90 dark:from-violet-600/80 dark:to-indigo-600/80 text-white border-0 shadow-sm"
            >
              <span className="text-xs font-medium">{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                aria-label={`删除标签 ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 输入框 */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length >= maxTags ? `最多 ${maxTags} 个标签` : placeholder}
          disabled={value.length >= maxTags}
          className="h-8 text-sm"
        />

        {/* 建议列表 */}
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

      {/* 提示文字 */}
      <p className="text-xs text-muted-foreground">
        {value.length}/{maxTags} 个标签
      </p>
    </div>
  );
}

