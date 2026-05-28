/**
 * NowClipboard Build Script v1.1.9
 * Uses esbuild to generate UMD, ESM, and minified bundles
 */
import { build } from 'esbuild';
import { readFileSync, mkdirSync, copyFileSync } from 'fs';

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

// Common build options
const commonOptions = {
  bundle: true,
  banner: { js: banner },
  target: ['es2015'],
  sourcemap: true,
  // Mark Node.js built-ins as external so they are not bundled
  // (they are resolved at runtime in Node.js environment)
  external: ['child_process'],
};

// Build UMD (完整版)
await build({
  ...commonOptions,
  entryPoints: ['src/NowClipboard.js'],
  format: 'iife',
  globalName: 'NowClipboard',
  outfile: 'dist/NowClipboard.js',
  platform: 'neutral',
});

// Build ESM (with named exports via ESM entry point)
await build({
  ...commonOptions,
  entryPoints: ['src/NowClipboard.esm.js'],
  format: 'esm',
  outfile: 'dist/NowClipboard.esm.mjs',
  platform: 'neutral',
});

// Build minified UMD
await build({
  ...commonOptions,
  entryPoints: ['src/NowClipboard.js'],
  format: 'iife',
  globalName: 'NowClipboard',
  outfile: 'dist/NowClipboard.min.js',
  minify: true,
  platform: 'neutral',
});

// Copy type definitions
copyFileSync('NowClipboard.d.ts', 'dist/NowClipboard.d.ts');

// Copy dist/ files to root for npm publish (package.json "files" field references root)
copyFileSync('dist/NowClipboard.js', 'NowClipboard.js');
copyFileSync('dist/NowClipboard.esm.mjs', 'NowClipboard.esm.mjs');
copyFileSync('dist/NowClipboard.min.js', 'NowClipboard.min.js');
// Source maps
copyFileSync('dist/NowClipboard.js.map', 'NowClipboard.js.map');
copyFileSync('dist/NowClipboard.esm.mjs.map', 'NowClipboard.esm.mjs.map');
copyFileSync('dist/NowClipboard.min.js.map', 'NowClipboard.min.js.map');

console.log(`✅ Build complete: NowClipboard v${version}`);
console.log('  dist/NowClipboard.js        (UMD)');
console.log('  dist/NowClipboard.esm.mjs   (ESM with named exports)');
console.log('  dist/NowClipboard.min.js   (UMD minified)');
console.log('  dist/NowClipboard.d.ts      (TypeScript definitions)');
console.log('  (+ copied to root for npm publish)');
