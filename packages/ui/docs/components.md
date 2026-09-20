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

## ScrollArea

基于 Radix `@radix-ui/react-scroll-area` 的滚动容器，用统一样式的滚动条替代系统原生滚动条
（原生滚动条在深色主题下会出现浅色滚动槽，且各平台样式不一致）。

### Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| type | `"auto" \| "always" \| "scroll" \| "hover"` | No | `"hover"` | 滚动条显示时机，透传给 Radix |
| viewportRef | `React.Ref<HTMLDivElement>` | No | - | 拿到真正发生滚动的 viewport 节点 |
| viewportClassName | `string` | No | - | viewport 的类名；内边距等影响滚动内容的样式加在这里 |
| className | `string` | No | - | 根节点类名，用于约束滚动区域自身的尺寸 |
| ...props | `ScrollAreaPrimitive.Root` | No | - | 其他 Radix `Root` 属性 |

`ScrollBar` 同时导出，默认已内置在 `ScrollArea` 中，一般不需要单独使用。

### Usage

```tsx
import { ScrollArea } from "@hamhome/ui";

// 普通滚动区域
<ScrollArea className="h-80">
  <div className="p-4">{content}</div>
</ScrollArea>

// 虚拟列表 / 瀑布流：必须把 viewport 交给它们，否则读到的 scrollTop 恒为 0
const viewportRef = useRef<HTMLDivElement>(null);

<ScrollArea type="auto" className="min-h-0 flex-1" viewportRef={viewportRef}>
  <div className="p-6">
    <Masonry bricks={items} render={renderCard} scrollElement={() => viewportRef.current} />
  </div>
</ScrollArea>
```

### Notes

- **默认的 `type="hover"` 在指针进入之前会把 viewport 设为 `overflow: hidden`**，
  此时它还不是滚动容器：向上查找可滚动祖先的逻辑（如 `Masonry` 的自动查找）会直接越过它，
  滚轮也可能滚不动。页面级的主滚动区域用 `type="auto"`，内容溢出即常驻滚动条
- 滚动条是覆盖层，不占布局宽度，不需要 `scrollbar-gutter: stable`；内容内边距留够
  （≥ `p-4`）即可避免与滚动条重叠
- viewport 的内容层默认是 `display: table`，高度不会撑满。内部需要 `h-full` / `min-h-full`
  时，用 `viewportClassName="[&>div]:block! [&>div]:h-full"`
- 滑块颜色取自 `foreground` 透明度而不是 `--border`：深色主题下 `--border` 几乎融进背景

## Calendar

shadcn/ui 的日历组件，底层是 `react-day-picker` v9。样式全部由 Tailwind class 覆盖，
不需要额外引入 `react-day-picker` 的 CSS。

### Props

透传 `react-day-picker` 的 `DayPicker` 全部属性，常用的有：

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| mode | `"single" \| "multiple" \| "range"` | No | - | 选择模式 |
| selected | `Date \| Date[] \| DateRange` | No | - | 当前选中值，类型随 `mode` 变化 |
| onSelect | `(value) => void` | No | - | 选中回调 |
| captionLayout | `"label" \| "dropdown" \| "dropdown-months" \| "dropdown-years"` | No | `"label"` | 月份/年份标题样式；`dropdown` 渲染成原生 `select`，可快速跨年份跳转 |
| locale | `date-fns Locale` | No | `enUS` | 月份、星期名的语言 |
| startMonth / endMonth | `Date` | No | - | 可导航到的最早/最晚月份；`captionLayout` 含年份下拉时不传默认是「100 年前 ~ 今年年底」 |
| disabled | `Matcher \| Matcher[]` | No | - | 不可选日期；数组是「或」关系，`{ before, after }` 写在同一个对象里是「且」 |
| buttonVariant | `ButtonProps["variant"]` | No | `"ghost"` | 上/下月导航按钮的样式 |

### Usage

```tsx
import { Calendar } from "@hamhome/ui";

const [date, setDate] = useState<Date>();

<Calendar mode="single" selected={date} onSelect={setDate} />;
```

### Notes

- 日期格子上有两个属性：`data-day` 是 `toLocaleDateString()` 结果（跟随运行时语言），
  `data-date` 是本地时区的 `YYYY-MM-DD`。要用选择器定位某一天（样式、E2E）只能用 `data-date`
- 上/下月导航按钮带 `react-day-picker` 的默认类名 `rdp-button_previous` / `rdp-button_next`
- 要做「输入框 + 日历下拉」用 `DatePicker`，不要自己再拼一遍 Popover

### 配套的日期工具

`data-date` 用的那套 `YYYY-MM-DD` 编解码同样从 `@hamhome/ui` 导出，需要把日历选择结果
存成字符串时直接用它们，不要自己 `toISOString()` / `new Date('2026-09-20')`——这两个都走 UTC，
在 UTC 以西的时区会整整差一天。

| Export         | Signature                                | Description                                       |
| -------------- | ---------------------------------------- | ------------------------------------------------- |
| `toISODate`    | `(date: Date) => string`                 | 按本地时间格式化成 `YYYY-MM-DD`                    |
| `parseISODate` | `(value: string) => Date \| undefined`   | 解析 `YYYY-MM-DD` 为当天本地零点；格式非法或日期不存在（如 `2026-02-31`）返回 `undefined` |

---

## DatePicker

触发按钮 + 日历弹层的日期选择器（shadcn/ui date picker 组合），用来替代 `<input type="date">`：
原生控件的弹层样式跟随浏览器，无法适配主题，各浏览器表现也不一致。

### Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| value | `Date` | No | - | 选中日期；不传渲染 `placeholder` |
| onChange | `(date: Date \| undefined) => void` | No | - | 选中回调 |
| placeholder | `string` | No | - | 未选中时按钮上的文案 |
| disabled | `boolean` | No | `false` | 禁用触发按钮 |
| min / max | `Date` | No | - | 可选日期的上下界（含端点），超出范围的日期不可点击 |
| startMonth / endMonth | `Date` | No | `min` / `max` | 可导航到的最早/最晚月份 |
| language | `string` | No | - | BCP-47 语言标签（如 `zh-CN`、`en`），决定星期名、月份下拉和按钮文案的语言 |
| captionLayout | 同 `Calendar` | No | `"dropdown"` | 月份/年份标题样式 |
| container | `HTMLElement` | No | - | Portal 容器，渲染在 Shadow DOM 里时必传 |
| className | `string` | No | - | 触发按钮类名 |
| id | `string` | No | - | 触发按钮 id，配合 `<Label htmlFor>` 使用 |
| aria-label | `string` | No | - | 触发按钮的无障碍名称 |

### Usage

```tsx
import { DatePicker, Label } from "@hamhome/ui";

const [start, setStart] = useState<Date>();
const [end, setEnd] = useState<Date>();

<Label htmlFor="range-start">开始日期</Label>
<DatePicker
  id="range-start"
  value={start}
  onChange={setStart}
  max={end}
  language={i18n.language}
  placeholder="开始日期"
/>;
```

### Notes

- `language` 只按 `zh` 前缀区分中英文；日历内部用 date-fns locale、触发按钮用 `Intl`，
  两边由同一处映射得出，不会出现「星期是中文、月份是英文」
- date-fns locale 按 `date-fns/locale/zh-CN` 这样的子路径引入，避免 `date-fns/locale`
  桶文件把上百个 locale 打进产物
- 选中日期后弹层自动关闭；清空选择（`onChange(undefined)`）不关闭
- 起止日期成对使用时，把对方的值互相传给 `max` / `min`，越界的日期就点不到了
