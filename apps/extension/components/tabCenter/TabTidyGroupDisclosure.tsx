import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@hamhome/ui";

interface TabTidyGroupDisclosureProps {
  selection: ReactNode;
  label: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function TabTidyGroupDisclosure({
  selection,
  label,
  children,
  defaultExpanded = false,
}: TabTidyGroupDisclosureProps) {
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hasOpened, setHasOpened] = useState(defaultExpanded);
  const [animate, setAnimate] = useState(false);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measure = () => setHeight(content.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [hasOpened]);

  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2">
        {selection}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={(event) => {
            const { nativeEvent } = event;
            const fromMouse = event.detail > 0 && "pointerType" in nativeEvent && nativeEvent.pointerType === "mouse";
            setAnimate(fromMouse && window.matchMedia("(prefers-reduced-motion: no-preference)").matches);
            setHasOpened(true);
            setExpanded((value) => !value);
          }}
        >
          <Chevron className="h-4 w-4 shrink-0" />
          {label}
        </button>
      </div>
      <div
        id={contentId}
        inert={!expanded}
        style={{ height: expanded ? height : 0 }}
        className={cn(
          "overflow-hidden",
          expanded ? "opacity-100" : "opacity-0",
          animate && "motion-safe:transition-[height,opacity] motion-safe:duration-160 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]",
        )}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === "height") {
            setAnimate(false);
          }
        }}
      >
        {hasOpened && <div ref={contentRef}>{children}</div>}
      </div>
    </>
  );
}
