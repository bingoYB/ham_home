/**
 * useAIConfig Hook
 * AI 配置的业务逻辑层
 */
import { useState, useEffect, useCallback } from 'react';
import { getDefaultModel } from '@hamhome/ai';
import { configStorage } from '@/lib/storage';
import { aiClient } from '@/lib/ai/client';
import type { AIConfig, AIProvider } from '@/types';

interface TestResult {
  success: boolean;
  message: string;
}

interface UseAIConfigResult {
  // 状态
  config: AIConfig | null;
  loading: boolean;
  saving: boolean;
  testing: boolean;
  testResult: TestResult | null;

  // 操作
  updateConfig: (updates: Partial<AIConfig>) => void;
  changeProvider: (provider: AIProvider) => void;
  saveConfig: () => Promise<void>;
  testConnection: () => Promise<void>;
}

export function useAIConfig(): UseAIConfigResult {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 加载配置
  useEffect(() => {
    configStorage.getAIConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  /**
   * 更新配置（本地状态）
   */
  const updateConfig = useCallback((updates: Partial<AIConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
    setTestResult(null); // 清除测试结果
  }, []);

  /**
   * 切换 AI 服务商（会同时更新默认模型）
   */
  const changeProvider = useCallback((provider: AIProvider) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        provider,
        model: getDefaultModel(provider),
      };
    });
    setTestResult(null);
  }, []);

  /**
   * 保存配置到存储
   */
  const saveConfig = useCallback(async () => {
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
  }, [config]);

  /**
   * 测试 AI 连接
   */
  const testConnection = useCallback(async () => {
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
  }, [config]);

  return {
    config,
    loading,
    saving,
    testing,
    testResult,
    updateConfig,
    changeProvider,
    saveConfig,
    testConnection,
  };
}

