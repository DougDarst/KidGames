// Game rules, tested by calling each page's own top-level functions in the browser.
const { test, expect } = require('@playwright/test');
const { gameUrl, trackErrors } = require('./helpers');

test.describe('tictactoe_v2.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(gameUrl('tictactoe_v2.html'));
  });

  test('detects every winning line', async ({ page }) => {
    const results = await page.evaluate(() => WINS.map(line => {
      board = Array(9).fill(null);
      line.forEach(i => { board[i] = 'X'; });
      return checkResult();
    }));
    const lines = await page.evaluate(() => WINS);
    results.forEach((r, i) => expect(r).toEqual({ combo: lines[i] }));
  });

  test('detects a draw on a full board with no line', async ({ page }) => {
    const r = await page.evaluate(() => {
      board = ['X','O','X', 'X','O','O', 'O','X','X'];
      return checkResult();
    });
    expect(r).toEqual({ draw: true });
  });

  test('game continues on a partial board', async ({ page }) => {
    expect(await page.evaluate(() => { board = ['X','O',null, null,null,null, null,null,null]; return checkResult(); })).toBeNull();
  });

  test('tapping cells plays a full game and shows the winner', async ({ page }) => {
    const first = await page.evaluate(() => current.name);
    const cells = page.locator('#board > *');
    // First player takes the top row; second player plays the middle row.
    for (const i of [0, 3, 1, 4, 2]) await cells.nth(i).click();
    await expect(page.locator('.overlay.show')).toBeVisible();
    await expect(page.locator('.overlay.show')).toContainText(`${first} Wins!`);
  });
});

