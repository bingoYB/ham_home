# HamHome 全球化语言方案 - 方案总结

## 📊 方案概览

本方案为 HamHome 项目提供了完整的国际化（i18n）解决方案，支持中英文（及后续语言扩展）。

### 核心成果

✅ **已完成**
- [x] i18n 完整实现方案文档
- [x] 创建 `@hamhome/i18n` 共享包（可选）
- [x] i18next 配置文件（`apps/extension/lib/i18n/config.ts`）
- [x] i18n 初始化函数（`apps/extension/lib/i18n/init.ts`）
- [x] 语言管理 Hook（`apps/extension/hooks/useLanguage.ts`）
- [x] 翻译资源文件（中英文，4 个命名空间）
- [x] i18next-scanner 配置用于自动化提取翻译键
- [x] 详细的集成指南和快速参考

### 覆盖范围

| 应用 | 模块 | 命名空间 |
|------|------|---------|
| Extension | 浏览器插件 | common, bookmark, settings, ai |
| Web | 管理后台 | common, bookmark, settings, ai |

---

## 📁 文件清单

### 文档
```
docs/
├── i18n_implementation_plan.md    ← 完整实现方案（详细设计）
├── i18n_integration_guide.md      ← 集成步骤指南（分步教程）
└── i18n_quick_reference.md        ← 快速参考（速查表）
```

### 代码配置
```
apps/extension/
├── lib/i18n/
│   ├── config.ts                  ← i18next 配置
│   └── init.ts                    ← 初始化函数
└── hooks/
    └── useLanguage.ts             ← 语言管理 Hook
```

### 翻译资源
```
apps/extension/locales/
├── en/
│   ├── common.json                ← 通用文案
│   ├── bookmark.json              ← 书签文案
│   ├── settings.json              ← 设置文案
│   └── ai.json                    ← AI 文案
└── zh/
    ├── common.json
    ├── bookmark.json
    ├── settings.json
    └── ai.json
```

### 工具配置
```
i18next-scanner.config.js           ← 自动化翻译提取配置
packages/i18n/package.json          ← 共享包（可选）
```

---

## 🚀 快速开始（3 步）

### 1. 安装依赖
```bash
cd apps/extension
pnpm add i18next react-i18next i18next-browser-languagedetector
```

### 2. 初始化应用
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

### 3. 使用翻译
```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('bookmark');
  return <h1>{t('bookmark.title')}</h1>;
}
```

---

## 📚 使用文档

### 对于快速查询
👉 **查看**: `docs/i18n_quick_reference.md`
- 5 分钟快速开始
- 常用 API 速查
- 常见模式示例
- 常见错误排查

### 对于集成实现
👉 **查看**: `docs/i18n_integration_guide.md`
- 分步集成指南
- 组件更新示例
- 语言切换 UI
- 完整检查清单

### 对于深入理解
👉 **查看**: `docs/i18n_implementation_plan.md`
- 完整技术方案
- 架构设计
- 翻译文件结构
- 最佳实践
- 分阶段实施计划

---

## 🎯 实施路线图

### 阶段 1：基础设置（第 1 周）
- [ ] 安装依赖
- [ ] 在主应用中配置 i18n
- [ ] 创建基础测试

### 阶段 2：核心功能翻译（第 2-3 周）
- [ ] 翻译书签模块（bookmark）
- [ ] 翻译通用文案（common）
- [ ] 更新相关组件

### 阶段 3：完整功能翻译（第 4 周）
- [ ] 翻译设置模块（settings）
- [ ] 翻译 AI 模块（ai）
- [ ] 添加语言切换 UI

### 阶段 4：Web 应用适配（第 5-6 周）
- [ ] 复制配置到 web 应用
- [ ] 翻译 web 所有页面
- [ ] 联调测试

### 阶段 5：测试和优化（第 7 周）
- [ ] 功能完整性测试
- [ ] 翻译质量审查
- [ ] 性能优化

