# UI Components API

## Masonry (Waterfall)

瀑布流布局组件，支持虚拟滚动和动态高度计算。

### Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| brickId | `string` | No | `"id"` | 用于标识每个元素的唯一键名 |
| bricks | `any[]` | No | `[]` | 要渲染的数据列表 |
| render | `(brick: any) => React.ReactNode` | Yes | - | 渲染函数 |
| gutter | `number` | No | `24` | 元素之间的间距（px） |
| columnSize | `number` | No | `240` | 每列的宽度（px） |
| columnNum | `number` | No | `4` | 列数 |
| threshold | `number` | No | `1` | 预加载区域，<10 为容器倍数，>=10 为绝对像素值 |
| scrollElement | `HTMLElement \| string \| (() => HTMLElement \| null)` | No | - | 滚动容器：可以是 DOM 元素、元素 ID 字符串，或返回元素的函数 |
| className | `string` | No | `"masonry"` | 容器的 CSS 类名 |
| onRendered | `() => void` | No | `() => {}` | 渲染完成的回调 |
| children | `React.ReactNode` | No | - | 固定子元素（优先于 bricks 渲染） |

### Ref Methods

| Method | Description |
|--------|-------------|
| `getBricksPosition()` | 获取所有元素的位置信息，用于框选等操作 |
| `relayout()` | 重新计算并渲染整个瀑布流布局 |

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
- 不传 `scrollElement` 时默认监听 window 滚动事件
