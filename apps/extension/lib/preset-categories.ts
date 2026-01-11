/**
 * 预设分类系统
 * 提供两套常用的书签分类，供用户快速选择
 * 支持中英文双语
 */
import type { PresetCategory, HierarchicalCategory } from '@/types';

// ========== 中文版预设分类 ==========

/**
 * 方案一：通用型（信息获取 + 工作生活平衡）- 中文
 */
const PRESET_CATEGORIES_GENERAL_ZH: HierarchicalCategory[] = [
  {
    id: 'general-learning',
    name: '学习与知识',
    icon: '📚',
    children: [
      { id: 'general-learning-tech-docs', name: '技术文档', icon: '📄' },
      { id: 'general-learning-tutorials', name: '教程 / 课程', icon: '🎓' },
      { id: 'general-learning-research', name: '研究 / 深度文章', icon: '🔬' },
      { id: 'general-learning-notes', name: '笔记 / 摘要', icon: '📝' },
      { id: 'general-learning-ebooks', name: '电子书 / 资料库', icon: '📖' },
    ],
  },
  {
    id: 'general-work',
    name: '工作与效率',
    icon: '💼',
    children: [
      { id: 'general-work-projects', name: '项目相关', icon: '📋' },
      { id: 'general-work-tools', name: '工具 / SaaS', icon: '🛠️' },
      { id: 'general-work-design', name: '设计资源', icon: '🎨' },
      { id: 'general-work-writing', name: '写作 / 文案', icon: '✍️' },
      { id: 'general-work-collab', name: '协作 / 管理', icon: '👥' },
    ],
  },
  {
    id: 'general-reading',
    name: '资讯与阅读',
    icon: '📰',
    children: [
      { id: 'general-reading-news', name: '新闻', icon: '📢' },
      { id: 'general-reading-blogs', name: '博客', icon: '✏️' },
      { id: 'general-reading-industry', name: '行业动态', icon: '📊' },
      { id: 'general-reading-later', name: '长文待读', icon: '📑' },
      { id: 'general-reading-rss', name: '订阅源', icon: '📡' },
    ],
  },
  {
    id: 'general-tech',
    name: '技术与开发',
    icon: '💻',
    children: [
      { id: 'general-tech-frontend', name: '前端', icon: '🌐' },
      { id: 'general-tech-backend', name: '后端', icon: '⚙️' },
      { id: 'general-tech-ai', name: 'AI / 数据', icon: '🤖' },
      { id: 'general-tech-system', name: '系统 / 架构', icon: '🏗️' },
      { id: 'general-tech-opensource', name: '开源项目', icon: '🔓' },
    ],
  },
  {
    id: 'general-life',
    name: '生活与兴趣',
    icon: '🎉',
    children: [
      { id: 'general-life-entertainment', name: '娱乐', icon: '🎬' },
      { id: 'general-life-art', name: '摄影 / 艺术', icon: '📷' },
      { id: 'general-life-health', name: '健康', icon: '🏃' },
      { id: 'general-life-travel', name: '旅行', icon: '✈️' },
      { id: 'general-life-hobbies', name: '兴趣爱好', icon: '🎮' },
    ],
  },
];

/**
 * 方案二：专业创作者 / 技术向（高颗粒度）- 中文
 */
const PRESET_CATEGORIES_PROFESSIONAL_ZH: HierarchicalCategory[] = [
  {
    id: 'pro-tech',
    name: '技术',
    icon: '💻',
    children: [
      {
        id: 'pro-tech-langs',
        name: '编程语言',
        icon: '📝',
        children: [
          { id: 'pro-tech-langs-js', name: 'JavaScript', icon: '🟨' },
          { id: 'pro-tech-langs-python', name: 'Python', icon: '🐍' },
          { id: 'pro-tech-langs-other', name: '其他', icon: '📄' },
        ],
      },
      { id: 'pro-tech-frameworks', name: '框架 / 库', icon: '📦' },
      { id: 'pro-tech-ai', name: 'AI / LLM', icon: '🤖' },
      { id: 'pro-tech-system', name: '系统设计', icon: '🏗️' },
      { id: 'pro-tech-opensource', name: '开源生态', icon: '🔓' },
    ],
  },
  {
    id: 'pro-product',
    name: '产品与设计',
    icon: '🎨',
    children: [
      { id: 'pro-product-analysis', name: '产品分析', icon: '📊' },
      { id: 'pro-product-ux', name: '用户体验', icon: '👤' },
      { id: 'pro-product-design-system', name: '设计系统', icon: '🎯' },
      { id: 'pro-product-competitor', name: '竞品研究', icon: '🔍' },
      { id: 'pro-product-prototype', name: '原型 / Demo', icon: '🖼️' },
    ],
  },
  {
    id: 'pro-content',
    name: '内容创作',
    icon: '✏️',
    children: [
      { id: 'pro-content-material', name: '写作素材', icon: '📚' },
      { id: 'pro-content-skills', name: '表达技巧', icon: '🎤' },
      { id: 'pro-content-cases', name: '案例拆解', icon: '🔬' },
      { id: 'pro-content-channels', name: '发布渠道', icon: '📡' },
    ],
  },
  {
    id: 'pro-business',
    name: '商业与趋势',
    icon: '📈',
    children: [
      { id: 'pro-business-reports', name: '行业报告', icon: '📋' },
      { id: 'pro-business-startup', name: '创业 / 商业模式', icon: '🚀' },
      { id: 'pro-business-investment', name: '投资 / 市场', icon: '💰' },
      { id: 'pro-business-trends', name: '趋势判断', icon: '📊' },
    ],
  },
  {
    id: 'pro-resources',
    name: '工具与资源',
    icon: '🛠️',
    children: [
      { id: 'pro-resources-online', name: '在线工具', icon: '🌐' },
      { id: 'pro-resources-data', name: '数据资源', icon: '💾' },
      { id: 'pro-resources-templates', name: '模板 / 素材', icon: '📑' },
      { id: 'pro-resources-automation', name: '自动化', icon: '⚡' },
    ],
  },
];

