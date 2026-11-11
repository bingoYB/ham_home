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
  const options = { smallModelMode: true };
  const title = await analyzeBookmarkField(agent, input, "title", temperature, signal, options);
  const summary = await analyzeBookmarkField(agent, input, "summary", temperature, signal, options);
  const category = await analyzeBookmarkField(agent, input, "category", temperature, signal, options);
  const tags = await analyzeBookmarkField(agent, input, "tags", temperature, signal, options);
  return bookmarkAnalysisResultSchema.parse({ title, summary, category, tags });
}
