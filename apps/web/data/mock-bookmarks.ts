/**
 * Mock 书签数据 - 产品介绍页使用
 */

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  categoryId: string;
  tags: string[];
  favicon?: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

// 中文分类数据
export const mockCategories: Category[] = [
  { id: 'cat-1', name: '技术开发', parentId: null, order: 1 },
  { id: 'cat-2', name: '前端框架', parentId: 'cat-1', order: 1 },
  { id: 'cat-3', name: '后端技术', parentId: 'cat-1', order: 2 },
  { id: 'cat-4', name: '设计资源', parentId: null, order: 2 },
  { id: 'cat-5', name: 'AI 与机器学习', parentId: null, order: 3 },
  { id: 'cat-6', name: '产品工具', parentId: null, order: 4 },
  { id: 'cat-7', name: '学习资料', parentId: null, order: 5 },
];

// 中文书签数据
export const mockBookmarks: Bookmark[] = [
  // 前端框架 (cat-2)
  {
    id: 'bk-1',
    url: 'https://react.dev/',
    title: 'React - The library for web and native user interfaces',
    description: 'React 官方文档，提供了最新的 React 18 特性说明、教程和 API 参考，是学习现代 React 开发的权威资源。',
    categoryId: 'cat-2',
    tags: ['React', 'JavaScript', '前端框架', '官方文档'],
    favicon: 'https://react.dev/favicon.ico',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'bk-2',
    url: 'https://vuejs.org/',
    title: 'Vue.js - The Progressive JavaScript Framework',
    description: 'Vue.js 是一款渐进式 JavaScript 框架，易于上手，性能出色，适合构建各种规模的 Web 应用。',
    categoryId: 'cat-2',
    tags: ['Vue', 'JavaScript', '前端框架'],
    favicon: 'https://vuejs.org/logo.svg',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'bk-6',
    url: 'https://nextjs.org/',
    title: 'Next.js by Vercel - The React Framework for the Web',
    description: 'Next.js 是一个用于生产环境的 React 框架，提供了服务端渲染、静态生成等多种渲染模式。',
    categoryId: 'cat-2',
    tags: ['Next.js', 'React', 'SSR', '全栈'],
    favicon: 'https://nextjs.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'bk-10',
    url: 'https://www.typescriptlang.org/',
    title: 'TypeScript: JavaScript With Syntax For Types',
    description: 'TypeScript 是 JavaScript 的超集，添加了静态类型系统，让大型应用的开发更加可靠和高效。',
    categoryId: 'cat-2',
    tags: ['TypeScript', 'JavaScript', '类型系统'],
    favicon: 'https://www.typescriptlang.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 6,
  },
  // 后端技术 (cat-3)
  {
    id: 'bk-11',
    url: 'https://nodejs.org/',
    title: 'Node.js — Run JavaScript Everywhere',
    description: 'Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行时，用于构建快速、可扩展的网络应用。',
    categoryId: 'cat-3',
    tags: ['Node.js', 'JavaScript', '后端', '服务器'],
    favicon: 'https://nodejs.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'bk-12',
    url: 'https://www.rust-lang.org/',
    title: 'Rust Programming Language',
    description: 'Rust 是一门系统编程语言，专注于安全、速度和并发性，被誉为最受欢迎的编程语言。',
    categoryId: 'cat-3',
    tags: ['Rust', '系统编程', '高性能'],
    favicon: 'https://www.rust-lang.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 12,
  },
  // 设计资源 (cat-4)
  {
    id: 'bk-3',
    url: 'https://tailwindcss.com/',
    title: 'Tailwind CSS - Rapidly build modern websites',
    description: '一个功能类优先的 CSS 框架，让你无需离开 HTML 就能快速构建现代化的网页设计。',
    categoryId: 'cat-4',
    tags: ['CSS', 'Tailwind', 'UI框架', '设计'],
    favicon: 'https://tailwindcss.com/favicons/favicon.ico',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'bk-5',
    url: 'https://www.figma.com/',
    title: 'Figma: The Collaborative Interface Design Tool',
    description: 'Figma 是一款基于云端的设计工具，支持实时协作，已成为现代产品设计团队的首选。',
    categoryId: 'cat-4',
    tags: ['设计', 'Figma', 'UI/UX', '协作'],
    favicon: 'https://www.figma.com/favicon.ico',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'bk-13',
    url: 'https://dribbble.com/',
    title: 'Dribbble - Discover the World\'s Top Designers',
    description: 'Dribbble 是设计师的社区，展示和发现创意设计作品，获取设计灵感。',
    categoryId: 'cat-4',
    tags: ['设计', '灵感', '社区'],
    favicon: 'https://dribbble.com/favicon.ico',
    createdAt: Date.now() - 86400000 * 15,
  },
  // AI 与机器学习 (cat-5)
  {
    id: 'bk-4',
    url: 'https://github.com/features/copilot',
    title: 'GitHub Copilot - Your AI pair programmer',
    description: 'GitHub Copilot 使用 OpenAI Codex 在你的编辑器中实时建议代码和整个函数，让编程更加高效。',
    categoryId: 'cat-5',
    tags: ['AI', 'GitHub', '编程助手', '效率工具'],
    favicon: 'https://github.com/favicon.ico',
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'bk-7',
    url: 'https://openai.com/chatgpt',
    title: 'ChatGPT - OpenAI',
    description: 'ChatGPT 是由 OpenAI 开发的大型语言模型，能够进行自然语言对话、回答问题和协助创作。',
    categoryId: 'cat-5',
    tags: ['AI', 'ChatGPT', 'OpenAI', 'LLM'],
    favicon: 'https://openai.com/favicon.ico',
    createdAt: Date.now() - 86400000 * 0.5,
  },
  {
    id: 'bk-14',
    url: 'https://huggingface.co/',
    title: 'Hugging Face – The AI community',
    description: 'Hugging Face 是 AI 社区的首选平台，提供模型、数据集和机器学习工具。',
    categoryId: 'cat-5',
    tags: ['AI', '机器学习', '模型', '开源'],
    favicon: 'https://huggingface.co/favicon.ico',
    createdAt: Date.now() - 86400000 * 10,
  },
  // 产品工具 (cat-6)
  {
    id: 'bk-8',
    url: 'https://www.notion.so/',
    title: 'Notion – One workspace. Every team.',
    description: 'Notion 是一款集笔记、文档、知识库和项目管理于一体的协作工具，帮助团队更好地组织工作。',
    categoryId: 'cat-6',
    tags: ['Notion', '效率', '笔记', '协作'],
    favicon: 'https://www.notion.so/images/favicon.ico',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'bk-15',
    url: 'https://linear.app/',
    title: 'Linear – A better way to build products',
    description: 'Linear 是现代软件团队的项目管理工具，简洁高效，让产品开发更加流畅。',
    categoryId: 'cat-6',
    tags: ['项目管理', '效率', '团队协作'],
    favicon: 'https://linear.app/favicon.ico',
    createdAt: Date.now() - 86400000 * 20,
  },
  // 学习资料 (cat-7)
  {
    id: 'bk-9',
    url: 'https://developer.mozilla.org/zh-CN/',
    title: 'MDN Web Docs',
    description: 'MDN 提供了关于开放网络技术（包括 HTML、CSS 和 JavaScript）的权威文档和学习资源。',
    categoryId: 'cat-7',
    tags: ['MDN', '文档', 'Web开发', '学习'],
    favicon: 'https://developer.mozilla.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'bk-16',
    url: 'https://www.freecodecamp.org/',
    title: 'freeCodeCamp - Learn to Code for Free',
    description: 'freeCodeCamp 提供免费的编程课程，帮助数百万人学习编程技能。',
    categoryId: 'cat-7',
    tags: ['学习', '编程', '免费课程'],
    favicon: 'https://www.freecodecamp.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 25,
  },
];

