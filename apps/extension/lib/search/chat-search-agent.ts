/**
 * Chat Search Agent
 * 统一代理到 extension agent service
 */
export {
  chatSearchService as chatSearchAgent,
  createInitialSession,
  createInitialState,
} from "@/lib/agent";
