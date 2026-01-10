#!/bin/bash
# shadcn/ui 组件安装脚本
# 统计目录下的所有组件并生成安装命令

# 组件列表（共 46 个组件）
components=(
  "accordion"
  "alert"
  "alert-dialog"
  "aspect-ratio"
  "avatar"
  "badge"
  "breadcrumb"
  "button"
  "calendar"
  "card"
  "carousel"
  "chart"
  "checkbox"
  "collapsible"
  "command"
  "context-menu"
  "dialog"
  "drawer"
  "dropdown-menu"
  "form"
  "hover-card"
  "input"
  "input-otp"
  "label"
  "menubar"
  "navigation-menu"
  "pagination"
  "popover"
  "progress"
  "radio-group"
  "resizable"
  "scroll-area"
  "select"
  "separator"
  "sheet"
  "sidebar"
  "skeleton"
  "slider"
  "sonner"
  "switch"
  "table"
  "tabs"
  "textarea"
  "toggle"
  "toggle-group"
  "tooltip"
)

echo "开始安装 shadcn/ui 组件..."
echo "共 ${#components[@]} 个组件"
echo ""

# 逐个安装组件
for component in "${components[@]}"; do
  echo "正在安装: $component"
  npx shadcn@latest add "$component" --yes
  echo ""
done

echo "所有组件安装完成！"