// ========== 英文版预设分类 ==========

/**
 * 方案一：通用型 - 英文
 */
const PRESET_CATEGORIES_GENERAL_EN: HierarchicalCategory[] = [
  {
    id: 'general-learning',
    name: 'Learning & Knowledge',
    icon: '📚',
    children: [
      { id: 'general-learning-tech-docs', name: 'Technical Docs', icon: '📄' },
      { id: 'general-learning-tutorials', name: 'Tutorials / Courses', icon: '🎓' },
      { id: 'general-learning-research', name: 'Research / Articles', icon: '🔬' },
      { id: 'general-learning-notes', name: 'Notes / Summaries', icon: '📝' },
      { id: 'general-learning-ebooks', name: 'E-books / Libraries', icon: '📖' },
    ],
  },
  {
    id: 'general-work',
    name: 'Work & Productivity',
    icon: '💼',
    children: [
      { id: 'general-work-projects', name: 'Projects', icon: '📋' },
      { id: 'general-work-tools', name: 'Tools / SaaS', icon: '🛠️' },
      { id: 'general-work-design', name: 'Design Resources', icon: '🎨' },
      { id: 'general-work-writing', name: 'Writing / Copywriting', icon: '✍️' },
      { id: 'general-work-collab', name: 'Collaboration / Management', icon: '👥' },
    ],
  },
  {
    id: 'general-reading',
    name: 'News & Reading',
    icon: '📰',
    children: [
      { id: 'general-reading-news', name: 'News', icon: '📢' },
      { id: 'general-reading-blogs', name: 'Blogs', icon: '✏️' },
      { id: 'general-reading-industry', name: 'Industry Updates', icon: '📊' },
      { id: 'general-reading-later', name: 'Read Later', icon: '📑' },
      { id: 'general-reading-rss', name: 'RSS Feeds', icon: '📡' },
    ],
  },
  {
    id: 'general-tech',
    name: 'Tech & Development',
    icon: '💻',
    children: [
      { id: 'general-tech-frontend', name: 'Frontend', icon: '🌐' },
      { id: 'general-tech-backend', name: 'Backend', icon: '⚙️' },
      { id: 'general-tech-ai', name: 'AI / Data', icon: '🤖' },
      { id: 'general-tech-system', name: 'System / Architecture', icon: '🏗️' },
      { id: 'general-tech-opensource', name: 'Open Source', icon: '🔓' },
    ],
  },
  {
    id: 'general-life',
    name: 'Life & Interests',
    icon: '🎉',
    children: [
      { id: 'general-life-entertainment', name: 'Entertainment', icon: '🎬' },
      { id: 'general-life-art', name: 'Photography / Art', icon: '📷' },
      { id: 'general-life-health', name: 'Health', icon: '🏃' },
      { id: 'general-life-travel', name: 'Travel', icon: '✈️' },
      { id: 'general-life-hobbies', name: 'Hobbies', icon: '🎮' },
    ],
  },
];

/**
 * 方案二：专业创作者 / 技术向 - 英文
 */
