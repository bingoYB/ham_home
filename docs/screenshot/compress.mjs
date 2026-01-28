#!/usr/bin/env node
/**
 * 截图压缩脚本
 * 将截图转换为固定 1280 x 800 尺寸，保持原比例，空白部分透明填充
 * 输出到 compressed 目录
 */

import { mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))

const OUTPUT_WIDTH = 1280
const OUTPUT_HEIGHT = 800
const OUTPUT_DIR = 'compressed'

async function compressImage(inputPath, outputPath) {
  const image = sharp(inputPath)
  const metadata = await image.metadata()

  const { width, height } = metadata

  // 确保输出目录存在
  await mkdir(dirname(outputPath), { recursive: true })

  // 使用 contain 模式：保持比例，空白部分透明填充
  await image
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // 透明背景
    })
    .png({ quality: 80, compressionLevel: 9 })
    .toFile(outputPath)

  console.log(
    `✓ ${inputPath.replace(__dirname + '/', '')} → ${outputPath.replace(__dirname + '/', '')} (${width}x${height} → ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT})`
  )
}

async function processDirectory(dir) {
  const entries = await readdir(join(__dirname, dir), { withFileTypes: true })

  for (const entry of entries) {
    const inputPath = join(__dirname, dir, entry.name)

    if (entry.isDirectory()) {
      await processDirectory(join(dir, entry.name))
    } else if (entry.name.endsWith('.png')) {
      const outputPath = join(__dirname, OUTPUT_DIR, dir, entry.name)
      await compressImage(inputPath, outputPath)
    }
  }
}

async function main() {
  console.log(`转换截图到固定尺寸 ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}...\n`)

  // 处理 ch 和 en 目录
  const dirs = ['ch', 'en']
  for (const dir of dirs) {
    await processDirectory(dir)
  }

  console.log('\n✅ 完成！转换后的图片在 compressed 目录')
}

main().catch(console.error)
