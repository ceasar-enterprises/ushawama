/**
 * Literacy engine: level structure, progress defaults, and prompt generation.
 *
 * Progress is persisted to data/literacy-progress.json, which is git-ignored
 * runtime state. The write-path test snapshots that file and restores it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { LiteracyEngine, LEVELS, WORD_BANKS } = require('../src/literacy/engine');

const PROGRESS_FILE = path.join(__dirname, '..', 'data', 'literacy-progress.json');

test('exposes five literacy levels', () => {
  assert.ok(Array.isArray(LEVELS));
  assert.equal(LEVELS.length, 5);
});

test('levels are numbered 1..5 and carry a translation for each language', () => {
  const langs = ['en', 'sw', 'lg', 'rw'];
  LEVELS.forEach((level, i) => {
    assert.equal(level.id, i + 1);
    assert.ok(level.hours > 0, `level ${level.id} has no hours`);
    for (const lang of langs) {
      assert.equal(typeof level.name[lang], 'string', `level ${level.id} missing ${lang} name`);
      assert.ok(level.name[lang].length > 0, `level ${level.id} empty ${lang} name`);
    }
  });
});

test('total course hours match the advertised 260', () => {
  const total = LEVELS.reduce((a, l) => a + l.hours, 0);
  assert.equal(total, 260);
});

test('every lesson has an id, translated title, words and activities', () => {
  for (const level of LEVELS) {
    assert.ok(level.lessons.length > 0, `level ${level.id} has no lessons`);
    for (const lesson of level.lessons) {
      assert.ok(lesson.id, `level ${level.id} has a lesson with no id`);
      for (const lang of ['en', 'sw', 'lg', 'rw']) {
        assert.equal(typeof lesson.title[lang], 'string', `lesson ${lesson.id} missing ${lang} title`);
      }
      assert.ok(Array.isArray(lesson.words) && lesson.words.length > 0, `lesson ${lesson.id} has no words`);
      assert.ok(Array.isArray(lesson.activities) && lesson.activities.length > 0, `lesson ${lesson.id} has no activities`);
    }
  }
});

test('lesson ids are unique across the whole course', () => {
  const ids = LEVELS.flatMap((l) => l.lessons.map((x) => x.id));
  assert.equal(new Set(ids).size, ids.length, 'duplicate lesson ids');
});

test('word banks are provided per language', () => {
  assert.ok(WORD_BANKS);
  assert.ok(Object.keys(WORD_BANKS).length > 0);
});

test('a new user starts at level 1 with nothing completed', () => {
  const engine = new LiteracyEngine('test-user-fresh-0001');
  const progress = engine.getProgress();

  assert.equal(progress.currentLevel, 1);
  // getProgress() reports a count, not the array.
  assert.equal(progress.completedLessons, 0);
  assert.equal(progress.totalHours, 0);
  assert.equal(progress.percentComplete, 0);
  assert.deepEqual(engine.progress.completedLessons, []);
});

test('getCurrentLevel returns the level matching current progress', () => {
  const engine = new LiteracyEngine('test-user-fresh-0002');
  const current = engine.getCurrentLevel();

  assert.equal(current.id, 1);
  assert.equal(current.name.en, LEVELS[0].name.en);
});

test('getLevels reports every level with progress attached', () => {
  const engine = new LiteracyEngine('test-user-fresh-0003');
  const levels = engine.getLevels();

  assert.equal(levels.length, 5);
  assert.ok(levels.every((l) => 'completed' in l && 'unlocked' in l && 'lessonCount' in l));
  // Only level 1 is unlocked for a fresh user.
  assert.equal(levels[0].unlocked, true);
  assert.equal(levels[1].unlocked, false);
});

test('getNextLesson returns an incomplete lesson from the current level', () => {
  const engine = new LiteracyEngine('test-user-fresh-0004');
  const lesson = engine.getNextLesson();

  assert.ok(lesson, 'expected a next lesson');
  assert.equal(lesson.id, LEVELS[0].lessons[0].id);
});

test('getLesson resolves a lesson by id and rejects unknown ids', () => {
  const engine = new LiteracyEngine('test-user-fresh-0005');

  const found = engine.getLesson(LEVELS[0].lessons[0].id);
  assert.equal(found.id, LEVELS[0].lessons[0].id);
  assert.equal(found.levelId, 1);

  assert.equal(engine.getLesson('does-not-exist'), null);
});

test('getVoicePrompt returns a prompt in the requested language', () => {
  const engine = new LiteracyEngine('test-user-fresh-0006');
  const lesson = engine.getLesson(LEVELS[0].lessons[0].id);
  const listen = lesson.activities.find((a) => a.type === 'listen_repeat');

  const en = engine.getVoicePrompt(listen, 'en');
  const sw = engine.getVoicePrompt(listen, 'sw');

  assert.ok(en.includes(listen.words[0]), 'English prompt should list the words');
  assert.ok(sw.length > 0);
  assert.notEqual(en, sw, 'translations should differ');
});

test('getVoicePrompt works for activities with no words or numbers', () => {
  const engine = new LiteracyEngine('test-user-fresh-0007');
  const lesson = engine.getLesson(LEVELS[0].lessons[0].id);

  // `trace`, `match` and `write` carry no `words`/`numbers` array. These used
  // to throw, because every template in the table was interpolated eagerly.
  for (const type of ['trace', 'match', 'write']) {
    const activity = lesson.activities.find((a) => a.type === type);
    assert.ok(activity, `expected a ${type} activity`);
    assert.equal(typeof activity.words, 'undefined');

    const prompt = engine.getVoicePrompt(activity, 'en');
    assert.equal(typeof prompt, 'string');
    assert.ok(prompt.length > 0, `${type} prompt was empty`);
  }
});

test('getVoicePrompt falls back to the instruction for unknown activity types', () => {
  const engine = new LiteracyEngine('test-user-fresh-0008');
  const prompt = engine.getVoicePrompt({ type: 'not_a_real_type', instruction: 'Do the thing' });

  assert.equal(prompt, 'Do the thing');
});

test('completeLesson records progress and persists it, then restores state', () => {
  const userId = 'test-user-write-0001';
  const existedBefore = fs.existsSync(PROGRESS_FILE);
  const before = existedBefore ? fs.readFileSync(PROGRESS_FILE, 'utf8') : null;

  try {
    const engine = new LiteracyEngine(userId);
    const lesson = LEVELS[0].lessons[0];

    engine.completeLesson(lesson.id, 90);

    assert.ok(engine.progress.completedLessons.includes(lesson.id), 'lesson not recorded');
    assert.ok(engine.progress.totalHours > 0, 'no hours credited');
    assert.equal(engine.getProgress().completedLessons, 1);

    // A fresh instance must load the persisted progress back off disk.
    const reloaded = new LiteracyEngine(userId);
    assert.ok(reloaded.progress.completedLessons.includes(lesson.id));
  } finally {
    if (before === null) {
      if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
    } else {
      fs.writeFileSync(PROGRESS_FILE, before, 'utf8');
    }
  }
});

test('completing every lesson in level 1 unlocks level 2', () => {
  const userId = 'test-user-unlock-0001';
  const existedBefore = fs.existsSync(PROGRESS_FILE);
  const before = existedBefore ? fs.readFileSync(PROGRESS_FILE, 'utf8') : null;

  try {
    const engine = new LiteracyEngine(userId);
    for (const lesson of LEVELS[0].lessons) engine.completeLesson(lesson.id, 100);

    assert.equal(engine.getProgress().currentLevel, 2);
  } finally {
    if (before === null) {
      if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
    } else {
      fs.writeFileSync(PROGRESS_FILE, before, 'utf8');
    }
  }
});
