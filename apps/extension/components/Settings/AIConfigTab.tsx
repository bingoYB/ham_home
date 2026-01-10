/**
 * AI 配置标签页
 * UI 层：负责 JSX 渲染、样式布局、事件绑定
 */
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
import { useAIConfig } from '@/hooks/useAIConfig';
import type { AIProvider } from '@/types';

export function AIConfigTab() {
  const {
    config,
    loading,
    saving,
    testing,
    testResult,
    updateConfig,
    changeProvider,
    saveConfig,
    testConnection,
  } = useAIConfig();

  // 加载状态
  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 启用开关 */}
      <EnableAICard
        enabled={config.enabled}
        onToggle={(checked) => updateConfig({ enabled: checked })}
      />

      {/* AI 配置表单 */}
      {config.enabled && (
        <>
          <AIServiceConfigCard
            config={config}
            saving={saving}
            testing={testing}
            testResult={testResult}
            onUpdateConfig={updateConfig}
            onChangeProvider={changeProvider}
            onSave={saveConfig}
            onTest={testConnection}
          />

          <SmartFeaturesCard
            config={config}
            saving={saving}
            onUpdateConfig={updateConfig}
            onSave={saveConfig}
          />
        </>
      )}
    </div>
  );
}

// ========== 子组件 ==========

interface EnableAICardProps {
  enabled: boolean;
  onToggle: (checked: boolean) => void;
}

function EnableAICard({ enabled, onToggle }: EnableAICardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">启用 AI 分析</CardTitle>
            <CardDescription>
              开启后，收藏时将自动分析网页内容生成摘要和标签
            </CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
    </Card>
  );
}

interface AIServiceConfigCardProps {
  config: {
    provider: AIProvider;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  saving: boolean;
  testing: boolean;
  testResult: { success: boolean; message: string } | null;
  onUpdateConfig: (updates: Record<string, unknown>) => void;
  onChangeProvider: (provider: AIProvider) => void;
  onSave: () => void;
  onTest: () => void;
}

function AIServiceConfigCard({
  config,
  saving,
  testing,
  testResult,
  onUpdateConfig,
  onChangeProvider,
  onSave,
  onTest,
}: AIServiceConfigCardProps) {
  return (
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
            onValueChange={(v) => onChangeProvider(v as AIProvider)}
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
              onChange={(e) => onUpdateConfig({ apiKey: e.target.value })}
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
              onChange={(e) => onUpdateConfig({ baseUrl: e.target.value })}
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
            onChange={(e) => onUpdateConfig({ model: e.target.value })}
            placeholder={getDefaultModel(config.provider)}
          />
        </div>

        {/* 高级参数 */}
        <AdvancedParams
          temperature={config.temperature}
          maxTokens={config.maxTokens}
          onUpdateConfig={onUpdateConfig}
        />

        {/* 测试结果 */}
        {testResult && <TestResultBanner result={testResult} />}

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-2">
          <Button onClick={onSave} disabled={saving || testing}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存配置
          </Button>
          <Button
            variant="outline"
            onClick={onTest}
            disabled={testing || saving}
          >
            {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            测试连接
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface AdvancedParamsProps {
  temperature?: number;
  maxTokens?: number;
  onUpdateConfig: (updates: Record<string, unknown>) => void;
}

function AdvancedParams({
  temperature,
  maxTokens,
  onUpdateConfig,
}: AdvancedParamsProps) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
        高级参数
      </summary>
      <div className="mt-3 space-y-4 pl-1">
        <div className="space-y-2">
          <Label>Temperature: {temperature}</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature || 0.3}
            onChange={(e) =>
              onUpdateConfig({ temperature: parseFloat(e.target.value) })
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
            value={maxTokens || 1000}
            onChange={(e) =>
              onUpdateConfig({ maxTokens: parseInt(e.target.value) || 1000 })
            }
            min={100}
            max={4000}
          />
        </div>
      </div>
    </details>
  );
}

interface TestResultBannerProps {
  result: { success: boolean; message: string };
}

function TestResultBanner({ result }: TestResultBannerProps) {
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-md text-sm ${
        result.success
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'bg-destructive/10 text-destructive'
      }`}
    >
      {result.success ? (
        <Check className="h-4 w-4" />
      ) : (
        <X className="h-4 w-4" />
      )}
      {result.message}
    </div>
  );
}

interface SmartFeaturesCardProps {
  config: {
    enableTagSuggestion?: boolean;
    enableSmartCategory?: boolean;
    enableTranslation?: boolean;
  };
  saving: boolean;
  onUpdateConfig: (updates: Record<string, unknown>) => void;
  onSave: () => void;
}

function SmartFeaturesCard({
  config,
  saving,
  onUpdateConfig,
  onSave,
}: SmartFeaturesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">智能功能</CardTitle>
        <CardDescription>
          配置 AI 辅助功能，提升书签管理效率
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 智能标签推荐 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>智能标签推荐</Label>
            <p className="text-xs text-muted-foreground">
              根据内容和历史标签推荐相关标签
            </p>
          </div>
          <Switch
            checked={config.enableTagSuggestion}
            onCheckedChange={(checked) =>
              onUpdateConfig({ enableTagSuggestion: checked })
            }
          />
        </div>

        {/* 智能分类 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>智能分类</Label>
            <p className="text-xs text-muted-foreground">
              自动推荐最合适的分类
            </p>
          </div>
          <Switch
            checked={config.enableSmartCategory}
            onCheckedChange={(checked) =>
              onUpdateConfig({ enableSmartCategory: checked })
            }
          />
        </div>

        {/* 内容翻译 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>自动翻译</Label>
            <p className="text-xs text-muted-foreground">
              将 AI 生成的标签和摘要翻译为中文
            </p>
          </div>
          <Switch
            checked={config.enableTranslation}
            onCheckedChange={(checked) =>
              onUpdateConfig({ enableTranslation: checked })
            }
          />
        </div>

        <div className="pt-2">
          <Button onClick={onSave} disabled={saving} variant="outline">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存智能功能配置
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
