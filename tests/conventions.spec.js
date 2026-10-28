// Static checks for the project rules in CLAUDE.md. No browser needed.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { ROOT, ORPHANS, read, htmlFiles, linkedGames } = require('./helpers');

const games = linkedGames();

test('index.html links only to files that exist', () => {
  expect(games.length).toBeGreaterThan(0);
  for (const href of games) {
    expect(fs.existsSync(path.join(ROOT, href)), `${href} is missing`).toBe(true);
  }
});

test('index.html has no duplicate game links', () => {
  expect(new Set(games).size).toBe(games.length);
});

test('every game file is linked from index.html', () => {
  const unlinked = htmlFiles().filter(f => f !== 'index.html' && !games.includes(f) && !ORPHANS.includes(f));
  expect(unlinked, 'add these to index.html (or to ORPHANS in tests/helpers.js)').toEqual([]);
});

for (const file of games) {
  test.describe(file, () => {
    const html = read(file);

    test('is self-contained (no external scripts, styles or images)', () => {
      const external = [...html.matchAll(/<(script|link|img|iframe)\b[^>]*\b(src|href)="([^"]+)"/g)]
        .map(m => m[3])
        .filter(url => !url.startsWith('data:'));
      expect(external).toEqual([]);
    });

    test('has a touch-friendly viewport', () => {
      expect(html).toMatch(/<meta name="viewport"[^>]*user-scalable=no/);
    });

    test('has a back link to the home screen', () => {
      expect(html).toMatch(/<a class="back-btn" href="index\.html"/);
    });

    test('blocks pinch-zoom gestures', () => {
      expect(html).toContain("addEventListener('gesturestart'");
    });

    test('has a <title>', () => {
      expect(html).toMatch(/<title>[^<]+<\/title>/);
    });
  });
}
