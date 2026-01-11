# HamHome i18n 集成指南

## 📚 快速开始

本指南将帮助您快速集成 i18n 国际化功能到 HamHome 项目中。

## 1️⃣ 第一步：安装依赖

```bash
# 在 extension 项目目录中
cd apps/extension

# 安装 i18next 和相关依赖
pnpm add i18next react-i18next i18next-browser-languagedetector
```

## 2️⃣ 第二步：使用现有配置

项目已提供以下文件，无需创建：

```
apps/extension/
├── lib/i18n/
│   ├── config.ts          ✅ i18next 配置
│   └── init.ts            ✅ 初始化函数
├── hooks/
│   └── useLanguage.ts     ✅ 语言管理 Hook
└── locales/
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

## 3️⃣ 第三步：在主应用中初始化 i18n

修改 `apps/extension/entrypoints/app/main.tsx`：

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/config';
import { App } from './App';
import './style.css';

// 初始化 i18n（异步）
await i18n.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>,
);
```

## 4️⃣ 第四步：在组件中使用翻译

### 基础用法

```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('common');
  
  return <button>{t('common.save')}</button>;
}
```

### 指定命名空间

```typescript
// 指定单个命名空间
const { t } = useTranslation('bookmark');
return <h1>{t('bookmark.title')}</h1>;

// 指定多个命名空间
const { t: t1 } = useTranslation(['common', 'bookmark']);
```

### 带参数的翻译

```typescript
const { t } = useTranslation('bookmark');

// 翻译文件中: "deleteConfirm": "确定删除 \"{{title}}\" 吗？"
return <p>{t('bookmark.deleteConfirm', { title: 'My Bookmark' })}</p>;
```

### 复数形式

```typescript
const { t } = useTranslation('bookmark');

// 翻译文件中:
// "count": "You have {{count}} bookmark"
// "count_plural": "You have {{count}} bookmarks"

return <p>{t('bookmark.count', { count: 5 })}</p>;
```

## 5️⃣ 第五步：更新现有组件

### 示例 1：更新 MainContent 组件

**原代码**（含硬编码中文）：
```typescript
export function MainContent({ currentView, onViewChange }: MainContentProps) {
  // ...
  return (
    <h2>分类</h2>  // ❌ 硬编码
    <span>查看全部</span>  // ❌ 硬编码
  );
}
```

**更新后**：
```typescript
import { useTranslation } from 'react-i18next';

export function MainContent({ currentView, onViewChange }: MainContentProps) {
  const { t } = useTranslation('bookmark');
  
  return (
    <h2>{t('bookmark.categories')}</h2>
    <span>{t('common.next')}</span>
  );
}
```

### 示例 2：更新带条件的渲染

**原代码**：
```typescript
return (
  <button>{
    isLoading ? '加载中...' : '保存'
  }</button>
);
```

**更新后**：
```typescript
import { useTranslation } from 'react-i18next';

export function MyButton({ isLoading }) {
  const { t } = useTranslation('common');
  
  return (
    <button>{
      isLoading ? t('common.loading') : t('common.save')
    }</button>
  );
}
```

## 6️⃣ 第六步：添加语言切换 UI

在设置页面中添加语言选择器：

```typescript
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hamhome/ui';

export function SettingsPage() {
  const { t } = useTranslation('settings');
  const { language, switchLanguage, availableLanguages } = useLanguage();

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">{t('settings.language')}</label>
      <Select value={language} onValueChange={switchLanguage}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lng) => (
            <SelectItem key={lng} value={lng}>
              {t(`common.languages.${lng}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

## 7️⃣ 第七步：更新类型定义

在 `apps/extension/types/index.ts` 中，`Language` 类型已定义：

```typescript
export type Language = 'zh' | 'en';

export interface LocalSettings {
  // ...
  language: Language;
  // ...
}
```

确保 `Language` 类型与 i18n 配置中的语言列表保持一致。

## ✅ 完整检查清单

在部署前，请确认以下项目已完成：

