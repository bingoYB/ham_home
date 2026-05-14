'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Check, Loader2, Download } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@hamhome/ui';
import { CategoryPreviewTree } from '@hamhome/ui-business/category';

interface AIFeatureDemoProps {
  isEn: boolean;
}

// 预设分类数据结构
interface HierarchicalCategory {
  id: string;
  name: string;
  icon: string;
  children?: HierarchicalCategory[];
}

// 模拟的通用型预设分类
const PRESET_CATEGORIES_GENERAL: HierarchicalCategory[] = [
  {
    id: 'general-learning',
    name: '学习与知识',
    icon: '📚',
    children: [
      { id: 'general-learning-tech-docs', name: '技术文档', icon: '📄' },
      { id: 'general-learning-tutorials', name: '教程 / 课程', icon: '🎓' },
      { id: 'general-learning-research', name: '研究 / 深度文章', icon: '🔬' },
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
    ],
  },
  {
    id: 'general-life',
    name: '生活与兴趣',
    icon: '🎉',
    children: [
      { id: 'general-life-entertainment', name: '娱乐', icon: '🎬' },
      { id: 'general-life-health', name: '健康', icon: '🏃' },
      { id: 'general-life-hobbies', name: '兴趣爱好', icon: '🎮' },
    ],
  },
];

const PRESET_CATEGORIES_GENERAL_EN: HierarchicalCategory[] = [
  {
    id: 'general-learning',
    name: 'Learning & Knowledge',
    icon: '📚',
    children: [
      { id: 'general-learning-tech-docs', name: 'Tech Docs', icon: '📄' },
      { id: 'general-learning-tutorials', name: 'Tutorials / Courses', icon: '🎓' },
      { id: 'general-learning-research', name: 'Research / In-depth', icon: '🔬' },
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
    ],
  },
  {
    id: 'general-life',
    name: 'Life & Interests',
    icon: '🎉',
    children: [
      { id: 'general-life-entertainment', name: 'Entertainment', icon: '🎬' },
      { id: 'general-life-health', name: 'Health', icon: '🏃' },
      { id: 'general-life-hobbies', name: 'Hobbies', icon: '🎮' },
    ],
  },
];

// 专业型预设分类
const PRESET_CATEGORIES_PROFESSIONAL: HierarchicalCategory[] = [
  {
    id: 'pro-tech',
    name: '技术',
    icon: '💻',
    children: [
      { id: 'pro-tech-langs', name: '编程语言', icon: '🗣️' },
      { id: 'pro-tech-frameworks', name: '框架 / 库', icon: '📦' },
      { id: 'pro-tech-devops', name: 'DevOps', icon: '🔧' },
    ],
  },
  {
    id: 'pro-ai',
    name: '人工智能',
    icon: '🤖',
    children: [
      { id: 'pro-ai-llm', name: '大模型', icon: '🧠' },
      { id: 'pro-ai-ml', name: '机器学习', icon: '📊' },
      { id: 'pro-ai-tools', name: 'AI 工具', icon: '⚡' },
    ],
  },
  {
    id: 'pro-product',
    name: '产品与设计',
    icon: '🎨',
    children: [
      { id: 'pro-product-ux', name: 'UX / UI', icon: '🖼️' },
      { id: 'pro-product-pm', name: '产品管理', icon: '📋' },
      { id: 'pro-product-growth', name: '增长', icon: '📈' },
    ],
  },
  {
    id: 'pro-startup',
    name: '创业',
    icon: '🚀',
    children: [
      { id: 'pro-startup-funding', name: '融资', icon: '💰' },
      { id: 'pro-startup-strategy', name: '策略', icon: '🎯' },
      { id: 'pro-startup-cases', name: '案例', icon: '📚' },
    ],
  },
];

const PRESET_CATEGORIES_PROFESSIONAL_EN: HierarchicalCategory[] = [
  {
    id: 'pro-tech',
    name: 'Technology',
    icon: '💻',
    children: [
      { id: 'pro-tech-langs', name: 'Languages', icon: '🗣️' },
      { id: 'pro-tech-frameworks', name: 'Frameworks', icon: '📦' },
      { id: 'pro-tech-devops', name: 'DevOps', icon: '🔧' },
    ],
  },
  {
    id: 'pro-ai',
    name: 'AI & ML',
    icon: '🤖',
    children: [
      { id: 'pro-ai-llm', name: 'LLMs', icon: '🧠' },
      { id: 'pro-ai-ml', name: 'Machine Learning', icon: '📊' },
      { id: 'pro-ai-tools', name: 'AI Tools', icon: '⚡' },
    ],
  },
  {
    id: 'pro-product',
    name: 'Product & Design',
    icon: '🎨',
    children: [
      { id: 'pro-product-ux', name: 'UX / UI', icon: '🖼️' },
      { id: 'pro-product-pm', name: 'Product Mgmt', icon: '📋' },
      { id: 'pro-product-growth', name: 'Growth', icon: '📈' },
    ],
  },
  {
    id: 'pro-startup',
    name: 'Startups',
    icon: '🚀',
    children: [
      { id: 'pro-startup-funding', name: 'Funding', icon: '💰' },
      { id: 'pro-startup-strategy', name: 'Strategy', icon: '🎯' },
      { id: 'pro-startup-cases', name: 'Case Studies', icon: '📚' },
    ],
  },
];

// AI 生成分类结果
interface AIGeneratedCategory {
  name: string;
  children?: AIGeneratedCategory[];
}

