# 🌍 HamHome 全球化国际化（i18n）方案

> **让 HamHome 服务全球用户的完整解决方案**

## 快速导航

| 文档 | 适合人群 | 阅读时间 | 内容 |
|------|---------|--------|------|
| **[📌 I18N_SUMMARY.md](./I18N_SUMMARY.md)** | 所有人 | 5 分钟 | 方案总体概览 |
| **[⚡ i18n_quick_reference.md](./i18n_quick_reference.md)** | 开发人员 | 10 分钟 | 速查表和常见用法 |
| **[📖 i18n_integration_guide.md](./i18n_integration_guide.md)** | 开发人员 | 30 分钟 | 分步集成指南 |
| **[🏗️ I18N_ARCHITECTURE.md](./I18N_ARCHITECTURE.md)** | 架构师 | 20 分钟 | 系统架构和流程图 |
| **[📚 i18n_implementation_plan.md](./i18n_implementation_plan.md)** | 深度学习 | 1 小时 | 完整技术方案 |
| **[✅ I18N_DELIVERY_CHECKLIST.md](./I18N_DELIVERY_CHECKLIST.md)** | 项目经理 | 15 分钟 | 交付物清单和进度 |

## 🚀 5 分钟快速开始

### 1. 安装依赖
```bash
cd apps/extension
pnpm add i18next react-i18next i18next-browser-languagedetector
```

### 2. 配置应用 (main.tsx)
```typescript
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>,
);
```

### 3. 在组件中使用
```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('bookmark');
  return <h1>{t('bookmark.title')}</h1>;
}
```

**就这么简单！** ✨

## 📋 核心交付物

### 📄 文档 (5 个)
- ✅ 完整实现方案 (详细设计)
- ✅ 集成指南 (分步教程)
- ✅ 快速参考 (速查表)
- ✅ 架构设计 (可视化)
- ✅ 交付清单 (进度跟踪)

### 💻 代码配置 (3 个)
```
apps/extension/
├── lib/i18n/config.ts      ← i18next 配置
├── lib/i18n/init.ts        ← 初始化函数
└── hooks/useLanguage.ts     ← 语言管理 Hook
```

### 📝 翻译资源 (8 个)
```
apps/extension/locales/
├── en/ (英文)
│   ├── common.json
│   ├── bookmark.json
│   ├── settings.json
│   └── ai.json
└── zh/ (中文)
    ├── common.json
    ├── bookmark.json
    ├── settings.json
    └── ai.json
```

### 🛠️ 工具配置
- ✅ i18next-scanner 自动提取配置
- ✅ 共享包配置 (packages/i18n/)

## 📊 方案特点

| 特性 | 说明 |
|------|------|
| 🎯 **零硬编码** | 所有文本通过翻译系统管理 |
| 🌍 **多语言支持** | 初期中英文，可轻松扩展 |
| 🔄 **自动检测** | 智能检测用户浏览器语言 |
| 💾 **持久化** | 记住用户的语言选择 |
| 📦 **命名空间** | 4 个独立命名空间，便于管理 |
| ⚡ **高性能** | 支持懒加载和缓存优化 |
| 🛠️ **开发友好** | 提供 Hook 和工具函数 |

## 🎯 应用场景

### Extension 浏览器插件
- ✅ 主应用界面
- ✅ 弹窗面板
- ✅ 设置页面
- ✅ AI 功能提示

### Web 管理后台
- ✅ 所有页面
- ✅ 表单验证提示
- ✅ 错误消息
- ✅ 帮助文档

## 📈 翻译键统计

| 模块 | 英文 | 中文 | 总计 |
|------|------|------|------|
| common (通用) | 17 | 17 | 34 |
| bookmark (书签) | 20 | 20 | 40 |
| settings (设置) | 22 | 22 | 44 |
| ai (AI功能) | 28 | 28 | 56 |
| **总计** | **87** | **87** | **174** |

## 🔄 使用工作流

```
开发 → 编写组件 → 使用 useTranslation
  ↓
翻译 → 在 JSON 中维护翻译键
  ↓
测试 → 验证中英文切换
  ↓
部署 → 发布支持多语言的版本
```

## 💡 常见问题速查

### 如何添加新翻译?
1. 在 JSON 文件中添加键值对
2. 在代码中使用 `t('namespace.key')`

### 如何切换语言?
```typescript
const { language, switchLanguage } = useLanguage();
switchLanguage('zh'); // 切换到中文
```

### 如何处理复数?
```typescript
t('bookmark.count', { count: 5 })
// 自动返回 "5 bookmarks" 或 "5 个书签"
```

