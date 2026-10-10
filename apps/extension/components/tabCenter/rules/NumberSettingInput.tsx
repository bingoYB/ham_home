/**
 * NumberSettingInput - number field that keeps a draft while typing and commits a
 * clamped value on blur or Enter (typing "15" must not stop at "1").
 */
import { useEffect, useState } from "react";
import { Input } from "@hamhome/ui";
import { resolveNumberDraft } from "@/utils/number-input.utils";

interface NumberSettingInputProps {
  id?: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

export function NumberSettingInput({ id, value, min, max, onCommit }: NumberSettingInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const next = resolveNumberDraft(draft, value, min, max);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
      className="h-9 w-[90px]"
    />
  );
}

export default NumberSettingInput;
