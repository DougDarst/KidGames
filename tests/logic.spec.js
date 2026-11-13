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

  test('each wrong guess adds the next part, and the tenth loses', async ({ page }) => {
    const errors = trackErrors(page);
    expect(await page.evaluate(() => PARTS)).toEqual(
      ['head', 'body', 'leg1', 'leg2', 'arm1', 'arm2', 'eye1', 'eye2', 'nose', 'frown']);
    await page.evaluate(() => startRound({ word: 'CAT', emoji: '🐱' }));

    const wrong = 'BDEFGHIJKL';
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
  test('the picture hint stays hidden until asked for, and hides again next word', async ({ page }) => {
    await page.evaluate(() => startRound({ word: 'CAT', emoji: '🐱' }));
    await expect(page.locator('#hint')).toHaveText('💡 Hint');
    await page.locator('#hint').click();
    await expect(page.locator('#hint')).toHaveText('🐱');
    await page.locator('.new-game-btn').click();
    await expect(page.locator('#hint')).toHaveText('💡 Hint');
  });
});

test.describe('snowman.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.goto(gameUrl('snowman.html'));
  });

  test('middle ball, then head, then the extras in any order; smile only at the end', async ({ page }) => {
    const errors = trackErrors(page);
    const tray = () => page.$$eval('#tray .piece', els => els.map(e => e.dataset.id));
    expect(await tray()).toEqual(['middle']);
    expect(await page.evaluate(() => [place('head'), place('hat')])).toEqual([false, false]);

    expect(await page.evaluate(() => place('middle'))).toBe(true);
    expect(await tray()).toEqual(['head']);
    expect(await page.evaluate(() => place('head'))).toBe(true);
    expect((await tray()).sort()).toEqual(['armL', 'armR', 'eyes', 'hat', 'nose']);

    for (const id of ['armR', 'nose', 'hat', 'eyes']) {
      expect(await page.evaluate(id => place(id), id)).toBe(true);
      await expect(page.locator('#p-smile')).not.toHaveClass(/on/);
    }
    expect(await page.evaluate(() => place('armL'))).toBe(true);
    await expect(page.locator('#p-smile')).toHaveClass(/on/);
    await expect(page.locator('#confetti .cp').first()).toBeAttached();
    await page.clock.runFor(3500);
    await expect(page.locator('#overlay')).toHaveClass(/show/);

    await page.locator('.play-again-btn').click();
    expect(await tray()).toEqual(['middle']);
    await expect(page.locator('#p-smile')).not.toHaveClass(/on/);
    expect(errors).toEqual([]);
  });

  test('dropping a piece in the scene snaps it; dropping outside sends it back', async ({ page }) => {
    const piece = page.locator('#tray .piece').first();
    const p = await piece.boundingBox();
    const s = await page.locator('#scene').boundingBox();
    const drag = async (x, y) => {
      await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
      await page.mouse.down();
      await page.mouse.move(x, y, { steps: 5 });
      await page.mouse.up();
      await page.clock.runFor(400);
    };

    await drag(p.x + p.width / 2, 5);   // up by the title, outside the scene
    expect(await page.evaluate(() => placed.has('middle'))).toBe(false);
    await expect(piece).not.toHaveClass(/lifted/);

    await drag(s.x + s.width * 0.8, s.y + s.height * 0.3);   // anywhere in the scene
    expect(await page.evaluate(() => placed.has('middle'))).toBe(true);
    await expect(page.locator('#p-middle')).toHaveClass(/on/);
  });
});

