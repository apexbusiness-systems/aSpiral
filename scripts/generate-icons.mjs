#!/usr/bin/env node
/**
 * Icon Generation Script for aSpiral
 * Generates all required icon sizes for PWA, iOS, Android, and web favicons
 *
 * Usage: node scripts/generate-icons.mjs
 *
 * Input files expected:
 * - src/assets/app-icon-source.png (app icon with background)
 * - src/assets/favicon-source.png (spiral on transparent background)
 */

import sharp from 'sharp';
import { mkdir, rm, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Source images
const APP_ICON_SOURCE = path.join(ROOT, 'src/assets/app_icon.png');
const FAVICON_SOURCE = path.join(ROOT, 'src/assets/aspiral-heromark.png');

// Output directories
const PUBLIC_DIR = path.join(ROOT, 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const IOS_ICONS_DIR = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const ANDROID_RES_DIR = path.join(ROOT, 'android/app/src/main/res');

// Icon configurations
const PWA_ICONS = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'maskable-icon-512x512.png', size: 512, padding: 0.2 }, // 20% padding for safe zone
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32, useFavicon: true },
  { name: 'favicon-16x16.png', size: 16, useFavicon: true },
];

const IOS_ICON = { name: 'AppIcon-512@2x.png', size: 1024 };

const ANDROID_ICONS = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

// Adaptive icon foreground (larger for proper scaling)
const ANDROID_FOREGROUND_SIZE_MULTIPLIER = 1.5; // Foreground should be 1.5x the mipmap size

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function generateIcon(source, output, size, options = {}) {
  const { padding = 0, useFavicon = false, round = false } = options;

  const sourceFile = useFavicon ? FAVICON_SOURCE : source;

  let image = sharp(sourceFile);

  if (padding > 0) {
    // Add padding for maskable icons (safe zone)
    const paddedSize = Math.round(size * (1 - padding * 2));
    const padAmount = Math.round(size * padding);

    image = image
      .resize(paddedSize, paddedSize, { fit: 'contain', background: { r: 74, g: 26, b: 107, alpha: 1 } })
      .extend({
        top: padAmount,
        bottom: padAmount,
        left: padAmount,
        right: padAmount,
        background: { r: 74, g: 26, b: 107, alpha: 1 } // #4a1a6b
      });
  } else {
    image = image.resize(size, size, { fit: 'cover' });
  }

  if (round) {
    // Create circular mask for round icons
    const roundedCorners = Buffer.from(
      `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );

    image = image.composite([{
      input: roundedCorners,
      blend: 'dest-in'
    }]);
  }

  await image.png().toFile(output);
  console.log(`✓ Generated: ${path.relative(ROOT, output)} (${size}x${size})`);
}

async function generateFavicon(source, output) {
  // Generate ICO file with multiple sizes
  const sizes = [16, 32, 48];

  // For ICO, we'll just use the 32x32 PNG and rename it for simplicity
  // (Full ICO generation requires additional libraries)
  await sharp(source)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(output.replace('.ico', '-temp.png'));

  // Copy as ICO (browsers accept PNG as ICO)
  await sharp(source)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(output);

  console.log(`✓ Generated: ${path.relative(ROOT, output)}`);
}

async function generateRootFavicon(source, output) {
  await sharp(source)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(output);
  console.log(`✓ Generated: ${path.relative(ROOT, output)}`);
}

async function main() {
  console.log('\n🎨 aSpiral Icon Generator\n');

  // Check source files exist
  if (!existsSync(APP_ICON_SOURCE)) {
    console.error(`❌ Missing source: ${APP_ICON_SOURCE}`);
    console.log('   Please save your app icon as src/assets/app_icon.png');
    process.exit(1);
  }

  if (!existsSync(FAVICON_SOURCE)) {
    console.error(`❌ Missing source: ${FAVICON_SOURCE}`);
    console.log('   The aspiral-heromark.png is expected for favicon generation');
    process.exit(1);
  }

  // Ensure output directories exist
  await ensureDir(ICONS_DIR);

  console.log('📱 Generating PWA Icons...');
  for (const icon of PWA_ICONS) {
    const output = path.join(ICONS_DIR, icon.name);
    await generateIcon(APP_ICON_SOURCE, output, icon.size, {
      padding: icon.padding || 0,
      useFavicon: icon.useFavicon || false
    });
  }

  console.log('\n📱 Generating Root Favicon...');
  await generateRootFavicon(FAVICON_SOURCE, path.join(PUBLIC_DIR, 'favicon.png'));
  await generateFavicon(FAVICON_SOURCE, path.join(PUBLIC_DIR, 'favicon.ico'));

  console.log('\n🍎 Generating iOS Icon...');
  if (existsSync(IOS_ICONS_DIR)) {
    await generateIcon(
      APP_ICON_SOURCE,
      path.join(IOS_ICONS_DIR, IOS_ICON.name),
      IOS_ICON.size
    );
  } else {
    console.log('   ⚠️ iOS directory not found, skipping');
  }

  console.log('\n🤖 Generating Android Icons...');
  if (existsSync(ANDROID_RES_DIR)) {
    for (const config of ANDROID_ICONS) {
      const folder = path.join(ANDROID_RES_DIR, config.folder);
      await ensureDir(folder);

      // Standard launcher icon
      await generateIcon(
        APP_ICON_SOURCE,
        path.join(folder, 'ic_launcher.png'),
        config.size
      );

      // Round launcher icon
      await generateIcon(
        APP_ICON_SOURCE,
        path.join(folder, 'ic_launcher_round.png'),
        config.size,
        { round: true }
      );

      // Foreground for adaptive icons (larger with padding)
      const fgSize = Math.round(config.size * ANDROID_FOREGROUND_SIZE_MULTIPLIER);
      await generateIcon(
        APP_ICON_SOURCE,
        path.join(folder, 'ic_launcher_foreground.png'),
        fgSize,
        { padding: 0.1 }
      );
    }
  } else {
    console.log('   ⚠️ Android directory not found, skipping');
  }

  console.log('\n✅ Icon generation complete!\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
