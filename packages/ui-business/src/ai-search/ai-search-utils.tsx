import {
  ArrowRight,
  ChevronRight,
  Clock,
  Copy,
  Folder,
  FolderOpen,
  Globe,
  Keyboard,
  Search,
  Tag,
} from "lucide-react";
import type { SuggestionActionType } from "./types";

export function getSuggestionIcon(action: SuggestionActionType) {
  switch (action) {
    case "copyAllLinks":
      return Copy;
    case "batchAddTags":
      return Tag;
    case "batchMoveCategory":
      return FolderOpen;
    case "showMore":
      return ChevronRight;
    case "timeFilter":
      return Clock;
    case "domainFilter":
      return Globe;
    case "categoryFilter":
      return Folder;
    case "semanticOnly":
    case "keywordOnly":
      return Search;
    case "findDuplicates":
      return Copy;
    case "navigate":
      return ArrowRight;
    case "text":
    default:
      return Keyboard;
  }
}

export function isDirectAction(action: SuggestionActionType): boolean {
  return [
    "copyAllLinks",
    "batchAddTags",
    "batchMoveCategory",
    "showMore",
    "findDuplicates",
    "navigate",
  ].includes(action);
}

export function formatScore(score?: number): string {
  if (score === undefined || score === null) return "";
  return `${Math.round(score * 100)}%`;
}

export function getScoreColor(score?: number): string {
  if (score === undefined || score === null) return "text-muted-foreground";
  if (score >= 0.7) return "text-green-600 dark:text-green-400";
  if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
  return "text-orange-600 dark:text-orange-400";
}
