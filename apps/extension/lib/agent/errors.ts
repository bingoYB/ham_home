export function getAgentErrorMessage(
  error: unknown,
  fallback = "AI 请求失败",
): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message.trim()) {
    const status = "statusCode" in error ? error.statusCode : undefined;
    return typeof status === "number" ? `HTTP ${status}: ${error.message}` : error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}
