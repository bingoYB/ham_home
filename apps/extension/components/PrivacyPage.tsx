/**
 * PrivacyPage 隐私设置页面
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Eye, EyeOff, Lock, Database, Cloud, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Label,
  Button,
  Input,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';

export function PrivacyPage() {
  const { t } = useTranslation(['common', 'settings']);
  const { appSettings, aiConfig, updateAppSettings, updateAIConfig } = useBookmarks();
  const [newDomain, setNewDomain] = useState('');

  // 添加隐私域名
  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    
    const currentDomains = aiConfig.privacyDomains || [];
    if (currentDomains.includes(domain)) {
      setNewDomain('');
      return;
    }
    
    updateAIConfig({ privacyDomains: [...currentDomains, domain] });
    setNewDomain('');
  };

  // 删除隐私域名
  const handleRemoveDomain = (domain: string) => {
    const currentDomains = aiConfig.privacyDomains || [];
    updateAIConfig({ privacyDomains: currentDomains.filter(d => d !== domain) });
  };

  // 按 Enter 添加
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDomain();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* 数据存储 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings.privacy.dataStorage.title', { ns: 'settings' })}</CardTitle>
          </div>
          <CardDescription>{t('settings.privacy.dataStorage.description', { ns: 'settings' })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">{t('settings.privacy.dataStorage.localStorage', { ns: 'settings' })}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings.privacy.dataStorage.localStorageDesc', { ns: 'settings' })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">{t('settings.privacy.dataStorage.apiKeySecurity', { ns: 'settings' })}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings.privacy.dataStorage.apiKeySecurityDesc', { ns: 'settings' })}
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
            <CardTitle className="text-lg">{t('settings.privacy.aiPrivacy.title', { ns: 'settings' })}</CardTitle>
          </div>
          <CardDescription>{t('settings.privacy.aiPrivacy.description', { ns: 'settings' })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 自定义隐私域名 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">{t('settings.privacy.aiPrivacy.customDomains', { ns: 'settings' })}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.privacy.aiPrivacy.customDomainsDesc', { ns: 'settings' })}
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('settings.privacy.aiPrivacy.domainPlaceholder', { ns: 'settings' })}
                  className="w-64"
                />
                <Button onClick={handleAddDomain} size="default">
                  {t('settings.privacy.aiPrivacy.addDomain', { ns: 'settings' })}
                </Button>
              </div>
            </div>
            
            {/* 已配置的域名列表 */}
            {(aiConfig.privacyDomains || []).length > 0 && (
              <div className="space-y-2 mt-4">
                {(aiConfig.privacyDomains || []).map((domain) => (
                  <div 
                    key={domain}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <span className="text-sm text-foreground font-mono">{domain}</span>
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label={t('settings.privacy.aiPrivacy.removeDomain', { ns: 'settings' })}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  {t('settings.privacy.aiPrivacy.dataNotice', { ns: 'settings' })}
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('settings.privacy.aiPrivacy.dataNoticeDesc', { ns: 'settings' })}
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                  <li>{t('settings.privacy.aiPrivacy.dataItems.url', { ns: 'settings' })}</li>
                  <li>{t('settings.privacy.aiPrivacy.dataItems.title', { ns: 'settings' })}</li>
                  <li>{t('settings.privacy.aiPrivacy.dataItems.content', { ns: 'settings' })}</li>
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
            <CardTitle className="text-lg">{t('settings.privacy.snapshot.title', { ns: 'settings' })}</CardTitle>
          </div>
          <CardDescription>{t('settings.privacy.snapshot.description', { ns: 'settings' })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">{t('settings.privacy.snapshot.autoSave', { ns: 'settings' })}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.privacy.snapshot.autoSaveDesc', { ns: 'settings' })}
              </p>
            </div>
            <Switch
              checked={appSettings.autoSaveSnapshot}
              onCheckedChange={(checked) => updateAppSettings({ autoSaveSnapshot: checked })}
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{t('settings.privacy.snapshot.tip', { ns: 'settings' })}：</strong>
              {t('settings.privacy.snapshot.tipContent', { ns: 'settings' })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

