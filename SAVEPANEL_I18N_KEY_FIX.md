# SavePanel 国际化 Key 修正说明

## 问题
之前的翻译key格式不正确，导致页面显示的是key本身而不是翻译后的文本。

## 原因
项目使用的 i18next 配置采用命名空间（namespace）结构：
- 每个翻译文件（如 `bookmark.json`, `ai.json`）被注册为一个命名空间
- 文件内容有一个顶层key（通常与文件名相同）
- 正确的key格式应该是：`namespace:topLevelKey.actualKey`

## 错误的格式 ❌
```typescript
t('bookmark.savePanel.cancel')
t('ai.status.analyzing')
t('common.delete')
```

## 正确的格式 ✅
```typescript
t('bookmark:savePanel.cancel')
t('ai:ai.status.analyzing')
t('common:common.delete')
```

## 修改内容

### 1. SavePanel.tsx
修正了所有翻译key，包括：
- `bookmark.savePanel.*` → `bookmark:savePanel.*`
- `bookmark.uncategorized` → `bookmark:bookmark.uncategorized`
- `common.delete` → `common:common.delete`

### 2. AIStatus.tsx
修正了所有AI状态相关的翻译key：
- `ai.status.*` → `ai:ai.status.*`

## 完整的Key映射表

### SavePanel相关 (bookmark命名空间)
| 旧Key (错误) | 新Key (正确) |
|-------------|-------------|
| `bookmark.savePanel.cancel` | `bookmark:savePanel.cancel` |
| `bookmark.savePanel.saving` | `bookmark:savePanel.saving` |
| `bookmark.savePanel.updateBookmark` | `bookmark:savePanel.updateBookmark` |
| `bookmark.savePanel.saveBookmark` | `bookmark:savePanel.saveBookmark` |
| `bookmark.savePanel.alreadyBookmarked` | `bookmark:savePanel.alreadyBookmarked` |
| `bookmark.savePanel.smartSuggestions` | `bookmark:savePanel.smartSuggestions` |
| `bookmark.savePanel.recommendedCategory` | `bookmark:savePanel.recommendedCategory` |
| `bookmark.savePanel.recommendedTags` | `bookmark:savePanel.recommendedTags` |
| `bookmark.savePanel.titleLabel` | `bookmark:savePanel.titleLabel` |
| `bookmark.savePanel.titlePlaceholder` | `bookmark:savePanel.titlePlaceholder` |
| `bookmark.savePanel.descriptionLabel` | `bookmark:savePanel.descriptionLabel` |
| `bookmark.savePanel.descriptionPlaceholder` | `bookmark:savePanel.descriptionPlaceholder` |
| `bookmark.savePanel.categoryLabel` | `bookmark:savePanel.categoryLabel` |
| `bookmark.savePanel.selectCategory` | `bookmark:savePanel.selectCategory` |
| `bookmark.savePanel.getSuggestions` | `bookmark:savePanel.getSuggestions` |
| `bookmark.savePanel.loading` | `bookmark:savePanel.loading` |
| `bookmark.savePanel.tagsLabel` | `bookmark:savePanel.tagsLabel` |
| `bookmark.savePanel.tagPlaceholder` | `bookmark:savePanel.tagPlaceholder` |
| `bookmark.savePanel.aiRecommendedCategory` | `bookmark:savePanel.aiRecommendedCategory` |
| `bookmark.savePanel.apply` | `bookmark:savePanel.apply` |
| `bookmark.uncategorized` | `bookmark:bookmark.uncategorized` |

### AI状态相关 (ai命名空间)
| 旧Key (错误) | 新Key (正确) |
|-------------|-------------|
| `ai.status.analyzing` | `ai:ai.status.analyzing` |
| `ai.status.completed` | `ai:ai.status.completed` |
| `ai.status.failed` | `ai:ai.status.failed` |
| `ai.status.retry` | `ai:ai.status.retry` |
| `ai.status.notConfigured` | `ai:ai.status.notConfigured` |
| `ai.status.configure` | `ai:ai.status.configure` |

### 通用文本 (common命名空间)
| 旧Key (错误) | 新Key (正确) |
|-------------|-------------|
| `common.delete` | `common:common.delete` |

## 验证结果

✅ 所有翻译key已修正
✅ 构建成功，无错误
✅ 代码格式统一

## 翻译文件结构说明

以 `bookmark.json` 为例：
```json
{
  "bookmark": {           // 顶层key，与文件名相同
    "savePanel": {        // 第二层分组
      "cancel": "取消"    // 实际翻译
    }
  }
}
```

使用时：`t('bookmark:savePanel.cancel')`
- `bookmark` - 命名空间（对应文件名）
- `savePanel.cancel` - JSON路径（从顶层key开始）

## 参考其他组件
项目中其他已经正确使用翻译的组件：
- `OptionsPage.tsx` - 使用 `settings:settings.*`
- `CategoriesPage.tsx` - 使用 `common:common.*`

这些组件的用法可作为参考标准。
