# HamHome 全球化语言（i18n）实现方案

## 📋 目录
1. [方案概述](#方案概述)
2. [技术架构](#技术架构)
3. [实现细节](#实现细节)
4. [文件结构](#文件结构)
5. [集成指南](#集成指南)
6. [翻译管理](#翻译管理)
7. [最佳实践](#最佳实践)

---

## 方案概述

### 核心目标
- 支持多种语言（初期：中文、英文；后期：日文、韩文等）
- 代码中零硬编码中文文本
- 统一的翻译管理系统
- 支持浏览器插件和 Web 应用
- 易于维护和扩展

### 支持范围
```
┌─────────────────────────────────┐
│      HamHome 全球化覆盖         │
├─────────────────────────────────┤
│ 浏览器插件 (Extension)         │
│  - 主应用界面                   │
│  - 弹窗面板                     │
│  - 选项页面                     │
│                                 │
│ Web 应用                        │
│  - 管理后台                     │
│  - 设置页面                     │
│                                 │
│ 系统文案                        │
│  - 按钮文案                     │
│  - 提示文案                     │
│  - 错误信息                     │
│  - 验证提示                     │
└─────────────────────────────────┘
```

---

## 技术架构

### 选型方案：i18next + React

**为什么选择 i18next？**
- ✅ 成熟稳定的国际化解决方案
- ✅ 支持命名空间分割（便于多包管理）
- ✅ 提供 React 集成（react-i18next）
- ✅ 支持动态加载和延迟加载
- ✅ 支持复数形式、日期格式化等
- ✅ 活跃的社区生态
- ✅ 低学习成本

### 依赖包
```json
{
  "dependencies": {
    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0"
  },
  "devDependencies": {
    "i18next-scanner": "^4.4.0"
  }
}
```

### 架构图
```
┌────────────────────────────────────┐
│     React Components               │
│   (使用 useTranslation hook)       │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      react-i18next Provider         │
│      (I18nextProvider)              │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│        i18next Instance             │
│  - 初始化配置                       │
│  - 语言检测                         │
│  - 资源加载                         │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      Translation Resources          │
│  locales/                           │
│  ├── zh/                            │
│  │   ├── common.json                │
│  │   ├── bookmark.json              │
│  │   └── settings.json              │
│  └── en/                            │
│      ├── common.json                │
│      ├── bookmark.json              │
│      └── settings.json              │
└────────────────────────────────────┘
```

---

## 实现细节

### 1. 文件结构

```
/Users/yingbin/work/github/ham_home/
├── apps/
│   ├── extension/
│   │   ├── locales/                    # 翻译文件
│   │   │   ├── en/
│   │   │   │   ├── common.json         # 通用文案
│   │   │   │   ├── bookmark.json       # 书签相关
│   │   │   │   ├── settings.json       # 设置相关
│   │   │   │   └── ai.json             # AI 相关
│   │   │   └── zh/
│   │   │       ├── common.json
│   │   │       ├── bookmark.json
│   │   │       ├── settings.json
│   │   │       └── ai.json
│   │   ├── lib/
│   │   │   ├── i18n/
│   │   │   │   ├── config.ts           # i18next 配置
│   │   │   │   ├── init.ts             # 初始化逻辑
│   │   │   │   └── types.ts            # 类型定义
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useTranslation.ts       # 自定义翻译 hook
│   │   │   └── useLanguage.ts          # 语言切换 hook
│   │   └── ...
│   │
│   └── web/
│       ├── locales/
│       │   ├── en/
│       │   │   ├── common.json
│       │   │   ├── bookmark.json
│       │   │   └── ...
│       │   └── zh/
│       │       ├── common.json
│       │       └── ...
│       ├── lib/
│       │   └── i18n/
│       │       ├── config.ts
│       │       └── init.ts
│       └── ...
│
├── packages/
│   └── i18n/                            # 共享 i18n 配置包
│       ├── src/
│       │   ├── index.ts
│       │   ├── config.ts
│       │   ├── types.ts
│       │   └── utils.ts
│       └── package.json
│
└── docs/
    └── i18n_implementation_plan.md     # 本文档
```

### 2. 翻译文件结构（JSON）

**常用.json** - 通用文案
```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "confirm": "Confirm",
    "error": "Error",
    "success": "Success",
    "warning": "Warning",
    "search": "Search",
    "empty": "No data",
    "noResults": "No results found",
    "back": "Back",
    "next": "Next"
  }
}
```

**bookmark.json** - 书签相关
```json
{
  "bookmark": {
    "title": "Bookmarks",
    "newBookmark": "New Bookmark",
    "addBookmark": "Add Bookmark",
    "editBookmark": "Edit Bookmark",
    "deleteBookmark": "Delete Bookmark",
    "deleteConfirm": "Are you sure you want to delete this bookmark?",
    "deleteSuccess": "Bookmark deleted successfully",
    "saveSuccess": "Bookmark saved successfully",
    "saveFailed": "Failed to save bookmark",
    "placeholders": {
      "title": "Enter bookmark title",
      "description": "Enter bookmark description",
      "url": "Enter bookmark URL"
    },
    "categories": "Categories",
    "uncategorized": "Uncategorized",
    "tags": "Tags",
    "createdAt": "Created",
    "recent": "Recent Bookmarks",
    "all": "All Bookmarks",
    "search": "Search bookmarks..."
  }
}
```

**settings.json** - 设置相关
```json
{
  "settings": {
    "title": "Settings",
    "language": "Language",
    "theme": "Theme",
    "themeOptions": {
      "light": "Light",
      "dark": "Dark",
      "system": "System"
    },
    "aiSettings": "AI Settings",
    "aiProvider": "AI Provider",
    "apiKey": "API Key",
    "modelName": "Model Name",
    "importBookmarks": "Import Bookmarks",
    "exportBookmarks": "Export Bookmarks",
    "about": "About"
  }
}
```

**ai.json** - AI 相关文案
```json
{
  "ai": {
    "analyzing": "AI is analyzing...",
    "generatingTitle": "Generating title...",
    "generatingDescription": "Generating description...",
    "extractingContent": "Extracting content...",
    "suggestedCategory": "Suggested Category",
    "suggestedTags": "Suggested Tags",
    "aiNotEnabled": "AI features are not enabled. Please configure AI settings.",
    "error": {
      "configNotFound": "AI configuration not found",
      "apiKeyInvalid": "Invalid API key",
      "requestFailed": "AI request failed: {{error}}"
    }
  }
}
```

### 3. i18next 配置文件

**`apps/extension/lib/i18n/config.ts`**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译资源
import enCommon from '@/locales/en/common.json';
import enBookmark from '@/locales/en/bookmark.json';
import enSettings from '@/locales/en/settings.json';
import enAi from '@/locales/en/ai.json';

import zhCommon from '@/locales/zh/common.json';
import zhBookmark from '@/locales/zh/bookmark.json';
import zhSettings from '@/locales/zh/settings.json';
import zhAi from '@/locales/zh/ai.json';

const resources = {
  en: {
    common: enCommon,
    bookmark: enBookmark,
    settings: enSettings,
    ai: enAi,
  },
  zh: {
    common: zhCommon,
    bookmark: zhBookmark,
    settings: zhSettings,
    ai: zhAi,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    ns: ['common', 'bookmark', 'settings', 'ai'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React 已处理 XSS
    },
    detection: {
      order: [
        'localStorage', // 首先检查本地存储
        'sessionStorage',
        'cookie',
        'navigator',
        'htmlTag',
      ],
      caches: ['localStorage', 'sessionStorage', 'cookie'],
    },
  });

export default i18n;
```

**`apps/extension/lib/i18n/init.ts`**
```typescript
import i18n from './config';
import type { Language } from '@/types';

/**
 * 初始化 i18n
 */
export async function initI18n(): Promise<void> {
  await i18n.init?.({ lng: 'en', fallbackLng: 'en' });
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): Language {
  return (i18n.language as Language) || 'en';
}

/**
 * 改变语言
 */
export async function changeLanguage(lng: Language): Promise<string> {
  return i18n.changeLanguage(lng);
}

/**
 * 获取翻译函数
 */
export function getI18n() {
  return i18n;
}
```

### 4. 自定义 Hooks

**`apps/extension/hooks/useLanguage.ts`**
```typescript
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBookmarks } from '@/contexts/BookmarkContext';
import type { Language } from '@/types';

/**
 * 语言管理 Hook
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const { appSettings, updateAppSettings } = useBookmarks();
  const [language, setLanguage] = useState<Language>(
    appSettings.language || 'en'
  );

  // 初始化语言
  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
    }
  }, []);

  // 切换语言
  const switchLanguage = async (lng: Language) => {
    setLanguage(lng);
    await i18n.changeLanguage(lng);
    await updateAppSettings({ language: lng });
  };

  return {
    language,
    switchLanguage,
    availableLanguages: ['en', 'zh'] as const,
  };
}
```

**`apps/extension/hooks/useTranslation.ts`** (可选，封装翻译)
```typescript
import { useTranslation as useI18nTranslation } from 'react-i18next';

export function useTranslation(namespace?: string) {
  return useI18nTranslation(namespace);
}
```

### 5. 在 React 组件中使用

**基础用法**
```typescript
import { useTranslation } from 'react-i18next';

export function BookmarkCard() {
  const { t } = useTranslation('bookmark');

  return (
    <div>
      <h3>{t('bookmark.title')}</h3>
      <button>{t('bookmark.newBookmark')}</button>
    </div>
  );
}
```

**带参数的翻译**
```typescript
const { t } = useTranslation('ai');

// 翻译文件中：
// "requestFailed": "AI request failed: {{error}}"

return (
  <div>{t('ai.error.requestFailed', { error: 'Network timeout' })}</div>
);
```

**复数形式**
```typescript
const { t } = useTranslation('bookmark');

// 翻译文件中：
// "count": "You have {{count}} bookmark",
// "count_plural": "You have {{count}} bookmarks"

return <div>{t('bookmark.count', { count: 5 })}</div>;
```

### 6. 提供者设置

**`apps/extension/entrypoints/app/main.tsx`**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/config';
import { App } from './App';

// 初始化 i18n
void i18n.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);
```

---

## 集成指南

### 第一步：安装依赖

```bash
# 在 extension 项目中
cd apps/extension
pnpm add i18next react-i18next i18next-browser-languagedetector
```

### 第二步：创建翻译文件

创建目录结构：
```
apps/extension/locales/
├── en/
│   ├── common.json
│   ├── bookmark.json
│   ├── settings.json
│   └── ai.json
└── zh/
    ├── common.json
    ├── bookmark.json
    ├── settings.json
    └── ai.json
```

### 第三步：配置 i18next

将 `config.ts` 和 `init.ts` 放入 `apps/extension/lib/i18n/`

### 第四步：更新主入口

修改 `apps/extension/entrypoints/app/main.tsx`，添加 `I18nextProvider`

### 第五步：逐步重构组件

在每个组件中：
1. 导入 `useTranslation` hook
2. 将硬编码的中文文案替换为 `t()` 函数调用
3. 确保所有文案都有对应的翻译

### 第六步：设置页面集成

在设置页面添加语言选项：
```typescript
import { useLanguage } from '@/hooks/useLanguage';

export function SettingsPage() {
  const { t } = useTranslation('settings');
  const { language, switchLanguage, availableLanguages } = useLanguage();

  return (
    <div>
      <label>{t('settings.language')}</label>
      <select value={language} onChange={(e) => switchLanguage(e.target.value)}>
        {availableLanguages.map((lng) => (
          <option key={lng} value={lng}>
            {t(`settings.languages.${lng}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## 翻译管理

### 1. 翻译工作流程

```
┌─────────────────────────────────────┐
│ 开发人员                            │
│ (使用 useTranslation 编写代码)      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ i18next-scanner 扫描               │
│ (自动提取待翻译字符串)             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 翻译人员                            │
│ (编辑 JSON 翻译文件)                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ QA 审查                             │
│ (检查翻译质量)                      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 发布                                │
│ (提交代码)                          │
└─────────────────────────────────────┘
```

### 2. i18next-scanner 配置

创建 `i18next-scanner.config.js`：
```javascript
module.exports = {
  input: [
    'apps/extension/**/*.{js,jsx,ts,tsx}',
    'apps/web/**/*.{js,jsx,ts,tsx}',
  ],
  output: './',
  options: {
    debug: false,
    func: {
      list: ['i18next.t', 't', 'useTranslation'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    lng: ['en', 'zh'],
    ns: ['common', 'bookmark', 'settings', 'ai'],
    defaultLng: 'en',
    defaultNS: 'common',
    resource: {
      loadPath: 'apps/{{appName}}/locales/{{lng}}/{{ns}}.json',
      savePath: 'apps/{{appName}}/locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
      lineSeperator: '\n',
    },
  },
};
```

### 3. 翻译流程建议

1. **标记关键文案**
   - 使用 `t('namespace.key')` 函数包装所有用户可见的文本
   - 保持一致的命名规范

2. **定期同步翻译**
   ```bash
   # 运行扫描工具，生成翻译模板
   npx i18next-scanner
   ```

3. **版本控制翻译文件**
   - 翻译文件保存在 Git
   - 每次发布前审查翻译更新

4. **社区贡献翻译**
   - 在 GitHub 上创建翻译 issue
   - 接受社区 PR 提交翻译

---

## 最佳实践

### 1. 命名规范

```json
{
  "common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel"
    },
    "messages": {
      "loading": "Loading...",
      "error": "An error occurred"
    },
    "placeholders": {
      "search": "Search...",
      "enterName": "Enter your name"
    }
  }
}
```

**规则**
- 按功能模块分层
- 使用小驼峰命名
- 避免过度嵌套（最多 3-4 层）

### 2. 参数化翻译

```typescript
// ❌ 错误
t('bookmarkDeletedAt') // "已删除的书签: xxx"

// ✅ 正确
t('bookmark.deletedAt', { title: 'My Bookmark' })
// 翻译文件: "deletedAt": "Deleted bookmark: {{title}}"
```

### 3. 常见文案共用

```typescript
// ❌ 避免重复
"common.save": "Save",
"bookmark.save": "Save",
"settings.save": "Save"

// ✅ 使用共用文案
// common.json 中定义一次
"common.save": "Save"
```

### 4. 日期和数字格式

```typescript
import { useTranslation } from 'react-i18next';

export function DateDisplay({ timestamp }) {
  const { i18n } = useTranslation();
  
  const date = new Date(timestamp);
  const formatted = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
  
  return <span>{formatted}</span>;
}
```

### 5. 处理HTML内容

```typescript
// 翻译文件
"welcome": "Welcome, <1>{{name}}</1>"

// 组件中
const { t } = useTranslation();
return <Trans i18nKey="welcome" values={{ name: 'John' }}>
  Welcome, <strong></strong>
</Trans>;
```

### 6. 类型安全

**`apps/extension/lib/i18n/types.ts`**
```typescript
// 确保翻译键的类型安全
export type TranslationKey = 
  | 'common.save'
  | 'common.cancel'
  | 'bookmark.title'
  | 'bookmark.newBookmark'
  // ... 更多键

export interface TranslationNamespace {
  common: typeof import('@/locales/en/common.json');
  bookmark: typeof import('@/locales/en/bookmark.json');
  settings: typeof import('@/locales/en/settings.json');
  ai: typeof import('@/locales/en/ai.json');
}
```

### 7. 性能优化

```typescript
// 使用命名空间分割，减少加载体积
const { t } = useTranslation(['common', 'bookmark']);

// 懒加载不常用的命名空间
const { t: t_settings } = useTranslation('settings');
```

### 8. 错误处理

```typescript
function useTranslationWithFallback(key: string, defaultValue: string) {
  const { t } = useTranslation();
  
  try {
    const translated = t(key);
    return translated === key ? defaultValue : translated;
  } catch {
    return defaultValue;
  }
}
```

---

## 分阶段实施计划

### 阶段 1：基础设置（第 1 周）
- [ ] 安装依赖
- [ ] 创建翻译文件结构
- [ ] 配置 i18next
- [ ] 在主入口添加 Provider
- [ ] 创建 useLanguage Hook

### 阶段 2：核心模块翻译（第 2-3 周）
- [ ] 翻译 common.json（共用文案）
- [ ] 翻译 bookmark.json（书签模块）
- [ ] 更新 BookmarkList 组件
- [ ] 更新 MainContent 组件
- [ ] 更新 Sidebar 组件

### 阶段 3：设置和配置翻译（第 4 周）
- [ ] 翻译 settings.json
- [ ] 翻译 ai.json
- [ ] 更新 OptionsPage 组件
- [ ] 添加语言切换UI
- [ ] 集成到 LocalSettings

### 阶段 4：Web 应用翻译（第 5-6 周）
- [ ] 复制 i18n 配置到 web 应用
- [ ] 翻译 web 应用的所有页面
- [ ] 测试多语言切换

### 阶段 5：测试和优化（第 7 周）
- [ ] 功能测试
- [ ] 性能测试
- [ ] 翻译质量审查
- [ ] 用户界面测试

### 阶段 6：发布和维护（第 8 周）
- [ ] 发布新版本
- [ ] 收集用户反馈
- [ ] 持续改进翻译

---

## 技术栈总结

| 功能 | 库 | 版本 |
|------|-----|------|
| 国际化核心 | i18next | ^24.0.0 |
| React 集成 | react-i18next | ^15.0.0 |
| 语言检测 | i18next-browser-languagedetector | ^7.0.0 |
| 翻译扫描 | i18next-scanner | ^4.4.0 |

---

## 常见问题（FAQ）

### Q: 如何处理日期格式化？
**A:** 使用 `Intl.DateTimeFormat` API，根据当前语言自动格式化。

```typescript
new Intl.DateTimeFormat(i18n.language).format(new Date())
```

### Q: 如何处理复数形式？
**A:** i18next 内置支持，在翻译文件中使用 `_plural` 后缀。

```json
{
  "item": "You have {{count}} item",
  "item_plural": "You have {{count}} items"
}
```

### Q: 如何添加新语言？
**A:** 
1. 创建新的语言目录 `locales/ja/`
2. 复制所有 JSON 文件并翻译
3. 更新 i18next 配置中的 `resources`
4. 在语言切换 UI 中添加新语言选项

### Q: 翻译文件可以支持 JavaScript 函数吗？
**A:** 不推荐。保持 JSON 格式纯文本，需要逻辑时使用参数化。

### Q: 如何处理未翻译的键？
**A:** 设置 `fallbackLng` 和 `saveMissing` 选项，i18next 会自动记录缺失的翻译。

---

## 参考链接

- [i18next 官方文档](https://www.i18next.com/)
- [react-i18next 文档](https://react.i18next.com/)
- [i18next-scanner 文档](https://github.com/i18next/i18next-scanner)
- [国际化最佳实践](https://www.w3.org/International/)

---

## 相关文档

- [开发者指南](./tech_browser_extension.md)
- [项目架构](./tech_shared_modules.md)
- [产品规划](./prd.md)

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-01-10 | 初版方案 |

---

## 贡献指南

欢迎改进这个方案！请通过以下方式贡献：

1. 提交 Issue 讨论改进建议
2. 提交 PR 改进文档
3. 参与翻译工作

---

**文档维护者**: HamHome 开发团队  
**最后更新**: 2026-01-10
