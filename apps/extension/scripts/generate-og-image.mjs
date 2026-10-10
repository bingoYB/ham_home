import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Generates the HamHome social preview image (1200×630) and the store small promo tile (440×280).
 * The copy mirrors PRODUCT_COPY in apps/web/app/lib/site.ts; update both when the positioning changes.
 * Fonts resolve from macOS system fonts (Avenir Next, PingFang SC), so run it on macOS:
 *   node apps/extension/scripts/generate-og-image.mjs
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../../..');
const logoPath = path.join(__dirname, '../assets/logo.png');

const COPY = {
  title: 'HamHome',
  categoryEn: 'AI Web Clipper & Tab Manager',
  categoryZh: 'AI 网页收藏与标签页管理',
  pills: [
    { en: 'Save & Clip', zh: '网页、文本与图片' },
    { en: 'Tab Workspaces', zh: '标签页工作空间' },
    { en: 'Local First', zh: '本地优先' },
  ],
  footer: 'Open source · Chrome · Edge · Firefox',
};

// Warm palette shared with the landing page (brand orange #ff5b24, teal accent).
const COLORS = {
  backgroundFrom: '#fffaf5',
  backgroundTo: '#ffeedd',
  brand: '#ff5b24',
  brandText: '#c2410c',
  accent: '#2dd4bf',
  title: '#1e1b4b',
  muted: '#9a3412',
};

const LATIN_FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const CJK_FONT = "'PingFang SC', 'Hiragino Sans GB', sans-serif";

const LAYOUTS = {
  // Open Graph / Twitter card: logo on the left, title, bilingual category, feature pills and a footer line.
  og: {
    width: 1200,
    height: 630,
    logo: { x: 100, y: 165, size: 300 },
    textX: 450,
    title: { y: 232, size: 100 },
    categoryEn: { y: 302, size: 40 },
    categoryZh: { y: 354, size: 32 },
    pills: { y: 398, width: 210, height: 74, gap: 20, enSize: 20, zhSize: 16 },
    footer: { x: 1140, y: 588, size: 18 },
    circles: [
      { cx: 1200, cy: 0, r: 420, color: 'brand', opacity: 0.08 },
      { cx: 0, cy: 630, r: 300, color: 'accent', opacity: 0.1 },
    ],
  },
  // Chrome Web Store small promo tile: fewer words and larger type so it stays legible.
  tile: {
    width: 440,
    height: 280,
    logo: { x: 22, y: 80, size: 120 },
    textX: 158,
    title: { y: 130, size: 46 },
    categoryEn: { y: 160, size: 17 },
    categoryZh: { y: 186, size: 15 },
    circles: [
      { cx: 440, cy: 0, r: 160, color: 'brand', opacity: 0.08 },
      { cx: 0, cy: 280, r: 110, color: 'accent', opacity: 0.1 },
    ],
  },
};

const OUTPUTS = [
  { file: 'apps/web/public/og-image.png', layout: 'og' },
  { file: 'docs/og-image.png', layout: 'og' },
  { file: 'docs/og-image-440x280.png', layout: 'tile' },
];

const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function text(x, y, value, { size, weight = 400, color, font = LATIN_FONT, anchor = 'start', opacity = 1 }) {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${color}" fill-opacity="${opacity}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function pills(layout) {
  if (!layout.pills) return '';
  const { y, width, height, gap, enSize, zhSize } = layout.pills;
  return COPY.pills.map((pill, index) => {
    const x = layout.textX + index * (width + gap);
    const center = x + width / 2;
    return [
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="18" fill="${COLORS.brand}" fill-opacity="0.1" stroke="${COLORS.brand}" stroke-opacity="0.2" />`,
      text(center, y + height * 0.44, pill.en, { size: enSize, weight: 700, color: COLORS.brandText, anchor: 'middle' }),
      text(center, y + height * 0.8, pill.zh, { size: zhSize, weight: 500, color: COLORS.muted, font: CJK_FONT, anchor: 'middle' }),
    ].join('');
  }).join('');
}

async function buildSvg(layout) {
  const { width, height, logo } = layout;
  const logoBuffer = await sharp(logoPath)
    .resize(logo.size, logo.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const circles = layout.circles
    .map(({ cx, cy, r, color, opacity }) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLORS[color]}" fill-opacity="${opacity}" />`)
    .join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="background" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.backgroundFrom}" />
      <stop offset="100%" stop-color="${COLORS.backgroundTo}" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#background)" />
  ${circles}
  <image x="${logo.x}" y="${logo.y}" width="${logo.size}" height="${logo.size}" href="data:image/png;base64,${logoBuffer.toString('base64')}" />
  ${text(layout.textX, layout.title.y, COPY.title, { size: layout.title.size, weight: 700, color: COLORS.title })}
  ${text(layout.textX, layout.categoryEn.y, COPY.categoryEn, { size: layout.categoryEn.size, weight: 600, color: COLORS.brandText })}
  ${text(layout.textX, layout.categoryZh.y, COPY.categoryZh, { size: layout.categoryZh.size, weight: 600, color: COLORS.muted, font: CJK_FONT })}
  ${pills(layout)}
  ${layout.footer ? text(layout.footer.x, layout.footer.y, COPY.footer, { size: layout.footer.size, weight: 500, color: COLORS.muted, anchor: 'end', opacity: 0.75 }) : ''}
</svg>`;
}

async function generateImages() {
  for (const output of OUTPUTS) {
    const target = path.join(repoRoot, output.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const svg = await buildSvg(LAYOUTS[output.layout]);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(target);
    console.log(`Generated ${output.file}`);
  }
}

generateImages().catch((error) => {
  console.error('Error generating OG image:', error);
  process.exit(1);
});
