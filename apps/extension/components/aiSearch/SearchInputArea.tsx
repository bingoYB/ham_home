import { useTranslation } from "react-i18next";
import {
  SearchInputArea as SharedSearchInputArea,
  type SearchInputAreaProps,
} from "@hamhome/ui-business/ai-search";

export interface ExtensionSearchInputAreaProps
  extends Omit<SearchInputAreaProps, "placeholder"> {
  placeholder?: string;
}

export type { ExtensionSearchInputAreaProps as SearchInputAreaProps };

export function SearchInputArea({
  placeholder,
  ...props
}: ExtensionSearchInputAreaProps) {
  const { t } = useTranslation("ai");

  return (
    <SharedSearchInputArea
      {...props}
      placeholder={placeholder || t("ai:search.keywordPlaceholder")}
    />
  );
}
