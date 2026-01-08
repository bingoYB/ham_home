/**
 * AI 配置标签页
 */
import { useState, useEffect } from 'react';
import {
  Button,
  Input,
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
import { Loader2, Check, X } from 'lucide-react';
import { getDefaultModel } from '@hamhome/ai';
import { configStorage } from '@/lib/storage';
import { aiClient } from '@/lib/ai/client';
import type { AIConfig, AIProvider } from '@/types';

export function AIConfigTab() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    configStorage.getAIConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const updateConfig = (updates: Partial<AIConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
    setTestResult(null); // 清除测试结果
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      await configStorage.setAIConfig(config);
      aiClient.reset(); // 重置客户端
      setTestResult({ success: true, message: 'AI 配置已保存' });
    } catch {
      setTestResult({ success: false, message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config) return;

    setTesting(true);
    setTestResult(null);

    try {
      // 先保存配置
      await configStorage.setAIConfig(config);
      aiClient.reset();

      // 测试连接
      const result = await aiClient.testConnection();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : '测试失败',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 启用开关 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">启用 AI 分析</CardTitle>
              <CardDescription>
                开启后，收藏时将自动分析网页内容生成摘要和标签
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => updateConfig({ enabled: checked })}
            />
          </div>
        </CardHeader>
      </Card>

      {/* AI 配置表单 */}
      {config.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI 服务配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 服务商选择 */}
            <div className="space-y-2">
              <Label>AI 服务商</Label>
              <Select
                value={config.provider}
                onValueChange={(v) => {
                  const provider = v as AIProvider;
                  updateConfig({
                    provider,
                    model: getDefaultModel(provider),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="ollama">Ollama (本地)</SelectItem>
                  <SelectItem value="custom">自定义 (兼容 OpenAI API)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Key（Ollama 不需要） */}
            {config.provider !== 'ollama' && (
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => updateConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                />
                <p className="text-xs text-muted-foreground">
                  你的 API Key 仅存储在本地，不会上传至任何服务器
                </p>
              </div>
            )}

            {/* Base URL（Ollama 和自定义需要） */}
            {(config.provider === 'ollama' || config.provider === 'custom') && (
              <div className="space-y-2">
                <Label>
                  {config.provider === 'ollama' ? 'Ollama 地址' : '自定义端点'}
                </Label>
                <Input
                  value={config.baseUrl || ''}
                  onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                  placeholder={
                    config.provider === 'ollama'
                      ? 'http://localhost:11434/v1'
                      : 'https://api.example.com/v1'
                  }
                />
              </div>
            )}

            {/* 模型 */}
            <div className="space-y-2">
              <Label>模型</Label>
              <Input
                value={config.model || ''}
                onChange={(e) => updateConfig({ model: e.target.value })}
                placeholder={getDefaultModel(config.provider)}
              />
            </div>

            {/* 高级参数 */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                高级参数
              </summary>
              <div className="mt-3 space-y-4 pl-1">
                <div className="space-y-2">
                  <Label>Temperature: {config.temperature}</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.temperature || 0.3}
                    onChange={(e) =>
                      updateConfig({ temperature: parseFloat(e.target.value) })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    值越低结果越确定，值越高结果越随机
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={config.maxTokens || 1000}
                    onChange={(e) =>
                      updateConfig({ maxTokens: parseInt(e.target.value) || 1000 })
                    }
                    min={100}
                    max={4000}
                  />
                </div>
              </div>
            </details>

            {/* 测试结果 */}
            {testResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                  testResult.success
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {testResult.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving || testing}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存配置
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || saving}
              >
                {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                测试连接
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

