import { z } from "zod";
import { tool } from "ai";

export interface SkillDefinition {
  name: string;
  desc: string;
  loader: () => Promise<string>;
}

export class SkillLoader {
  private skills: Record<string, SkillDefinition> = {};

  /**
   * 注册一个新的 Skill
   */
  addSkill(skill: SkillDefinition) {
    this.skills[skill.name] = skill;
  }

  /**
   * 注册多个 Skill
   */
  addSkills(skills: SkillDefinition[]) {
    for (const skill of skills) {
      this.addSkill(skill);
    }
  }

  /**
   * 判断 skill 是否已注册
   */
  hasSkill(name: string): boolean {
    return name in this.skills;
  }

  /**
   * 返回所有 skill 名称
   */
  listSkillNames(): string[] {
    return Object.keys(this.skills);
  }

  /**
   * 直接加载 skill 原始内容。
   * 与 getContent 的区别是：这里会抛错，适合给外部 hook / agent 层做统一控制。
   */
  async loadSkill(name: string): Promise<string> {
    const skill = this.skills[name];
    if (!skill) {
      throw new Error(`Unknown skill '${name}'.`);
    }

    return skill.loader();
  }

  /**
   * 获取 skill 完整提示词内容
   */
  async getContent(name: string): Promise<string> {
    try {
      const body = await this.loadSkill(name);
      return `<skill name="${name}">\n${body}\n</skill>`;
    } catch (err: any) {
      return `Error: Failed to load skill '${name}'. ${err?.message || err}`;
    }
  }

  /**
   * 获取所有 skill 描述，用于生成 system prompt
   */
  getDescriptions(): string {
    return Object.values(this.skills)
      .map((skill) => `- ${skill.name}: ${skill.desc || "No description provided."}`)
      .join("\n");
  }

  /**
   * 获取预置的 System Prompt 片段
   */
  getSystemPrompt(workdir: string = "your workspace"): string {
    return `You are a coding agent at ${workdir}.
Use load_skill to access specialized knowledge before tackling unfamiliar topics.
IMPORTANT: If the skill's content is already loaded and visible in the conversation history, DO NOT call load_skill for it again. Read the context first!

Skills available:
${this.getDescriptions()}`;
  }

  /**
   * 提供给 Vercel AI SDK 等框架封装的 load_skill 工具对象
   * 返回一个适配 Vercel AI core \`tool()\` 参数的配置对象
   */
  getLoadSkillTool() {
    return tool({
      description: "Load a specialized skill content to gain knowledge.",
      inputSchema: z.object({
        name: z.string().describe("The name of the skill to load"),
      }),
      outputSchema: z.string().describe("The content of the skill"),
      execute: async (input: { name: string }) => {
        return this.getContent(input.name);
      },
    });
  }
}
