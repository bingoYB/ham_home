/** Serialize public commands, binding nested method calls to the raw service to avoid deadlocks. */
export function serializeService<T extends object, K extends keyof T>(
  service: T,
  methods: readonly K[],
): Pick<T, K> {
  let tail: Promise<unknown> = Promise.resolve();
  const commands = {} as Pick<T, K>;
  for (const name of methods) {
    const method = service[name];
    if (typeof method !== 'function') throw new Error(`Invalid service method: ${String(name)}`);
    Reflect.set(commands, name, (...args: unknown[]) => {
      const result = tail.then(() => Reflect.apply(method, service, args));
      // One failed command must not poison subsequent writes.
      tail = result.catch(() => undefined);
      return result;
    });
  }
  return commands;
}
