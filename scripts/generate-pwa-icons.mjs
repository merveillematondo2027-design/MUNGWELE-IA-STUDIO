import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourcePath = path.join(root, 'src/assets/mungwele-ai-official-mark.svg');
const outputDir = path.join(root, 'public/icons');
const background = '#07101f';

await fs.mkdir(outputDir, { recursive: true });
const source = await fs.readFile(sourcePath);

async function makeIcon(size, filename, paddingRatio = 0.14) {
  const inner = Math.round(size * (1 - paddingRatio * 2));
  const mark = await sharp(source)
    .resize({ width: inner, height: inner, fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(outputDir, filename));
}

await Promise.all([
  makeIcon(192, 'mungwele-192.png', 0.12),
  makeIcon(512, 'mungwele-512.png', 0.12),
  makeIcon(512, 'mungwele-maskable-512.png', 0.2),
]);

console.log('[PWA] Icônes MUNGWELE générées.');
