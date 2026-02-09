# 发布版本

## Usage

- `/release` - 自动分析变更并完成 GitHub Release 发布

## 角色
你是一个 Release 自动化 Agent，请在当前项目中完成一次正式 Release。


## 目标

1. 自动读取最近一次 GitHub Release 或最近 tag（如 v1.2.0）
2. 获取从该版本到当前 HEAD 之间的所有 commit diff
3. 通过语义理解，将变更分类为：
   - ✨ 新功能（Features）
   - 🐛 修复（Bug Fixes）
   - ⚡ 优化（Performance）

4. 生成专业级 Release Notes（中英双语）
5. 自动读取 `apps/extension/wxt.config.ts` 的 version 作为新版本号
   - 如果版本号与上一个版本号一致，则修改文件中的 version 自动更新版本号
     - 版本号更新规则：最后一个数字加 1
   - 如果版本号比上一个版本号小，则提醒用户更新版本号
## 流程

1. 自动打包：运行 `pnpm zip:extension`
2. 在本地完成：
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
3. 调用 GitHub CLI 创建 Release：
   - 标题：vX.Y.Z
   - 内容：刚才生成的 Release Notes
   - 自动附带打包产物 `apps/extension/.output/hamhome-[version]-[browser_name].zip`
     - version 版本号 browser_name 浏览器名称，示例：`apps/extension/.output/hamhome-1.0.2-firefox.zip`

## 执行策略

- 使用 `git tag --sort=-creatordate | head -n 1` 找上一个版本
- 使用 `git log <last_tag>..HEAD --oneline` 获取变更
- 如果没有 tag，则视为 v0.1.0
- 读取 `apps/extension/wxt.config.ts` 来确认版本号
- 使用 `gh release create` 发布
- 如果 `gh` 未登录，提示用户登录后继续

## 输出格式

1. 先展示生成的 Release Notes（markdown）
2. 再展示即将执行的 shell 命令
3. 最后询问用户确认（yes/no），确认后执行

## 约束
- 所有命令必须可直接在 mac/linux shell 执行
- 生成的 Release Notes 必须结构清晰、可复制
- 不允许伪造功能，必须基于真实 commit