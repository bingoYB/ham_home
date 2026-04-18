import { tool, type Tool } from "ai";


export class ToolRegistry {
  private tools: Record<string, any> = {};

  /**
   * 注册一个工具配置，内部自动调用 `tool()`
   * @param name 工具名称
   * @param options 工具原始配置
   */
  registerTool(name: string, options: Tool) {
    this.tools[name] = tool(options);
  }

  /**
   * 根据配置动态创建并注册一个新的工具
   * @param name 工具名称
   * @param options 工具配置（包含 description, parameters, execute）
   */
  register(name: string, options: Tool) {
    this.registerTool(name, options);
  }

  /**
   * 批量注册工具配置
   * @param toolsMap tool record
   */
  registerTools(toolsMap: Record<string, Tool>) {
    for (const [name, options] of Object.entries(toolsMap)) {
      this.registerTool(name, options);
    }
  }

  /**
   * 移除已注册的工具
   * @param name 工具名称
   */
  removeTool(name: string) {
    delete this.tools[name];
  }

  /**
   * 检查工具是否存在
   * @param name 工具名称
   */
  hasTool(name: string): boolean {
    return name in this.tools;
  }

  /**
   * 获取所有的工具对象，可以直接透传给 Vercel AI SDK 的 generateText/streamText 的 tools 参数
   */
  getTools(): Record<string, any> {
    return this.tools;
  }

  /**
   * 获取指定的工具有哪些
   * @param names 指定返回的工具名称数组
   */
  getToolsByName(names: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const name of names) {
      if (this.tools[name]) {
        result[name] = this.tools[name];
      }
    }
    return result;
  }
}

/**
 * 全局单例的工具注册表
 */
export const globalToolRegistry = new ToolRegistry();
