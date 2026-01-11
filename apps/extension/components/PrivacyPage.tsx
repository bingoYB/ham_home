/**
 * PrivacyPage 隐私设置页面
 */
import { useTranslation } from 'react-i18next';
import { Shield, Eye, EyeOff, Lock, Database, Cloud } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Label,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';

export function PrivacyPage() {
  const { t } = useTranslation(['common', 'settings']);
  const { appSettings, aiConfig, updateAppSettings, updateAIConfig } = useBookmarks();

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">{t('settings:privacy.title')}</h1>
        <p className="text-muted-foreground">{t('settings:privacy.description')}</p>
      </div>

      {/* 数据存储 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings:privacy.dataStorage.title')}</CardTitle>
          </div>
          <CardDescription>{t('settings:privacy.dataStorage.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">{t('settings:privacy.dataStorage.localStorage')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings:privacy.dataStorage.localStorageDesc')}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">{t('settings:privacy.dataStorage.apiKeySecurity')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings:privacy.dataStorage.apiKeySecurityDesc')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI 隐私设置 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings:privacy.aiPrivacy.title')}</CardTitle>
          </div>
          <CardDescription>{t('settings:privacy.aiPrivacy.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">{t('settings:privacy.aiPrivacy.enableAI')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings:privacy.aiPrivacy.enableAIDesc')}
              </p>
            </div>
            <Switch
              checked={aiConfig.enabled}
              onCheckedChange={(checked) => updateAIConfig({ enabled: checked })}
            />
          </div>

          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  {t('settings:privacy.aiPrivacy.dataNotice')}
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('settings:privacy.aiPrivacy.dataNoticeDesc')}
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                  <li>{t('settings:privacy.aiPrivacy.dataItems.url')}</li>
                  <li>{t('settings:privacy.aiPrivacy.dataItems.title')}</li>
                  <li>{t('settings:privacy.aiPrivacy.dataItems.content')}</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快照设置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings:privacy.snapshot.title')}</CardTitle>
          </div>
          <CardDescription>{t('settings:privacy.snapshot.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">{t('settings:privacy.snapshot.autoSave')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings:privacy.snapshot.autoSaveDesc')}
              </p>
            </div>
            <Switch
              checked={appSettings.autoSaveSnapshot}
              onCheckedChange={(checked) => updateAppSettings({ autoSaveSnapshot: checked })}
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{t('settings:privacy.snapshot.tip')}：</strong>
              {t('settings:privacy.snapshot.tipContent')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

