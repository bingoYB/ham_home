import { useEffect, useState } from 'react';

interface UseSyncStrategyInputOptions {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

/** Keep incomplete input local; only persist whole, in-range time values on blur / Enter. */
export function useSyncStrategyInput({ value, min, max, onCommit }: UseSyncStrategyInputOptions) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(String(value));
    setInvalid(false);
  }, [value]);

  const change = (next: string) => {
    setDraft(next);
    setInvalid(false);
  };

  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isInteger(parsed) || parsed < min || parsed > max) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(String(parsed));
    if (parsed !== value) onCommit(parsed);
  };

  return { draft, invalid, change, commit };
}
