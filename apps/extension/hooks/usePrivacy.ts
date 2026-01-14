/**
 * usePrivacy Hook
 * 检测当前页面是否涉及隐私
 */
import { useState, useEffect, useCallback } from 'react';
import { containsPrivateContent, isNonBookmarkableUrl, type PrivacyCheckResult } from '../lib/privacy';

interface UsePrivacyResult {
  /** 隐私检测结果 */
  privacyCheck: PrivacyCheckResult | null;
  /** 是否正在检测 */
  loading: boolean;
  /** 是否为不可收藏的 URL */
  isNonBookmarkable: boolean;
  /** 重新检测 */
  recheck: (url: string) => Promise<void>;
}

/**
 * 检测页面隐私状态的 Hook
 * @param url - 要检测的 URL
 */
export function usePrivacy(url: string | undefined): UsePrivacyResult {
  const [privacyCheck, setPrivacyCheck] = useState<PrivacyCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNonBookmarkable, setIsNonBookmarkable] = useState(false);

  const checkPrivacy = useCallback(async (targetUrl: string) => {
    setLoading(true);

    try {
      // 首先检查是否为不可收藏的 URL
      const nonBookmarkable = isNonBookmarkableUrl(targetUrl);
      setIsNonBookmarkable(nonBookmarkable);

      if (nonBookmarkable) {
        setPrivacyCheck({ isPrivate: true, reason: '浏览器内部页面' });
        return;
      }

      // 检测隐私内容
      const result = await containsPrivateContent(targetUrl);
      setPrivacyCheck(result);
    } catch (error) {
      console.error('[usePrivacy] Error:', error);
      // 出错时保守处理
      setPrivacyCheck({ isPrivate: true, reason: '检测失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (url) {
      checkPrivacy(url);
    } else {
      setPrivacyCheck(null);
      setIsNonBookmarkable(false);
    }
  }, [url, checkPrivacy]);

  return {
    privacyCheck,
    loading,
    isNonBookmarkable,
    recheck: checkPrivacy,
  };
}
