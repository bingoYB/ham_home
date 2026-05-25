import { useTranslation } from "react-i18next";
import { Button } from "@hamhome/ui";
import { Loader2, Check, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@hamhome/ui";

interface AIConnectionTestProps {
  isTesting: boolean;
  testResult: { status: "success" | "error" | "warning"; message: string } | null;
  onTest: () => void;
  disabled?: boolean;
}

export function AIConnectionTest({ isTesting, testResult, onTest, disabled }: AIConnectionTestProps) {
  const { t } = useTranslation(["common", "settings"]);

  return (
    <>
      <div className="flex gap-2">
        <Button 
          onClick={onTest} 
          disabled={isTesting || disabled} 
          className="bg-primary hover:bg-primary/90"
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("settings:settings.ai.testing")}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("settings:settings.ai.testConnection")}
            </>
          )}
        </Button>
      </div>

      {testResult && (
        <div
          className={cn(
            "p-3 rounded-md text-sm flex items-start gap-2",
            testResult.status === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400 border border-green-100 dark:border-green-900/30"
              : testResult.status === "warning"
                ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/10 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/30"
                : "bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400 border border-red-100 dark:border-red-900/30",
          )}
        >
          {testResult.status === "success" ? (
            <Check className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          {testResult.message}
        </div>
      )}
    </>
  );
}