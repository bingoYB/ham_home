/**
 * 预设分类系统
 * 提供一套常用的书签分类，供用户快速选择
 */
import type { PresetCategory } from '@/types';

/**
 * 预设分类列表
 * 包含常见的书签分类及其关键词，用于智能匹配
 */
export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'preset-tech',
    name: '技术开发',
    icon: '💻',
    description: '编程、开发工具、技术文档',
    keywords: [
      'github', 'stackoverflow', 'dev', 'code', 'programming', 'developer',
      '代码', '编程', '开发', 'api', 'documentation', 'docs', 'tutorial',
      'javascript', 'python', 'java', 'typescript', 'react', 'vue', 'node',
    ],
  },
  {
    id: 'preset-design',
    name: '设计资源',
    icon: '🎨',
    description: 'UI/UX设计、素材、灵感',
    keywords: [
      'design', 'ui', 'ux', 'figma', 'sketch', 'dribbble', 'behance',
      '设计', 'icon', 'color', 'font', 'typography', 'inspiration',
      'mockup', 'prototype', 'wireframe',
    ],
  },
  {
    id: 'preset-tools',
    name: '工具效率',
    icon: '🛠️',
    description: '生产力工具、实用软件',
    keywords: [
      'tool', 'utility', 'productivity', 'automation', 'workflow',
      '工具', '效率', 'chrome extension', 'app', 'software', 'saas',
      'notion', 'obsidian', 'vscode', 'editor',
    ],
  },
  {
    id: 'preset-ai',
    name: 'AI 人工智能',
    icon: '🤖',
    description: 'AI工具、机器学习、大语言模型',
    keywords: [
      'ai', 'artificial intelligence', 'machine learning', 'ml', 'chatgpt',
      'gpt', 'openai', 'claude', 'llm', 'neural', 'deep learning',
      '人工智能', '机器学习', '深度学习', 'prompt', 'model',
    ],
  },
  {
    id: 'preset-reading',
    name: '阅读学习',
    icon: '📚',
    description: '文章、博客、教程',
    keywords: [
      'blog', 'article', 'post', 'medium', 'read', 'tutorial', 'guide',
      '博客', '文章', '教程', 'learn', 'course', 'education', 'study',
      'book', 'documentation', 'wiki',
    ],
  },
  {
    id: 'preset-news',
    name: '新闻资讯',
    icon: '📰',
    description: '科技新闻、行业动态',
    keywords: [
      'news', 'techcrunch', 'hackernews', 'reddit', 'twitter',
      '新闻', '资讯', 'press', 'media', 'tech news', 'update',
      'announcement', 'release',
    ],
  },
  {
    id: 'preset-video',
    name: '视频影音',
    icon: '🎬',
    description: 'YouTube、课程视频',
    keywords: [
      'youtube', 'video', 'watch', 'bilibili', 'vimeo', 'ted',
      '视频', '影片', 'movie', 'course', 'lecture', 'tutorial video',
      'stream', 'podcast',
    ],
  },
  {
    id: 'preset-social',
    name: '社交媒体',
    icon: '👥',
    description: '社交网络、社区',
    keywords: [
      'twitter', 'facebook', 'instagram', 'linkedin', 'social',
      '社交', 'community', 'forum', 'discord', 'slack', 'wechat',
      '微信', '微博', 'weibo',
    ],
  },
  {
    id: 'preset-shopping',
    name: '购物消费',
    icon: '🛒',
    description: '电商、购物、产品',
    keywords: [
      'shop', 'buy', 'amazon', 'taobao', 'jd', 'product', 'store',
      '购物', '淘宝', '京东', 'ecommerce', 'cart', 'price', 'deal',
      'discount', 'coupon',
    ],
  },
  {
    id: 'preset-travel',
    name: '旅行出行',
    icon: '✈️',
    description: '旅游、攻略、地图',
    keywords: [
      'travel', 'trip', 'hotel', 'flight', 'booking', 'airbnb',
      '旅行', '旅游', 'tour', 'map', 'destination', 'guide',
      'vacation', 'holiday',
    ],
  },
  {
    id: 'preset-finance',
    name: '财经金融',
    icon: '💰',
    description: '投资、理财、经济',
    keywords: [
      'finance', 'investment', 'stock', 'crypto', 'bitcoin', 'trading',
      '金融', '投资', '理财', 'money', 'bank', 'economy', 'market',
      'fund', 'portfolio',
    ],
  },
  {
    id: 'preset-health',
    name: '健康生活',
    icon: '🏃',
    description: '健康、运动、养生',
    keywords: [
      'health', 'fitness', 'workout', 'exercise', 'nutrition', 'diet',
      '健康', '运动', '健身', 'yoga', 'meditation', 'wellness',
      'medical', 'doctor',
    ],
  },
  {
    id: 'preset-entertainment',
    name: '娱乐休闲',
    icon: '🎮',
    description: '游戏、娱乐、音乐',
    keywords: [
      'game', 'gaming', 'entertainment', 'music', 'spotify', 'steam',
      '游戏', '娱乐', 'play', 'fun', 'hobby', 'leisure',
      'movie', 'tv', 'show',
    ],
  },
  {
    id: 'preset-reference',
    name: '参考资料',
    icon: '📖',
    description: '文档、手册、规范',
    keywords: [
      'reference', 'documentation', 'manual', 'specification', 'standard',
      '参考', '文档', 'cheatsheet', 'guide', 'handbook', 'wiki',
      'mdn', 'w3c', 'rfc',
    ],
  },
  {
    id: 'preset-work',
    name: '工作事务',
    icon: '💼',
    description: '工作相关、项目管理',
    keywords: [
      'work', 'job', 'career', 'project', 'management', 'business',
      '工作', '项目', 'meeting', 'task', 'jira', 'trello', 'asana',
      'productivity', 'collaboration',
    ],
  },
];

