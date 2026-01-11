/**
 * OptionsPage 设置页面
 * 迁移自 design-example，整合现有设置功能
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Sparkles,
  Globe,
  Database,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Download,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { useLanguage } from '@/hooks/useLanguage';

export function OptionsPage() {
  const { t } = useTranslation(['common', 'settings']);
  const { language, switchLanguage, availableLanguages } = useLanguage();
  const {
    aiConfig,
    appSettings,
    storageInfo,
    updateAIConfig,
    updateAppSettings,
    clearAllData,
    exportData,
  } = useBookmarks();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [newTag, setNewTag] = useState('');

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // 模拟测试连接
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      if (aiConfig.apiKey) {
        setTestResult({ status: 'success', message: 'AI 服务连接成功！' });
      } else {
        setTestResult({ status: 'warning', message: '请先配置 API Key' });
      }
    } catch {
      setTestResult({ status: 'error', message: '连接失败，请检查配置' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearData = async () => {
    await clearAllData();
    setShowClearDialog(false);
  };

  const handleExport = (format: 'json' | 'html') => {
    exportData(format);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = aiConfig.presetTags || [];
      if (!currentTags.includes(newTag.trim())) {
        updateAIConfig({ presetTags: [...currentTags, newTag.trim()] });
        setNewTag('');
      }
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const currentTags = aiConfig.presetTags || [];
    updateAIConfig({
      presetTags: currentTags.filter((_, index) => index !== indexToRemove),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">{t('settings:settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings:settings.description')}</p>
      </div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t('settings:settings.tabs.ai')}
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            {t('settings:settings.tabs.general')}
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <Database className="h-4 w-4" />
            {t('settings:settings.tabs.storage')}
          </TabsTrigger>
        </TabsList>

        {/* AI 配置标签页 */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings:settings.ai.title')}</CardTitle>
              <CardDescription>{t('settings:settings.ai.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings:settings.ai.enableAI')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings:settings.ai.enableAIDesc')}
                  </p>
                </div>
                <Switch
                  checked={aiConfig.enabled}
                  onCheckedChange={(checked) => updateAIConfig({ enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">{t('settings:settings.ai.provider')}</Label>
                <Select
                  value={aiConfig.provider}
                  onValueChange={(value: 'openai' | 'anthropic' | 'ollama' | 'custom') => 
                    updateAIConfig({ provider: value })
                  }
                >
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">{t('settings:settings.providers.openai')}</SelectItem>
                    <SelectItem value="anthropic">{t('settings:settings.providers.anthropic')}</SelectItem>
                    <SelectItem value="ollama">{t('settings:settings.providers.ollama')}</SelectItem>
                    <SelectItem value="custom">{t('settings:settings.providers.custom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">{t('settings:settings.apiKey')}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={t('settings:settings.ai.apiKeyPlaceholder')}
                  value={aiConfig.apiKey || ''}
                  onChange={(e) => updateAIConfig({ apiKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings:settings.ai.apiKeyDesc')}
                </p>
              </div>

              {(aiConfig.provider === 'custom' || aiConfig.provider === 'ollama') && (
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">{t('settings:settings.ai.baseUrl')}</Label>
                  <Input
                    id="baseUrl"
                    type="url"
                    placeholder={t('settings:settings.ai.baseUrlPlaceholder')}
                    value={aiConfig.baseUrl || ''}
                    onChange={(e) => updateAIConfig({ baseUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="model">{t('settings:settings.ai.model')}</Label>
                <Input
                  id="model"
                  placeholder={t('settings:settings.ai.modelPlaceholder')}
                  value={aiConfig.model || ''}
                  onChange={(e) => updateAIConfig({ model: e.target.value })}
                />
              </div>

              {/* 高级参数折叠面板 */}
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
                  />
                  {t('settings:settings.ai.advancedOptions')}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">{t('settings:settings.temperature')}: {aiConfig.temperature || 0.3}</Label>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={aiConfig.temperature || 0.3}
                      onChange={(e) =>
                        updateAIConfig({ temperature: parseFloat(e.target.value) })
                      }
                      className="w-full accent-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings:settings.messages.temperatureDesc')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">{t('settings:settings.maxTokens')}</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      min="100"
                      max="4000"
                      value={aiConfig.maxTokens || 1000}
                      onChange={(e) => updateAIConfig({ maxTokens: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings:settings.messages.maxTokensDesc')}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* AI 功能开关 */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings:settings.ai.smartCategory')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings:settings.ai.smartCategoryDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={aiConfig.enableSmartCategory}
                    onCheckedChange={(checked) => updateAIConfig({ enableSmartCategory: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings:settings.ai.tagSuggestion')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings:settings.ai.tagSuggestionDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={aiConfig.enableTagSuggestion}
                    onCheckedChange={(checked) => updateAIConfig({ enableTagSuggestion: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings:settings.ai.translation')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings:settings.ai.translationDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={aiConfig.enableTranslation}
                    onCheckedChange={(checked) => updateAIConfig({ enableTranslation: checked })}
                  />
                </div>
              </div>

              {/* 预设标签配置 */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-base font-semibold mb-3 block">{t('settings:settings.ai.presetTags')}</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('settings:settings.ai.presetTagsDesc')}
                  </p>

                  {/* 标签输入 */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="tagInput">{t('settings:settings.ai.addTag')}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tagInput"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('settings:settings.ai.addTagPlaceholder')}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddTag}
                        variant="outline"
                        size="sm"
                        disabled={!newTag.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 标签列表 */}
                  {(aiConfig.presetTags || []).length > 0 ? (
                    <div className="space-y-2">
                      <Label>{t('settings:settings.ai.configuredTags')} ({(aiConfig.presetTags || []).length})</Label>
                      <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                        {(aiConfig.presetTags || []).map((tag: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-background text-foreground px-3 py-1 rounded-md text-sm border"
                          >
                            <span>{tag}</span>
                            <button
                              onClick={() => handleRemoveTag(index)}
                              className="hover:text-destructive transition-colors ml-1"
                              aria-label={t('settings:settings.ai.removeTag')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      {t('settings:settings.ai.noTags')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={isTesting || !aiConfig.apiKey}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('settings:settings.ai.testing')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('settings:settings.ai.testConnection')}
                    </>
                  )}
                </Button>
              </div>

              {/* 测试结果显示 */}
              {testResult && (
                <div
                  className={`p-3 rounded-lg border ${
                    testResult.status === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : testResult.status === 'warning'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {testResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通用设置标签页 */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings:settings.general.title')}</CardTitle>
              <CardDescription>{t('settings:settings.general.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 语言设置 - 使用 useLanguage hook 实现即时切换 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings:settings.language')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings:settings.descriptions.language')}
                  </p>
                </div>
                <Select value={language} onValueChange={switchLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((lng) => (
                      <SelectItem key={lng} value={lng}>
                        {t(`common:common.languages.${lng}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings:settings.general.autoSaveSnapshot')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings:settings.general.autoSaveSnapshotDesc')}
                  </p>
                </div>
                <Switch
                  checked={appSettings.autoSaveSnapshot}
                  onCheckedChange={(checked) => updateAppSettings({ autoSaveSnapshot: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">{t('settings:settings.theme')}</Label>
                <Select
                  value={appSettings.theme}
                  onValueChange={(value: 'system' | 'light' | 'dark') => 
                    updateAppSettings({ theme: value })
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t('settings:settings.themeOptions.system')}</SelectItem>
                    <SelectItem value="light">{t('settings:settings.themeOptions.light')}</SelectItem>
                    <SelectItem value="dark">{t('settings:settings.themeOptions.dark')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortcut">{t('settings:settings.general.shortcut')}</Label>
                <Input
                  id="shortcut"
                  value={appSettings.shortcut}
                  onChange={(e) => updateAppSettings({ shortcut: e.target.value })}
                  placeholder={t('settings:settings.general.shortcutPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings:settings.general.shortcutDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 存储管理标签页 */}
        <TabsContent value="storage" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings:settings.storage.title')}</CardTitle>
              <CardDescription>{t('settings:settings.storage.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">{t('settings:settings.storage.bookmarkCount')}</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {storageInfo.bookmarkCount}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">{t('settings:settings.storage.categoryCount')}</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {storageInfo.categoryCount}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">{t('settings:settings.storage.storageUsed')}</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {storageInfo.storageSize}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div>
                  <h4 className="font-medium text-foreground mb-3">{t('settings:settings.storage.dataExport')}</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExport('json')}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t('settings:settings.storage.exportJSON')}
                    </Button>
                    <Button
                      onClick={() => handleExport('html')}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t('settings:settings.storage.exportHTML')}
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-3">{t('settings:settings.storage.dangerZone')}</h4>
                  <Button
                    onClick={() => setShowClearDialog(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('settings:settings.storage.clearAllData')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 清除确认对话框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings:settings.dialogs.confirmClear')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:settings.dialogs.clearWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings:settings.dialogs.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} className="bg-destructive hover:bg-destructive/90">
              {t('settings:settings.dialogs.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