const PRESET_CATEGORIES_PROFESSIONAL_EN: HierarchicalCategory[] = [
  {
    id: 'pro-tech',
    name: 'Technology',
    icon: '💻',
    children: [
      {
        id: 'pro-tech-langs',
        name: 'Programming Languages',
        icon: '📝',
        children: [
          { id: 'pro-tech-langs-js', name: 'JavaScript', icon: '🟨' },
          { id: 'pro-tech-langs-python', name: 'Python', icon: '🐍' },
          { id: 'pro-tech-langs-other', name: 'Others', icon: '📄' },
        ],
      },
      { id: 'pro-tech-frameworks', name: 'Frameworks / Libraries', icon: '📦' },
      { id: 'pro-tech-ai', name: 'AI / LLM', icon: '🤖' },
      { id: 'pro-tech-system', name: 'System Design', icon: '🏗️' },
      { id: 'pro-tech-opensource', name: 'Open Source Ecosystem', icon: '🔓' },
    ],
  },
  {
    id: 'pro-product',
    name: 'Product & Design',
    icon: '🎨',
    children: [
      { id: 'pro-product-analysis', name: 'Product Analysis', icon: '📊' },
      { id: 'pro-product-ux', name: 'User Experience', icon: '👤' },
      { id: 'pro-product-design-system', name: 'Design System', icon: '🎯' },
      { id: 'pro-product-competitor', name: 'Competitor Research', icon: '🔍' },
      { id: 'pro-product-prototype', name: 'Prototype / Demo', icon: '🖼️' },
    ],
  },
  {
    id: 'pro-content',
    name: 'Content Creation',
    icon: '✏️',
    children: [
      { id: 'pro-content-material', name: 'Writing Materials', icon: '📚' },
      { id: 'pro-content-skills', name: 'Expression Skills', icon: '🎤' },
      { id: 'pro-content-cases', name: 'Case Studies', icon: '🔬' },
      { id: 'pro-content-channels', name: 'Publishing Channels', icon: '📡' },
    ],
  },
  {
    id: 'pro-business',
    name: 'Business & Trends',
    icon: '📈',
    children: [
      { id: 'pro-business-reports', name: 'Industry Reports', icon: '📋' },
      { id: 'pro-business-startup', name: 'Startup / Business Model', icon: '🚀' },
      { id: 'pro-business-investment', name: 'Investment / Market', icon: '💰' },
      { id: 'pro-business-trends', name: 'Trend Analysis', icon: '📊' },
    ],
  },
  {
    id: 'pro-resources',
    name: 'Tools & Resources',
    icon: '🛠️',
    children: [
      { id: 'pro-resources-online', name: 'Online Tools', icon: '🌐' },
      { id: 'pro-resources-data', name: 'Data Resources', icon: '💾' },
      { id: 'pro-resources-templates', name: 'Templates / Assets', icon: '📑' },
      { id: 'pro-resources-automation', name: 'Automation', icon: '⚡' },
    ],
  },
];

// ========== 根据语言获取预设分类 ==========

/**
 * 根据语言获取通用型预设分类
 */
export function getPresetCategoriesGeneral(lang: string = 'zh'): HierarchicalCategory[] {
  return lang.startsWith('en') ? PRESET_CATEGORIES_GENERAL_EN : PRESET_CATEGORIES_GENERAL_ZH;
}

/**
 * 根据语言获取专业型预设分类
 */
export function getPresetCategoriesProfessional(lang: string = 'zh'): HierarchicalCategory[] {
  return lang.startsWith('en') ? PRESET_CATEGORIES_PROFESSIONAL_EN : PRESET_CATEGORIES_PROFESSIONAL_ZH;
}

// 导出默认版本（中文）以保持兼容
export const PRESET_CATEGORIES_GENERAL = PRESET_CATEGORIES_GENERAL_ZH;
export const PRESET_CATEGORIES_PROFESSIONAL = PRESET_CATEGORIES_PROFESSIONAL_ZH;

/**
 * 预设分类方案类型
 */
export type PresetCategoryScheme = 'general' | 'professional';

/**
 * 获取预设分类方案
 */
export function getPresetCategoryScheme(scheme: PresetCategoryScheme): HierarchicalCategory[] {
  return scheme === 'general' ? PRESET_CATEGORIES_GENERAL : PRESET_CATEGORIES_PROFESSIONAL;
}

/**
 * 将层级分类展平为扁平列表（用于存储）
 */
export function flattenCategories(
  categories: HierarchicalCategory[],
  parentId: string | null = null
): Array<{ id: string; name: string; parentId: string | null; icon?: string }> {
  const result: Array<{ id: string; name: string; parentId: string | null; icon?: string }> = [];
  
  for (const category of categories) {
    result.push({
      id: category.id,
      name: category.name,
      parentId,
      icon: category.icon,
    });
    
    if (category.children) {
      result.push(...flattenCategories(category.children, category.id));
    }
  }
  
  return result;
}

/**
 * 格式化分类为带层级关系的字符串（用于传递给 AI）
 * 例如: "技术 > 编程语言 > JavaScript"
 */
export function formatCategoryHierarchy(
  categories: HierarchicalCategory[],
  prefix = ''
): string[] {
  const lines: string[] = [];
  
  for (const category of categories) {
    const path = prefix ? `${prefix} > ${category.name}` : category.name;
    lines.push(path);
    
    if (category.children) {
      lines.push(...formatCategoryHierarchy(category.children, path));
    }
  }
  
  return lines;
}

/**
 * 将用户分类转换为层级结构（用于传递给 AI）
 */
export function buildCategoryTree(
  categories: Array<{ id: string; name: string; parentId: string | null }>
): HierarchicalCategory[] {
  const map = new Map<string, HierarchicalCategory>();
  const roots: HierarchicalCategory[] = [];
  
  // 第一遍：创建所有节点
  for (const cat of categories) {
    map.set(cat.id, { id: cat.id, name: cat.name });
  }
  
  // 第二遍：建立父子关系
  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      const parent = map.get(cat.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  
  return roots;
}

// ========== 旧版兼容 ==========

/**
 * 预设分类列表（旧版，保持兼容）
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
