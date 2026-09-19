# UI Components API

## Toaster

Sonner toast 容器组件，统一应用 HamHome 的圆角、主题变量和状态样式。

### Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| theme | `ToasterProps["theme"]` | No | `"system"` | toast 主题，透传给 Sonner |
| ...props | `ToasterProps` | No | - | 其他 Sonner `Toaster` 属性 |

### Usage

```tsx
import { Toaster, toast } from "@hamhome/ui";

<Toaster theme="light" />

toast.info("已跳过同步");
toast.success("保存成功");
toast.error("保存失败");
toast.warning("请检查配置");
```

### Notes

- `info` 使用浅蓝背景和深蓝文字，避免亮色主题下白底白字。
- `success`、`error`、`warning` 保持彩色背景和白色文字。
- 描述文字继承当前 toast 状态颜色。

## Masonry (Waterfall)

瀑布流布局组件，支持虚拟滚动和动态高度计算。内部基于 [masonic](https://github.com/jaredLunde/masonic)
的布局原语实现，额外提供「在容器内滚动」的支持。

### Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| brickId | `string` | No | - | 用于标识每个元素的唯一键名，不传则使用索引 |
| bricks | `any[]` | No | `[]` | 要渲染的数据列表 |
| render | `(brick: any, index: number, width: number) => React.ReactNode` | Yes | - | 渲染函数，`width` 为实际列宽 |
| gutter | `number` | No | `24` | 元素之间的间距（px） |
| columnSize | `number` | No | `240` | 列宽基准值，未指定 `columnNum` 时用于推导列数 |
| columnNum | `number` | No | - | 固定列数，不传则按容器宽度自动推导 |
| threshold | `number` | No | `2` | 预渲染区域，相对视口高度的倍数 |
| scrollElement | `HTMLElement \| string \| (() => HTMLElement \| null)` | No | - | 滚动容器：可以是 DOM 元素、元素 ID 字符串，或返回元素的函数 |
| className | `string` | No | `"masonry"` | 容器的 CSS 类名 |
| onRendered | `(startIndex: number, stopIndex: number) => void` | No | - | 渲染范围变化时的回调 |
| children | `React.ReactNode` | No | - | 固定子元素（排在 bricks 之前参与布局） |
| itemHeightEstimate | `number` | No | `300` | 元素高度估算值，用于首屏批量加载和容器高度预估 |

### Ref Methods

| Method | Description |
|--------|-------------|
| `getBricksPosition()` | 获取所有元素的位置信息，用于框选等操作 |
| `relayout()` | 丢弃全部高度缓存并重新测量、重排整个瀑布流 |

### Usage

```tsx
import Masonry from '@hamhome/ui';

// 基础用法
<Masonry
  bricks={items}
  render={(item) => <Card data={item} />}
  columnNum={3}
  gutter={16}
/>

// 使用函数获取滚动元素
<Masonry
  bricks={items}
  render={(item) => <Card data={item} />}
  scrollElement={() => document.querySelector('.scroll-container')}
/>

// 使用 ID 字符串
<Masonry
  bricks={items}
  render={(item) => <Card data={item} />}
  scrollElement="scroll-container-id"
/>
```

### Notes

- `scrollElement` 支持三种方式：DOM 元素引用、元素 ID 字符串、返回元素的函数
- 函数形式适用于元素在组件挂载时可能还不存在的场景
- 不传 `scrollElement` 时会自动向上查找最近的可滚动祖先，找不到则回退到 window 滚动
- 列宽由实际测得的容器宽度推导，容器宽度测出来之前不渲染任何卡片：
  用估算宽度测出的高度会被缓存下来，后续修正宽度也无法纠正，表现为卡片重叠
- 卡片高度可在图片加载或内容变化后动态增长；组件会在重新测量后同步更新容器高度，保证完整内容和滚动范围不会被初始估算值裁切
- `render` 是普通函数 prop，闭包变化（如外部选中态更新）时卡片会正常重渲染，
  不需要把状态塞进 `bricks` 数据里
- **`bricks` 必须是稳定引用（memo 化）**：位置缓存按索引存放，`bricks` 引用一变组件就会
  整体重新测量。筛选、排序、增删数据时这正是需要的（同一索引换成了另一条数据，
  沿用旧高度会让卡片互相压盖）；但如果每次渲染都传入新数组字面量，就会反复重测
