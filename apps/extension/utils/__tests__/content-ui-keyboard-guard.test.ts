import { describe, expect, it } from "vitest";
import { installContentUIKeyboardEventGuard } from "../content-ui-keyboard-guard";

function createContainer(): HTMLElement {
  return new EventTarget() as HTMLElement;
}

describe("installContentUIKeyboardEventGuard", () => {
  it("stops keyboard events from leaving the content UI root", () => {
    const container = createContainer();
    const cleanup = installContentUIKeyboardEventGuard(container);

    for (const type of ["keydown", "keypress", "keyup"]) {
      const event = new Event(type, { bubbles: true });

      container.dispatchEvent(event);

      expect(event.cancelBubble).toBe(true);
      expect(event.defaultPrevented).toBe(false);
    }

    cleanup();
  });

  it("removes the guard during cleanup", () => {
    const container = createContainer();
    const cleanup = installContentUIKeyboardEventGuard(container);

    cleanup();

    const event = new Event("keydown", { bubbles: true });
    container.dispatchEvent(event);

    expect(event.cancelBubble).toBe(false);
  });
});
