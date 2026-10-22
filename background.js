importScripts('lib/sponsorblock.js', 'lib/settings.js');

const segmentCache = new Map();
const pendingRequests = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const MAX_RESPONSE_BYTES = 1024 * 1024;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_SEGMENTS') {
    return undefined;
  }

  getSegments(message.videoID, message.categories)
    .then((segments) => sendResponse({ ok: true, segments }))
    .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }));
  return true;
});

async function getSegments(videoID, requestedCategories) {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoID || '')) {
    throw new TypeError('Invalid YouTube video ID');
  }

  const allowedCategories = new Set(Object.keys(SegmentSettings.CATEGORY_DEFINITIONS));
  const categories = Array.isArray(requestedCategories)
    ? [...new Set(requestedCategories.filter((category) => allowedCategories.has(category)))].sort()
    : [];

  if (categories.length === 0) {
    return [];
  }

  const cacheKey = `${videoID}|${categories.join(',')}`;
  const cached = segmentCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    return cached.segments;
  }
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  if (pendingRequests.size >= MAX_CACHE_ENTRIES) {
    throw new Error('Too many pending SponsorBlock requests');
  }

  const request = fetchSegments(videoID, categories, cacheKey).finally(() => {
    if (pendingRequests.get(cacheKey) === request) pendingRequests.delete(cacheKey);
  });
  pendingRequests.set(cacheKey, request);
  return request;
}

async function fetchSegments(videoID, categories, cacheKey) {
  const prefix = await SponsorBlockClient.sha256Prefix(videoID);
  const url = SponsorBlockClient.buildSkipSegmentsUrl(prefix, categories);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      signal: controller.signal,
      cache: 'no-store'
    });

    if (response.status === 404) {
      saveCache(cacheKey, []);
      return [];
    }
    if (!response.ok) {
      throw new Error(`SponsorBlock API returned HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new RangeError('SponsorBlock response is too large');
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    const segments = SponsorBlockClient.pickVideoSegments(JSON.parse(text), videoID);
    saveCache(cacheKey, segments);
    return segments;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('SponsorBlock request timed out');
    }
    throw error;
  } finally {
    controller.abort();
    clearTimeout(timeout);
  }
}

function saveCache(key, segments) {
  if (segmentCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = segmentCache.keys().next().value;
    if (oldestKey) {
      segmentCache.delete(oldestKey);
    }
  }
  segmentCache.set(key, { segments, savedAt: Date.now() });
}

function errorMessage(error) {
  return error?.message || String(error || 'Unknown error');
}
