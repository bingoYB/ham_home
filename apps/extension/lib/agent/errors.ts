export function getAgentErrorMessage(
  error: unknown,
  fallback = "AI 请求失败",
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}
