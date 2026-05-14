import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  AIChatPanel as SharedAIChatPanel,
  type AIChatLabels,
  type AIChatPanelProps as SharedAIChatPanelProps,
} from "@hamhome/ui-business/ai-search";

export type AIChatPanelProps = Omit<SharedAIChatPanelProps, "labels">;

export function AIChatPanel(props: AIChatPanelProps) {
  const { t } = useTranslation("ai");
  const labels = useMemo<AIChatLabels>(
    () => ({
      aiAnswer: t("ai:search.aiAnswer"),
      close: t("ai:search.close"),
      aiPlaceholder: t("ai:search.aiPlaceholder"),
      sources: t("ai:search.sources"),
      retry: t("ai:status.retry"),
      dismissQuickActions: t("ai:search.quickActions.dismiss"),
      status: {
        thinking: t("ai:search.status.thinking"),
        searching: t("ai:search.status.searching"),
        writing: t("ai:search.status.writing"),
        error: t("ai:search.status.error"),
      },
      quickActions: [
        {
          title: t("ai:search.quickActions.examples.features"),
          query: t("ai:search.quickActions.examples.featuresQuery"),
        },
        {
          title: t("ai:search.quickActions.examples.shortcuts"),
          query: t("ai:search.quickActions.examples.shortcutsQuery"),
        },
        {
          title: t("ai:search.quickActions.examples.semantic"),
          query: t("ai:search.quickActions.examples.semanticQuery"),
        },
      ],
    }),
    [t],
  );

  return <SharedAIChatPanel {...props} labels={labels} />;
}