// Demo 数据
const AI_DEMO_CATEGORIES: AIGeneratedCategory[] = [
  {
    name: '前端开发',
    children: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'CSS' }],
  },
  {
    name: 'AI 与大模型',
    children: [{ name: 'Prompt 工程' }, { name: 'AI 工具' }],
  },
  {
    name: '创业',
    children: [{ name: '产品' }, { name: '增长' }],
  },
];

const AI_DEMO_CATEGORIES_EN: AIGeneratedCategory[] = [
  {
    name: 'Frontend Development',
    children: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'CSS' }],
  },
  {
    name: 'AI & LLM',
    children: [{ name: 'Prompt Engineering' }, { name: 'AI Tools' }],
  },
  {
    name: 'Startups',
    children: [{ name: 'Product' }, { name: 'Growth' }],
  },
];

export function CategoriesDemo({ isEn }: AIFeatureDemoProps) {
  const demoDescription = isEn
    ? 'I am a frontend developer interested in AI and startups...'
    : '我是一名前端开发者，对 AI 和创业感兴趣...';
  const demoCategories = isEn ? AI_DEMO_CATEGORIES_EN : AI_DEMO_CATEGORIES;

  const [aiDescription, setAiDescription] = useState(demoDescription);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedCategories, setAiGeneratedCategories] = useState<AIGeneratedCategory[] | null>(
    demoCategories
  );

  // 语言切换时同步 demo 数据
  useEffect(() => {
    setAiDescription(demoDescription);
    setAiGeneratedCategories(demoCategories);
  }, [isEn, demoDescription, demoCategories]);

  const presetCategoriesGeneral = isEn ? PRESET_CATEGORIES_GENERAL_EN : PRESET_CATEGORIES_GENERAL;
  const presetCategoriesProfessional = isEn
    ? PRESET_CATEGORIES_PROFESSIONAL_EN
    : PRESET_CATEGORIES_PROFESSIONAL;

  const texts = {
    title: isEn ? 'Choose Category Scheme' : '选择分类方案',
    description: isEn
      ? 'Choose a preset category scheme or use AI to generate personalized categories'
      : '选择预设分类方案或使用 AI 生成个性化分类',
    presetTab: isEn ? 'Preset Categories' : '预设分类',
    aiTab: isEn ? 'AI Generate' : 'AI 生成',
    general: isEn ? 'General' : '通用型',
    generalDesc: isEn ? 'Suitable for most users' : '适合大多数用户',
    professional: isEn ? 'Professional' : '专业型',
    professionalDesc: isEn ? 'For power users & creators' : '适合创作者与专业人士',
    apply: isEn ? 'Apply' : '应用',
    aiInputLabel: isEn ? 'Describe your needs' : '描述您的需求',
    aiInputPlaceholder: isEn
      ? 'E.g., I am a frontend developer interested in AI and startups...'
      : '例如：我是一名前端开发者，对 AI 和创业感兴趣...',
    aiGenerate: isEn ? 'Generate with AI' : 'AI 生成',
    aiGenerating: isEn ? 'Generating...' : '生成中...',
    aiRecommended: isEn ? 'AI Recommended Categories' : 'AI 推荐分类',
  };

  // 模拟 AI 生成
  const handleAIGenerate = () => {
    if (!aiDescription.trim()) return;
    setAiGenerating(true);
    setTimeout(() => {
      setAiGenerating(false);
      setAiGeneratedCategories(demoCategories);
    }, 1500);
  };

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border shadow-lg bg-background">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {texts.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">{texts.description}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preset" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preset">
            <Download className="h-4 w-4 mr-2" />
            {texts.presetTab}
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-2" />
            {texts.aiTab}
          </TabsTrigger>
        </TabsList>

        {/* 预设分类 Tab */}
        <TabsContent value="preset" className="mt-0 p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 方案一：通用型 */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>📁</span>
                  {texts.general}
                </CardTitle>
                <CardDescription className="text-xs">{texts.generalDesc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <ScrollArea className="h-[320px] bg-muted/30 rounded-lg">
                  <div className="p-3">
                    <CategoryPreviewTree categories={presetCategoriesGeneral} />
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-3 pt-3">
                <Button className="w-full" size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  {texts.apply}
                </Button>
              </div>
            </Card>

            {/* 方案二：专业型 */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>💼</span>
                  {texts.professional}
                </CardTitle>
                <CardDescription className="text-xs">{texts.professionalDesc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <ScrollArea className="h-[320px] bg-muted/30 rounded-lg">
                  <div className="p-3">
                    <CategoryPreviewTree categories={presetCategoriesProfessional} />
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-3 pt-3">
                <Button className="w-full" size="sm">
                  <Check className="h-4 w-4 mr-2" />
                  {texts.apply}
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* AI 生成 Tab */}
        <TabsContent value="ai" className="mt-0 p-4 space-y-4">
          {/* AI 输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{texts.aiInputLabel}</label>
            <Textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder={texts.aiInputPlaceholder}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleAIGenerate}
            disabled={!aiDescription.trim() || aiGenerating}
            className="w-full"
          >
            {aiGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {texts.aiGenerating}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {texts.aiGenerate}
              </>
            )}
          </Button>

          {/* AI 生成结果 */}
          {aiGeneratedCategories && (
            <div className="space-y-3">
              <label className="text-sm font-medium">{texts.aiRecommended}</label>
              <div className="p-4 bg-muted/50 rounded-lg">
                <CategoryPreviewTree categories={aiGeneratedCategories} generated />
              </div>
              <Button className="w-full" size="sm">
                <Check className="h-4 w-4 mr-2" />
                {texts.apply}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
