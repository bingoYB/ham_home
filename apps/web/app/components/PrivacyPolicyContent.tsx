'use client';

import Link from 'next/link';
import { ChevronLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useWebPreferences } from '@/app/hooks/useWebPreferences';

const LAST_UPDATED = '2026-03-12';
const REPOSITORY_URL = 'https://github.com/bingoYB/ham_home';

const chineseSections = [
  {
    title: '1. 适用范围',
    paragraphs: [
      '本隐私权政策适用于 HamHome 浏览器扩展及其配套官网中的隐私说明页面。HamHome 是一款以本地优先为核心的书签管理工具，主要帮助用户保存、分类、搜索和整理网页书签。',
      '除非用户主动启用第三方 AI 服务或自行配置同步服务，HamHome 不会将你的书签内容、页面正文或账号数据上传到开发者自建服务器。',
    ],
  },
  {
    title: '2. 我们处理哪些数据',
    paragraphs: [
      '为了实现产品功能，HamHome 可能在你的浏览器本地处理以下数据：书签 URL、标题、摘要、标签、分类、收藏时间、网页正文提取结果、网页快照、搜索索引、界面偏好设置，以及你主动填写的 AI 服务或同步配置。',
      '这些数据默认保存在浏览器本地存储或 IndexedDB 中，用于书签管理、搜索、导入导出、快照查看和个性化设置，不会默认发送给开发者。',
    ],
  },
  {
    title: '3. 权限使用说明',
    paragraphs: [
      '`storage` 和 `unlimitedStorage` 用于保存书签、设置、快照及索引；`activeTab` 和 `scripting` 用于在你主动保存当前页面或打开侧边栏时读取当前网页信息；`bookmarks` 用于导入浏览器原生书签；`contextMenus` 用于右键菜单快速收藏；`downloads` 用于导出数据文件；`alarms` 用于触发定时同步任务。',
      '扩展声明 `<all_urls>` 主机权限，是因为用户可能希望在任意网页上使用“一键收藏”、内容提取或侧边栏能力。HamHome 仅在你主动触发相关功能时访问对应页面内容。',
    ],
  },
  {
    title: '4. AI 服务与第三方传输',
    paragraphs: [
      '如果你主动配置并启用 OpenAI、Anthropic、Google、Azure、Ollama 或其他兼容 AI 服务，HamHome 可能会将当前页面的 URL、标题、正文摘录等必要内容发送到你所选择的服务商，用于摘要生成、智能分类、标签推荐或语义搜索。',
      '你可以随时关闭 AI 功能，也可以通过“隐私域名”配置让特定网站跳过 AI 分析。对于你自行选择的第三方服务，其数据处理方式受对应服务商隐私政策约束。',
    ],
  },
  {
    title: '5. 数据共享与出售',
    paragraphs: [
      'HamHome 不会出售你的个人数据，也不会将你的书签库批量共享给广告商、数据经纪商或开发者自建分析平台。',
      '仅在你主动使用相关功能时，数据才可能被发送至你自行选择的第三方 AI 服务、WebDAV 或其他同步目标。',
    ],
  },
  {
    title: '6. 数据保留与用户控制',
    paragraphs: [
      '你的数据会一直保留在本地，直到你主动删除书签、清除快照、重置扩展数据、卸载扩展或覆盖导入为止。',
      '你可以在扩展中查看、编辑、删除、导出和导入自己的数据，并可通过浏览器扩展管理或清除站点数据的方式删除本地存储内容。',
    ],
  },
  {
    title: '7. 安全措施',
    paragraphs: [
      'HamHome 采用本地优先设计，尽量减少不必要的数据外发。对于你填写的 API Key、同步地址及相关设置，HamHome 仅在实现你选择的功能时于本地使用。',
      '尽管我们会尽力降低风险，但任何本地设备、浏览器环境或第三方服务都无法承诺绝对安全，请你妥善保管本机和外部服务凭据。',
    ],
  },
  {
    title: '8. 政策更新与联系方式',
    paragraphs: [
      '如果产品的数据处理方式发生重大变化，我们会更新本页面，并修改“最后更新”日期。',
      `如需反馈隐私相关问题，可通过 GitHub Issues 联系项目维护者：${REPOSITORY_URL}`,
    ],
  },
];

