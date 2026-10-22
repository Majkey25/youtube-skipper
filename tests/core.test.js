const test = require('node:test');
const assert = require('node:assert/strict');

const SegmentUtils = require('../lib/segment-utils.js');
const Settings = require('../lib/settings.js');
const SponsorBlock = require('../lib/sponsorblock.js');

test('SponsorBlock rejects excessive candidate and matching segment counts', () => {
  assert.throws(() => SponsorBlock.pickVideoSegments(Array(4097).fill(null), 'target'), /Too many SponsorBlock videos/);
  const payload = [{ videoID: 'target', segments: Array(512).fill({ segment: [1, 2] }) }];
  assert.equal(SponsorBlock.pickVideoSegments(payload, 'target').length, 512);
  payload[0].segments.push({ segment: [2, 3] });
  assert.throws(() => SponsorBlock.pickVideoSegments(payload, 'target'), /Too many SponsorBlock segments/);
  assert.deepEqual(SponsorBlock.pickVideoSegments(payload, 'other'), []);
});

test('extractVideoId accepts watch and Shorts URLs', () => {
  assert.equal(
    SegmentUtils.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    SegmentUtils.extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
});

test('extractVideoId rejects non-video and invalid URLs', () => {
  assert.equal(SegmentUtils.extractVideoId('https://www.youtube.com/'), null);
  assert.equal(SegmentUtils.extractVideoId('https://notyoutube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(SegmentUtils.extractVideoId('not a URL'), null);
});

test('normalizeSegments rejects malformed ranges and sorts by start time', () => {
  const result = SegmentUtils.normalizeSegments([
    { segment: [20, 30], category: 'intro', actionType: 'skip', UUID: 'b' },
    { segment: [5, 10], category: 'sponsor', actionType: 'skip', UUID: 'a' },
    { segment: [9, 4], category: 'sponsor', actionType: 'skip', UUID: 'bad' },
    { segment: ['x', 12], category: 'sponsor', actionType: 'skip', UUID: 'bad2' },
    { segment: [1, 2], category: 'chapter', actionType: 'chapter', UUID: 'bad3' }
  ]);

  assert.deepEqual(result.map((item) => item.UUID), ['a', 'b']);
});

test('findActiveSegment handles active and missing segments', () => {
  const segments = [
    { start: 5, end: 10, category: 'sponsor', UUID: 'a' },
    { start: 20, end: 25, category: 'intro', UUID: 'b' }
  ];

  assert.equal(SegmentUtils.findActiveSegment(segments, 7)?.UUID, 'a');
  assert.equal(SegmentUtils.findActiveSegment(segments, 15), null);
});

test('secondsLabel produces compact readable durations', () => {
  assert.equal(SegmentUtils.secondsLabel(4.2), '4s');
  assert.equal(SegmentUtils.secondsLabel(61), '1m 1s');
});

test('sanitizeSettings migrates flat and combined settings without ad-block state', () => {
  const settings = Settings.sanitizeSettings({
    enabled: false,
    adBlockEnabled: true,
    showMarkers: false,
    showToast: true,
    theme: 'light',
    categories: {
      sponsor: 'button',
      intro: 'ignore'
    },
    adguard: {
      enabled: true,
      rules: ['example.com##.ad']
    }
  });

  assert.equal(settings.youtube.enabled, false);
  assert.equal(settings.youtube.showMarkers, false);
  assert.equal(settings.youtube.showToast, true);
  assert.equal(settings.youtube.categories.sponsor, 'button');
  assert.equal(settings.youtube.categories.intro, 'ignore');
  assert.equal(settings.theme, 'light');
  assert.equal(settings.adguard, undefined);
  assert.equal(settings.adBlockEnabled, undefined);
});

test('sanitizeSettings validates nested settings and is idempotent', () => {
  const settings = Settings.sanitizeSettings({
    youtube: {
      enabled: true,
      showMarkers: true,
      showToast: false,
      categories: {
        sponsor: 'auto',
        intro: 'wat',
        unknown: 'button'
      }
    },
    theme: 'neon'
  });

  assert.equal(settings.youtube.enabled, true);
  assert.equal(settings.youtube.showToast, false);
  assert.equal(settings.youtube.categories.intro, Settings.DEFAULT_SETTINGS.youtube.categories.intro);
  assert.equal(settings.youtube.categories.unknown, undefined);
  assert.equal(settings.theme, 'system');
  assert.deepEqual(Settings.sanitizeSettings(settings), settings);
});

test('activeCategories reads enabled modes only', () => {
  const settings = Settings.sanitizeSettings({
    youtube: {
      categories: {
        sponsor: 'auto',
        intro: 'button',
        filler: 'ignore'
      }
    }
  });

  assert.ok(Settings.activeCategories(settings).includes('sponsor'));
  assert.ok(Settings.activeCategories(settings).includes('intro'));
  assert.ok(!Settings.activeCategories(settings).includes('filler'));
});

test('sha256Prefix returns the documented four-character privacy prefix', async () => {
  const prefix = await SponsorBlock.sha256Prefix('dQw4w9WgXcQ');
  assert.equal(prefix.length, 4);
  assert.match(prefix, /^[0-9a-f]{4}$/);
});

test('buildSkipSegmentsUrl encodes categories and skip action type', () => {
  const url = new URL(SponsorBlock.buildSkipSegmentsUrl('abcd', ['sponsor', 'intro']));
  assert.equal(url.pathname, '/api/skipSegments/abcd');
  assert.deepEqual(JSON.parse(url.searchParams.get('categories')), ['sponsor', 'intro']);
  assert.deepEqual(JSON.parse(url.searchParams.get('actionTypes')), ['skip']);
  assert.equal(url.searchParams.get('service'), 'YouTube');
});

test('pickVideoSegments returns only the exact matching video', () => {
  const result = SponsorBlock.pickVideoSegments([
    { videoID: 'other', segments: [{ UUID: 'x' }] },
    { videoID: 'target', segments: [{ UUID: 'y' }] }
  ], 'target');

  assert.deepEqual(result, [{ UUID: 'y' }]);
  assert.deepEqual(SponsorBlock.pickVideoSegments({}, 'target'), []);
});
