import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  REVEAL_FALLBACK_MS,
  REVEAL_GATE_CLASS,
  REVEAL_GATE_SCRIPT,
  REVEAL_READY_CLASS,
} from '../reveal-gate';

// Runs the inline script against a minimal <html> stand-in, the way the browser does before any bundle loads.
function runGateScript(): Set<string> {
  const classes = new Set<string>();
  const classList = {
    add: (name: string) => void classes.add(name),
    remove: (name: string) => void classes.delete(name),
    contains: (name: string) => classes.has(name),
  };
  new Function('document', REVEAL_GATE_SCRIPT)({ documentElement: { classList } });
  return classes;
}

describe('reveal gate script', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets the gate immediately so revealed blocks start hidden without a flash', () => {
    expect(runGateScript().has(REVEAL_GATE_CLASS)).toBe(true);
  });

  it('drops the gate when the app has not hydrated in time', () => {
    const classes = runGateScript();
    vi.advanceTimersByTime(REVEAL_FALLBACK_MS - 1);
    expect(classes.has(REVEAL_GATE_CLASS)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(classes.has(REVEAL_GATE_CLASS)).toBe(false);
  });

  it('keeps the gate once Reveal has marked the page ready', () => {
    const classes = runGateScript();
    classes.add(REVEAL_READY_CLASS);
    vi.advanceTimersByTime(REVEAL_FALLBACK_MS);
    expect(classes.has(REVEAL_GATE_CLASS)).toBe(true);
  });

  it('is safe to inline in a <script> element', () => {
    expect(REVEAL_GATE_SCRIPT).not.toMatch(/<\/script/i);
  });
});