const englishSections = [
  {
    title: '1. Scope',
    paragraphs: [
      'This Privacy Policy applies to the HamHome browser extension and its public privacy page. HamHome is a local-first bookmark manager for saving, organizing, and searching web bookmarks.',
      'Unless you explicitly enable a third-party AI provider or configure your own sync target, HamHome does not upload your bookmark content, page text, or account data to developer-operated servers.',
    ],
  },
  {
    title: '2. Data We Process',
    paragraphs: [
      'To provide core features, HamHome may process bookmark URLs, titles, summaries, tags, categories, saved timestamps, extracted page content, snapshots, search indexes, UI preferences, and any AI or sync settings you choose to enter.',
      'This data is stored locally in your browser storage or IndexedDB by default and is used for bookmark management, search, import/export, snapshots, and preferences.',
    ],
  },
  {
    title: '3. Browser Permissions',
    paragraphs: [
      '`storage` and `unlimitedStorage` store bookmarks, settings, snapshots, and indexes. `activeTab` and `scripting` are used when you choose to save the current page or open the sidebar. `bookmarks` imports browser bookmarks. `contextMenus` supports right-click saving. `downloads` exports your data. `alarms` runs scheduled sync tasks.',
      'The extension requests `<all_urls>` because users may save or inspect bookmarks on any website. HamHome accesses page content only when you trigger a related feature.',
    ],
  },
  {
    title: '4. AI Providers and Third Parties',
    paragraphs: [
      'If you enable and configure OpenAI, Anthropic, Google, Azure, Ollama, or another compatible AI service, HamHome may send the current page URL, title, or extracted content required for summaries, categorization, tag suggestions, or semantic search to the provider you selected.',
      'You can disable AI features at any time and configure privacy domains to exclude specific websites from AI analysis. Third-party processing is governed by the privacy terms of the provider you choose.',
    ],
  },
  {
    title: '5. Sharing and Sale of Data',
    paragraphs: [
      'HamHome does not sell your personal data and does not share your bookmark library with advertisers, data brokers, or developer-run analytics services.',
      'Data is only transmitted when you intentionally use features that rely on providers you selected, such as AI APIs or your own sync destination.',
    ],
  },
  {
    title: '6. Retention and Control',
    paragraphs: [
      'Your data stays local until you delete bookmarks, remove snapshots, reset extension data, uninstall the extension, or overwrite data through import.',
      'You can review, edit, delete, export, and import your data inside HamHome, and you can also remove local storage through your browser extension settings.',
    ],
  },
  {
    title: '7. Security',
    paragraphs: [
      'HamHome follows a local-first approach to reduce unnecessary external transfers. API keys, sync endpoints, and related settings are used locally to provide the features you enable.',
      'No browser extension or third-party service can guarantee absolute security, so please protect your device and external credentials carefully.',
    ],
  },
  {
    title: '8. Updates and Contact',
    paragraphs: [
      'If our data practices change materially, we will update this page and revise the last updated date.',
      `For privacy-related questions, please contact the project maintainer via GitHub Issues: ${REPOSITORY_URL}`,
    ],
  },
];

function PolicySection({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <section className="rounded-2xl border bg-card/70 p-6 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export function PrivacyPolicyContent() {
  const { isDark, isEn, toggleTheme, toggleLanguage } = useWebPreferences();
  const sections = isEn ? englishSections : chineseSections;

  const texts = {
    badge: isEn ? 'HamHome Privacy Policy' : 'HamHome 隐私权政策',
    title: isEn ? 'Privacy Policy' : '隐私权政策',
    description: isEn
      ? 'This page explains how the HamHome browser extension handles bookmarks, page content, AI settings, and browser permissions.'
      : '本页面用于说明 HamHome 浏览器扩展如何处理书签、页面内容、AI 配置及浏览器权限。',
    backHome: isEn ? 'Back to Home' : '返回首页',
    updatedAt: isEn ? 'Last updated' : '最后更新',
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        isDark={isDark}
        isEn={isEn}
        onToggleTheme={toggleTheme}
        onToggleLanguage={toggleLanguage}
      />

      <main className="container mx-auto px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {texts.backHome}
          </Link>

          <section className="mt-6 rounded-3xl border bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10 p-7 shadow-sm sm:p-10">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {texts.badge}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  {texts.title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {texts.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {texts.updatedAt}：{LAST_UPDATED}
                  </span>
                  <span aria-hidden="true">•</span>
                  <a
                    href={REPOSITORY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    GitHub
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="space-y-4">
              {sections.map((section) => (
                <PolicySection
                  key={section.title}
                  title={section.title}
                  paragraphs={section.paragraphs}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer isEn={isEn} />
    </div>
  );
}
