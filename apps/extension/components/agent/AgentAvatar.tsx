import { CharacterMark } from "@aora-bot/react";

interface AgentAvatarProps {
  sizePx?: number;
  state?: "sleeping" | "alerting" | "working";
}

export function AgentAvatar({ state, sizePx = 48 }: AgentAvatarProps) {
  return (
    <span aria-hidden="true" className="flex shrink-0">
      <CharacterMark
        shape="bot"
        color="orange"
        styleId="pixel"
        state={state}
        sizePx={sizePx}
        followPointer
        autoPause
        className="relative inline-flex aspect-square select-none [--aora-bg:var(--background)] [&>svg]:size-full [&>svg]:overflow-visible"
      />
    </span>
  );
}
