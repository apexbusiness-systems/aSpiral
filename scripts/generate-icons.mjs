import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// aSpiral brand colors
const SPIRAL_PURPLE = '#4a1a6b';  // HSL 271 63% 26%
const SPIRAL_ACCENT = '#c77dff'; // HSL 280 85% 65%
const GOLD = '#f5c842';          // Secondary accent

// Create a proper vector SVG icon for aSpiral - a stylized spiral
const createSpiralSVG = (size, padding = 0.1) => {
  const actualSize = size;
  const center = actualSize / 2;
  const maxRadius = (actualSize / 2) * (1 - padding);

  // Create spiral path using arcs
  const spiralPath = [];
  const turns = 2.5;
  const segments = 36;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * turns * 2 * Math.PI - Math.PI / 2;
    const radius = maxRadius * (0.15 + t * 0.85);
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);

    if (i === 0) {
      spiralPath.push(`M ${x} ${y}`);
    } else {
      spiralPath.push(`L ${x} ${y}`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="spiralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${SPIRAL_ACCENT};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${GOLD};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${SPIRAL_ACCENT};stop-opacity:1" />
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="${SPIRAL_PURPLE}" rx="${size * 0.15}"/>
  <path d="${spiralPath.join(' ')}"
        fill="none"
        stroke="url(#spiralGrad)"
        stroke-width="${size * 0.06}"
        stroke-linecap="round"
        filter="url(#glow)"/>
  <circle cx="${center}" cy="${center}" r="${maxRadius * 0.12}" fill="${GOLD}"/>
</svg>`;
};

// Create maskable icon (with safe zone padding)
const createMaskableSVG = (size) => {
  return createSpiralSVG(size, 0.2); // 20% padding for maskable safe zone
};

async function generateIcons() {
  console.log('Generating PWA icons...');

  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });

  const sizes = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
    { name: 'maskable-icon-512x512.png', size: 512, maskable: true },
    { name: 'favicon-32x32.png', size: 32, maskable: false },
    { name: 'favicon-16x16.png', size: 16, maskable: false },
  ];

  for (const { name, size, maskable } of sizes) {
    const svg = maskable ? createMaskableSVG(size) : createSpiralSVG(size);
    const svgBuffer = Buffer.from(svg);

    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    await writeFile(join(iconsDir, name), pngBuffer);
    console.log(`  Created ${name} (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
  }

  // Also save a small clean SVG for favicon
  const cleanSvg = createSpiralSVG(512);
  await writeFile(join(iconsDir, 'icon.svg'), cleanSvg);
  console.log('  Created icon.svg (clean vector)');

  // Remove the old massive icon
  const oldIconPath = join(iconsDir, 'aspiral-icon.svg');
  try {
    const { unlink } = await import('fs/promises');
    await unlink(oldIconPath);
    console.log('  Removed old aspiral-icon.svg (2.2MB)');
  } catch (e) {
    // File might not exist
  }

  console.log('\nPWA icons generated successfully!');
}

generateIcons().catch(console.error);
