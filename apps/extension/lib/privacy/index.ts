/**
 * 隐私检测模块导出
 */
export {
  containsPrivateContent,
  isNonBookmarkableUrl,
  getPrivacyRulesDescription,
  PRIVACY_PATTERNS,
  PRIVATE_DOMAINS,
} from './privacy-detector';

export type {
  PrivacyRule,
  PrivacyCheckResult,
} from './privacy-detector';