### 阶段 6：发布（第 8 周）
- [ ] 文档完善
- [ ] 发布新版本
- [ ] 反馈收集

---

## 🔧 技术栈

| 功能 | 库 | 版本 |
|------|-----|------|
| i18n 核心 | i18next | ^24.0.0 |
| React 集成 | react-i18next | ^15.0.0 |
| 浏览器语言检测 | i18next-browser-languagedetector | ^7.0.0 |
| 翻译键自动提取 | i18next-scanner | ^4.4.0 |

---

## 🎨 翻译命名空间

### common.json（通用文案）
```
✓ 操作按钮：save, cancel, delete, edit, close
✓ 反馈状态：loading, error, success, warning
✓ 列表状态：empty, noResults, search
✓ 导航：back, next
✓ 语言列表：languages.en, languages.zh, ...
```

### bookmark.json（书签文案）
```
✓ 操作：newBookmark, addBookmark, editBookmark, deleteBookmark
✓ 提示：deleteConfirm, deleteSuccess, saveSuccess, saveFailed
✓ 占位符：placeholders.title, placeholders.description, placeholders.url
✓ 分类和标签：categories, uncategorized, tags
✓ 显示：recent, all, search, createdAt
✓ 统计：count (含复数形式)
```

### settings.json（设置文案）
```
✓ 通用设置：language, theme, themeOptions
✓ AI 设置：aiSettings, aiProvider, apiKey, modelName
✓ 导入导出：importBookmarks, exportBookmarks
✓ 按钮和描述
✓ 设置分组
```

### ai.json（AI 文案）
```
✓ 处理状态：analyzing, generatingTitle, generatingDescription, extractingContent
✓ 推荐：suggestedCategory, suggestedTags
✓ 错误处理：完整的错误消息
✓ 成功提示：配置保存、连接测试等
```

---

## 💡 关键特性

### 1. 零硬编码
所有用户可见的文本都通过翻译系统管理，代码中无硬编码。

### 2. 自动语言检测
- 优先检查 localStorage 用户选择
- 其次检查浏览器语言
- 最后使用英文作为默认

### 3. 持久化存储
用户的语言选择被保存到：
- localStorage（客户端）
- AppSettings（应用层）
- 自动在下次启动时恢复

### 4. 参数化翻译
支持动态内容：
```typescript
t('bookmark.deleteConfirm', { title: 'My Bookmark' })
```

### 5. 复数形式
自动处理复数：
```typescript
t('bookmark.count', { count: 5 })
// "你有 5 个书签" 或 "You have 5 bookmarks"
```

### 6. 命名空间分割
4 个独立的命名空间：
- `common` - 通用文案
- `bookmark` - 书签相关
- `settings` - 设置相关
- `ai` - AI 相关

---

## 🔐 最佳实践

✅ **推荐做法**
- 使用小驼峰命名键：`bookmarkTitle`
- 按功能分组翻译
- 保持中英文翻译同步
- 定期审查缺失的翻译
- 使用参数化处理动态内容

❌ **避免做法**
- 硬编码文本到代码中
- 过度嵌套翻译键
- 混合不同的命名风格
- 忘记更新对应语言的翻译
- 在翻译中包含 HTML 标记

---

## 🛠️ 维护指南

### 添加新翻译键
1. 在翻译文件中添加：`apps/extension/locales/[lang]/[namespace].json`
2. 确保中英文都有对应翻译
3. 在代码中使用 `t('namespace.key')`

### 添加新语言
1. 创建目录：`apps/extension/locales/[lang]/`
2. 复制所有 JSON 文件并翻译
3. 更新 `lib/i18n/config.ts` 中的 resources
4. 更新 `types/index.ts` 中的 `Language` 类型
5. 更新 `hooks/useLanguage.ts` 中的 `availableLanguages`

### 自动提取翻译键
```bash
# 安装 i18next-scanner
pnpm add -D i18next-scanner

# 运行扫描
npx i18next-scanner

# 会生成新的 .new.json 文件，手动合并
```