test.describe('christmastree.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.goto(gameUrl('christmastree.html'));
  });

  // Screen point for a spot on the 300×400 stage
  async function stagePoint(page, x, y) {
    const b = await page.locator('#stage').boundingBox();
    return { x: b.x + x / 300 * b.width, y: b.y + y / 400 * b.height };
  }
  async function drag(page, from, to) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    await page.clock.runFor(400);
  }

  test('ornaments and lights only go on the tree', async ({ page }) => {
    const r = await page.evaluate(() => [
      pointInTree(150, 250), pointInTree(150, 100), pointInTree(20, 60), pointInTree(280, 120),
      !!addDecoration('ball-red', 150, 250), !!addDecoration('bulb-blue', 140, 120), !!addDecoration('bell', 20, 60),
    ]);
    expect(r).toEqual([true, true, false, false, true, true, false]);
    expect(await page.evaluate(() => decorations.length)).toBe(2);
  });

  test('a star snaps to the top, there is only one, and it celebrates', async ({ page }) => {
    const errors = trackErrors(page);
    expect(await page.evaluate(() => addDecoration('star-gold', 150, 300))).toBeNull();   // too low
    const pos = await page.evaluate(() => { const d = addDecoration('star-gold', 110, 90); return { x: d.x, y: d.y }; });
    expect(pos).toEqual(await page.evaluate(() => STAR_POS));
    await expect(page.locator('.deco.topper')).toHaveClass(/celebrate/);
    await page.clock.runFor(1500);
    await expect(page.locator('.deco.topper')).toHaveCSS('opacity', '1');   // not hidden by kit.css's .star
    await expect(page.locator('#confetti .cp').first()).toBeAttached();

    // A different color replaces it
    await page.evaluate(() => addDecoration('star-blue', 160, 60));
    expect(await page.evaluate(() => decorations.filter(d => CATALOG[d.kind].cat === 'star').map(d => d.kind))).toEqual(['star-blue']);
    expect(errors).toEqual([]);
  });

  test('presents snap down to the ground under the tree', async ({ page }) => {
    const r = await page.evaluate(() => {
      const d = addDecoration('gift-green', 100, 120);
      return { x: d.x, bottom: d.y + CATALOG['gift-green'].size[1] / 2, ground: GROUND };
    });
    expect(r.x).toBe(100);
    expect(r.bottom).toBe(r.ground);
  });

  test('the lights switch makes every bulb twinkle, including ones added later', async ({ page }) => {
    await page.evaluate(() => addDecoration('bulb-red', 150, 250));
    const glow = () => page.$$eval('.deco.bulb', els => els.map(e => getComputedStyle(e, '::after').animationName));
    expect(await glow()).toEqual(['none']);

    await page.locator('#lightsBtn').click();
    await expect(page.locator('#lightsBtn')).toHaveText('💡 Lights: On');
    await page.evaluate(() => addDecoration('bulb-green', 150, 200));
    expect(await glow()).toEqual(['twinkle', 'twinkle']);

    await page.locator('#lightsBtn').click();
    expect(await glow()).toEqual(['none', 'none']);
  });

  test('clear takes two taps', async ({ page }) => {
    await page.evaluate(() => { addDecoration('ball-red', 150, 250); addDecoration('gift-red', 150, 0); });
    const clear = page.locator('#clearBtn');
    await clear.click();
    await expect(clear).toHaveText('Tap again to clear');
    expect(await page.evaluate(() => decorations.length)).toBe(2);

    await page.clock.runFor(3500);   // waited too long: back to normal
    await expect(clear).toHaveText('🗑️ Clear');
    await clear.click();
    await clear.click();
    expect(await page.evaluate(() => decorations.length)).toBe(0);
    await expect(page.locator('#decos .deco')).toHaveCount(0);
  });

  test('drag from the tray onto the tree, move it, then drag it off to remove it', async ({ page }) => {
    const errors = trackErrors(page);
    const item = await page.locator('.tray-item').first().boundingBox();
    const from = { x: item.x + item.width / 2, y: item.y + item.height / 2 };

    // Off the tree (top-left corner of the sky): floats back, nothing added
    await drag(page, from, await stagePoint(page, 10, 30));
    expect(await page.evaluate(() => decorations.length)).toBe(0);

    // Onto the middle of the tree (the piece floats a little above the finger, so aim low)
    await drag(page, from, await stagePoint(page, 150, 290));
    expect(await page.evaluate(() => decorations.length)).toBe(1);
    const placed = page.locator('#decos .deco').first();

    // Move it within the tree
    const b = await placed.boundingBox();
    await drag(page, { x: b.x + b.width / 2, y: b.y + b.height / 2 }, await stagePoint(page, 150, 200));
    const y = await page.evaluate(() => decorations[0].y);
    expect(Math.abs(y - 200)).toBeLessThan(3);

    // Drag it off the tree: removed
    const b2 = await placed.boundingBox();
    await drag(page, { x: b2.x + b2.width / 2, y: b2.y + b2.height / 2 }, await stagePoint(page, 15, 40));
    expect(await page.evaluate(() => decorations.length)).toBe(0);
    expect(errors).toEqual([]);
  });

  test('every tab fills the tray, and every item fits inside it', async ({ page }) => {
    for (const [i, n] of [[0, 12], [1, 6], [2, 6], [3, 5]]) {
      await page.locator('.tab').nth(i).click();
      await expect(page.locator('.tray-item')).toHaveCount(n);
      const tray = await page.locator('#tray').boundingBox();
      for (const box of await page.$$eval('.tray-item', els => els.map(e => e.getBoundingClientRect().toJSON()))) {
        expect(box.right).toBeLessThanOrEqual(tray.x + tray.width);
      }
    }
  });
});

