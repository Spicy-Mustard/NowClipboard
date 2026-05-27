/**
 * NowClipboard Build Script
 * Uses esbuild to generate UMD, ESM, and minified bundles
 */
import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = pkg.version;
const banner = `/**
 * NowClipboard v${version}
 * Modern clipboard utility library - Clipboard API + execCommand fallback + Node.js adapter
 * Zero dependencies, supports both browser and Node.js environments
 *
 * Licensed MIT © Spicy-Mustard
 */`;

// Ensure dist/ directory exists
mkdirSync('dist', { recursive: true });

// Build UMD (完整版)
await build({
  entryPoints: ['src/NowClipboard.js'],
  bundle: true,
  format: 'iife',
  globalName: 'NowClipboard',
  outfile: 'dist/NowClipboard.js',
  banner: { js: banner },
  target: ['es2015'],
  platform: 'browser',
});

// Build ESM
await build({
  entryPoints: ['src/NowClipboard.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/NowClipboard.esm.mjs',
  banner: { js: banner },
  target: ['es2015'],
  platform: 'browser',
});

// Build minified UMD
await build({
  entryPoints: ['src/NowClipboard.js'],
  bundle: true,
  format: 'iife',
  globalName: 'NowClipboard',
  outfile: 'dist/NowClipboard.min.js',
  banner: { js: banner },
  minify: true,
  target: ['es2015'],
  platform: 'browser',
});

// Copy type definitions
import { copyFileSync } from 'fs';
copyFileSync('NowClipboard.d.ts', 'dist/NowClipboard.d.ts');

console.log(`✅ Build complete: NowClipboard v${version}`);
console.log('  dist/NowClipboard.js      (UMD)');
console.log('  dist/NowClipboard.esm.mjs (ESM)');
console.log('  dist/NowClipboard.min.js  (UMD minified)');
console.log('  dist/NowClipboard.d.ts    (TypeScript definitions)');
