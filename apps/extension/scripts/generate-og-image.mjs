import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '../assets');
const outputDir = path.join(__dirname, '../public'); // Output to public directly

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const CONFIG = {
  width: 1200,
  height: 630,
  logoPath: path.join(assetsDir, 'logo.png'), 
  outputPath: path.join(outputDir, 'og-image.png'),
  
  // Color Palette (based on oklch values approximated to hex)
  backgroundColor: '#f5f3ff', // Light violet/gray
  primaryColor: '#8b5cf6',    // Violet
  secondaryColor: '#a78bfa',  // Light violet
  textColor: '#1e1b4b',       // Dark navy
  subtitleColor: '#4c1d95',   // Deep violet
};

async function generateOGImage() {
  try {
    // 1. Prepare Logo (resize and convert to base64 for embedding in SVG)
    const logoBuffer = await sharp(CONFIG.logoPath)
      .resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

    // 2. Construct SVG
    // We use a modern, clean layout with a gradient background and feature highlights
    const svgContent = `
    <svg width="${CONFIG.width}" height="${CONFIG.height}" viewBox="0 0 ${CONFIG.width} ${CONFIG.height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="${CONFIG.backgroundColor}" />
        </linearGradient>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dx="2" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.2"/>
          </feComponentTransfer>
          <feMerge> 
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/> 
          </feMerge>
        </filter>
      </defs>

      <!-- Minimalist Background with abstract shapes -->
      <rect width="100%" height="100%" fill="url(#bgGradient)" />
      
      <!-- Abstract circle bottom left -->
      <circle cx="0" cy="630" r="300" fill="${CONFIG.primaryColor}" opacity="0.05" />
      
      <!-- Abstract circle top right -->
      <circle cx="1200" cy="0" r="400" fill="${CONFIG.secondaryColor}" opacity="0.05" />

      <!-- Main Layout Group -->
      <g transform="translate(100, 165)">
        
        <!-- Logo Image -->
        <image x="0" y="0" width="300" height="300" href="${logoBase64}" />

        <!-- Text Group -->
        <g transform="translate(350, 60)">
          <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="96" fill="${CONFIG.textColor}">HamHome</text>
          
          <text x="0" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="500" font-size="42" fill="${CONFIG.subtitleColor}">Intelligent Bookmark Assistant</text>
          <text x="0" y="120" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="400" font-size="32" fill="${CONFIG.subtitleColor}" opacity="0.9">智能书签助手</text>

          <!-- Feature pills -->
          <g transform="translate(0, 180)">
             <!-- Pill 1 -->
            <rect x="0" y="0" width="200" height="70" rx="16" fill="${CONFIG.primaryColor}" opacity="0.1" />
            <text x="100" y="32" font-family="Arial, sans-serif" font-size="20" fill="${CONFIG.primaryColor}" text-anchor="middle" font-weight="bold">AI Analysis</text>
            <text x="100" y="58" font-family="Arial, sans-serif" font-size="16" fill="${CONFIG.primaryColor}" text-anchor="middle" opacity="0.9">AI 智能分析</text>

            <!-- Pill 2 -->
            <rect x="220" y="0" width="200" height="70" rx="16" fill="${CONFIG.primaryColor}" opacity="0.1" />
            <text x="320" y="32" font-family="Arial, sans-serif" font-size="20" fill="${CONFIG.primaryColor}" text-anchor="middle" font-weight="bold">Smart Org</text>
            <text x="320" y="58" font-family="Arial, sans-serif" font-size="16" fill="${CONFIG.primaryColor}" text-anchor="middle" opacity="0.9">智能整理</text>

            <!-- Pill 3 -->
            <rect x="440" y="0" width="200" height="70" rx="16" fill="${CONFIG.primaryColor}" opacity="0.1" />
            <text x="540" y="32" font-family="Arial, sans-serif" font-size="20" fill="${CONFIG.primaryColor}" text-anchor="middle" font-weight="bold">Privacy First</text>
            <text x="540" y="58" font-family="Arial, sans-serif" font-size="16" fill="${CONFIG.primaryColor}" text-anchor="middle" opacity="0.9">隐私优先</text>
          </g>
        </g>
      </g>
    </svg>
    `;

    // 3. Render SVG to PNG using Sharp
    await sharp(Buffer.from(svgContent))
      .png()
      .toFile(CONFIG.outputPath);

    console.log('OG Image generated successfully at:', CONFIG.outputPath);

  } catch (err) {
    console.error('Error generating OG image:', err);
    process.exit(1);
  }
}

generateOGImage();
