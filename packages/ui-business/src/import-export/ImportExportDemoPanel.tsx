import {
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  FolderTree,
  Globe,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Progress,
  cn,
} from "@hamhome/ui";

export interface ImportExportDemoResult {
  success: boolean;
  message: string;
  details: string;
}

export interface ImportExportDemoTexts {
  title: string;
  description: string;
  exportTitle: string;
  exportDesc: string;
  importTitle: string;
  importDesc: string;
  stats: string;
  exportJSON: string;
  exportHTML: string;
  preserveFolders: string;
  preserveFoldersDesc: string;
  enableAIAnalysis: string;
  enableAIAnalysisDesc: string;
  fetchPageContent: string;
  fetchPageContentDesc: string;
  importFile: string;
  importBrowser: string;
  browserCount: string;
  importing: string;
  progress: string;
}

export interface ImportExportDemoPanelProps {
  texts: ImportExportDemoTexts;
  preserveFolders: boolean;
  enableAIAnalysis: boolean;
  fetchPageContent: boolean;
  importing: boolean;
  progress: number;
  result: ImportExportDemoResult | null;
  onPreserveFoldersChange: (checked: boolean) => void;
  onEnableAIAnalysisChange: (checked: boolean) => void;
  onFetchPageContentChange: (checked: boolean) => void;
  onImportFile: () => void;
  onImportBrowser: () => void;
}

export function ImportExportDemoPanel({
  texts,
  preserveFolders,
  enableAIAnalysis,
  fetchPageContent,
  importing,
  progress,
  result,
  onPreserveFoldersChange,
  onEnableAIAnalysisChange,
  onFetchPageContentChange,
  onImportFile,
  onImportBrowser,
}: ImportExportDemoPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          {texts.title}
        </CardTitle>
        <CardDescription>{texts.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-500" />
              {texts.exportTitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{texts.exportDesc}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{texts.stats}</Badge>
            <Badge variant="outline">JSON / HTML</Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2">
              <FileJson className="h-4 w-4" />
              {texts.exportJSON}
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <FileText className="h-4 w-4" />
              {texts.exportHTML}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-500" />
              {texts.importTitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{texts.importDesc}</p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={preserveFolders}
                onCheckedChange={(checked) => onPreserveFoldersChange(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label>{texts.preserveFolders}</Label>
                <p className="text-xs text-muted-foreground">{texts.preserveFoldersDesc}</p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <Checkbox
                checked={enableAIAnalysis}
                onCheckedChange={(checked) => onEnableAIAnalysisChange(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {texts.enableAIAnalysis}
                </Label>
                <p className="text-xs text-muted-foreground">{texts.enableAIAnalysisDesc}</p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <Checkbox
                checked={fetchPageContent}
                disabled={!enableAIAnalysis}
                onCheckedChange={(checked) => onFetchPageContentChange(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label className={cn(!enableAIAnalysis && "text-muted-foreground")}>
                  {texts.fetchPageContent}
                </Label>
                <p className="text-xs text-muted-foreground">{texts.fetchPageContentDesc}</p>
              </div>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={onImportFile}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {texts.importFile}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={onImportBrowser}
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {texts.importBrowser}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FolderTree className="h-3.5 w-3.5" />
            {texts.browserCount}
          </p>

          {importing && (
            <div className="rounded-lg bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{texts.progress}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {result.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.details}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
