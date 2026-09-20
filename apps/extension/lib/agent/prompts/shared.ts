/**
 * Prompt 构建的公共工具。
 * 各主体（整页 / 图片剪藏 / 文字剪藏）的提示词各自独立，仅共享这些无语义的格式化函数。
 */
import {
  buildCategoryTree,
  formatCategoryHierarchy,
} from "@/lib/preset-categories";
import type { Language, LocalCategory } from "@/types";

export type PromptLanguage = Language;

export function truncate(text: string | undefined, maxLength: number): string {
  return (text || "").trim().slice(0, maxLength);
}

/** 已有分类以层级路径（如 "设计 > 灵感素材"）的形式提供给模型 */
export function buildCategoryContext(categories?: LocalCategory[]): string[] {
  if (!categories?.length) {
    return [];
  }

  return formatCategoryHierarchy(buildCategoryTree(categories));
}

/** 拼接提示词片段，跳过空值，避免出现 "field: " 这种无信息噪声行 */
export function joinPromptLines(lines: Array<string | undefined | false>): string {
  return lines.filter((line): line is string => !!line).join("\n\n");
}