// 英文分类数据
export const mockCategoriesEn: Category[] = [
  { id: 'cat-1', name: 'Development', parentId: null, order: 1 },
  { id: 'cat-2', name: 'Frontend', parentId: 'cat-1', order: 1 },
  { id: 'cat-3', name: 'Backend', parentId: 'cat-1', order: 2 },
  { id: 'cat-4', name: 'Design Resources', parentId: null, order: 2 },
  { id: 'cat-5', name: 'AI & Machine Learning', parentId: null, order: 3 },
  { id: 'cat-6', name: 'Productivity Tools', parentId: null, order: 4 },
  { id: 'cat-7', name: 'Learning', parentId: null, order: 5 },
];

// 英文书签数据
export const mockBookmarksEn: Bookmark[] = [
  // Frontend (cat-2)
  {
    id: 'bk-1',
    url: 'https://react.dev/',
    title: 'React - The library for web and native user interfaces',
    description: 'Official React documentation with the latest React 18 features, tutorials, and API references.',
    categoryId: 'cat-2',
    tags: ['React', 'JavaScript', 'Frontend', 'Docs'],
    favicon: 'https://react.dev/favicon.ico',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'bk-2',
    url: 'https://vuejs.org/',
    title: 'Vue.js - The Progressive JavaScript Framework',
    description: 'Vue.js is a progressive JavaScript framework that is easy to learn and performs excellently.',
    categoryId: 'cat-2',
    tags: ['Vue', 'JavaScript', 'Frontend'],
    favicon: 'https://vuejs.org/logo.svg',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'bk-6',
    url: 'https://nextjs.org/',
    title: 'Next.js by Vercel - The React Framework for the Web',
    description: 'Next.js is a React framework for production with server-side rendering and static generation.',
    categoryId: 'cat-2',
    tags: ['Next.js', 'React', 'SSR', 'Fullstack'],
    favicon: 'https://nextjs.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'bk-10',
    url: 'https://www.typescriptlang.org/',
    title: 'TypeScript: JavaScript With Syntax For Types',
    description: 'TypeScript is a typed superset of JavaScript that makes large-scale development more reliable.',
    categoryId: 'cat-2',
    tags: ['TypeScript', 'JavaScript', 'Types'],
    favicon: 'https://www.typescriptlang.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 6,
  },
  // Backend (cat-3)
  {
    id: 'bk-11',
    url: 'https://nodejs.org/',
    title: 'Node.js — Run JavaScript Everywhere',
    description: 'Node.js is a JavaScript runtime built on Chrome V8 engine for building fast, scalable network applications.',
    categoryId: 'cat-3',
    tags: ['Node.js', 'JavaScript', 'Backend', 'Server'],
    favicon: 'https://nodejs.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'bk-12',
    url: 'https://www.rust-lang.org/',
    title: 'Rust Programming Language',
    description: 'Rust is a systems programming language focused on safety, speed, and concurrency.',
    categoryId: 'cat-3',
    tags: ['Rust', 'Systems', 'Performance'],
    favicon: 'https://www.rust-lang.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 12,
  },
  // Design Resources (cat-4)
  {
    id: 'bk-3',
    url: 'https://tailwindcss.com/',
    title: 'Tailwind CSS - Rapidly build modern websites',
    description: 'A utility-first CSS framework that lets you build modern designs without leaving your HTML.',
    categoryId: 'cat-4',
    tags: ['CSS', 'Tailwind', 'UI', 'Design'],
    favicon: 'https://tailwindcss.com/favicons/favicon.ico',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'bk-5',
    url: 'https://www.figma.com/',
    title: 'Figma: The Collaborative Interface Design Tool',
    description: 'Figma is a cloud-based design tool with real-time collaboration, the choice of modern product teams.',
    categoryId: 'cat-4',
    tags: ['Design', 'Figma', 'UI/UX', 'Collaboration'],
    favicon: 'https://www.figma.com/favicon.ico',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'bk-13',
    url: 'https://dribbble.com/',
    title: 'Dribbble - Discover the World\'s Top Designers',
    description: 'Dribbble is a community for designers to showcase and discover creative work and get inspiration.',
    categoryId: 'cat-4',
    tags: ['Design', 'Inspiration', 'Community'],
    favicon: 'https://dribbble.com/favicon.ico',
    createdAt: Date.now() - 86400000 * 15,
  },
  // AI & Machine Learning (cat-5)
  {
    id: 'bk-4',
    url: 'https://github.com/features/copilot',
    title: 'GitHub Copilot - Your AI pair programmer',
    description: 'GitHub Copilot uses OpenAI Codex to suggest code and entire functions in real-time.',
    categoryId: 'cat-5',
    tags: ['AI', 'GitHub', 'Coding', 'Productivity'],
    favicon: 'https://github.com/favicon.ico',
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'bk-7',
    url: 'https://openai.com/chatgpt',
    title: 'ChatGPT - OpenAI',
    description: 'ChatGPT is a large language model by OpenAI for natural conversations and assistance.',
    categoryId: 'cat-5',
    tags: ['AI', 'ChatGPT', 'OpenAI', 'LLM'],
    favicon: 'https://openai.com/favicon.ico',
    createdAt: Date.now() - 86400000 * 0.5,
  },
  {
    id: 'bk-14',
    url: 'https://huggingface.co/',
    title: 'Hugging Face – The AI community',
    description: 'Hugging Face is the go-to platform for AI, providing models, datasets, and ML tools.',
    categoryId: 'cat-5',
    tags: ['AI', 'ML', 'Models', 'Open Source'],
    favicon: 'https://huggingface.co/favicon.ico',
    createdAt: Date.now() - 86400000 * 10,
  },
  // Productivity Tools (cat-6)
  {
    id: 'bk-8',
    url: 'https://www.notion.so/',
    title: 'Notion – One workspace. Every team.',
    description: 'Notion is an all-in-one workspace for notes, docs, wikis, and project management.',
    categoryId: 'cat-6',
    tags: ['Notion', 'Productivity', 'Notes', 'Collaboration'],
    favicon: 'https://www.notion.so/images/favicon.ico',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'bk-15',
    url: 'https://linear.app/',
    title: 'Linear – A better way to build products',
    description: 'Linear is the modern project management tool for software teams, simple and efficient.',
    categoryId: 'cat-6',
    tags: ['Project Management', 'Productivity', 'Teams'],
    favicon: 'https://linear.app/favicon.ico',
    createdAt: Date.now() - 86400000 * 20,
  },
  // Learning (cat-7)
  {
    id: 'bk-9',
    url: 'https://developer.mozilla.org/en-US/',
    title: 'MDN Web Docs',
    description: 'MDN provides authoritative documentation and learning resources for open web technologies.',
    categoryId: 'cat-7',
    tags: ['MDN', 'Docs', 'WebDev', 'Learning'],
    favicon: 'https://developer.mozilla.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'bk-16',
    url: 'https://www.freecodecamp.org/',
    title: 'freeCodeCamp - Learn to Code for Free',
    description: 'freeCodeCamp provides free coding courses, helping millions learn programming skills.',
    categoryId: 'cat-7',
    tags: ['Learning', 'Coding', 'Free Courses'],
    favicon: 'https://www.freecodecamp.org/favicon.ico',
    createdAt: Date.now() - 86400000 * 25,
  },
];

