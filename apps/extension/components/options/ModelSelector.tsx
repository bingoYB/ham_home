import { useTranslation } from "react-i18next";
import { useRef } from "react";
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@hamhome/ui";
import { cn } from "@hamhome/ui";
import { Loader2, ChevronsUpDown, Check, RefreshCw } from "lucide-react";

interface ModelSelectorProps {
  value: string;
  remoteModels: string[];
  recommendedModels: string[];
  isFetchingModels: boolean;
  modelFetchResult: { status: "success" | "error"; message: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (model: string) => void;
  onChange: (model: string) => void;
  onBlur: (model: string) => void;
  onFetchModels: () => void;
  placeholder?: string;
}

export function ModelSelector({
  value,
  remoteModels,
  recommendedModels,
  isFetchingModels,
  modelFetchResult,
  open,
  onOpenChange,
  onSelect,
  onChange,
  onBlur,
  onFetchModels,
  placeholder,
}: ModelSelectorProps) {
  const { t } = useTranslation(["common", "settings"]);
  const isSelectingRef = useRef(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="model" onClick={(e) => e.preventDefault()}>
          {t("settings:settings.ai.model")}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFetchModels}
          disabled={isFetchingModels}
        >
          {isFetchingModels ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("settings:settings.ai.fetchingModels")}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("settings:settings.ai.fetchModels")}
            </>
          )}
        </Button>
      </div>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              id="model"
              placeholder={placeholder || t("settings:settings.ai.modelPlaceholder")}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={(e) => {
                const val = e.target.value;
                setTimeout(() => {
                  if (!isSelectingRef.current) {
                    onBlur(val);
                  }
                }, 150);
              }}
              className="pr-8"
            />
            <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-(--radix-popover-trigger-width) p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandInput placeholder={t("settings:settings.ai.searchModelsPlaceholder")} />
            <CommandList>
              <CommandEmpty>
                {isFetchingModels ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("settings:settings.ai.fetchingModels")}
                  </div>
                ) : (
                  t("settings:settings.ai.modelListEmpty")
                )}
              </CommandEmpty>
              {isFetchingModels && (
                <CommandGroup>
                  <CommandItem disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("settings:settings.ai.fetchingModels")}
                  </CommandItem>
                </CommandGroup>
              )}
              {remoteModels.length > 0 && (
                <CommandGroup heading={t("settings:settings.ai.remoteModels")}>
                  {remoteModels.map((model) => (
                    <CommandItem
                      key={model}
                      value={model}
                      onSelect={(v) => {
                        isSelectingRef.current = true;
                        onSelect(model);
                        onOpenChange(false);
                        setTimeout(() => {
                          isSelectingRef.current = false;
                        }, 200);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === model ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {model}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {remoteModels.length > 0 && recommendedModels.length > 0 && <CommandSeparator />}
              {recommendedModels.length > 0 && (
                <CommandGroup heading={t("settings:settings.ai.recommendedModels")}>
                  {recommendedModels.map((model) => (
                    <CommandItem
                      key={model}
                      value={model}
                      onSelect={(v) => {
                        isSelectingRef.current = true;
                        onSelect(model);
                        onOpenChange(false);
                        setTimeout(() => {
                          isSelectingRef.current = false;
                        }, 200);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === model ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {model}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {modelFetchResult && (
        <p
          className={cn(
            "text-xs mt-1",
            modelFetchResult.status === "error" ? "text-destructive" : "text-green-600",
          )}
        >
          {modelFetchResult.message}
        </p>
      )}
    </div>
  );
}