/**
 * AboutPage 关于 HamHome 页面
 */
import { useTranslation } from "react-i18next";
import { Globe, Github, ExternalLink, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "@hamhome/ui";
import {
  APP_GITHUB_REPO_URL,
  APP_WEBSITE_URL,
} from "@/lib/constants/app-info";
import { safeCreateTab } from "@/utils/browser-api";
import { browser } from "wxt/browser";

export function AboutPage() {
  const { t } = useTranslation(["common", "settings"]);
  const extensionVersion = browser.runtime.getManifest().version;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings:settings.about.title")}</CardTitle>
          <CardDescription>
            {t("settings:settings.about.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-medium text-primary">
              {t("settings:settings.about.subtitle")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-6">
              {t("settings:settings.about.intro")}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("settings:settings.about.versionLabel")}
              </p>
              <p className="text-base font-semibold">
                {t("settings:settings.about.versionValue", {
                  version: extensionVersion,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings:settings.about.versionHint")}
              </p>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>{t("settings:settings.about.websiteLabel")}</span>
              </div>
              <p className="text-sm font-medium break-all">{APP_WEBSITE_URL}</p>
              <p className="text-xs text-muted-foreground">
                {t("settings:settings.about.websiteHint")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void safeCreateTab(APP_WEBSITE_URL)}
              >
                {t("settings:settings.about.websiteButton")}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Github className="h-4 w-4" />
                <span>{t("settings:settings.about.githubLabel")}</span>
              </div>
              <p className="text-sm font-medium break-all">
                {APP_GITHUB_REPO_URL}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings:settings.about.githubHint")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void safeCreateTab(APP_GITHUB_REPO_URL)}
              >
                {t("settings:settings.about.githubButton")}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Star className="h-4 w-4 text-primary" />
                <span>{t("settings:settings.about.starTitle")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("settings:settings.about.starHint")}
              </p>
            </div>
            <Button onClick={() => void safeCreateTab(APP_GITHUB_REPO_URL)}>
              <Github className="h-4 w-4" />
              {t("settings:settings.about.starButton")}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("settings:settings.about.copyright")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