/**
 * 根据关键词智能匹配分类
 * @param text 要匹配的文本（通常是 URL + 标题 + 内容）
 * @param threshold 匹配阈值（0-1），默认 0.3
 * @returns 匹配的分类列表，按置信度排序
 */
export function matchCategories(
  text: string,
  threshold = 0.3
): Array<{ category: PresetCategory; confidence: number }> {
  const lowerText = text.toLowerCase();
  const results: Array<{ category: PresetCategory; confidence: number }> = [];

  for (const category of PRESET_CATEGORIES) {
    let matchCount = 0;
    const totalKeywords = category.keywords.length;

    // 统计匹配的关键词数量
    for (const keyword of category.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // 计算置信度
    const confidence = matchCount / totalKeywords;

    if (confidence >= threshold) {
      results.push({ category, confidence });
    }
  }

  // 按置信度降序排序
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

/**
 * 获取最佳匹配分类
 * @param text 要匹配的文本
 * @param threshold 匹配阈值
 * @returns 最佳匹配的分类，如果没有匹配则返回 null
 */
export function getBestMatchCategory(
  text: string,
  threshold = 0.3
): PresetCategory | null {
  const matches = matchCategories(text, threshold);
  return matches.length > 0 ? matches[0].category : null;
}

/**
 * 根据 ID 查找预设分类
 */
export function getPresetCategoryById(id: string): PresetCategory | undefined {
  return PRESET_CATEGORIES.find((c) => c.id === id);
}

/**
 * 初始化预设分类到用户的分类列表
 * 用户可以选择导入全部或部分预设分类
 */
export function getPresetCategoriesToImport(selectedIds?: string[]): PresetCategory[] {
  if (!selectedIds || selectedIds.length === 0) {
    return PRESET_CATEGORIES;
  }
  return PRESET_CATEGORIES.filter((c) => selectedIds.includes(c.id));
}

