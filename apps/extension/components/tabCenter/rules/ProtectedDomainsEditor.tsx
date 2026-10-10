/**
 * ProtectedDomainsEditor - domains whose tabs are never closed automatically.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { Badge, Button, Input } from "@hamhome/ui";

interface ProtectedDomainsEditorProps {
  domains: string[];
  disabled?: boolean;
  onAdd: (input: string) => Promise<boolean>;
  onRemove: (domain: string) => void;
}

export function ProtectedDomainsEditor({ domains, disabled, onAdd, onRemove }: ProtectedDomainsEditorProps) {
  const { t } = useTranslation("bookmark");
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  const add = async () => {
    if (!value.trim()) return;
    const ok = await onAdd(value);
    setInvalid(!ok);
    if (ok) setValue("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          disabled={disabled}
          onChange={(event) => {
            setValue(event.target.value);
            setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void add();
            }
          }}
          placeholder={t("tabCenter.rules.domains.placeholder")}
          aria-invalid={invalid}
          className="h-9"
        />
        <Button variant="outline" size="sm" className="h-9" disabled={disabled} onClick={() => void add()}>
          <Plus className="mr-1 h-4 w-4" />
          {t("tabCenter.rules.domains.add")}
        </Button>
      </div>
      {invalid && <p className="text-xs text-destructive">{t("tabCenter.rules.domains.invalid")}</p>}
      {domains.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("tabCenter.rules.domains.empty")}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {domains.map((domain) => (
            <Badge key={domain} variant="secondary" className="gap-1 pr-1 font-normal">
              {domain}
              <button
                type="button"
                onClick={() => onRemove(domain)}
                className="rounded p-0.5 hover:bg-background/60"
                aria-label={t("tabCenter.rules.domains.remove", { domain })}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProtectedDomainsEditor;
