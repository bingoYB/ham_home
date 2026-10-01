import { useTranslation } from "react-i18next";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hamhome/ui";
import type { EmbeddingDimensionSpec } from "@/lib/agent/provider-config";

const NATIVE_SIZE_VALUE = "default";

export interface EmbeddingDimensionsFieldProps {
  /** Sizes the current model accepts; the field is hidden when null */
  spec: EmbeddingDimensionSpec | null;
  /** Effective size; undefined means the model's native size */
  value?: number;
  onChange: (dimensions: number | undefined) => void;
}

/**
 * Vector size picker for embedding models that accept a custom output size.
 */
export function EmbeddingDimensionsField({
  spec,
  value,
  onChange,
}: EmbeddingDimensionsFieldProps) {
  const { t } = useTranslation(["settings"]);

  if (!spec) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor="embeddingDimensions">
        {t("settings:settings.ai.embedding.dimensions.label")}
      </Label>
      <Select
        value={value ? String(value) : NATIVE_SIZE_VALUE}
        onValueChange={(next) =>
          onChange(next === NATIVE_SIZE_VALUE ? undefined : Number(next))
        }
      >
        <SelectTrigger id="embeddingDimensions">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NATIVE_SIZE_VALUE}>
            {t("settings:settings.ai.embedding.dimensions.native", {
              dimensions: spec.defaultDimensions,
            })}
          </SelectItem>
          {spec.options.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {t("settings:settings.ai.embedding.dimensions.option", { dimensions: size })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {t("settings:settings.ai.embedding.dimensions.hint")}
      </p>
    </div>
  );
}
