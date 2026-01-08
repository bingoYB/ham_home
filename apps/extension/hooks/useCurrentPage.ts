/**
 * useCurrentPage Hook
 * 获取当前页面内容
 */
import { useState, useEffect } from 'react';
import type { PageContent } from '@/types';

interface UseCurrentPageResult {
  pageContent: PageContent | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCurrentPage(): UseCurrentPageResult {
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id || !tab.url) {
        setError('无法获取当前页面信息');
        setLoading(false);
        return;
      }

      // 检查是否是特殊页面（chrome://、edge:// 等）
      if (
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('about:')
      ) {
        setError('无法收藏浏览器内部页面');
        setLoading(false);
        return;
      }

      // 向 content script 发送消息提取内容
      const content = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_CONTENT',
      });

      if (content) {
        setPageContent(content);
      } else {
        // 如果 content script 未返回内容，使用基本信息
        setPageContent({
          url: tab.url,
          title: tab.title || '',
          content: '',
          textContent: '',
          excerpt: '',
          favicon: tab.favIconUrl || '',
        });
      }
    } catch (err) {
      console.error('[useCurrentPage] Error:', err);
      
      // 尝试获取基本标签页信息作为 fallback
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        
        if (tab?.url) {
          setPageContent({
            url: tab.url,
            title: tab.title || '',
            content: '',
            textContent: '',
            excerpt: '',
            favicon: tab.favIconUrl || '',
          });
        } else {
          setError('获取页面内容失败');
        }
      } catch {
        setError('获取页面内容失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  return {
    pageContent,
    loading,
    error,
    refresh: fetchContent,
  };
}

