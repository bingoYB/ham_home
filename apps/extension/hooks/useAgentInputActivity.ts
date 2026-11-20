import { useEffect, useState } from "react";

export function useAgentInputActivity(isOpen: boolean) {
  const [activity, setActivity] = useState<"sleeping" | "focused" | "waiting">("sleeping");

  useEffect(() => {
    if (!isOpen) {
      setActivity("sleeping");
    } else if (activity === "waiting") {
      const timer = window.setTimeout(() => setActivity("sleeping"), 10_000);
      return () => window.clearTimeout(timer);
    }
  }, [activity, isOpen]);

  return {
    sleeping: activity === "sleeping",
    onFocus: () => setActivity("focused"),
    onBlur: () => setActivity("waiting"),
  };
}