// 模拟当前页面内容（用于 SavePanel 演示）
export interface PageContent {
  url: string;
  title: string;
  excerpt: string;
  favicon?: string;
}

export const mockPageContent: PageContent = {
  url: 'https://claude.ai/',
  title: 'Claude - Anthropic',
  excerpt: 'Claude 是 Anthropic 开发的新一代 AI 助手，具有强大的对话能力和安全性。',
  favicon: 'https://claude.ai/favicon.ico',
};

export const mockPageContentEn: PageContent = {
  url: 'https://claude.ai/',
  title: 'Claude - Anthropic',
  excerpt: 'Claude is a next-generation AI assistant by Anthropic with powerful conversation abilities and safety.',
  favicon: 'https://claude.ai/favicon.ico',
};

// 所有标签
export const mockAllTags = [
  'React', 'Vue', 'JavaScript', 'TypeScript', 'CSS', 'Tailwind',
  'AI', 'ChatGPT', 'OpenAI', 'GitHub', 'Figma', 'Notion',
  '前端框架', '设计', '效率工具', '学习', '文档', '协作',
];

export const mockAllTagsEn = [
  'React', 'Vue', 'JavaScript', 'TypeScript', 'CSS', 'Tailwind',
  'AI', 'ChatGPT', 'OpenAI', 'GitHub', 'Figma', 'Notion',
  'Frontend', 'Design', 'Productivity', 'Learning', 'Docs', 'Collaboration',
];

// 工具函数
export function getCategoryName(categoryId: string, categories: Category[], isEn: boolean): string {
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.name || (isEn ? 'Uncategorized' : '未分类');
}

export function formatRelativeDate(timestamp: number, isEn: boolean): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / 86400000);
  
  if (days === 0) return isEn ? 'Today' : '今天';
  if (days === 1) return isEn ? 'Yesterday' : '昨天';
  return isEn ? `${days} days ago` : `${days} 天前`;
}