test.describe('puzzle.html', () => {
  test('neighbors respects the 3×3 grid edges', async ({ page }) => {
    await page.goto(gameUrl('puzzle.html'));
    const n = await page.evaluate(() => [0, 4, 8, 2].map(i => neighbors(i).sort((a, b) => a - b)));
    expect(n).toEqual([[1, 3], [1, 3, 5, 7], [5, 7], [1, 5]]);
  });

  test('shuffled boards are always solvable', async ({ page }) => {
    await page.goto(gameUrl('puzzle.html'));
    const boards = await page.evaluate(() => Array.from({ length: 50 }, () => { generateShuffle(); return [...grid]; }));
    for (const b of boards) {
      expect([...b].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      // A 3×3 sliding puzzle is solvable iff the tile permutation has an even number of inversions.
      const tiles = b.filter(v => v !== 0);
      let inversions = 0;
      for (let i = 0; i < tiles.length; i++)
        for (let j = i + 1; j < tiles.length; j++)
          if (tiles[i] > tiles[j]) inversions++;
      expect(inversions % 2).toBe(0);
    }
  });

  test('isSolved recognizes only the solved layout', async ({ page }) => {
    await page.goto(gameUrl('puzzle.html'));
    const r = await page.evaluate(() => {
      grid = [1, 2, 3, 4, 5, 6, 7, 8, 0]; const solved = isSolved();
      grid = [1, 2, 3, 4, 5, 6, 7, 0, 8]; const almost = isSolved();
      return { solved, almost };
    });
    expect(r).toEqual({ solved: true, almost: false });
  });
});

test.describe('addition.html', () => {
  test('questions have sums from 1 to 10', async ({ page }) => {
    await page.goto(gameUrl('addition.html'));
    const qs = await page.evaluate(() => Array.from({ length: 500 }, makeQuestion));
    for (const q of qs) {
      expect(q.a + q.b).toBe(q.answer);
      expect(q.a).toBeGreaterThanOrEqual(0);
      expect(q.b).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeGreaterThanOrEqual(1);
      expect(q.answer).toBeLessThanOrEqual(10);
    }
  });

  test('offers 4 distinct choices including the answer', async ({ page }) => {
    await page.goto(gameUrl('addition.html'));
    const all = await page.evaluate(() => Array.from({ length: 11 }, (_, n) => ({ n, choices: makeChoices(n) })));
    for (const { n, choices } of all) {
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(n);
      choices.forEach(c => expect(c).toBeGreaterThanOrEqual(0));
    }
  });
});

test.describe('counting.html', () => {
  test('offers 4 distinct choices from 1–10 including the answer', async ({ page }) => {
    await page.goto(gameUrl('counting.html'));
    const all = await page.evaluate(() => Array.from({ length: 10 }, (_, i) => ({ n: i + 1, choices: generateAnswers(i + 1) })));
    for (const { n, choices } of all) {
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(n);
      choices.forEach(c => { expect(c).toBeGreaterThanOrEqual(1); expect(c).toBeLessThanOrEqual(10); });
    }
  });
});

test.describe('matching.html', () => {
  test('deck has exactly two of each emoji', async ({ page }) => {
    await page.goto(gameUrl('matching.html'));
    const { deck, set } = await page.evaluate(() => ({ deck: board.map(c => c.emoji), set: EMOJI_SET }));
    expect(deck).toHaveLength(set.length * 2);
    for (const e of set) expect(deck.filter(d => d === e)).toHaveLength(2);
  });

  test('matching every pair ends the game with a winner', async ({ page }) => {
    const errors = trackErrors(page);
    await page.clock.install();
    await page.goto(gameUrl('matching.html'));
    const first = await page.evaluate(() => current.name);
    const deck = await page.evaluate(() => board.map(c => c.emoji));
    const cards = page.locator('#grid .card');

    const done = new Set();
    for (let i = 0; i < deck.length; i++) {
      if (done.has(i)) continue;
      const j = deck.indexOf(deck[i], i + 1);
      await cards.nth(i).click();
      await cards.nth(j).click();
      await page.clock.runFor(1000);
      done.add(i).add(j);
    }
    await page.clock.runFor(1000);

    // The same player matched every pair, so they keep the turn and win 8–0.
    await expect(page.locator('#overlay')).toHaveClass(/show/);
    await expect(page.locator('#rTitle')).toHaveText(`${first} Wins!`);
    await expect(page.locator(`#score${first}`)).toHaveText('8');
    expect(errors).toEqual([]);
  });
});

test.describe('hangman.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.goto(gameUrl('hangman.html'));
  });

  test('word list is short, unique, uppercase words with a hint', async ({ page }) => {
    const words = await page.evaluate(() => WORDS);
    expect(new Set(words.map(w => w.word)).size).toBe(words.length);
    for (const w of words) {
      expect(w.word).toMatch(/^[A-Z]{3,5}$/);
      expect(w.emoji).toBeTruthy();
    }
  });

  test('each wrong guess adds the next part, and the ninth loses', async ({ page }) => {
    const errors = trackErrors(page);
    expect(await page.evaluate(() => PARTS)).toEqual(
      ['head', 'body', 'leg1', 'leg2', 'arm', 'eye1', 'eye2', 'nose', 'frown']);
    await page.evaluate(() => startRound({ word: 'CAT', emoji: '🐱' }));

    const wrong = 'BDEFGHIJK';
    for (let i = 0; i < wrong.length; i++) {
      await page.locator(`#key${wrong[i]}`).click();
      const shown = await page.$$eval('#figure .part.on', els => els.map(e => e.id));
      expect(shown).toEqual(await page.evaluate(n => PARTS.slice(0, n), i + 1));
      expect(await page.evaluate(() => over)).toBe(i === wrong.length - 1);
    }
    await expect(page.locator('#triesLeft')).toHaveText('0');
    await page.clock.runFor(2000);
    await expect(page.locator('#overlay')).toHaveClass(/show/);
    await expect(page.locator('#rScores')).toContainText('CAT');
    expect(errors).toEqual([]);
  });

  test('a letter fills every spot, repeats are free, and spelling the word wins', async ({ page }) => {
    const errors = trackErrors(page);
    await page.evaluate(() => startRound({ word: 'BEE', emoji: '🐝' }));
    await page.locator('#keyE').click();
    await expect(page.locator('#word .tile span')).toHaveText(['E', 'E']);

    await page.evaluate(() => { guess('Z'); guess('Z'); });
    expect(await page.evaluate(() => misses)).toBe(1);

    await page.locator('#keyB').click();
    expect(await page.evaluate(() => over)).toBe(true);
    await expect(page.locator('#wins')).toHaveText('1');
    await expect(page.locator('#confetti .cp').first()).toBeAttached();
    await page.clock.runFor(2000);
    await expect(page.locator('#overlay')).toHaveClass(/show/);
    await expect(page.locator('#rTitle')).toHaveText('You did it!');
    expect(errors).toEqual([]);
  });
});
