import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public/icon');

// CRC32 计算
function makeCRCTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCRCTable();

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  
  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// 简单的纯色 PNG 生成器 (无需外部依赖)
function createSimplePNG(size, r, g, b) {
  // PNG 文件头
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData.writeUInt8(8, 8);        // bit depth
  ihdrData.writeUInt8(2, 9);        // color type (RGB)
  ihdrData.writeUInt8(0, 10);       // compression
  ihdrData.writeUInt8(0, 11);       // filter
  ihdrData.writeUInt8(0, 12);       // interlace
  const ihdr = createChunk('IHDR', ihdrData);
  
  // 创建图像数据
  const rawData = [];
  const cx = size / 2, cy = size / 2, radius = size * 0.4;
  
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        rawData.push(r, g, b); // 主色 (紫色)
      } else {
        rawData.push(255, 255, 255); // 白色背景 (透明效果需要 RGBA)
      }
    }
  }
  
  // 使用 zlib deflate
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

const sizes = [16, 32, 48, 128];
const primaryColor = { r: 79, g: 70, b: 229 }; // #4F46E5

mkdirSync(publicDir, { recursive: true });

for (const size of sizes) {
  const png = createSimplePNG(size, primaryColor.r, primaryColor.g, primaryColor.b);
  writeFileSync(join(publicDir, `${size}.png`), png);
  console.log(`Created ${size}.png`);
}

console.log('Icons generated successfully!');

