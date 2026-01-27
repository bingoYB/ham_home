#!/usr/bin/env node
/**
 * 截图压缩脚本
 * 将截图压缩到 1280 x 800 以下，保持原比例
 * 输出到 compressed 目录
 */

import { mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MAX_WIDTH = 1280
const MAX_HEIGHT = 800
const OUTPUT_DIR = 'compressed'

async function compressImage(inputPath, outputPath) {
  const image = sharp(inputPath)
  const metadata = await image.metadata()

  const { width, height } = metadata

  // 计算缩放比例，保持原比例
  let newWidth = width
  let newHeight = height

  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const widthRatio = MAX_WIDTH / width
    const heightRatio = MAX_HEIGHT / height
    const ratio = Math.min(widthRatio, heightRatio)

    newWidth = Math.round(width * ratio)
    newHeight = Math.round(height * ratio)
  }

  // 确保输出目录存在
  await mkdir(dirname(outputPath), { recursive: true })

  await image
    .resize(newWidth, newHeight, { fit: 'inside' })
    .png({ quality: 80, compressionLevel: 9 })
    .toFile(outputPath)

  console.log(
    `✓ ${inputPath.replace(__dirname + '/', '')} → ${outputPath.replace(__dirname + '/', '')} (${width}x${height} → ${newWidth}x${newHeight})`
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
  console.log(`压缩截图到 ${MAX_WIDTH}x${MAX_HEIGHT} 以下...\n`)

  // 处理 ch 和 en 目录
  const dirs = ['ch', 'en']
  for (const dir of dirs) {
    await processDirectory(dir)
  }

  console.log('\n✅ 完成！压缩后的图片在 compressed 目录')
}

main().catch(console.error)
