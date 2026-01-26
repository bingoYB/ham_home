/**
 * OptionsPage 设置页面
 * 迁移自 design-example，整合现有设置功能
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Globe,
  Database,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Download,
  Trash2,
  Plus,
  ExternalLink,
  Check,
  ChevronsUpDown,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  cn,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useShortcuts } from '@/hooks/useShortcuts';
import { configStorage } from '@/lib/storage/config-storage';
import { CustomFilterDialog } from '@/components/bookmarkPanel/CustomFilterDialog';
import { getBrowserSpecificURL, isFirefox, safeCreateTab } from '@/utils/browser-api';
import { getDefaultModel, getProviderModels } from '@hamhome/ai';
import { aiClient } from '@/lib/ai/client';
import type { CustomFilter, FilterCondition, AIProvider } from '@/types';

export function OptionsPage() {
  const { t } = useTranslation(['common', 'settings']);
  const { language, switchLanguage, availableLanguages } = useLanguage();
  const { shortcuts, refresh: refreshShortcuts } = useShortcuts();
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

  // 自定义筛选器管理状态
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<CustomFilter | null>(null);
  const [deleteFilterTarget, setDeleteFilterTarget] = useState<CustomFilter | null>(null);

  // 本地状态用于输入框，避免光标跳动
  const [localApiKey, setLocalApiKey] = useState('');
  const [localBaseUrl, setLocalBaseUrl] = useState('');
  const [localModel, setLocalModel] = useState('');
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // 同步 aiConfig 到本地状态
  useEffect(() => {
    setLocalApiKey(aiConfig.apiKey || '');
    setLocalBaseUrl(aiConfig.baseUrl || '');
    setLocalModel(aiConfig.model || '');
  }, [aiConfig.apiKey, aiConfig.baseUrl, aiConfig.model]);

  // 加载自定义筛选器
  useEffect(() => {
    const loadCustomFilters = async () => {
      try {
        const filters = await configStorage.getCustomFilters();
        setCustomFilters(filters);
      } catch (error) {
        console.error('[OptionsPage] Failed to load custom filters:', error);
      }
    };
    loadCustomFilters();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // 确保最新配置已保存到 storage
      await updateAIConfig({});

      // 重置 AI 客户端以加载最新配置
      aiClient.reset();

      // 执行真实连接测试
      const result = await aiClient.testConnection();

      if (result.success) {
        setTestResult({ status: 'success', message: result.message });
      } else {
        setTestResult({ status: 'error', message: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '连接失败，请检查配置';
      setTestResult({ status: 'error', message });
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

  // 筛选器管理函数
  const handleAddFilter = () => {
    setEditingFilter(null);
    setFilterDialogOpen(true);
  };

  const handleEditFilter = (filter: CustomFilter) => {
    setEditingFilter(filter);
    setFilterDialogOpen(true);
  };

  const handleSaveFilter = async (name: string, conditions: FilterCondition[]) => {
    try {
      if (editingFilter) {
        // 更新现有筛选器
        await configStorage.updateCustomFilter(editingFilter.id, {
          name,
          conditions,
        });
        setCustomFilters((prev) =>
          prev.map((f) =>
            f.id === editingFilter.id
              ? { ...f, name, conditions, updatedAt: Date.now() }
              : f
          )
        );
      } else {
        // 创建新筛选器
        const newFilter: CustomFilter = {
          id: `filter_${Date.now()}`,
          name,
          conditions,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await configStorage.addCustomFilter(newFilter);
        setCustomFilters((prev) => [...prev, newFilter]);
      }
      setFilterDialogOpen(false);
      setEditingFilter(null);
    } catch (error) {
      console.error('[OptionsPage] Failed to save custom filter:', error);
    }
  };

  const handleDeleteFilter = async () => {
    if (!deleteFilterTarget) return;
    try {
      await configStorage.deleteCustomFilter(deleteFilterTarget.id);
      setCustomFilters((prev) => prev.filter((f) => f.id !== deleteFilterTarget.id));
      setDeleteFilterTarget(null);
    } catch (error) {
      console.error('[OptionsPage] Failed to delete custom filter:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
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
              <div className="space-y-2">
                <Label htmlFor="provider">{t('settings:settings.ai.provider')}</Label>
                <Select
                  value={aiConfig.provider}
                  onValueChange={(value: AIProvider) => {
                    const defaultModel = getDefaultModel(value);
                    setLocalModel(defaultModel);
                    updateAIConfig({ provider: value, model: defaultModel });
                  }}
                >
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">{t('settings:settings.providers.openai')}</SelectItem>
                    <SelectItem value="anthropic">{t('settings:settings.providers.anthropic')}</SelectItem>
                    <SelectItem value="google">{t('settings:settings.providers.google')}</SelectItem>
                    <SelectItem value="azure">{t('settings:settings.providers.azure')}</SelectItem>
                    <SelectItem value="deepseek">{t('settings:settings.providers.deepseek')}</SelectItem>
                    <SelectItem value="groq">{t('settings:settings.providers.groq')}</SelectItem>
                    <SelectItem value="mistral">{t('settings:settings.providers.mistral')}</SelectItem>
                    <SelectItem value="moonshot">{t('settings:settings.providers.moonshot')}</SelectItem>
                    <SelectItem value="zhipu">{t('settings:settings.providers.zhipu')}</SelectItem>
                    <SelectItem value="hunyuan">{t('settings:settings.providers.hunyuan')}</SelectItem>
                    <SelectItem value="nvidia">{t('settings:settings.providers.nvidia')}</SelectItem>
                    <SelectItem value="siliconflow">{t('settings:settings.providers.siliconflow')}</SelectItem>
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
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  onBlur={(e) => updateAIConfig({ apiKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings:settings.ai.apiKeyDesc')}
                </p>
              </div>

              {/* Azure 和 Custom 必须配置 baseUrl，Ollama 可选配置 */}
              {(['azure', 'custom', 'ollama'].includes(aiConfig.provider)) && (
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">{t('settings:settings.ai.baseUrl')}</Label>
                  <Input
                    id="baseUrl"
                    type="url"
                    placeholder={t('settings:settings.ai.baseUrlPlaceholder')}
                    value={localBaseUrl}
                    onChange={(e) => setLocalBaseUrl(e.target.value)}
                    onBlur={(e) => updateAIConfig({ baseUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="model" onClick={e => e.preventDefault()}>{t('settings:settings.ai.model')}</Label>
                <Popover open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        id="model"
                        placeholder={t('settings:settings.ai.modelPlaceholder')}
                        value={localModel}
                        onChange={(e) => setLocalModel(e.target.value)}
                        onBlur={(e) => {
                          // 延迟更新配置，允许点击下拉选项
                          setTimeout(() => {
                            updateAIConfig({ model: e.target.value });
                          }, 150);
                        }}
                        className="pr-8"
                      />
                      <ChevronsUpDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {getProviderModels(aiConfig.provider).map((model) => (
                            <CommandItem
                              key={model}
                              value={model}
                              onSelect={(value) => {
                                setLocalModel(value);
                                updateAIConfig({ model: value });
                                setModelSelectorOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  localModel === model ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {model}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 测试连接 */}
              <div className="flex gap-2">
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
                  className={`p-3 rounded-lg border ${testResult.status === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : testResult.status === 'warning'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                >
                  {testResult.message}
                </div>
              )}

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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="theme">{t('settings:settings.theme')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings:settings.descriptions.theme')}
                  </p>
                </div>
                <Select
                  value={appSettings.theme}
                  onValueChange={(value: 'system' | 'light' | 'dark') =>
                    updateAppSettings({ theme: value })
                  }
                >
                  <SelectTrigger id="theme" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t('settings:settings.themeOptions.system')}</SelectItem>
                    <SelectItem value="light">{t('settings:settings.themeOptions.light')}</SelectItem>
                    <SelectItem value="dark">{t('settings:settings.themeOptions.dark')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings:settings.general.shortcut')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {isFirefox()
                        ? t('settings:settings.general.shortcutDescFirefox')
                        : t('settings:settings.general.shortcutDesc')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const url = getBrowserSpecificURL('shortcuts');
                      await safeCreateTab(url);
                      // 延迟刷新，等待用户从设置页返回
                      setTimeout(refreshShortcuts, 500);
                    }}
                  >
                    <span>{t('settings:settings.general.shortcutButton')}</span>
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* 当前快捷键配置显示 */}
                {shortcuts.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('settings:settings.general.currentShortcuts')}
                    </p>
                    <div className="space-y-3">
                      {shortcuts.map((shortcut) => (
                        <div
                          key={shortcut.name}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="text-sm text-foreground">{shortcut.description}</span>
                          {shortcut.shortcut ? (
                            <div className="flex items-center gap-1">
                              {shortcut.formattedShortcut.split(' + ').map((key, idx) => (
                                <kbd
                                  key={idx}
                                  className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium font-mono bg-background border border-border rounded-md shadow-sm"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              {t('settings:settings.general.shortcutNotSet')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="panelPosition">{t('settings:settings.general.panelPosition')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings:settings.general.panelPositionDesc')}
                  </p>
                </div>
                <Select
                  value={appSettings.panelPosition}
                  onValueChange={(value: 'left' | 'right') =>
                    updateAppSettings({ panelPosition: value })
                  }
                >
                  <SelectTrigger id="panelPosition" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">{t('settings:settings.general.panelPositionOptions.left')}</SelectItem>
                    <SelectItem value="right">{t('settings:settings.general.panelPositionOptions.right')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 自定义筛选器管理 */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-base font-semibold mb-1 block">
                    {t('settings:settings.general.customFilters.title')}
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('settings:settings.general.customFilters.description')}
                  </p>
                </div>

                {customFilters.length === 0 ? (
                  <div className="p-6 border border-dashed rounded-lg text-center bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('settings:settings.general.customFilters.noFilters')}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t('settings:settings.general.customFilters.noFiltersDesc')}
                    </p>
                    <Button onClick={handleAddFilter} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('settings:settings.general.customFilters.addFilter')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {customFilters.length} {t('settings:settings.general.customFilters.title')}
                      </span>
                      <Button onClick={handleAddFilter} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('settings:settings.general.customFilters.addFilter')}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {customFilters.map((filter) => (
                        <div
                          key={filter.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{filter.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('settings:settings.general.customFilters.conditionsCount', {
                                count: filter.conditions.length,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFilter(filter)}
                              className="h-8 px-2"
                            >
                              {t('settings:settings.general.customFilters.edit')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteFilterTarget(filter)}
                              className="h-8 px-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* 删除筛选器确认对话框 */}
      <AlertDialog open={!!deleteFilterTarget} onOpenChange={(open) => !open && setDeleteFilterTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings:settings.general.customFilters.deleteConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:settings.general.customFilters.deleteWarning', {
                name: deleteFilterTarget?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings:settings.dialogs.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFilter}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('settings:settings.dialogs.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 自定义筛选器弹窗 */}
      <CustomFilterDialog
        open={filterDialogOpen}
        onOpenChange={(open) => {
          setFilterDialogOpen(open);
          if (!open) {
            setEditingFilter(null);
          }
        }}
        onSave={handleSaveFilter}
        editingFilter={editingFilter}
      />
    </div>
  );
}

