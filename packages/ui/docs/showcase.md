# UI Component Showcase

## 概述

`ComponentShowcase` 是 `@hamhome/ui` 包中的组件展示页面，用于演示所有可用的基础组件及其用法。

## 组件位置

- 源文件：`packages/ui/src/example/components.tsx`
- 导出：通过 `packages/ui/src/example/index.ts` 导出

## 使用方式

```tsx
import { ComponentShowcase } from '@hamhome/ui';

function App() {
  return <ComponentShowcase />;
}
```

## 展示内容

### 1. 表单组件区域

#### 订阅升级表单示例
展示以下组件的综合使用：
- **Card** - 卡片容器
- **Input** - 文本输入框（姓名、邮箱、卡号等）
- **Label** - 表单标签
- **RadioGroup** - 单选按钮组（方案选择）
- **Textarea** - 多行文本输入
- **Checkbox** - 复选框（条款同意）
- **Button** - 操作按钮

#### 账号创建表单示例
展示以下组件：
- OAuth 登录按钮（GitHub、Google）
- 邮箱密码输入
- 分隔线和提示文本

#### 聊天界面示例
展示以下组件：
- **Avatar** - 用户头像
- **ScrollArea** - 滚动区域
- 消息气泡布局

### 2. 基础组件区域

以独立卡片形式展示各个基础组件：

- **Button** - 按钮（多种变体和尺寸）
  - Default, Secondary, Destructive
  - Outline, Ghost, Link
  - Small, Default, Large, Icon

- **Badge** - 徽章
  - Default, Secondary, Destructive, Outline

- **Switch** - 开关
  - 飞行模式、通知等示例

- **Select** - 选择器
  - 下拉选择水果示例

- **Progress** - 进度条
  - 动态进度显示和控制

- **Slider** - 滑块
  - 可调节数值滑块

- **Avatar** - 头像
  - 图片头像和文字头像

- **Tooltip** - 提示框
  - 悬停显示提示

- **Alert** - 警告框
  - 信息提示样式

### 3. 交互组件区域

展示复杂交互组件：

- **Tabs** - 标签页
  - 账户和密码切换示例

- **Accordion** - 手风琴
  - FAQ 问答展开收起

- **Collapsible** - 折叠面板
  - 仓库列表展开收起

- **Dialog** - 对话框
  - 编辑资料弹窗
  - AlertDialog 确认对话框

### 4. 数据展示

- **Table** - 表格
  - 员工信息表格示例
  - 带状态徽章的数据展示

## 设计特点

### 样式主题
- **背景色**：深色主题 (`#0A0A0A`, `#1A1A1A`)
- **边框色**：灰色调 (`border-gray-700`, `border-gray-800`)
- **主色调**：Indigo (按钮、链接)
- **辅助色**：Teal (聊天加号按钮)

### 布局特性
- 响应式网格布局（1/2/3列）
- 最大宽度限制（`max-w-7xl`）
- 统一间距系统
- 卡片化组件展示

## 技术实现

### 状态管理
- 使用 React.useState 管理动态交互：
  - Progress 进度值
  - Slider 滑块值

### 组件组合
- 充分利用 shadcn/ui 的组件组合能力
- 展示真实场景的使用案例
- 提供可复制的代码示例

## 扩展建议

如需添加新组件到展示页面：

1. 在对应区域添加新的 Card 组件
2. 提供清晰的组件标题
3. 展示主要变体和用法
4. 保持一致的样式主题
5. 更新此文档

## 参考

本展示页面参考了 shadcn/ui 官方示例和现代 SaaS 应用的表单设计模式。
