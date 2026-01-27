'use client';

import { useState } from 'react';
import {
  Bookmark,
  FileText,
  AlignLeft,
  FolderOpen,
  Tag as TagIcon,
  Sparkles,
  ChevronDown,
  Shield,
  X,
} from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Label,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hamhome/ui';
import type { Category, PageContent } from '@/data/mock-bookmarks';

interface SaveBookmarkDemoProps {
  pageContent: PageContent;
  categories: Category[];
  allTags: string[];
  isEn: boolean;
}

export function SaveBookmarkDemo({
  pageContent,
  categories,
  isEn,
}: SaveBookmarkDemoProps) {
  const [title, setTitle] = useState(pageContent.title);
  const [description, setDescription] = useState(pageContent.excerpt);
  const [selectedCategory] = useState(isEn ? 'AI & Machine Learning' : 'AI 与机器学习');
  const [tags] = useState(['AI', 'Claude', 'Anthropic']);

  const texts = {
    saveBookmark: isEn ? 'Save Bookmark' : '保存书签',
    saveBookmarkDesc: isEn ? 'One-click save with AI smart suggestions' : '一键保存，AI 智能建议分类和标签',
    titleLabel: isEn ? 'Title' : '标题',
    titlePlaceholder: isEn ? 'Enter bookmark title' : '输入书签标题',
    descLabel: isEn ? 'Description' : '摘要',
    descPlaceholder: isEn ? 'Enter bookmark description' : '输入书签描述',
    categoryLabel: isEn ? 'Category' : '分类',
    tagsLabel: isEn ? 'Tags' : '标签',
    aiRecommended: isEn ? 'AI Recommended:' : 'AI 推荐分类:',
    apply: isEn ? 'Apply' : '应用',
    cancel: isEn ? 'Cancel' : '取消',
    save: isEn ? 'Save' : '保存',
    aiTitle: isEn ? 'AI Features' : 'AI 功能',
    aiDesc: isEn ? 'Powered by advanced AI technology' : '由先进的 AI 技术驱动',
    feature1: isEn ? 'Auto Generate Summaries' : '自动生成摘要',
    feature1Desc: isEn ? 'AI extracts key information from web pages' : 'AI 从网页中提取关键信息',
    feature2: isEn ? 'Smart Categorization' : '智能分类',
    feature2Desc: isEn ? 'Automatically suggest the most suitable category' : '自动建议最合适的分类',
    feature3: isEn ? 'Tag Recommendations' : '标签推荐',
    feature3Desc: isEn ? 'Generate relevant tags based on content' : '根据内容生成相关标签',
    feature4: isEn ? 'Privacy Protection' : '隐私保护',
    feature4Desc: isEn ? 'All analysis runs locally, your data stays safe' : '所有分析在本地运行，数据安全',
  };

  const features = [
    { icon: <FileText className="h-5 w-5 text-blue-500" />, title: texts.feature1, desc: texts.feature1Desc },
    { icon: <FolderOpen className="h-5 w-5 text-emerald-500" />, title: texts.feature2, desc: texts.feature2Desc },
    { icon: <TagIcon className="h-5 w-5 text-purple-500" />, title: texts.feature3, desc: texts.feature3Desc },
    { icon: <Shield className="h-5 w-5 text-orange-500" />, title: texts.feature4, desc: texts.feature4Desc },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 左侧：保存表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            {texts.saveBookmark}
          </CardTitle>
          <CardDescription>{texts.saveBookmarkDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 标题 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              {texts.titleLabel}
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={texts.titlePlaceholder}
            />
          </div>

          {/* 摘要 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlignLeft className="h-4 w-4 text-orange-500" />
              {texts.descLabel}
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={texts.descPlaceholder}
              rows={3}
            />
          </div>

          {/* 分类 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-emerald-500" />
              {texts.categoryLabel}
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedCategory}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full min-w-[300px]">
                {categories.filter((c) => !c.parentId).map((cat) => (
                  <DropdownMenuItem key={cat.id}>{cat.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* AI 推荐提示 */}
            <div className="flex items-center gap-2 text-xs text-primary">
              <Sparkles className="h-3 w-3" />
              {texts.aiRecommended} {selectedCategory}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                {texts.apply}
              </Button>
            </div>
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-purple-500" />
              {texts.tagsLabel}
            </Label>
            <div className="space-y-2">
              {/* 已添加的标签 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="pl-2 pr-1 py-0.5 flex items-center gap-1 cursor-default bg-linear-to-r from-violet-500/90 to-indigo-500/90 dark:from-violet-600/80 dark:to-indigo-600/80 text-white border-0 shadow-sm"
                    >
                      <span className="text-xs font-medium">{tag}</span>
                      <button
                        type="button"
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {/* 输入框 */}
              <Input
                placeholder={isEn ? 'Type and press Enter to add tags' : '输入标签后按回车'}
                className="text-sm"
              />
              {/* 提示文字 */}
              <p className="text-xs text-muted-foreground">
                {tags.length}/10 {isEn ? 'tags' : '个标签'}
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1">
              {texts.cancel}
            </Button>
            <Button className="flex-1">
              <Bookmark className="h-4 w-4 mr-2" />
              {texts.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 右侧：AI 功能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {texts.aiTitle}
          </CardTitle>
          <CardDescription>{texts.aiDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
