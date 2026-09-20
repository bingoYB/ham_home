import { useTranslation } from "react-i18next";
import type { ImageClipMetadata as ImageClipMetadataValue } from "@/types";

interface ImageClipMetadataProps {
  metadata?: ImageClipMetadataValue;
}

function formatFileSize(bytes?: number): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${unit}`;
}

export function ImageClipMetadata({ metadata }: ImageClipMetadataProps) {
  const { t } = useTranslation("bookmark");
  const colors = metadata?.colors?.slice(0, 8) ?? [];
  const dimensions =
    metadata?.width && metadata.height
      ? `${metadata.width} × ${metadata.height}`
      : null;
  const fileSize = formatFileSize(metadata?.size);
  const format = metadata?.format?.toUpperCase() ?? null;

  if (!colors.length && !dimensions && !fileSize && !format) return null;

  return (
    <div
      className="w-full max-w-xl space-y-3"
      aria-label={t("subject.imageInfo")}
    >
      {colors.length > 0 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-2 shadow-sm backdrop-blur">
            {colors.map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-6 w-6 rounded-full border border-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
                style={{ backgroundColor: color }}
                title={color}
                aria-label={color}
              />
            ))}
          </div>
        </div>
      )}

      {(dimensions || fileSize || format) && (
        <dl className="grid grid-cols-3 overflow-hidden rounded-lg border bg-background/75 text-center">
          <MetadataItem
            label={t("subject.dimensions")}
            value={dimensions ?? t("subject.unknown")}
          />
          <MetadataItem
            label={t("subject.fileSize")}
            value={fileSize ?? t("subject.unknown")}
          />
          <MetadataItem
            label={t("subject.format")}
            value={format ?? t("subject.unknown")}
          />
        </dl>
      )}
    </div>
  );
}

interface MetadataItemProps {
  label: string;
  value: string;
}

function MetadataItem({ label, value }: MetadataItemProps) {
  return (
    <div className="min-w-0 border-r px-3 py-2.5 last:border-r-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className="mt-0.5 truncate text-xs font-medium text-foreground"
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
