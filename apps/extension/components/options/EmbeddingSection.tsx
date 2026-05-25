import { useTranslation } from "react-i18next";
import { Loader2, Trash2, Plus, Sparkles, RefreshCw, AlertTriangle, Database } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from "@hamhome/ui";
import type { EmbeddingConfig } from "@/types";
import type { QueueProgress } from "@/lib/embedding/embedding-queue";
import type { VectorStoreStats } from "@/lib/storage/vector-store";

interface EmbeddingSectionProps {
  embeddingConfig: EmbeddingConfig;
  vectorStats: VectorStoreStats | null;
  isLoadingStats: boolean;
  isRebuilding: boolean;
  rebuildProgress: QueueProgress | null;
  isClearing: boolean;
  onIncrementalRebuild: () => void;
  onFullRebuild: () => void;
  onClearVectors: () => void;
  formatBytes: (bytes: number) => string;
}

export function EmbeddingSection({
  embeddingConfig,
  vectorStats,
  isLoadingStats,
  isRebuilding,
  rebuildProgress,
  isClearing,
  onIncrementalRebuild,
  onFullRebuild,
  onClearVectors,
  formatBytes,
}: EmbeddingSectionProps) {
  const { t } = useTranslation(["common", "settings"]);

  if (!embeddingConfig.enabled) return null;

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t("settings:settings.ai.embedding.status.title")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("settings:settings.ai.embedding.status.description")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onIncrementalRebuild}
          disabled={isRebuilding || isClearing}
        >
          <RefreshCw className={isRebuilding ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
          {t("settings:settings.ai.embedding.actions.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-muted/30 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {t("settings:settings.ai.embedding.status.vectorCount")}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {isLoadingStats ? "..." : vectorStats?.count || 0}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("settings:settings.ai.embedding.status.unit")}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-muted/30 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {t("settings:settings.ai.embedding.status.storageSize")}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {isLoadingStats ? "..." : formatBytes(vectorStats?.estimatedSize || 0)}
            </span>
          </div>
        </div>
      </div>

      {isRebuilding && rebuildProgress && (
        <div className="space-y-2 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-primary">
              {t("settings:settings.ai.embedding.progress.title")}
            </span>
            <span className="text-muted-foreground">
              {rebuildProgress.completed} / {rebuildProgress.total}
            </span>
          </div>
          <Progress value={rebuildProgress.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground italic">
            {t("settings:settings.ai.embedding.progress.description")}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onIncrementalRebuild}
          disabled={isRebuilding || isClearing}
        >
          {t("settings:settings.ai.embedding.actions.rebuildIncremental")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onFullRebuild}
          disabled={isRebuilding || isClearing}
          className="text-destructive hover:bg-destructive/5"
        >
          {t("settings:settings.ai.embedding.actions.rebuildFull")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearVectors}
          disabled={isRebuilding || isClearing}
          className="text-muted-foreground"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("settings:settings.ai.embedding.actions.clear")}
        </Button>
      </div>
    </div>
  );
}
