// Static checks for the project rules in CLAUDE.md. No browser needed.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { ROOT, ORPHANS, read, htmlFiles, linkedGames } = require('./helpers');

const games = linkedGames();
const KIT_VERSION = read('shared/kit.js').match(/kit\.js\?v=(\d+)/)[1];
const KIT_TAGS = [
  `<link rel="stylesheet" href="shared/kit.css?v=${KIT_VERSION}">`,
  `<script src="shared/kit.js?v=${KIT_VERSION}"></script>`,
];

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

test('kit.css and kit.js document the same ?v= version', () => {
  expect(read('shared/kit.css')).toContain(`kit.css?v=${KIT_VERSION}`);
});

for (const file of ['index.html', ...games]) {
  test.describe(file, () => {
    const html = read(file);

    test('loads only the shared kit — nothing from other sites', () => {
      const refs = [...html.matchAll(/<(script|link|img|iframe)\b[^>]*\b(src|href)="([^"]+)"/g)]
        .map(m => m[3])
        .filter(url => !url.startsWith('data:'));
      expect(refs).toEqual([`shared/kit.css?v=${KIT_VERSION}`, `shared/kit.js?v=${KIT_VERSION}`]);
    });

    test('loads kit.css before its own styles and kit.js before its own script', () => {
      for (const tag of KIT_TAGS) expect(html, `missing or wrong ?v= on: ${tag}`).toContain(tag);
      expect(html.indexOf(KIT_TAGS[0])).toBeLessThan(html.indexOf('<style>'));
      expect(html.indexOf(KIT_TAGS[1])).toBeLessThan(html.indexOf('<script>'));
    });

    test('does not re-implement what the kit provides', () => {
      expect(html, 'zoom blocking is in kit.js').not.toContain("addEventListener('gesturestart'");
      expect(html, 'use Kit.shuffle').not.toMatch(/function shuffle\b/);
      expect(html, 'use Kit.audio / Kit.tone').not.toContain('new (window.AudioContext');
      expect(html, 'kit.js fills #stars').not.toContain("className = 'star'");
    });

    test('has a touch-friendly viewport', () => {
      expect(html).toMatch(/<meta name="viewport"[^>]*user-scalable=no/);
    });

    if (file !== 'index.html') {
      test('has a back link to the home screen', () => {
        expect(html).toMatch(/<a class="back-btn" href="index\.html"/);
      });
    }

    test('has a <title>', () => {
      expect(html).toMatch(/<title>[^<]+<\/title>/);
    });
  });
}
