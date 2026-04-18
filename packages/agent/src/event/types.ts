export type HookHandler<TPayload> = (
  payload: TPayload,
) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface EventDispatcher<TEvents extends object> {
  emit<TKey extends keyof TEvents>(
    event: TKey,
    payload: TEvents[TKey],
  ): Promise<TEvents[TKey]>;
}
