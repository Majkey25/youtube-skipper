const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function worker() {
  const requests = [];
  const timers = new Map();
  let clock = 0;
  let timerId = 0;
  let listener;
  const root = path.resolve(__dirname, '..');
  const context = vm.createContext({
    URL, TextEncoder, Uint8Array, AbortController, DOMException, Response,
    crypto: webcrypto,
    Date: class extends Date { static now() { return clock; } },
    chrome: { runtime: { onMessage: { addListener(value) { listener = value; } } } },
    setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) {
      return new Promise((resolve, reject) => {
        requests.push({ url, options, resolve });
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    },
    importScripts(...files) {
      for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'background.js'), 'utf8'), context);
  return {
    requests, timers,
    call(videoID = 'fixtureVid01', categories = ['sponsor']) {
      return new Promise(resolve => listener({ type: 'GET_SEGMENTS', videoID, categories }, {}, resolve));
    },
    count(expression) { return vm.runInContext(expression, context); },
    advance(milliseconds) { clock += milliseconds; },
    async waitForRequests(count) {
      const until = Date.now() + 5000;
      while (requests.length < count && Date.now() < until) await new Promise(setImmediate);
      assert.equal(requests.length, count);
    }
  };
}

function response(status = 200) {
  return new Response(JSON.stringify([{ videoID: 'fixtureVid01', segments: [{ UUID: 'fixture-segment' }] }]), { status });
}

test('concurrent equal requests share one fetch and keep the existing privacy boundary', async () => {
  const fixture = worker();
  const pending = Promise.all(Array.from({ length: 10 }, () => fixture.call()));
  await fixture.waitForRequests(1);
  const request = fixture.requests[0];
  assert.match(new URL(request.url).pathname, /^\/api\/skipSegments\/[a-f0-9]{4}$/);
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.cache, 'no-store');
  assert.equal([...fixture.timers.values()][0].delay, 8000);
  request.resolve(response());
  const replies = await pending;
  assert.ok(replies.every(reply => reply.ok && reply.segments[0].UUID === 'fixture-segment'));
  assert.equal(fixture.count('pendingRequests.size'), 0);
  assert.equal(fixture.timers.size, 0);
  assert.equal((await fixture.call()).ok, true);
  assert.equal(fixture.requests.length, 1);
});

test('normalized categories share work while different video and category keys stay separate', async () => {
  const fixture = worker();
  const pending = Promise.all([
    fixture.call('fixtureVid01', ['sponsor', 'intro', 'sponsor', 'unknown']),
    fixture.call('fixtureVid01', ['intro', 'sponsor']),
    fixture.call('fixtureVid01', ['sponsor']),
    fixture.call('fixtureVid02', ['intro', 'sponsor'])
  ]);
  await fixture.waitForRequests(3);
  for (const request of fixture.requests) request.resolve(response());
  assert.ok((await pending).every(reply => reply.ok));
  assert.equal(fixture.count('pendingRequests.size'), 0);
});

test('failed shared fetch is removed and a later request can retry', async () => {
  const fixture = worker();
  const pending = Promise.all([fixture.call(), fixture.call()]);
  await fixture.waitForRequests(1);
  fixture.requests[0].resolve(response(503));
  assert.ok((await pending).every(reply => !reply.ok && /503/.test(reply.error)));
  assert.equal(fixture.count('pendingRequests.size'), 0);
  assert.equal(fixture.count('segmentCache.size'), 0);
  const retry = fixture.call();
  await fixture.waitForRequests(2);
  fixture.requests[1].resolve(response());
  assert.equal((await retry).ok, true);
});

test('the eight-second abort clears pending work without caching a failure', async () => {
  const fixture = worker();
  const pending = Promise.all([fixture.call(), fixture.call()]);
  await fixture.waitForRequests(1);
  for (const timer of [...fixture.timers.values()]) {
    assert.equal(timer.delay, 8000);
    timer.callback();
  }
  assert.ok((await pending).every(reply => !reply.ok && /timed out/.test(reply.error)));
  assert.equal(fixture.count('pendingRequests.size'), 0);
  assert.equal(fixture.count('segmentCache.size'), 0);
  assert.equal(fixture.timers.size, 0);
});

test('pending reuse and completed response storage remain bounded at fifty entries', async () => {
  const fixture = worker();
  const pending = Promise.all(Array.from({ length: 52 }, (_, index) => fixture.call(`fixture${String(index).padStart(5, '0')}`)));
  await fixture.waitForRequests(52);
  assert.equal(fixture.count('pendingRequests.size'), 50);
  for (const request of fixture.requests) request.resolve(response());
  assert.ok((await pending).every(reply => reply.ok));
  assert.equal(fixture.count('pendingRequests.size'), 0);
  assert.equal(fixture.count('segmentCache.size'), 50);
  assert.equal(fixture.timers.size, 0);
});

test('cached 404 remains empty until the existing ten-minute TTL expires', async () => {
  const fixture = worker();
  const pending = fixture.call();
  await fixture.waitForRequests(1);
  fixture.requests[0].resolve(response(404));
  assert.equal((await pending).segments.length, 0);
  assert.equal((await fixture.call()).segments.length, 0);
  assert.equal(fixture.requests.length, 1);
  fixture.advance(10 * 60 * 1000);
  const expired = fixture.call();
  await fixture.waitForRequests(2);
  fixture.requests[1].resolve(response());
  assert.equal((await expired).segments[0].UUID, 'fixture-segment');
});
