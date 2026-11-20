import { browser } from "wxt/browser";

interface AgentAvatarProps {
  busy?: boolean;
}

export function AgentAvatar({ busy = false }: AgentAvatarProps) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-300/10">
      <img
        src={browser.runtime.getURL(busy ? "/agent/hammy-thinking.svg" : "/agent/hammy-idle.svg")}
        alt=""
        width={40}
        height={40}
        draggable={false}
        className="size-10 select-none motion-safe:transition-transform motion-safe:group-hover/avatar:-rotate-6 motion-safe:group-focus-visible/avatar:-rotate-6"
      />
    </span>
  );
}