test.describe('hanukkah.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.goto(gameUrl('hanukkah.html'));
  });

  async function stagePoint(page, x, y) {
    const b = await page.locator('#stage').boundingBox();
    return { x: b.x + x / 300 * b.width, y: b.y + y / 300 * b.height };
  }
  // Fill every holder; the shamash lights itself, the others start unlit.
  const fillMenorah = page => page.evaluate(() =>
    HOLDERS.map(h => addDecoration('candle-blue', h.x, h.y - 20)).map(d => d.holder));

  test('candles snap into the nearest empty holder, one per holder', async ({ page }) => {
    const r = await page.evaluate(() => {
      const a = addDecoration('candle-red', 63, 135);    // near holder 1
      const b = addDecoration('candle-red', 63, 135);    // holder 1 is taken: goes to a neighbor
      const far = addDecoration('candle-red', 150, 40); // nowhere near a holder
      return [a.holder, b.holder, far];
    });
    expect(r[0]).toBe(1);
    expect([0, 2]).toContain(r[1]);
    expect(r[2]).toBeNull();
  });

  test('all nine holders can be filled, and a tenth candle has nowhere to go', async ({ page }) => {
    expect(await fillMenorah(page)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(await page.evaluate(() => addDecoration('candle-red', 90, 128))).toBeNull();
  });

  test('the shamash lights itself; tapping a candle lights it from the shamash', async ({ page }) => {
    const errors = trackErrors(page);
    await page.evaluate(() => addDecoration('candle-pink', HOLDERS[2].x, 120));
    // No shamash yet: tapping doesn't light it
    let candle = page.locator('#decos .deco.candle').first();
    await candle.click();
    await page.clock.runFor(500);
    expect(await page.evaluate(() => decorations[0].lit)).toBe(false);

    await page.evaluate(() => addDecoration('candle-white', 150, 90));
    expect(await page.evaluate(() => candleIn(SHAMASH).lit)).toBe(true);
    await candle.click();
    await page.clock.runFor(500);
    expect(await page.evaluate(() => candleIn(2).lit)).toBe(true);
    expect(errors).toEqual([]);
  });

  test("dragging the shamash's flame over a candle lights it", async ({ page }) => {
    await page.evaluate(() => { addDecoration('candle-white', 150, 90); addDecoration('candle-blue', HOLDERS[6].x, 125); });
    await page.waitForTimeout(500);   // let the candles finish popping in before measuring them
    const sh = await page.evaluate(() => { const r = candleIn(SHAMASH).el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const target = await page.evaluate(() => { const r = candleIn(6).el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y }; });
    await page.mouse.move(sh.x, sh.y);
    await page.mouse.down();
    // The flame floats a little above the finger, so aim the finger just below the candle's top
    const lift = await page.evaluate(() => candleIn(SHAMASH).el.querySelector('.flame').getBoundingClientRect().height * 1.6);
    await page.mouse.move(target.x, target.y + lift, { steps: 10 });
    await page.mouse.up();
    expect(await page.evaluate(() => candleIn(6).lit)).toBe(true);
    expect(await page.evaluate(() => candleIn(SHAMASH).holder)).toBe(4);   // the shamash didn't move
  });

  test('lighting all nine celebrates; taking one away resets', async ({ page }) => {
    await fillMenorah(page);
    await expect(page.locator('#status')).not.toHaveText(/Happy Hanukkah/);
    await page.evaluate(() => decorations.forEach(lightCandle));
    await expect(page.locator('#status')).toHaveText('✨ Happy Hanukkah! ✨');
    await expect(page.locator('#confetti .cp').first()).toBeAttached();
    await expect(page.locator('#scene')).toHaveClass(/glow/);

    await page.evaluate(() => removeDecoration(candleIn(0)));
    await expect(page.locator('#scene')).not.toHaveClass(/glow/);
    expect(await page.evaluate(() => isComplete())).toBe(false);
  });

  test('sill things sit on the sill; window things hang above it', async ({ page }) => {
    const r = await page.evaluate(() => {
      const gelt = addDecoration('gelt', 80, 40);
      const star = addDecoration('star-blue', 80, 60);
      const low  = addDecoration('star-blue', 80, 290);
      return { geltBottom: gelt.y + CATALOG.gelt.size[1] / 2, star: [star.x, star.y], low, table: TABLE_Y };
    });
    expect(r.geltBottom).toBe(r.table);
    expect(r.star).toEqual([80, 60]);
    expect(r.low).toBeNull();
  });

  test('tapping a dreidel spins it and lands on a letter', async ({ page }) => {
    const errors = trackErrors(page);
    await page.evaluate(() => addDecoration('dreidel-blue', 150, 0));
    const dreidel = page.locator('#decos .deco.dreidel');
    await dreidel.click();
    await expect(dreidel).toHaveClass(/spinning/);
    await page.clock.runFor(1700);
    await expect(dreidel).not.toHaveClass(/spinning/);
    const letter = await page.evaluate(() => decorations[0].letter);
    expect(['נ', 'ג', 'ה', 'ש']).toContain(letter);
    await expect(dreidel.locator('text')).toHaveText(letter);
    await expect(page.locator('#status')).toContainText(letter);
    expect(errors).toEqual([]);
  });

  test('tabs fill the tray, items fit, and clear takes two taps', async ({ page }) => {
    for (const [i, n] of [[0, 8], [1, 12]]) {
      await page.locator('.tab').nth(i).click();
      await expect(page.locator('.tray-item')).toHaveCount(n);
      const tray = await page.locator('#tray').boundingBox();
      for (const box of await page.$$eval('.tray-item', els => els.map(e => e.getBoundingClientRect().toJSON()))) {
        expect(box.right).toBeLessThanOrEqual(tray.x + tray.width);
      }
    }
    await fillMenorah(page);
    await page.locator('#clearBtn').click();
    expect(await page.evaluate(() => decorations.length)).toBe(9);
    await page.locator('#clearBtn').click();
    expect(await page.evaluate(() => decorations.length)).toBe(0);
  });

  test('drag a candle from the tray into the menorah', async ({ page }) => {
    const item = await page.locator('.tray-item').first().boundingBox();
    await page.mouse.move(item.x + item.width / 2, item.y + item.height / 2);
    await page.mouse.down();
    // The piece floats above the finger, so aim the finger below holder 7
    const p = await stagePoint(page, 240, 150);
    await page.mouse.move(p.x, p.y, { steps: 8 });
    await page.mouse.up();
    await page.clock.runFor(400);
    expect(await page.evaluate(() => decorations.map(d => d.holder))).toEqual([7]);
  });
});
