import type { Agent } from "@hamhome/agent";
import {
  bookmarkAnalysisResultSchema,
  type BookmarkAnalysisOutput,
  type BookmarkAnalysisPromptInput,
} from "../prompts";
import { analyzeBookmarkField } from "./bookmark-field-analysis";

/** Request each field separately, then validate the complete result before applying it. */
export async function analyzeBookmarkWithSmallModel(
  agent: Agent,
  input: BookmarkAnalysisPromptInput,
  temperature: number,
  signal?: AbortSignal,
): Promise<BookmarkAnalysisOutput> {
  const title = await analyzeBookmarkField(agent, input, "title", temperature, signal);
  const summary = await analyzeBookmarkField(agent, input, "summary", temperature, signal);
  const category = await analyzeBookmarkField(agent, input, "category", temperature, signal);
  const tags = await analyzeBookmarkField(agent, input, "tags", temperature, signal);
  return bookmarkAnalysisResultSchema.parse({ title, summary, category, tags });
}
