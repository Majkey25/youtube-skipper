const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('package and manifest identify YouTube Skipper v2.0.2', () => {
  const packageJson = readJson('package.json');
  const manifest = readJson('manifest.json');

  assert.equal(packageJson.name, 'youtube-skipper');
  assert.equal(packageJson.version, '2.0.2');
  assert.equal(manifest.name, 'YouTube Skipper');
  assert.equal(manifest.version, '2.0.2');
  assert.equal(packageJson.license, 'MIT');
  assert.deepEqual(Object.keys(packageJson.devDependencies), ['archiver']);
});

test('manifest grants only the access required for YouTube segment skipping', () => {
  const manifest = readJson('manifest.json');
  const segmentScript = manifest.content_scripts.find((entry) => entry.js.includes('content.js'));

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://sponsor.ajay.app/*']);
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.equal(manifest.action.default_popup, 'popup.html');
  assert.ok(segmentScript.matches.every((pattern) => pattern.includes('youtube.com')));
  assert.equal(manifest.declarative_net_request, undefined);
  assert.ok(!manifest.host_permissions.includes('<all_urls>'));
});

test('popup contains only YouTube segment controls and attribution', () => {
  const html = readText('popup.html');

  for (const id of ['youtubeEnabled', 'showMarkers', 'showToast', 'categories', 'youtubeReset']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const theme of ['light', 'dark', 'system']) {
    assert.match(html, new RegExp(`data-theme-value="${theme}"`));
  }
  assert.match(html, /YouTube Skipper/);
  assert.match(html, /SponsorBlock/);
  assert.doesNotMatch(html, /role="tab"/);
  assert.doesNotMatch(html, /AdGuard/i);
});

test('background contains bounded SponsorBlock fetching and no filtering engine', () => {
  const background = readText('background.js');

  assert.match(background, /MAX_CACHE_ENTRIES = 50/);
  assert.match(background, /CACHE_TTL_MS = 10 \* 60 \* 1000/);
  assert.match(background, /GET_SEGMENTS/);
  assert.match(background, /AbortController/);
  assert.doesNotMatch(background, /AdGuard/i);
});

test('manual skip button keeps native-like structure and styling', () => {
  const content = readText('content.js');
  const css = readText('content.css');

  assert.match(content, /majkey-segment-skip-text/);
  assert.match(content, /majkey-segment-skip-icon/);
  assert.match(css, /\.majkey-segment-skip-button\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(css, /\.majkey-segment-skip-button:focus-visible/);
});

test('build and package scripts emit focused release names', () => {
  const build = readText('scripts/build.mjs');
  const pack = readText('scripts/package.mjs');

  assert.match(build, /background\.js/);
  assert.doesNotMatch(build, /webpack|ruleset|filter|adguard/i);
  assert.match(pack, /youtube-skipper\.zip/);
  assert.match(pack, /youtube-skipper-v/);
});

test('current product files contain no stale AdGuard feature references', () => {
  const files = [
    'manifest.json',
    'package.json',
    'popup.html',
    'popup.css',
    'popup.js',
    'background.js',
    'README.md',
    'NOTICE.md',
    'CONTRIBUTING.md',
    'RELEASE_NOTES.md',
    'assets/banner.svg',
    'assets/preview.svg',
    '.github/workflows/ci.yml',
    '.github/workflows/release.yml'
  ];

  for (const file of files) {
    assert.doesNotMatch(readText(file), /AdGuard|adguard|ad block/i, file);
  }
});
