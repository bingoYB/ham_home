/**
 * 通用设置标签页
 */
import { useState, useEffect } from 'react';
import {
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hamhome/ui';
import { Loader2 } from 'lucide-react';
import { configStorage } from '@/lib/storage';
import type { LocalSettings } from '@/types';

export function GeneralSettingsTab() {
  const [settings, setSettings] = useState<LocalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configStorage.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleChange = async <K extends keyof LocalSettings>(
    key: K,
    value: LocalSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await configStorage.setSettings({ [key]: value });

    // 如果是主题变化，立即应用
    if (key === 'theme') {
      applyTheme(value as LocalSettings['theme']);
    }
  };

  const applyTheme = (theme: LocalSettings['theme']) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 自动保存快照 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">自动保存快照</CardTitle>
              <CardDescription>
                收藏时自动保存网页的本地副本，防止链接失效
              </CardDescription>
            </div>
            <Switch
              checked={settings.autoSaveSnapshot}
              onCheckedChange={(checked) =>
                handleChange('autoSaveSnapshot', checked)
              }
            />
          </div>
        </CardHeader>
      </Card>

      {/* 外观设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">外观设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>主题模式</Label>
            <Select
              value={settings.theme}
              onValueChange={(v) =>
                handleChange('theme', v as LocalSettings['theme'])
              }
            >
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
            <Select
              value={settings.language}
              onValueChange={(v) =>
                handleChange('language', v as LocalSettings['language'])
              }
            >
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

      {/* 快捷键 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">快捷键</CardTitle>
          <CardDescription>
            使用快捷键快速收藏当前页面
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <span className="text-sm">快速收藏</span>
            <kbd className="px-2 py-1 bg-background border rounded text-sm font-mono">
              {settings.shortcut}
            </kbd>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            如需修改快捷键，请前往浏览器扩展设置页面
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

