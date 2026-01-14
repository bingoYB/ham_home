/**
 * 隐私检测模块
 * 自动检测 URL 是否涉及隐私内容，保护用户隐私
 */

import { configStorage } from '../storage/config-storage';

/**
 * 隐私检测规则
 */
export interface PrivacyRule {
  pattern: RegExp;
  scope: 'pathname' | 'search' | 'full';
  description: string;
}

/**
 * 隐私检测结果
 */
export interface PrivacyCheckResult {
  isPrivate: boolean;
  reason?: string;
  matchedRule?: string;
}

/**
 * 隐私相关路径模式
 */
const PRIVACY_PATTERNS: Record<string, PrivacyRule> = {
  // 认证相关页面
  auth: {
    pattern: /^.*\/(?:login|signin|signup|register|password|auth|oauth|sso)(?:\/|$)/i,
    scope: 'pathname',
    description: '认证页面',
  },

  // 验证和确认页面
  verification: {
    pattern: /^.*\/(?:verify|confirmation|activate|reset)(?:\/|$)/i,
    scope: 'pathname',
    description: '验证确认页面',
  },

  // 邮箱和消息页面
  mail: {
    pattern: /^.*\/(?:mail|inbox|compose|message|chat|conversation)(?:\/|$)/i,
    scope: 'pathname',
    description: '邮件消息页面',
  },

  // 个人账户和设置页面
  account: {
    pattern: /^.*\/(?:profile|account|settings|preferences|dashboard|admin)(?:\/|$)/i,
    scope: 'pathname',
    description: '账户设置页面',
  },

  // 支付和财务页面
  payment: {
    pattern: /^.*\/(?:payment|billing|invoice|subscription|wallet|checkout|order)(?:\/|$)/i,
    scope: 'pathname',
    description: '支付财务页面',
  },

  // 敏感查询参数
  sensitiveParams: {
    pattern: /[?&](?:token|auth|key|password|secret|access_token|refresh_token|session|code)=/i,
    scope: 'search',
    description: '包含敏感参数',
  },
};

/**
 * 敏感域名列表
 */
const PRIVATE_DOMAINS: Record<string, string[]> = {
  // 邮箱服务
  mail: [
    'mail.google.com',
    'outlook.office.com',
    'mail.qq.com',
    'mail.163.com',
    'mail.126.com',
    'mail.sina.com',
    'mail.yahoo.com',
  ],
  // 网盘服务
  storage: [
    'drive.google.com',
    'onedrive.live.com',
    'dropbox.com',
    'pan.baidu.com',
  ],
  // 社交和通讯平台的私密页面
  social: [
    'messages.google.com',
    'web.whatsapp.com',
    'web.telegram.org',
    'discord.com/channels',
  ],
  // 在线办公和协作平台的私密页面
  workspace: [
    'docs.google.com',
    'sheets.googleapis.com',
    'notion.so',
  ],
  // 银行和金融
  banking: [
    'online.cmbchina.com',  // 招商银行
    'pbsz.ebank.cmbchina.com',
    'ebank.spdb.com.cn',     // 浦发银行
    'mybank.icbc.com.cn',    // 工商银行
    'perbank.abchina.com',   // 农业银行
  ],
};

/**
 * 公开页面例外规则
 */
const EXCEPTION_RULES: Record<string, {
  patterns: RegExp[];
  domains?: string[];
}> = {
  // 公开的文档页面
  workspace: {
    patterns: [
      /\/public\//i,
      /[?&]sharing=public/i,
      /[?&]view=public/i,
    ],
  },
  // 公开的个人主页
  account: {
    patterns: [
      /\/public\/profile\//i,
      /\/users\/[^/]+$/i,
      /\/@[^/]+$/i,
    ],
  },
  // 允许特定域名的登录相关页面（如开发文档）
  auth: {
    patterns: [],
    domains: [
      'developer.mozilla.org',
      'docs.github.com',
      'learn.microsoft.com',
    ],
  },
  // 公开的支付文档或 API 文档
  payment: {
    patterns: [
      /\/docs\/payment/i,
      /\/api\/payment/i,
      /\/guides\/billing/i,
    ],
  },
};

