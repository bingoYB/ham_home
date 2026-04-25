import { useTranslation } from "react-i18next";
import { BarChart3, RefreshCw, Sparkles } from "lucide-react";
import { Badge, Button } from "@hamhome/ui";
import type { Workspace } from "@/types";

interface WorkspaceAnalysisSummaryProps {
  workspace: Workspace;
  analyzing: boolean;
  onAnalyze: () => void;
}

export function WorkspaceAnalysisSummary({
  workspace,
  analyzing,
  onAnalyze,
}: WorkspaceAnalysisSummaryProps) {
  const { t } = useTranslation("bookmark");
  const analysis = workspace.analysis;

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("workspace.analysis.title")}
        </div>
        <Button size="sm" variant="outline" onClick={onAnalyze} disabled={analyzing}>
          <RefreshCw className={analyzing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          {analysis ? t("workspace.analysis.rerun") : t("workspace.analysis.run")}
        </Button>
      </div>
      {analysis ? (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <span>{t("workspace.analysis.total", { count: analysis.totalPageCount })}</span>
            <span>{t("workspace.analysis.deduped", { count: analysis.dedupedPageCount })}</span>
            <span>{t("workspace.analysis.recommended", { count: analysis.bookmarkRecommendedPageIds.length })}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{analysis.recommendedName}</Badge>
            {analysis.recommendedTags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.categoryDistribution.map((item) => (
              <span key={item.category} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                {item.category} {item.count}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("workspace.analysis.empty")}
        </p>
      )}
    </div>
  );
}
