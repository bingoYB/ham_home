import React, { useState } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@ui/components/accordion';
import { cn } from '@ui/lib/utils';

interface LandingFAQProps {
  isEn: boolean;
}

type FAQCategory = 'general' | 'privacy' | 'ai' | 'sync';

const categories: { id: FAQCategory; labelEn: string; labelZh: string }[] = [
  { id: 'general', labelEn: 'GENERAL', labelZh: '通用' },
  { id: 'privacy', labelEn: 'PRIVACY & DATA', labelZh: '隐私与数据' },
  { id: 'ai', labelEn: 'AI FEATURES', labelZh: 'AI 功能' },
  { id: 'sync', labelEn: 'SYNC & BACKUP', labelZh: '同步与备份' },
];

const faqs: Record<FAQCategory, { qEn: string; aEn: string; qZh: string; aZh: string }[]> = {
  general: [
    {
      qEn: 'What is HamHome?',
      aEn: 'HamHome is an AI-powered browser workspace that combines bookmark management, saved tab workspaces, and automatic tab grouping. It helps you organize both long-term knowledge and in-progress browsing in one place.',
      qZh: '什么是 HamHome？',
      aZh: 'HamHome 是一个由 AI 驱动的浏览器工作空间，将书签管理、标签页工作区和自动标签分组结合在一起。它可以帮助您在一个地方集中管理长期的知识库和正在进行的浏览任务。'
    },
    {
      qEn: 'Which browsers are supported?',
      aEn: 'HamHome currently supports Google Chrome, Microsoft Edge (Manifest V3), and Firefox (Manifest V2/V3).',
      qZh: '支持哪些浏览器？',
      aZh: 'HamHome 目前支持 Google Chrome、Microsoft Edge (Manifest V3) 以及 Firefox (Manifest V2/V3)。'
    }
  ],
  privacy: [
    {
      qEn: 'Where is my data stored?',
      aEn: 'HamHome is designed with a Local-First approach. All your bookmarks, tab groups, and snapshots are stored locally on your device using Chrome Storage and IndexedDB.',
      qZh: '我的数据存储在哪里？',
      aZh: 'HamHome 采用本地优先（Local-First）的设计理念。您所有的书签、标签组规则和网页快照都使用 Chrome Storage 和 IndexedDB 本地安全地存储在您的设备上。'
    },
    {
      qEn: 'Are my private sites sent to AI?',
      aEn: 'You can configure "Privacy Domains" to exclude sensitive sites from AI analysis, ensuring your private browsing data remains completely secure and local.',
      qZh: '我的私人网站内容会发送给 AI 吗？',
      aZh: '您可以配置“隐私域名”，将包含敏感信息的网站完全排除在 AI 分析之外，确保您的私人浏览数据绝对安全并仅保留在本地。'
    }
  ],
  ai: [
    {
      qEn: 'Do I need to pay for AI features?',
      aEn: 'HamHome uses a Bring Your Own Key (BYOK) model. You can plug in your own API keys for OpenAI, Anthropic, Claude, or even use local models via Ollama. You only pay directly to the AI providers for what you actually use.',
      qZh: '我需要为 AI 功能付费吗？',
      aZh: 'HamHome 采用自带密钥（BYOK）模式。您可以配置自己的 OpenAI、Anthropic、Claude API 密钥，甚至可以通过 Ollama 接入本地大模型。您只需直接向 AI 提供商支付您所使用的 API 费用，插件本身不收取 AI 使用费。'
    },
    {
      qEn: 'What can the AI do?',
      aEn: 'AI can automatically categorize your bookmarks, suggest smart tags, generate concise summaries for saved pages, and power semantic or conversational search across your entire knowledge base.',
      qZh: 'AI 能做什么？',
      aZh: 'AI 可以自动对您的书签进行智能分类、提供精准的标签建议、为保存的网页生成简明摘要，并支持在您的个人知识库中进行自然语言的语义搜索或对话式检索。'
    }
  ],
  sync: [
    {
      qEn: 'Can I sync my data across multiple devices?',
      aEn: 'Yes! HamHome supports synchronization via WebDAV (e.g., Nextcloud, InfiniCLOUD). You can seamlessly sync your bookmarks, categories, workspaces, and settings across all your devices.',
      qZh: '我可以在多个设备之间同步我的数据吗？',
      aZh: '可以！HamHome 支持通过标准的 WebDAV 协议（例如 Nextcloud、坚果云、InfiniCLOUD 等）进行同步。您可以在所有设备上无缝同步您的书签、分类、工作区和偏好设置。'
    },
    {
      qEn: 'Is the synced data secure?',
      aEn: 'Absolutely. We provide end-to-end encryption options for WebDAV sync, ensuring your data remains unreadable on the remote server.',
      qZh: '同步的数据安全吗？',
      aZh: '绝对安全。我们为 WebDAV 同步提供了端到端加密选项，即使在第三方远程服务器上，您的数据也保持不可读状态。'
    }
  ]
};

export function LandingFAQ({ isEn }: LandingFAQProps) {
  const [activeCategory, setActiveCategory] = useState<FAQCategory>('general');

  const title = isEn ? 'Frequently asked questions' : '常见问题';
  const currentCategoryData = categories.find((c) => c.id === activeCategory);
  const currentCategoryLabel = isEn ? currentCategoryData?.labelEn : currentCategoryData?.labelZh;

  return (
    <section className="mx-auto w-full px-4 py-16 sm:px-6 lg:px-8 lg:py-24 container border-t border-border/10">
      <div className="w-full">
        {/* 标题 */}
        <h2 className="text-4xl md:text-5xl font-semibold mb-16 tracking-tight">
          {title}
        </h2>

        <div className="flex flex-col md:flex-row gap-12 md:gap-24">
          {/* 左侧分类导航 */}
          <div className="md:w-1/4 flex-shrink-0">
            <div className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 md:sticky md:top-24 scrollbar-none">
              {categories.map((category) => {
                const isActive = activeCategory === category.id;
                const label = isEn ? category.labelEn : category.labelZh;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "flex items-center text-left py-2 px-3 text-sm font-medium transition-colors whitespace-nowrap rounded-md",
                      isActive 
                        ? "text-foreground" 
                        : "text-muted-foreground hover:text-foreground/80 hover:bg-muted/30"
                    )}
                  >
                    {/* Github style green indicator */}
                    <span 
                      className={cn(
                        "w-2 h-2 mr-3 rounded-sm transition-colors",
                        isActive ? "bg-primary" : "bg-transparent"
                      )} 
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 右侧问题列表 */}
          <div className="md:w-3/4 flex-1">
            <h3 className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wider">
              {currentCategoryLabel}
            </h3>
            
            <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
              {faqs[activeCategory].map((faq, index) => {
                const q = isEn ? faq.qEn : faq.qZh;
                const a = isEn ? faq.aEn : faq.aZh;
                
                return (
                  <AccordionItem 
                    key={`${activeCategory}-${index}`} 
                    value={`item-${index}`}
                    className="border-border/10 border-b last:border-0"
                  >
                    <AccordionTrigger className="text-left text-lg py-6 hover:no-underline hover:text-primary transition-colors [&_svg]:text-primary">
                      {q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6 pr-8">
                      {a}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
