/**
 * HS code classification helpers.
 *
 * Only the offline, synchronous paths are exercised here. HsCodeService also
 * queries hscodeatlas.com and hs.datahub.io at runtime and falls back to the
 * local table, so the tests stick to the local table to stay hermetic.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { HsCodeService, EAC_DUTY_RATES } = require('../src/core/hs-codes');

test('the EAC duty table covers a broad set of chapters', () => {
  const chapters = Object.keys(EAC_DUTY_RATES);
  assert.ok(chapters.length > 50, `expected >50 chapters, got ${chapters.length}`);
});

test('every chapter carries a description and a numeric duty rate', () => {
  for (const [chapter, info] of Object.entries(EAC_DUTY_RATES)) {
    assert.match(chapter, /^\d{2}$/, `bad chapter key: ${chapter}`);
    assert.equal(typeof info.description, 'string', `chapter ${chapter} has no description`);
    assert.ok(info.description.length > 0, `chapter ${chapter} has an empty description`);
    assert.equal(typeof info.duty, 'number', `chapter ${chapter} has no numeric duty`);
    assert.ok(info.duty >= 0 && info.duty <= 100, `chapter ${chapter} duty out of range: ${info.duty}`);
  }
});

test('cereals (chapter 10) is a 60% duty chapter', () => {
  assert.equal(EAC_DUTY_RATES['10'].duty, 60);
  assert.match(EAC_DUTY_RATES['10'].description, /cereal/i);
});

test('getChapterInfo resolves a code by its first two digits', () => {
  const svc = new HsCodeService();

  assert.equal(svc.getChapterInfo('1001').duty, EAC_DUTY_RATES['10'].duty);
  assert.equal(svc.getChapterInfo('8471').duty, EAC_DUTY_RATES['84'].duty);
  assert.equal(svc.getChapterInfo('99'), null, 'unknown chapter should be null');
});

test('_localLookup returns the local tariff row and labels its source', () => {
  const svc = new HsCodeService();

  const row = svc._localLookup('1001');
  assert.equal(row.code, '1001');
  assert.equal(row.source, 'local');
  assert.equal(row.duty, EAC_DUTY_RATES['10'].duty);
  assert.match(row.note, /EAC/);

  assert.equal(svc._localLookup('9999'), null, 'unknown chapter should be null');
});

test('_localSearch finds a chapter by description', () => {
  const svc = new HsCodeService();

  const results = svc._localSearch('cereals');
  assert.ok(results.length > 0, 'expected a match for "cereals"');
  assert.ok(results.some((r) => r.description === EAC_DUTY_RATES['10'].description));

  assert.deepEqual(svc._localSearch('zzzzz-not-a-real-commodity'), []);
});