/**
 * 检查是否应允许例外
 */
function shouldAllowException(url: string, ruleKey: string, context?: string): boolean {
  try {
    const urlObj = new URL(url);
    const exception = EXCEPTION_RULES[context || ruleKey];

    if (!exception) return false;

    // 检查域名例外
    if (exception.domains?.some(domain => urlObj.hostname.endsWith(domain))) {
      return true;
    }

    // 检查路径模式例外
    if (exception.patterns?.some(pattern => pattern.test(url))) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 检查 URL 是否匹配自定义隐私域名
 */
function matchCustomDomain(hostname: string, pattern: string): boolean {
  // 处理正则表达式模式
  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    try {
      const regex = new RegExp(pattern.slice(1, -1));
      return regex.test(hostname);
    } catch {
      return false;
    }
  }

  // 处理通配符模式
  if (pattern.startsWith('*.')) {
    const domain = pattern.slice(2);
    return hostname.endsWith(domain);
  }

  // 处理普通域名
  return hostname === pattern;
}

/**
 * 检查 URL 是否包含隐私内容
 */
export async function containsPrivateContent(url: string): Promise<PrivacyCheckResult> {
  try {
    const urlObj = new URL(url);

    // 1. 检查敏感域名
    for (const [category, domains] of Object.entries(PRIVATE_DOMAINS)) {
      const matchedDomain = domains.find(
        domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );

      if (matchedDomain) {
        // 检查是否有例外情况
        if (shouldAllowException(url, 'domain', category)) {
          continue;
        }

        return {
          isPrivate: true,
          reason: `属于隐私域名类别: ${category}`,
          matchedRule: matchedDomain,
        };
      }
    }

    // 2. 检查路径和查询参数模式
    for (const [key, rule] of Object.entries(PRIVACY_PATTERNS)) {
      let testString: string;

      switch (rule.scope) {
        case 'pathname':
          testString = urlObj.pathname;
          break;
        case 'search':
          testString = urlObj.search;
          break;
        case 'full':
          testString = url;
          break;
        default:
          continue;
      }

      if (rule.pattern.test(testString)) {
        // 检查是否有例外情况
        if (shouldAllowException(url, key)) {
          continue;
        }

        return {
          isPrivate: true,
          reason: rule.description,
          matchedRule: key,
        };
      }
    }

    // 3. 检查自定义隐私域名
    const config = await configStorage.getAIConfig();
    const customDomains = config.privacyDomains || [];

    for (const pattern of customDomains) {
      if (matchCustomDomain(urlObj.hostname, pattern)) {
        return {
          isPrivate: true,
          reason: '匹配自定义隐私域名',
          matchedRule: pattern,
        };
      }
    }

    return { isPrivate: false };
  } catch (error) {
    console.error('[PrivacyDetector] Error checking privacy content:', error);
    // 出错时从安全角度返回 true
    return {
      isPrivate: true,
      reason: '检测过程出错，默认保护隐私',
    };
  }
}

/**
 * 检查 URL 是否为不可收藏的特殊页面
 */
export function isNonBookmarkableUrl(url: string): boolean {
  const nonBookmarkablePatterns = [
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^edge:\/\//i,
    /^about:/i,
    /^moz-extension:\/\//i,
    /^file:\/\//i,
    /^data:/i,
    /^javascript:/i,
    /^view-source:/i,
  ];

  return nonBookmarkablePatterns.some(pattern => pattern.test(url));
}

/**
 * 获取所有隐私规则描述（用于设置页面展示）
 */
export function getPrivacyRulesDescription(): Array<{
  name: string;
  description: string;
}> {
  return [
    { name: '认证页面', description: '登录、注册、密码重置等页面' },
    { name: '个人账户页面', description: '个人资料、账户设置、管理后台等页面' },
    { name: '支付页面', description: '支付、账单、订阅管理等页面' },
    { name: '邮件消息页面', description: '邮箱、私信、聊天等页面' },
    { name: '敏感参数', description: '包含 token、密钥等敏感信息的 URL' },
  ];
}

export { PRIVACY_PATTERNS, PRIVATE_DOMAINS };
