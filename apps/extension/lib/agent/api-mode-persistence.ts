/**
 * Browser Agent SDK 通过 `invocationMode: "auto"` 在单个 Agent 实例内完成
 * response/chat 模式回退；当前扩展不再维护旧 runtime 的全局探测缓存。
 */
export function initApiModePersistence(): void {
  // 保留 background 初始化入口，避免启动流程需要感知 agent runtime 细节。
}
