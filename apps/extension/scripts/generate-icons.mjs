import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public/icon');
const logoPath = join(__dirname, '../assets/logo.png');

const sizes = [16, 32, 48, 128];

mkdirSync(publicDir, { recursive: true });

async function generateIcons() {
  try {
    // 读取原始 logo 图片
    const image = sharp(logoPath);
    
    // 为每个尺寸生成图标
    for (const size of sizes) {
      const buffer = await image
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // 透明背景
        })
        .png()
        .toBuffer();
      
      writeFileSync(join(publicDir, `${size}.png`), buffer);
      console.log(`✓ Created ${size}.png`);
    }
    
    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