- [ ] 安装了所有依赖包
- [ ] 在 `main.tsx` 中添加了 `I18nextProvider`
- [ ] 翻译配置文件已正确导入
- [ ] 所有硬编码的中文文本已替换为 `t()` 调用
- [ ] 在设置页面添加了语言切换选项
- [ ] 测试了中英文切换
- [ ] 检查了翻译文本的完整性
- [ ] 验证了参数化翻译是否正确工作

## 🧪 测试翻译

### 手动测试

1. 打开浏览器开发者工具
2. 在 Console 中运行：
   ```javascript
   localStorage.setItem('i18nextLng', 'zh');
   location.reload();
   ```
3. 验证界面是否显示中文

4. 再次运行，切换回英文：
   ```javascript
   localStorage.setItem('i18nextLng', 'en');
   location.reload();
   ```

### 自动化测试（可选）

创建测试文件 `tests/i18n.test.ts`：
```typescript
import i18n from '@/lib/i18n/config';
import { describe, it, expect } from 'vitest';

describe('i18n', () => {
  it('should have all required namespaces', () => {
    expect(i18n.options.ns).toContain('common');
    expect(i18n.options.ns).toContain('bookmark');
  });

  it('should translate keys correctly', async () => {
    await i18n.changeLanguage('en');
    const result = i18n.t('common.save');
    expect(result).toBe('Save');
  });

  it('should support Chinese translation', async () => {
    await i18n.changeLanguage('zh');
    const result = i18n.t('common.save');
    expect(result).toBe('保存');
  });
});
```

## 📝 翻译维护

### 添加新的翻译键

1. **在翻译文件中添加**：
   ```json
   {
     "common": {
       "myNewKey": "My new translation"
     }
   }
   ```

2. **在代码中使用**：
   ```typescript
   const { t } = useTranslation('common');
   return <div>{t('common.myNewKey')}</div>;
   ```

3. **确保中英文都有对应翻译**：
   - `apps/extension/locales/en/common.json`
   - `apps/extension/locales/zh/common.json`

### 翻译文件检查

定期检查翻译文件的完整性：

```bash
# 查看缺失的翻译（需要实现脚本）
npm run i18n:check-missing

# 生成翻译报告
npm run i18n:report
```

## 🐛 常见问题

### Q1: 翻译不显示

**症状**: 页面显示翻译键 `common.save` 而不是 `Save`

**解决方案**:
- 检查命名空间是否正确
- 确保翻译文件已正确导入
- 检查 localStorage 中的 `i18nextLng` 值

### Q2: 语言切换不生效

**症状**: 切换语言后，某些组件的文本没有更新

**解决方案**:
- 确保组件中使用了 `useTranslation` Hook
- 检查组件是否在 `I18nextProvider` 内
- 使用 `useTranslation` 的返回值中的 `i18n` 对象

### Q3: 性能下降

**症状**: 添加 i18n 后应用加载变慢

**解决方案**:
- 使用命名空间分割
- 实现翻译资源的延迟加载
- 减少不必要的重新渲染

### Q4: 特殊字符显示不正确

**症状**: 中文或特殊符号显示乱码

**解决方案**:
- 确保 JSON 文件使用 UTF-8 编码
- 检查 HTML 的 `<meta charset>` 设置

## 📚 进阶用法

### 使用 Trans 组件处理 HTML

```typescript
import { Trans } from 'react-i18next';

export function Component() {
  return (
    <Trans i18nKey="welcome">
      Welcome, <strong>{{ name: 'John' }}</strong>
    </Trans>
  );
}
```

### 条件翻译

```typescript
const { t } = useTranslation('bookmark');

const message = isPremium 
  ? t('bookmark.premiumFeature')
  : t('bookmark.basicFeature');
```

### 动态加载命名空间

```typescript
const { t, i18n } = useTranslation();

// 在运行时加载命名空间
const loadNamespace = async (ns: string) => {
  await i18n.loadNamespaces(ns);
};
```

## 🔗 相关文档

- [i18next 官方文档](https://www.i18next.com/)
- [react-i18next 文档](https://react.i18next.com/)
- [翻译实现方案](./i18n_implementation_plan.md)

## 📞 获取帮助

如有问题，请：
1. 查看 [FAQ](#faq)
2. 检查官方文档
3. 提交 GitHub Issue

---

**最后更新**: 2026-01-10
