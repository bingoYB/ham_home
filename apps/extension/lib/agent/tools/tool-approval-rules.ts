/**
 * Per-call approval exceptions: some tools only need the user's approval for
 * batches. Kept free of storage imports so the approval policy stays light.
 */
export function isAutoApprovedCall(toolName: string, input: Record<string, unknown>): boolean {
  return (
    toolName === "update_read_later_status" &&
    Array.isArray(input.bookmarkIds) &&
    input.bookmarkIds.length <= 1
  );
}
