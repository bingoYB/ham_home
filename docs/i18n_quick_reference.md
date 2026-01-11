# HamHome i18n 快速参考

## 🚀 5 分钟快速开始

### 安装
```bash
pnpm add i18next react-i18next i18next-browser-languagedetector
```

### 配置
✅ 已提供文件：
- `apps/extension/lib/i18n/config.ts` - i18next 配置
- `apps/extension/lib/i18n/init.ts` - 初始化函数
- `apps/extension/hooks/useLanguage.ts` - 语言 Hook
- 翻译文件：`apps/extension/locales/[en|zh]/[common|bookmark|settings|ai].json`

### 初始化应用
```typescript
// apps/extension/entrypoints/app/main.tsx
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>,
);
```

### 使用翻译
```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('bookmark');
  return <h1>{t('bookmark.title')}</h1>;
}
```

---

## 📖 常用 API

### useTranslation Hook
```typescript
const { t, i18n, ready } = useTranslation('namespace');

// t() - 翻译函数
t('key')
t('key', { interpolation: 'value' })

// i18n - i18next 实例
i18n.language          // 当前语言
i18n.changeLanguage('en')
i18n.getResource('en', 'namespace', 'key')

// ready - 是否初始化完成
{ready && <Component />}
```

### useLanguage Hook（自定义）
```typescript
import { useLanguage } from '@/hooks/useLanguage';

const {
  language,                    // 当前语言
  switchLanguage,             // 切换语言函数
  availableLanguages,         // ['en', 'zh']
  currentLanguageName,        // 'English' 或 '中文'
  isLoading                   // 是否切换中
} = useLanguage();
```

---

## 🎯 常见使用模式

### 模式 1：简单翻译
```typescript
const { t } = useTranslation('common');
return <button>{t('common.save')}</button>;
```

### 模式 2：参数化翻译
```typescript
const { t } = useTranslation('bookmark');
// 翻译文件: "deleteConfirm": "Delete \"{{title}}\"?"
return <div>{t('bookmark.deleteConfirm', { title: 'My Bookmark' })}</div>;
```

### 模式 3：复数形式
```typescript
const { t } = useTranslation('bookmark');
// "count": "{{count}} bookmark", "count_plural": "{{count}} bookmarks"
return <p>{t('bookmark.count', { count: bookmarks.length })}</p>;
```

### 模式 4：条件翻译
```typescript
const { t } = useTranslation('common');
return <div>{isLoading ? t('common.loading') : t('common.save')}</div>;
```

### 模式 5：多命名空间
```typescript
const { t } = useTranslation(['common', 'bookmark']);
return (
  <div>
    <p>{t('common:common.save')}</p>
    <p>{t('bookmark:bookmark.title')}</p>
  </div>
);
```

### 模式 6：语言切换
```typescript
const { language, switchLanguage } = useLanguage();

return (
  <select value={language} onChange={(e) => switchLanguage(e.target.value)}>
    <option value="en">English</option>
    <option value="zh">中文</option>
  </select>
);
```

---

## 📁 文件位置速查

| 需求 | 位置 |
|------|------|
| i18n 配置 | `apps/extension/lib/i18n/config.ts` |
| 初始化函数 | `apps/extension/lib/i18n/init.ts` |
| 语言 Hook | `apps/extension/hooks/useLanguage.ts` |
| 英文翻译 | `apps/extension/locales/en/*.json` |
| 中文翻译 | `apps/extension/locales/zh/*.json` |
| 使用示例 | `docs/i18n_integration_guide.md` |
| 完整方案 | `docs/i18n_implementation_plan.md` |

---

## 🔑 翻译键快速查询

### 通用（common）
```
common.loading         // 加载中...
common.save           // 保存
common.cancel         // 取消
common.delete         // 删除
common.error          // 错误
common.success        // 成功
```

### 书签（bookmark）
```
bookmark.title        // 书签
bookmark.newBookmark  // 新建书签
bookmark.categories   // 分类
bookmark.tags         // 标签
bookmark.deleteConfirm// 确定删除吗？
```

### 设置（settings）
```
settings.language     // 语言
settings.theme        // 主题
settings.aiSettings   // AI 设置
```

### AI（ai）
```
ai.analyzing          // AI 正在分析...
ai.suggestedCategory  // 推荐分类
ai.error.apiKeyInvalid// API 密钥无效
```

---

## ⚠️ 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| 显示翻译键 `common.save` | 命名空间错误或未初始化 | 检查 `useTranslation()` 的参数 |
| 无法切换语言 | 组件未在 `I18nextProvider` 内 | 在 main.tsx 中添加 Provider |
| 中文显示乱码 | 编码问题 | 确保 JSON 文件是 UTF-8 编码 |
| 翻译文本为空 | 键不存在 | 检查翻译文件中是否存在该键 |

---

## 🛠️ 维护任务

### 添加新翻译
1. 在对应语言的 JSON 文件中添加键值对
2. 确保中英文都有对应翻译
3. 在代码中使用 `t('namespace.key')`

### 更新翻译
1. 找到翻译文件：`apps/extension/locales/[lang]/[namespace].json`
2. 编辑对应的翻译文本
3. 刷新浏览器查看效果

### 添加新语言
1. 创建目录：`apps/extension/locales/ja/`
2. 复制所有 JSON 文件并翻译
3. 更新 `lib/i18n/config.ts` 中的 resources
4. 更新 `useLanguage.ts` 中的 `availableLanguages`

---

## 💡 最佳实践

✅ **DO**
- 使用小驼峰命名 `bookmarkTitle`
- 组织翻译文件，每个功能一个文件
- 使用参数化处理动态内容
- 保持中英文翻译的一致性
- 定期审查缺失的翻译

❌ **DON'T**
- 在代码中硬编码文本
- 使用过深的嵌套结构
- 混合使用不同的命名风格
- 忘记更新对应语言的翻译
- 在翻译中包含 HTML 标记

---

## 📞 快速帮助

### 我想...

**翻译一个组件**
```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('namespace');
  return <div>{t('namespace.key')}</div>;
}
```

**切换语言**
```typescript
import { useLanguage } from '@/hooks/useLanguage';

const { switchLanguage } = useLanguage();
switchLanguage('en');
```

**添加参数**
```typescript
// 翻译文件: "welcome": "Hello {{name}}"
const text = t('welcome', { name: 'John' });
```

**处理复数**
```typescript
// 翻译文件: "item": "{{count}} item", "item_plural": "{{count}} items"
const text = t('item', { count: 5 });
```

**获取当前语言**
```typescript
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
console.log(i18n.language); // 'en' 或 'zh'
```

---

## 🔗 相关资源

| 资源 | 链接 |
|------|------|
| 完整实现方案 | [i18n_implementation_plan.md](./i18n_implementation_plan.md) |
| 集成指南 | [i18n_integration_guide.md](./i18n_integration_guide.md) |
| i18next 文档 | https://www.i18next.com/ |
| react-i18next 文档 | https://react.i18next.com/ |

---

**最后更新**: 2026-01-10  
**维护者**: HamHome 开发团队
