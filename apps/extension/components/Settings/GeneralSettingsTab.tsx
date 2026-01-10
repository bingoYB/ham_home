/**
 * 通用设置标签页
 * UI 层：负责 JSX 渲染、样式布局、事件绑定
 */
import {
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hamhome/ui';
import { Loader2, Download, Check } from 'lucide-react';
import { useGeneralSettings, isCategoryImported } from '@/hooks/useGeneralSettings';
import { PRESET_CATEGORIES } from '@/lib/preset-categories';
import type { LocalSettings } from '@/types';

export function GeneralSettingsTab() {
  const {
    settings,
    loading,
    userCategories,
    importingCategories,
    importedPresetCount,
    presetCategoriesCount,
    updateSetting,
    importPresetCategories,
  } = useGeneralSettings();

  // 加载状态
  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 自动保存快照 */}
      <AutoSnapshotCard
        enabled={settings.autoSaveSnapshot}
        onToggle={(checked) => updateSetting('autoSaveSnapshot', checked)}
      />

      {/* 外观设置 */}
      <AppearanceCard
        theme={settings.theme}
        language={settings.language}
        onThemeChange={(v) => updateSetting('theme', v)}
        onLanguageChange={(v) => updateSetting('language', v)}
      />

      {/* 快捷键 */}
      <ShortcutCard shortcut={settings.shortcut} />

      {/* 预设分类系统 */}
      <PresetCategoriesCard
        userCategories={userCategories}
        importing={importingCategories}
        importedCount={importedPresetCount}
        totalCount={presetCategoriesCount}
        onImport={importPresetCategories}
      />
    </div>
  );
}

// ========== 子组件 ==========

interface AutoSnapshotCardProps {
  enabled: boolean;
  onToggle: (checked: boolean) => void;
}

function AutoSnapshotCard({ enabled, onToggle }: AutoSnapshotCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">自动保存快照</CardTitle>
            <CardDescription>
              收藏时自动保存网页的本地副本，防止链接失效
            </CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
    </Card>
  );
}

interface AppearanceCardProps {
  theme: LocalSettings['theme'];
  language: LocalSettings['language'];
  onThemeChange: (theme: LocalSettings['theme']) => void;
  onLanguageChange: (language: LocalSettings['language']) => void;
}

function AppearanceCard({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
}: AppearanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">外观设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>主题模式</Label>
          <Select value={theme} onValueChange={onThemeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">跟随系统</SelectItem>
              <SelectItem value="light">明亮</SelectItem>
              <SelectItem value="dark">暗黑</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>界面语言</Label>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            注：MVP 版本仅支持中文
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ShortcutCardProps {
  shortcut: string;
}

function ShortcutCard({ shortcut }: ShortcutCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">快捷键</CardTitle>
        <CardDescription>使用快捷键快速收藏当前页面</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <span className="text-sm">快速收藏</span>
          <kbd className="px-2 py-1 bg-background border rounded text-sm font-mono">
            {shortcut}
          </kbd>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          如需修改快捷键，请前往浏览器扩展设置页面
        </p>
      </CardContent>
    </Card>
  );
}

interface PresetCategoriesCardProps {
  userCategories: { name: string }[];
  importing: boolean;
  importedCount: number;
  totalCount: number;
  onImport: () => void;
}

function PresetCategoriesCard({
  userCategories,
  importing,
  importedCount,
  totalCount,
  onImport,
}: PresetCategoriesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">预设分类系统</CardTitle>
        <CardDescription>
          导入常用的书签分类，配合智能分类功能使用
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {PRESET_CATEGORIES.slice(0, 8).map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 p-2 bg-muted rounded-md"
            >
              <span className="text-base">{cat.icon}</span>
              <span className="font-medium">{cat.name}</span>
              {isCategoryImported(cat.name, userCategories) && (
                <Check className="h-3 w-3 text-green-600 ml-auto" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            共 {totalCount} 个预设分类，已导入 {importedCount} 个
          </p>
          <Button
            onClick={onImport}
            disabled={importing}
            variant="outline"
            size="sm"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                导入全部预设分类
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
