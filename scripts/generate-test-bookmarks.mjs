#!/usr/bin/env node
/**
 * 生成模拟书签文件，用于测试大批量导入性能
 * 用法: node scripts/generate-test-bookmarks.mjs [数量] [格式]
 *   数量：默认 10000
 *   格式：html（默认）或 json
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNT = parseInt(process.argv[2] || '10000', 10);
const FORMAT = process.argv[3] || 'html';

// 模拟数据池
const domains = [
  'github.com', 'stackoverflow.com', 'developer.mozilla.org', 'medium.com',
  'dev.to', 'css-tricks.com', 'smashingmagazine.com', 'web.dev',
  'reactjs.org', 'vuejs.org', 'angular.io', 'svelte.dev',
  'nextjs.org', 'nuxt.com', 'astro.build', 'remix.run',
  'tailwindcss.com', 'chakra-ui.com', 'ant.design', 'mui.com',
  'npmjs.com', 'pypi.org', 'crates.io', 'rubygems.org',
  'docs.python.org', 'go.dev', 'rust-lang.org', 'typescriptlang.org',
  'kubernetes.io', 'docker.com', 'aws.amazon.com', 'cloud.google.com',
  'azure.microsoft.com', 'vercel.com', 'netlify.com', 'cloudflare.com',
  'redis.io', 'postgresql.org', 'mongodb.com', 'mysql.com',
  'elastic.co', 'grafana.com', 'prometheus.io', 'sentry.io',
  'figma.com', 'dribbble.com', 'behance.net', 'canva.com',
  'notion.so', 'linear.app', 'slack.com', 'discord.com',
  'youtube.com', 'bilibili.com', 'zhihu.com', 'juejin.cn',
  'segmentfault.com', 'cnblogs.com', 'csdn.net', 'oschina.net',
  'infoq.cn', 'thoughtworks.com', 'martinfowler.com', 'refactoring.guru',
  'leetcode.com', 'hackerrank.com', 'codewars.com', 'exercism.org',
  'coursera.org', 'udemy.com', 'edx.org', 'freecodecamp.org',
  'arxiv.org', 'scholar.google.com', 'researchgate.net', 'ieee.org',
  'wikipedia.org', 'wikimedia.org', 'archive.org', 'gutenberg.org',
  'news.ycombinator.com', 'producthunt.com', 'techcrunch.com', 'theverge.com',
  'arstechnica.com', 'wired.com', 'engadget.com', 'gizmodo.com',
];

const folders = [
  { name: '前端开发', children: ['React', 'Vue', 'Angular', 'CSS', 'TypeScript', 'Svelte', 'Solid', 'Web Components'] },
  { name: '后端开发', children: ['Node.js', 'Python', 'Go', 'Rust', 'Java', 'Ruby', 'PHP', '.NET'] },
  { name: '数据库', children: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite'] },
  { name: '云服务与DevOps', children: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform'] },
  { name: 'AI与机器学习', children: ['深度学习', 'NLP', '计算机视觉', '强化学习', 'LLM', '数据科学'] },
  { name: '设计资源', children: ['UI 设计', 'UX 研究', '配色方案', '图标资源', '字体', '设计系统'] },
  { name: '工具与效率', children: ['编辑器', '终端', '浏览器扩展', '笔记工具', '项目管理', '自动化'] },
  { name: '学习资源', children: ['在线课程', '技术博客', '电子书', '视频教程', '技术播客', '编程练习'] },
  { name: '开源项目', children: ['框架', '工具库', '命令行工具', '桌面应用', '移动开发', '游戏开发'] },
  { name: '科技资讯', children: ['行业新闻', '产品发布', '技术趋势', '开发者社区', '会议活动'] },
  { name: '生活与爱好', children: ['摄影', '旅行', '美食', '音乐', '阅读', '健身', '电影'] },
  { name: '金融与投资', children: ['股票', '基金', '加密货币', '财务规划', '经济学'] },
];

const titlePrefixes = [
  '深入理解', '从零开始学', '最佳实践指南：', '一文搞懂',
  '高级教程：', '入门到精通：', '实战案例：', '性能优化：',
  '源码解析：', '架构设计：', '常见问题解答：', '快速上手：',
  '全面指南：', '进阶技巧：', '核心概念：', '底层原理：',
  '面试必备：', '团队协作中的', '生产环境下的', '大规模应用中的',
  '2025年最新', '你不知道的', '被忽略的', '重新认识',
  'How to', 'Understanding', 'A Guide to', 'Introduction to',
  'Building', 'Mastering', 'Exploring', 'Debugging',
  'Optimizing', 'Deploying', 'Testing', 'Scaling',
];

const titleSubjects = [
  'React Hooks', 'Vue Composition API', 'WebSocket 实时通信', 'GraphQL 查询优化',
  'TypeScript 类型体操', 'Tailwind CSS 组件', 'Next.js App Router', 'Vite 构建配置',
  'Docker 容器编排', 'Kubernetes Pod 管理', 'CI/CD 流水线', 'Git 工作流',
  'RESTful API 设计', '微服务架构', '消息队列', '缓存策略',
  'SQL 查询优化', 'NoSQL 数据建模', '全文搜索引擎', '时序数据库',
  'OAuth 2.0 认证', 'JWT Token 管理', 'CORS 跨域处理', 'CSP 安全策略',
  'Webpack 打包优化', 'ESLint 规则配置', 'Prettier 代码格式化', 'Babel 转译',
  'Jest 单元测试', 'Cypress E2E 测试', 'Playwright 自动化', 'Storybook 组件文档',
  'PWA 离线应用', 'Service Worker', 'Web Workers 多线程', 'WebAssembly',
  'CSS Grid 布局', 'Flexbox 弹性布局', 'CSS 动画', 'SVG 图形编程',
  'Node.js Stream', 'Rust 所有权', 'Go Goroutine', 'Python 异步编程',
  'Redis 集群', 'PostgreSQL 索引', 'MongoDB 聚合管道', 'Elasticsearch DSL',
  'Prometheus 监控', 'Grafana 仪表板', 'ELK 日志分析', 'Sentry 错误追踪',
  'Figma 设计系统', 'Design Token', '响应式设计', '无障碍访问',
  'LLM 微调', 'RAG 检索增强', 'Embedding 向量搜索', 'Transformer 架构',
  'React Server Components', 'Suspense 与 Streaming', 'Islands Architecture', 'Edge Computing',
];

const pathSegments = [
  'docs', 'guide', 'tutorial', 'blog', 'articles', 'reference',
  'api', 'getting-started', 'advanced', 'examples', 'cookbook',
  'best-practices', 'patterns', 'architecture', 'performance',
  'security', 'testing', 'deployment', 'migration', 'troubleshooting',
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUrl(index) {
  const domain = randomPick(domains);
  const seg1 = randomPick(pathSegments);
  const seg2 = randomPick(pathSegments);
  // 加 index 确保 URL 唯一
  return `https://${domain}/${seg1}/${seg2}-${index}`;
}

function generateTitle() {
  return `${randomPick(titlePrefixes)}${randomPick(titleSubjects)}`;
}

function generateTimestamp() {
  // 2020-01-01 ~ 2025-12-31 之间的随机时间戳（秒）
  const start = 1577836800;
  const end = 1767225600;
  return randomInt(start, end);
}

// ============ HTML 格式生成 ============

function generateHTML() {
  const lines = [];
  lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
  lines.push('<!-- This is an automatically generated file for testing. -->');
  lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
  lines.push('<TITLE>Bookmarks</TITLE>');
  lines.push('<H1>Bookmarks</H1>');
  lines.push('<DL><p>');

  let bookmarkIndex = 0;

  for (const folder of folders) {
    const ts = generateTimestamp();
    lines.push(`  <DT><H3 ADD_DATE="${ts}">${folder.name}</H3>`);
    lines.push('  <DL><p>');

    for (const subfolder of folder.children) {
      const subTs = generateTimestamp();
      lines.push(`    <DT><H3 ADD_DATE="${subTs}">${subfolder}</H3>`);
      lines.push('    <DL><p>');

      // 每个子文件夹放 50-120 条书签
      const count = randomInt(50, 120);
      for (let i = 0; i < count && bookmarkIndex < COUNT; i++) {
        const url = generateUrl(bookmarkIndex);
        const title = generateTitle();
        const addDate = generateTimestamp();
        lines.push(`      <DT><A HREF="${url}" ADD_DATE="${addDate}">${title}</A>`);
        bookmarkIndex++;
      }

      lines.push('    </DL><p>');
    }

    lines.push('  </DL><p>');
  }

  // 剩余的书签放到根级别的"未分类"文件夹
  if (bookmarkIndex < COUNT) {
    lines.push('  <DT><H3>未分类书签</H3>');
    lines.push('  <DL><p>');
    while (bookmarkIndex < COUNT) {
      const url = generateUrl(bookmarkIndex);
      const title = generateTitle();
      const addDate = generateTimestamp();
      lines.push(`    <DT><A HREF="${url}" ADD_DATE="${addDate}">${title}</A>`);
      bookmarkIndex++;
    }
    lines.push('  </DL><p>');
  }

  lines.push('</DL><p>');

  console.log(`生成了 ${bookmarkIndex} 条书签`);
  return lines.join('\n');
}

// ============ JSON 格式生成 ============

function generateJSON() {
  const categories = [];
  const bookmarks = [];

  let catIndex = 0;

  for (const folder of folders) {
    const parentId = `cat_${catIndex++}`;
    categories.push({
      id: parentId,
      name: folder.name,
      parentId: null,
      order: categories.length,
      createdAt: Date.now(),
    });

    for (const subfolder of folder.children) {
      const childId = `cat_${catIndex++}`;
      categories.push({
        id: childId,
        name: subfolder,
        parentId,
        order: categories.length,
        createdAt: Date.now(),
      });
    }
  }

  for (let i = 0; i < COUNT; i++) {
    const cat = randomPick(categories);
    const now = Date.now() - randomInt(0, 365 * 24 * 3600 * 1000 * 3);
    bookmarks.push({
      url: generateUrl(i),
      title: generateTitle(),
      description: `这是第 ${i + 1} 条测试书签的描述文本，用于模拟真实的书签数据导入场景。`,
      categoryId: cat.id,
      tags: [randomPick(['前端', '后端', '数据库', 'DevOps', 'AI', '设计', '工具', '学习', '开源', '资讯']),
             randomPick(['收藏', '待读', '精华', '入门', '进阶', '实战', '面试', '分享'])],
      favicon: `https://www.google.com/s2/favicons?domain=${randomPick(domains)}&sz=32`,
      hasSnapshot: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(`生成了 ${bookmarks.length} 条书签, ${categories.length} 个分类`);

  return JSON.stringify({
    version: '1.0.0',
    exportedAt: Date.now(),
    categories,
    bookmarks,
  }, null, 2);
}

// ============ 主逻辑 ============

const ext = FORMAT === 'json' ? 'json' : 'html';
const content = FORMAT === 'json' ? generateJSON() : generateHTML();
const outFile = resolve(__dirname, `../test-bookmarks-${COUNT}.${ext}`);

writeFileSync(outFile, content, 'utf-8');

const sizeKB = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(1);
console.log(`文件已写入: ${outFile}`);
console.log(`文件大小: ${sizeKB} KB`);