---

## 📊 翻译键统计

| 命名空间 | 英文键数 | 中文键数 | 状态 |
|---------|--------|--------|------|
| common | ✅ 17 | ✅ 17 | 完成 |
| bookmark | ✅ 20 | ✅ 20 | 完成 |
| settings | ✅ 22 | ✅ 22 | 完成 |
| ai | ✅ 28 | ✅ 28 | 完成 |
| **总计** | **87** | **87** | ✅ **完成** |

---

## 🧪 测试方案

### 手动测试
```javascript
// 在浏览器 Console 中切换语言
localStorage.setItem('i18nextLng', 'zh');
location.reload();
```

### 自动化测试框架（可选）
```typescript
// 使用 Vitest 或 Jest
describe('i18n', () => {
  it('should translate to Chinese', () => {
    i18n.changeLanguage('zh');
    expect(i18n.t('common.save')).toBe('保存');
  });
});
```

---

## 📈 性能考虑

| 优化项 | 措施 | 效果 |
|------|------|------|
| 初始加载 | 命名空间分割 | 减少初始 JS 大小 |
| 内存占用 | 翻译资源缓存 | 避免重复加载 |
| 切换速度 | 本地存储缓存 | 即时切换，无需网络 |
| 代码分割 | 按需加载命名空间 | 优化加载性能 |

---

## 📞 常见问题

### Q: 如何处理日期格式化？
**A:** 使用 `Intl.DateTimeFormat` API，根据 `i18n.language` 自动格式化。

### Q: 支持复数形式吗？
**A:** 是的，i18next 内置支持。在翻译文件中使用 `_plural` 后缀。

### Q: 可以添加其他语言吗？
**A:** 可以。创建新的语言目录，复制翻译文件并翻译，更新配置。

### Q: 如何处理 RTL 语言（如阿拉伯语）？
**A:** 此方案暂未支持，需要额外的 CSS 和 HTML dir 属性处理。

### Q: 翻译文件可以使用其他格式吗？
**A:** 可以（如 YAML、CSV），需要对应的 i18next backend。当前推荐 JSON。

---

## 🔗 相关资源

### 官方文档
- [i18next 官方文档](https://www.i18next.com/)
- [react-i18next 文档](https://react.i18next.com/)
- [i18next-scanner 文档](https://github.com/i18next/i18next-scanner)

### 项目文档
- [完整实现方案](./i18n_implementation_plan.md)
- [集成指南](./i18n_integration_guide.md)
- [快速参考](./i18n_quick_reference.md)

### 相关技术文档
- [浏览器插件开发](./tech_browser_extension.md)
- [前端架构](./tech_frontend_web.md)
- [共享模块](./tech_shared_modules.md)

---

## 👥 贡献指南

欢迎改进和扩展此方案：

1. **报告问题** - 发现 bug 请提交 Issue
2. **改进建议** - 提出改进意见和新功能
3. **参与翻译** - 贡献新语言的翻译
4. **完善文档** - 改进文档的清晰度和准确性

---

## 📝 版本历史

| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | 2026-01-10 | 初始方案完成 |

---

## 📋 检查清单

实施前请确认：

- [ ] 阅读了 `i18n_implementation_plan.md`
- [ ] 理解了整体架构
- [ ] 准备了团队培训
- [ ] 已创建项目支持的所有翻译文件
- [ ] 已安装所有必需的依赖
- [ ] 已在主应用中配置 i18n Provider
- [ ] 已创建至少一个测试组件验证功能
- [ ] 已制定翻译维护计划
- [ ] 已准备好用户文档

---

## 📞 获取帮助

如需帮助，请：

1. 查看相关文档（上方列出）
2. 检查官方 i18next 文档
3. 提交 GitHub Issue
4. 联系开发团队

---

**方案完成时间**: 2026-01-10  
**维护者**: HamHome 开发团队  
**状态**: ✅ 完成并可投入使用