### 如何添加新语言?
1. 创建目录 `locales/ja/`
2. 复制所有 JSON 文件并翻译
3. 更新配置文件中的语言列表

## 📞 获取帮助

### 快速查询
👉 **i18n_quick_reference.md** - 最常用的 API 和模式

### 逐步学习
👉 **i18n_integration_guide.md** - 详细的集成步骤

### 深入理解
👉 **i18n_implementation_plan.md** - 完整的技术细节

### 遇到问题
👉 查看相应文档的 FAQ 部分

## 🗓️ 实施建议

### 第 1 周
- [ ] 安装依赖
- [ ] 配置 i18n
- [ ] 创建基础测试

### 第 2-3 周
- [ ] 翻译核心功能
- [ ] 更新主要组件

### 第 4 周
- [ ] 完成所有翻译
- [ ] 添加语言切换 UI

### 第 5-6 周
- [ ] Web 应用适配
- [ ] 联调测试

### 第 7-8 周
- [ ] 质量检查
- [ ] 发布上线

## ✨ 核心优势

✅ **完整性** - 从设计到代码到文档，全覆盖  
✅ **可用性** - 提供现成配置和翻译，即插即用  
✅ **可扩展性** - 轻松添加新语言和翻译键  
✅ **易学性** - 5 份文档，循序渐进  
✅ **工程化** - 遵循最佳实践，提供工具  

## 🔗 相关资源

### 官方文档
- [i18next 文档](https://www.i18next.com/)
- [react-i18next 文档](https://react.i18next.com/)

### 项目文档
- [产品需求文档 (PRD)](./prd.md)
- [技术架构](./tech_shared_modules.md)
- [浏览器插件开发](./tech_browser_extension.md)

## 📊 技术栈

```json
{
  "dependencies": {
    "i18next": "^24.0.0",
    "react-i18next": "^15.0.0",
    "i18next-browser-languagedetector": "^7.0.0"
  },
  "devDependencies": {
    "i18next-scanner": "^4.4.0"
  }
}
```

## 🎓 学习路径

### 初级（新手开发人员）
1. 阅读本 README
2. 查看 i18n_quick_reference.md
3. 按照 i18n_integration_guide.md 集成

### 中级（有经验的开发人员）
1. 学习 i18n_implementation_plan.md
2. 理解 I18N_ARCHITECTURE.md
3. 贡献新语言翻译

### 高级（架构师/技术负责人）
1. 深入学习整个方案
2. 优化和扩展功能
3. 制定翻译维护计划

## 👥 团队协作

### 开发人员
- 使用 `useTranslation` Hook
- 用 `t()` 替换硬编码文本
- 测试语言切换功能

### 翻译人员
- 编辑 JSON 文件
- 维护中英文一致性
- 参与新语言翻译

### 项目经理
- 跟踪实施进度
- 制定时间计划
- 协调资源分配

### QA 测试
- 验证多语言功能
- 检查翻译完整性
- 测试极端情况

## 📝 更新日志

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-01-10 | 1.0 | 初始方案完成 |

## ✅ 最终检查清单

- [ ] 已阅读 I18N_SUMMARY.md
- [ ] 已安装依赖包
- [ ] 已配置 I18nextProvider
- [ ] 已测试中英文切换
- [ ] 已更新关键组件
- [ ] 已检查翻译完整性
- [ ] 已通过 QA 测试
- [ ] 已准备发布

## 🎉 开始使用

**立即开始让 HamHome 支持多语言！**

### 第一步：选择合适的起点
- 仅需快速上手？👉 查看 `i18n_quick_reference.md`
- 需要分步指南？👉 查看 `i18n_integration_guide.md`
- 想深入理解？👉 查看 `i18n_implementation_plan.md`

### 第二步：安装依赖并配置
```bash
pnpm add i18next react-i18next i18next-browser-languagedetector
```

### 第三步：在 main.tsx 中初始化
```typescript
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>,
);
```

### 第四步：开始使用翻译
```typescript
const { t } = useTranslation('namespace');
return <div>{t('namespace.key')}</div>;
```

**恭喜！你已经准备好向全球用户服务了！🌍**

---

## 📞 需要帮助？

| 情况 | 建议 |
|------|------|
| 快速查询 API | 📌 i18n_quick_reference.md |
| 集成问题 | 📖 i18n_integration_guide.md |
| 理解架构 | 🏗️ I18N_ARCHITECTURE.md |
| 深入学习 | 📚 i18n_implementation_plan.md |
| 翻译问题 | 📝 翻译文件中的注释 |
| 其他问题 | 🐛 提交 GitHub Issue |

---

**维护者**: HamHome 开发团队  
**最后更新**: 2026-01-10  
**状态**: ✅ 可投入生产使用
