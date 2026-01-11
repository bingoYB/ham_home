#!/bin/bash

# HamHome 插件 i18n 集成验证脚本
# 用途: 快速验证 i18n 集成是否正确

set -e

echo "🔍 开始验证 HamHome 插件 i18n 集成..."
echo ""

# 1. 检查文件是否存在
echo "1️⃣ 检查必要的文件..."
files=(
  "apps/extension/lib/i18n/config.ts"
  "apps/extension/lib/i18n/init.ts"
  "apps/extension/hooks/useLanguage.ts"
  "apps/extension/locales/en/common.json"
  "apps/extension/locales/en/bookmark.json"
  "apps/extension/locales/en/settings.json"
  "apps/extension/locales/en/ai.json"
  "apps/extension/locales/zh/common.json"
  "apps/extension/locales/zh/bookmark.json"
  "apps/extension/locales/zh/settings.json"
  "apps/extension/locales/zh/ai.json"
)

missing_files=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file (缺失)"
    ((missing_files++))
  fi
done

if [ $missing_files -eq 0 ]; then
  echo "   ✅ 所有文件都存在"
else
  echo "   ❌ 缺少 $missing_files 个文件"
  exit 1
fi

echo ""

# 2. 检查 main.tsx 中的 I18nextProvider
echo "2️⃣ 检查 main.tsx 中的 I18nextProvider..."
if grep -q "I18nextProvider" "apps/extension/entrypoints/app/main.tsx"; then
  echo "   ✅ I18nextProvider 已添加"
else
  echo "   ❌ I18nextProvider 未找到"
  exit 1
fi

echo ""

# 3. 检查组件中的翻译导入
echo "3️⃣ 检查组件中的翻译导入..."
components=(
  "apps/extension/components/Sidebar.tsx"
  "apps/extension/components/MainContent.tsx"
  "apps/extension/components/OptionsPage.tsx"
)

for component in "${components[@]}"; do
  if grep -q "useTranslation" "$component"; then
    echo "   ✅ $component"
  else
    echo "   ⚠️  $component (未导入 useTranslation)"
  fi
done

echo ""

# 4. 检查翻译键
echo "4️⃣ 检查翻译键完整性..."
key_counts=(
  "apps/extension/locales/en/common.json:15"
  "apps/extension/locales/en/bookmark.json:15"
  "apps/extension/locales/en/settings.json:15"
  "apps/extension/locales/en/ai.json:15"
)

for item in "${key_counts[@]}"; do
  file="${item%:*}"
  min_keys="${item##*:}"
  
  if [ -f "$file" ]; then
    key_count=$(grep -o '": "' "$file" | wc -l)
    if [ "$key_count" -ge "$min_keys" ]; then
      echo "   ✅ $file ($key_count 个键)"
    else
      echo "   ⚠️  $file (只有 $key_count 个键，预期至少 $min_keys 个)"
    fi
  fi
done

echo ""

# 5. 检查 package.json 中的依赖
echo "5️⃣ 检查 package.json 中的 i18next 依赖..."
if grep -q "i18next" "apps/extension/package.json"; then
  echo "   ⚠️  package.json 中需要手动添加: i18next, react-i18next"
  echo "   运行命令: cd apps/extension && pnpm add i18next react-i18next i18next-browser-languagedetector"
else
  echo "   ℹ️  需要安装依赖"
fi

echo ""
echo "✅ 验证完成！"
echo ""
echo "📝 建议的后续步骤："
echo "1. 安装 i18next 依赖: cd apps/extension && pnpm add i18next react-i18next i18next-browser-languagedetector"
echo "2. 运行构建测试: pnpm build:extension"
echo "3. 启动开发服务器: pnpm dev:extension"
echo "4. 在浏览器中测试语言切换"
echo ""
