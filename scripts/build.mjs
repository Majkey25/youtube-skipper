import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'dist', 'extension');
const files = [
  'manifest.json',
  'background.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'content.js',
  'content.css',
  'NOTICE.md',
  'PRIVACY.md',
  'LICENSE'
];

await fs.rm(path.join(root, 'dist'), { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

for (const file of files) {
  await fs.copyFile(path.join(root, file), path.join(outputDir, file));
}

await fs.mkdir(path.join(outputDir, 'lib'), { recursive: true });
for (const file of ['settings.js', 'segment-utils.js', 'sponsorblock.js']) {
  await fs.copyFile(path.join(root, 'lib', file), path.join(outputDir, 'lib', file));
}
await fs.cp(path.join(root, 'icons'), path.join(outputDir, 'icons'), { recursive: true });

const manifest = JSON.parse(await fs.readFile(path.join(outputDir, 'manifest.json'), 'utf8'));
if (manifest.name !== 'YouTube Skipper' || manifest.background?.service_worker !== 'background.js') {
  throw new Error('Built manifest does not identify the focused YouTube Skipper runtime');
}

console.log(`Built extension at ${outputDir}`);
