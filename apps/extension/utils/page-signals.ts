/**
 * Lightweight page signals collected by the content script for the tab lifecycle:
 * - unsubmitted input: fields the user edited and that still hold their edits, so
 *   auto archive never closes a half-written form;
 * - the link a context menu was opened on, because Chromium does not report its text.
 *
 * Only booleans and the clicked link's own text ever leave the page.
 */

const editedElements = new Set<WeakRef<Element>>();
/** Elements already in editedElements, so a field is tracked once, not once per keystroke */
const trackedElements = new WeakSet<Element>();
/**
 * Field values from before the user's edits. defaultValue alone is not enough:
 * React writes every controlled value back into it on each render.
 */
const baselineValues = new WeakMap<Element, string>();
let lastContextLink: { href: string; text: string } | null = null;
let installed = false;

const TEXT_INPUT_TYPES = new Set([
  "",
  "text",
  "email",
  "number",
  "password",
  "tel",
  "url",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
]);

function isTrackedField(target: EventTarget | null): target is Element {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type);
  return target instanceof HTMLElement && target.isContentEditable;
}

function stillDirty(element: Element): boolean {
  if (!element.isConnected) return false;
  if (element.closest('[role="search"], form[role="search"]')) return false;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const baseline = baselineValues.get(element) ?? element.defaultValue;
    return element.value.trim() !== "" && element.value !== baseline;
  }
  if (element instanceof HTMLSelectElement) {
    return Array.from(element.options).some((option) => option.selected !== option.defaultSelected);
  }
  return element instanceof HTMLElement && (element.innerText || "").trim() !== "";
}

function linkText(anchor: HTMLAnchorElement): string {
  const text =
    anchor.innerText ||
    anchor.getAttribute("aria-label") ||
    anchor.getAttribute("title") ||
    anchor.querySelector("img")?.getAttribute("alt") ||
    "";
  return text.replace(/\s+/g, " ").trim().slice(0, 300);
}

/** The element the event started on; at document level, events from open shadow roots point at the host */
function eventOrigin(event: Event): EventTarget | null {
  return event.composedPath()[0] ?? event.target;
}

function trackEdit(element: Element): void {
  if (trackedElements.has(element)) return;
  trackedElements.add(element);
  editedElements.add(new WeakRef(element));
}

function untrack(ref: WeakRef<Element>, element: Element | undefined): void {
  editedElements.delete(ref);
  if (element) trackedElements.delete(element);
}

export function installPageSignals(): void {
  if (installed) return;
  installed = true;

  document.addEventListener(
    "input",
    (event) => {
      const field = eventOrigin(event);
      if (!isTrackedField(field)) return;
      // This capture listener runs before the page's own handlers re-render the
      // field, so defaultValue still holds the value from before the first edit
      if (
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
        !baselineValues.has(field)
      ) {
        baselineValues.set(field, field.defaultValue);
      }
      trackEdit(field);
    },
    true,
  );
  document.addEventListener(
    "change",
    (event) => {
      if (event.target instanceof HTMLSelectElement) trackEdit(event.target);
    },
    true,
  );
  // Submitting means the input is saved: later edits compare with the submitted value
  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      for (const ref of editedElements) {
        const element = ref.deref();
        if (element && !(form && form.contains(element))) continue;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          baselineValues.set(element, element.value);
        }
        untrack(ref, element);
      }
    },
    true,
  );
  document.addEventListener(
    "contextmenu",
    (event) => {
      const origin = eventOrigin(event);
      const anchor =
        origin instanceof Element
          ? (origin.closest("a[href]") as HTMLAnchorElement | null)
          : null;
      lastContextLink = anchor ? { href: anchor.href, text: linkText(anchor) } : null;
    },
    true,
  );
}

export function hasDirtyForm(): boolean {
  for (const ref of editedElements) {
    const element = ref.deref();
    if (!element) {
      untrack(ref, element);
      continue;
    }
    if (stillDirty(element)) return true;
  }
  return false;
}

/** Text of the link the context menu was opened on, when it matches `href` */
export function getContextLinkText(href: string): string {
  if (!lastContextLink) return "";
  try {
    const a = new URL(lastContextLink.href);
    const b = new URL(href);
    return a.href === b.href ? lastContextLink.text : "";
  } catch {
    return lastContextLink.href === href ? lastContextLink.text : "";
  }
}
