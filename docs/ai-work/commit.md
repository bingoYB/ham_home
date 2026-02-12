# 提交代码

## 特性

- 运行检查(使用 `pnpm run test`)
- 如果没有暂存，则自动暂存变更文件
- 建议按照不同的关注点及特性拆分提交
- 使用中文，避免使用 emoji 表情

## Usage

- `/commit` - 配合 pre-commit 检查进行提交
- `/commit --no-verify` - 跳过 pre-commit 的检查

## Commit Types

- feat: 新特性
- fix: 问题修复
- docs: 文档或注释变更
- refactor: 没有改变逻辑的代码重构
- style: 例如代码格式化，补充标点等
- perf: 性能优化
- test: 添加或调整测试用例
- chore: 工具、配置变更

## 过程

1. 检查当前缓存的变更
2. 如果没有 `--no-verify`， 运行 pre-commit 检查
3. 如果没有暂存变更，则对当前的变更文件进行分析
4. 分析变更并确定 commit 类型
5. 如果提交过于复杂，尝试拆分 commit，保证 commit 保持功能的一致性与原子性
6. 生成 commit 的描述
7. 执行提交

## commit 要求

- 保持 commit 的原子性与专注性
- 以命令式语气编写（例如用‘添加功能’而非‘已添加功能’）
- 解释为什么，而不只是做了什么
- 一个 commit 的内容保持摘要简洁
- 将不相关的修改拆分到不同的提交中，尽量避免一次性提交复杂的变更
- pre-commit 失败不要直接修复，让我选择如何处理
- commit 描述中不要包含对内容的评价
