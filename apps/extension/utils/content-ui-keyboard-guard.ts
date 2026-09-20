/**
 * 阻止 Shadow DOM 内的键盘事件冒泡到宿主页面。
 *
 * 键盘事件跨出 Shadow DOM 后，页面只能看到 shadow host 作为 target。
 * GitHub 等站点会因此把 content UI 输入框中的字符误判为页面快捷键。
 */
const KEYBOARD_EVENT_TYPES = ["keydown", "keypress", "keyup"] as const;

export function installContentUIKeyboardEventGuard(
  container: HTMLElement,
): () => void {
  const stopPropagation = (event: Event) => {
    event.stopPropagation();
  };

  KEYBOARD_EVENT_TYPES.forEach((type) => {
    container.addEventListener(type, stopPropagation);
  });

  return () => {
    KEYBOARD_EVENT_TYPES.forEach((type) => {
      container.removeEventListener(type, stopPropagation);
    });
  };
}
