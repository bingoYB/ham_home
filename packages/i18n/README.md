# @hamhome/i18n

HamHome 项目的国际化（i18n）工具包，基于 i18next 构建，提供类型安全的翻译管理和语言切换功能。

## 功能特性

- 🌍 **多语言支持**：支持英语（en）、中文（zh）、日语（ja）、韩语（ko）
- 🔒 **类型安全**：完整的 TypeScript 类型定义，提供编译时类型检查
- 📦 **命名空间管理**：按功能模块划分命名空间（common、bookmark、settings、ai）
- 🔄 **自动语言检测**：基于浏览器设置自动检测用户语言偏好
- ⚡ **React 集成**：与 react-i18next 无缝集成
- 💾 **持久化存储**：语言选择自动保存到 localStorage

## 安装

```bash
pnpm add @hamhome/i18n
```

## 快速开始

### 1. 准备翻译资源

创建翻译资源文件，结构如下：

```typescript
import type { TranslationNamespace, Language } from '@hamhome/i18n';

const resources: Record<Language, TranslationNamespace> = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      // ...
    },
    bookmark: {
      title: 'Bookmarks',
      // ...
    },
    // ...
  },
  zh: {
    common: {
      save: '保存',
      cancel: '取消',
      // ...
    },
    // ...
  },
};
```

### 2. 初始化 i18n

```typescript
import { initI18n } from '@hamhome/i18n';
import resources from './locales';

// 初始化
await initI18n(resources);
```

### 3. 在 React 应用中使用

```typescript
import { I18nextProvider } from 'react-i18next';
import { getI18nInstance } from '@hamhome/i18n';
import { initI18n } from '@hamhome/i18n';
import resources from './locales';

// 初始化
await initI18n(resources);

// 在应用根组件中包装
function App() {
  return (
    <I18nextProvider i18n={getI18nInstance()}>
      {/* 你的应用组件 */}
    </I18nextProvider>
  );
}
```

### 4. 在组件中使用翻译

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  
  return <button>{t('common.save')}</button>;
}
```

## API 文档

### `createI18nInstance(resources, options?)`

创建并配置 i18next 实例。

**参数：**
- `resources`: `Record<Language, TranslationNamespace>` - 翻译资源对象
- `options`: `Partial<InitOptions>` - 可选的 i18next 配置选项

**返回：** `i18next` 实例

**示例：**
```typescript
import { createI18nInstance } from '@hamhome/i18n';

const i18n = createI18nInstance(resources, {
  fallbackLng: 'en',
  debug: true,
});
```

### `initI18n(resources, options?)`

异步初始化 i18n 实例。

**参数：**
- `resources`: `Record<Language, TranslationNamespace>` - 翻译资源对象
- `options`: `Partial<InitOptions>` - 可选的 i18next 配置选项

**返回：** `Promise<void>`

**示例：**
```typescript
import { initI18n } from '@hamhome/i18n';

await initI18n(resources);
```

### `getCurrentLanguage()`

获取当前使用的语言。

**返回：** `Language` - 当前语言代码

**示例：**
```typescript
import { getCurrentLanguage } from '@hamhome/i18n';

const lang = getCurrentLanguage(); // 'en' | 'zh' | 'ja' | 'ko'
```

### `changeLanguage(lng)`

切换应用语言。

**参数：**
- `lng`: `Language` - 目标语言代码

**返回：** `Promise<string>` - 切换后的语言代码

**示例：**
```typescript
import { changeLanguage } from '@hamhome/i18n';

await changeLanguage('zh');
```

### `getI18nInstance()`

获取 i18next 实例，用于直接访问 i18next API。

**返回：** `i18next` 实例

**示例：**
```typescript
import { getI18nInstance } from '@hamhome/i18n';

const i18n = getI18nInstance();
i18n.language; // 当前语言
i18n.t('common.save'); // 翻译函数
```

## 类型定义

### `Language`

支持的语言类型：

```typescript
type Language = 'en' | 'zh' | 'ja' | 'ko';
```

### `TranslationNamespace`

完整的翻译命名空间类型，包含：

- `CommonNamespace` - 通用文案（common）
- `BookmarkNamespace` - 书签相关文案（bookmark）
- `SettingsNamespace` - 设置相关文案（settings）
- `AINamespace` - AI 相关文案（ai）

### `I18nOptions`

i18n 配置选项类型：

```typescript
interface I18nOptions {
  defaultLanguage?: Language;
  fallbackLanguage?: Language;
  debug?: boolean;
  detection?: {
    order?: string[];
    caches?: string[];
  };
}
```

## 命名空间说明

### common

通用 UI 文案，如按钮、提示信息等：
- `save`, `cancel`, `delete`, `edit`
- `loading`, `error`, `success`, `warning`
- `search`, `empty`, `noResults`

### bookmark

书签管理相关文案：
- `title`, `newBookmark`, `addBookmark`
- `editBookmark`, `deleteBookmark`
- `categories`, `tags`, `placeholders`

### settings

设置页面相关文案：
- `title`, `language`, `theme`
- `aiSettings`, `aiProvider`, `apiKey`
- `importBookmarks`, `exportBookmarks`

### ai

AI 功能相关文案：
- `analyzing`, `generatingTitle`, `generatingDescription`
- `suggestedCategory`, `suggestedTags`
- `error.configNotFound`, `error.apiKeyInvalid`

## 默认配置

包提供了合理的默认配置：

- **默认语言**：`en`
- **回退语言**：`en`
- **命名空间**：`['common', 'bookmark', 'settings', 'ai']`
- **默认命名空间**：`common`
- **语言检测顺序**：`localStorage` → `sessionStorage` → `cookie` → `navigator` → `htmlTag`
- **存储位置**：`localStorage`, `sessionStorage`, `cookie`

## 开发

### 构建

```bash
pnpm build
```

### 开发模式

```bash
pnpm dev
```

## 依赖

- `i18next` - 核心国际化库
- `react-i18next` - React 集成
- `i18next-browser-languagedetector` - 浏览器语言检测

## 许可证

MIT
