/**
 * useCurrentPage Hook
 * 获取当前页面内容
 */
import { useState, useEffect } from 'react';
import type { PageContent } from '@/types';
import { containsPrivateContent, isNonBookmarkableUrl } from '../lib/privacy';

interface UseCurrentPageResult {
  pageContent: PageContent | null;
  loading: boolean;
  error: string | null;
  /** 是否为隐私页面 */
  isPrivate: boolean;
  /** 隐私原因 */
  privacyReason: string | null;
  refresh: () => Promise<void>;
}

export function useCurrentPage(): UseCurrentPageResult {
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privacyReason, setPrivacyReason] = useState<string | null>(null);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    setIsPrivate(false);
    setPrivacyReason(null);

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

      // 检查是否是特殊页面（使用 privacy 模块统一检测）
      if (isNonBookmarkableUrl(tab.url)) {
        setError('无法收藏浏览器内部页面');
        setIsPrivate(true);
        setPrivacyReason('浏览器内部页面');
        setLoading(false);
        return;
      }

      // 检测隐私内容
      const privacyCheck = await containsPrivateContent(tab.url);
      setIsPrivate(privacyCheck.isPrivate);
      setPrivacyReason(privacyCheck.reason || null);

      // 如果是隐私页面，只返回基本信息，不提取页面内容
      if (privacyCheck.isPrivate) {
        setPageContent({
          url: tab.url,
          title: tab.title || '',
          content: '',
          textContent: '',
          excerpt: '',
          favicon: tab.favIconUrl || '',
          isPrivate: true,
          privacyReason: privacyCheck.reason,
        });
        setLoading(false);
        return;
      }

      // 向 content script 发送消息提取内容
      const content = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_CONTENT',
      });

      if (content) {
        setPageContent({
          ...content,
          isPrivate: false,
        });
      } else {
        // 如果 content script 未返回内容，使用基本信息
        setPageContent({
          url: tab.url,
          title: tab.title || '',
          content: '',
          textContent: '',
          excerpt: '',
          favicon: tab.favIconUrl || '',
          isPrivate: false,
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
          // 即使出错也检测隐私状态
          const privacyCheck = await containsPrivateContent(tab.url);
          setIsPrivate(privacyCheck.isPrivate);
          setPrivacyReason(privacyCheck.reason || null);

          setPageContent({
            url: tab.url,
            title: tab.title || '',
            content: '',
            textContent: '',
            excerpt: '',
            favicon: tab.favIconUrl || '',
            isPrivate: privacyCheck.isPrivate,
            privacyReason: privacyCheck.reason,
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
    isPrivate,
    privacyReason,
    refresh: fetchContent,
  };
}

