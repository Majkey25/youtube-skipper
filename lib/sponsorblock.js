(function initSponsorBlock(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.SponsorBlockClient = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSponsorBlockClient() {
  const API_BASE = 'https://sponsor.ajay.app';

  async function sha256Prefix(value) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new TypeError('videoID must be a non-empty string');
    }

    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(digest));
    const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 4);
  }

  function buildSkipSegmentsUrl(prefix, categories) {
    if (!/^[0-9a-f]{4,32}$/i.test(prefix)) {
      throw new TypeError('prefix must contain 4 to 32 hex characters');
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new TypeError('categories must be a non-empty array');
    }

    const url = new URL(`/api/skipSegments/${prefix.toLowerCase()}`, API_BASE);
    url.searchParams.set('service', 'YouTube');
    url.searchParams.set('categories', JSON.stringify(categories));
    url.searchParams.set('actionTypes', JSON.stringify(['skip']));
    return url.toString();
  }

  function pickVideoSegments(payload, videoID) {
    if (!Array.isArray(payload) || typeof videoID !== 'string') {
      return [];
    }
    if (payload.length > 4096) throw new RangeError('Too many SponsorBlock videos');
    const match = payload.find((item) => item && item.videoID === videoID);
    if (Array.isArray(match?.segments) && match.segments.length > 512) {
      throw new RangeError('Too many SponsorBlock segments');
    }
    return Array.isArray(match?.segments) ? match.segments : [];
  }

  return {
    API_BASE,
    sha256Prefix,
    buildSkipSegmentsUrl,
    pickVideoSegments
  };
});
