# AEO V2 实施与验证记录

日期：2026-10-17。状态：本地实现与验证完成，尚未发布网站、更新 GitHub About 或提交商店资料。

## 实施范围

基于 `origin/main` 的 `fb11d3c`，在独立分支 `codex/aeo-v2` 实施。主工作区 `fix/webdav-sync-integrity` 的扩展改动不纳入本次修改。

- 首页、导航品类、title、description、Open Graph、SoftwareApplication 与 FAQ 统一到 AI 书签管理定位；保留原中英文 slogan。
- 首屏明确 AI 分类/标签/摘要、导入旧书签后批量分析、关键词/语义搜索、本地存储与自选 AI。说明模型配置、Embedding 独立配置、API 费用与相关内容发送。
- 复用安装组件，在首页与指南的初始 HTML 提供 Chrome、Edge、Firefox 直接商店链接。
- 新增三组双语指南，沿用现有 `/[lang]/guides/[slug]/` 路由，自动进入首页链接、sitemap、hreflang、TechArticle 与面包屑：
  - `ai-bookmark-manager`：适用场景、安装与整理流程。
  - `import-bookmarks`：导入、文件夹保留与 AI 分析互斥、批量分析、可选写回。
  - `ai-provider-setup`：DeepSeek/OpenAI/Ollama 配置、Embedding 与隐私范围。
- 每种语言 FAQ 从 19 条补到 22 条，仍全部输出为静态 `details/summary`。
- 同步中英文 README、扩展 manifest 名称与简介，准备 `apps/extension/docs/aeo-store-copy-v2.md` 中的双语商店长描述。
- Pages workflow 加入 Web 单元测试及生产静态导出验证，失败时不上传部署产物。

## 本地验证

生产构建使用正式部署路径与域名：

```sh
NEXT_PUBLIC_BASE_PATH=/ham_home NEXT_PUBLIC_SITE_URL=https://bingoyb.github.io/ham_home pnpm build:web
node apps/web/scripts/verify-static-export.mjs
```

- 构建与 TypeScript 检查通过。
- 在 `apps/web` 运行 `node node_modules/vitest/vitest.mjs run`，2 个测试文件、12 项测试通过。直接调用锁定依赖的 Vitest，避开本机 pnpm 启动器在沙箱内的联网身份校验。
- 20 个静态内容页面与 `404.html` 通过：canonical、双语 alternate/x-default、真实链接、图片、OG、JSON-LD、FAQ、robots 与 sitemap。sitemap 包含 18 个正式语言 URL，两个历史入口分别 canonical 到中文正式页。
- 静态验证新增旧书签流程、费用、云端发送、Embedding 条件、三个商店入口和全部指南可发现性检查。
- Chromium 浏览器检查中英文首页及三个新指南，共 8 个 URL，在 1440 与 390 宽度下的 16 个场景均返回 200、只有一个 H1、无横向溢出。人工查看中文桌面/手机首页、英文桌面首页和英文手机导入指南截图；最终英文首页 console 无错误或警告。
- 扩展语言 JSON 可解析，中文/英文简介分别为 69/129 字符，均不超过 132。扩展功能代码未修改，本轮未打包或提交新版本。
- `git diff --check` 通过。构建生成的 `next-env.d.ts` 路径变化未纳入修改。

浏览器截图位于独立工作区的 `output/playwright/`，作为本地验收产物保留，不纳入版本库。指南使用现有真实插件截图；没有把截图示例宣称为一次真实 AI 整理成功率测试。

## 发布前后待办

1. 合并并发布网站，重新验证正式站的三组新指南、静态 FAQ、安装链接与 sitemap；本地通过不代表线上已更新。
2. 推送 README，并更新 GitHub About。建议英文：`Local-first AI bookmark manager for Chrome, Edge & Firefox. AI categories, tags, summaries, bulk analysis and semantic search. Bring your own AI provider.`
3. 对照各商店实际公开版本核验能力，先上线指南，再提交新长描述与扩展简介；分别记录提交、审核和公开展示状态。
4. 补充使用本人可用 AI 服务或本地模型完成的旧书签整理演示与实际结果；本轮完成了配置/操作教程，尚未录制新的真实 AI 调用演示。
5. 发布后使用固定问题、模型、地区与搜索条件进行多次推荐表现观察，记录日期、引用 URL、是否提及 HamHome 和功能描述准确性。本轮没有测得新的推荐率或收录效果。

已有线上基线在本轮核验：中文与英文首页、sitemap 返回 200，canonical 指向 `https://bingoyb.github.io/ham_home/` 下的正式语言 URL，19 条 FAQ/语言已静态输出。V2 在该基线上增加内容与入口，不重复旧版域名修复。
