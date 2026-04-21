# HamHome 浏览器工作管家子任务索引

> 来源总方案：[snapshot-sync-pin-tabs-product-plan.md](../snapshot-sync-pin-tabs-product-plan.md)  
> 拆分原则：按可独立设计、开发、验收的功能边界拆分，保留跨模块依赖和阶段关系。

## 子任务列表

| 序号 | 子任务 | 对应阶段 | 主要交付 |
| --- | --- | --- | --- |
| 01 | [快照保存可选](./01-snapshot-save-options.md) | Phase 1 | 保存面板快照开关、设置页默认策略、书签快照操作 |
| 02 | [Markdown 快照同步到 Obsidian](./02-obsidian-markdown-sync.md) | Phase 2 | Obsidian 保存设置、单条同步、批量同步、同步状态 |
| 03 | [分类和书签置顶](./03-pin-categories-bookmarks.md) | Phase 1 | 分类置顶、书签置顶、侧边栏置顶区、置顶排序 |
| 04 | [工作空间保存与恢复 MVP](./04-workspace-save-restore.md) | Phase 3 | 保存当前窗口、工作空间列表、搜索、恢复、地址栏入口 |
| 05 | [工作空间转书签](./05-workspace-to-bookmarks.md) | Phase 4 | 全部转书签、选择转书签、AI 命令转书签 |
| 06 | [工作空间智能分析](./06-workspace-ai-analysis.md) | Phase 4 | Tab 分类、重复 URL 去重、名称和标签推荐 |
| 07 | [Tab 分组规则管理](./07-tab-group-rules.md) | Phase 5 | 分组列表、命中规则、优先级、AI 生成规则 |
| 08 | [新标签页自动分组](./08-new-tab-auto-grouping.md) | Phase 6 | 新 Tab 规则匹配、AI 建议、用户确认策略 |
| 09 | [新人引导页面](./09-onboarding.md) | Phase 7 | 首次引导、AI Key、分类、WebDAV、使用说明 |

## 交付顺序建议

1. 先做 Phase 1：`01` 和 `03`，覆盖当前书签能力增强。
2. 再做 Phase 2：`02`，依赖 Markdown 快照能力和快照状态。
3. 再做 Phase 3：`04`，建立工作空间数据模型和核心入口。
4. 再做 Phase 4：`05` 和 `06`，补齐工作空间的整理与沉淀能力。
5. 再做 Phase 5/6：`07` 和 `08`，扩展到当前 Tab 自动整理。
6. 最后做 Phase 7：`09`，把关键配置和使用路径串成首次体验。

## 跨任务依赖

- `02-obsidian-markdown-sync.md` 依赖 `01-snapshot-save-options.md` 中的 Markdown 快照保存结果。
- `05-workspace-to-bookmarks.md` 依赖 `04-workspace-save-restore.md` 的工作空间和页面列表模型。
- `06-workspace-ai-analysis.md` 会被 `04-workspace-save-restore.md` 的名称生成、`05-workspace-to-bookmarks.md` 的筛选和 `07-tab-group-rules.md` 的规则生成复用。
- `08-new-tab-auto-grouping.md` 依赖 `07-tab-group-rules.md` 的启用规则、优先级和匹配逻辑。
- `09-onboarding.md` 需要复用设置页中的 AI Key、WebDAV、分类配置能力。

## 通用产品原则

- 保存、恢复、转书签、关闭标签页必须由用户明确触发。
- AI 只做推荐，不绕过用户确认。
- 自动影响浏览器当前状态的能力默认关闭。
- 快照或外部同步失败不阻塞书签保存。
- 工作空间必须可从多个入口找回和恢复。
