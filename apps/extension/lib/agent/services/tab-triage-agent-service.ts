/**
 * AI tidy-up for open tabs: one structured call per batch. The prompt only carries
 * titles, cleaned URLs, domains, idle times and tab groups (see tab-triage.utils),
 * plus the names of existing workspaces and bookmark categories. Never page content.
 */
import { z } from "zod";
import type { AgentCommand, JsonSchema } from "@hamhome/agent";
import type { RawTriageItem, TriagePromptItem } from "@/lib/tabs/tab-triage.utils";
import type { Language } from "@/types";
import { getAgentErrorMessage } from "../errors";
import { createExtensionAgent } from "../factory";

interface TriageCommandInput {
  language: Language;
  items: TriagePromptItem[];
  workspaces: string[];
  categories: string[];
}

const triageOutputParser = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      destination: z.string(),
      reason: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      workspace: z.string().nullable().optional(),
    }),
  ),
});

const triageOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          destination: {
            type: "string",
            enum: ["keep", "readLater", "bookmark", "workspace", "close"],
          },
          reason: { type: "string" },
          category: { anyOf: [{ type: "string" }, { type: "null" }] },
          workspace: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["id", "destination", "reason", "category", "workspace"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const SYSTEM_PROMPT_ZH = [
  "你是 HamHome 的标签页整理助手。根据每个标签页的标题、网址、闲置时长和所在分组，为它选择一个去处：",
  "- keep：仍在使用、或与其他打开的标签页属于同一项正在进行的任务，继续保留；",
  "- readLater：值得读但还没读完的长文、教程、新闻和博客；",
  "- bookmark：值得长期保留的参考资料、文档和工具；category 只能从“现有书签分类”中原样选一个，没有合适的填 null；",
  "- workspace：属于同一个项目或主题、适合整组收起以后再恢复的标签页；workspace 给出简短名称（中文不超过 8 个字），优先原样复用“现有工作空间”的名称，同一组的标签页必须使用完全相同的名称；",
  "- close：搜索结果页、登录或验证页、已处理完的页面，以及没有保留价值的页面。",
  "闲置越久越倾向于不保留，但不要只凭闲置时长判断。",
  "reason 用一句话说明理由，不超过 20 个字。每个标签页必须且只能输出一次，id 与输入一致。",
  "只输出符合 schema 的 JSON。",
].join("\n");

const SYSTEM_PROMPT_EN = [
  "You are HamHome's tab tidy-up assistant. From each tab's title, URL, idle time and tab group, pick one destination:",
  "- keep: still in use, or part of an ongoing task together with other open tabs;",
  "- readLater: long reads, tutorials, news and blog posts worth reading that are not read yet;",
  "- bookmark: reference material, docs and tools worth keeping for good; category must be copied exactly from \"Existing bookmark categories\", or null when none fits;",
  "- workspace: tabs of one project or topic that can be folded away and restored together; give a short workspace name (at most 3 words), reuse an \"Existing workspaces\" name exactly when one fits, and use exactly the same name for every tab of one group;",
  "- close: search results, sign-in or verification pages, finished pages and pages not worth keeping.",
  "The longer a tab has been idle, the less likely it needs to stay open, but never decide on idle time alone.",
  "reason is one short sentence of at most 12 words. Output every tab exactly once, with the id it came with.",
  "Return JSON only that matches the schema.",
].join("\n");

function buildPrompt({ language, items, workspaces, categories }: TriageCommandInput): string {
  const zh = language === "zh";
  const list = (values: string[]) =>
    values.length ? values.map((value) => `- ${value}`).join("\n") : zh ? "- 无" : "- none";
  const rows = items.map((item) =>
    [item.id, item.idle, item.group ?? "-", item.title, item.url].join(" | "),
  );
  return [
    `language: ${language}`,
    "",
    zh ? "现有工作空间：" : "Existing workspaces:",
    list(workspaces),
    "",
    zh ? "现有书签分类：" : "Existing bookmark categories:",
    list(categories),
    "",
    zh ? "标签页（id | 闲置时长 | 分组 | 标题 | 网址）：" : "Tabs (id | idle | group | title | url):",
    ...rows,
  ].join("\n");
}

const suggestTabTriageCommand: AgentCommand<
  TriageCommandInput,
  z.infer<typeof triageOutputParser>
> = {
  name: "suggestTabTriage",
  description: "Suggest where each open browser tab should go.",
  outputSchema: triageOutputSchema,
  maxIterations: 1,
  prompt: buildPrompt,
};

class TabTriageAgentService {
  async suggest(
    input: Omit<TriageCommandInput, "language">,
  ): Promise<{ items: RawTriageItem[]; language: Language }> {
    const { agent, config } = await createExtensionAgent();
    try {
      const { output } = await agent.commands.run(
        suggestTabTriageCommand,
        { ...input, language: config.language },
        {
          systemPrompt: config.language === "zh" ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN,
          temperature: 0.2,
        },
      );
      return { items: triageOutputParser.parse(output).items, language: config.language };
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "AI 整理失败"));
    }
  }
}

export const tabTriageAgentService = new TabTriageAgentService();
