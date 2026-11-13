// The shared kit (shared/kit.js + kit.css), tested through a real game page.
const { test, expect } = require('@playwright/test');
const { gameUrl, trackErrors } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.goto(gameUrl('matching.html'));
});

test('fills #stars with 70 stars', async ({ page }) => {
  await expect(page.locator('#stars .star')).toHaveCount(70);
});

test('kit.css is applied', async ({ page }) => {
  // If the relative path to shared/kit.css broke, the back button would lose its pill shape.
  await expect(page.locator('.back-btn')).toHaveCSS('border-radius', '50px');
  await expect(page.locator('#stars')).toHaveCSS('position', 'fixed');
});

test('Kit.shuffle returns a shuffled copy and leaves the original alone', async ({ page }) => {
  const r = await page.evaluate(() => {
    const orig = Array.from({ length: 20 }, (_, i) => i);
    const runs = Array.from({ length: 20 }, () => Kit.shuffle(orig));
    return { orig, runs };
  });
  expect(r.orig).toEqual(Array.from({ length: 20 }, (_, i) => i));
  for (const run of r.runs) expect([...run].sort((a, b) => a - b)).toEqual(r.orig);
  expect(r.runs.some(run => run.join() !== r.orig.join())).toBe(true);
});

test('Kit.confetti drops pieces that clean themselves up', async ({ page }) => {
  await page.evaluate(() => Kit.confetti(25));
  await expect(page.locator('#confetti .cp')).toHaveCount(25);
  // Longest piece: 0.8s delay + 3.5s fall.
  await expect(page.locator('#confetti .cp')).toHaveCount(0, { timeout: 8000 });
});

test('Kit.confetti creates its container if a page has none', async ({ page }) => {
  await page.evaluate(() => { document.getElementById('confetti').remove(); Kit.confetti(5); });
  await expect(page.locator('#confetti.confetti-wrap .cp')).toHaveCount(5);
});

test('Kit.tone and Kit.audio work without throwing', async ({ page }) => {
  const errors = trackErrors(page);
  const state = await page.evaluate(() => { Kit.tone(440, 0.05); return Kit.audio() === Kit.audio(); });
  expect(state).toBe(true);
  expect(errors).toEqual([]);
});

test('every page gets the game controller tab icon', async ({ page }) => {
  for (const file of ['matching.html', 'index.html']) {
    await page.goto(gameUrl(file));
    const href = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(href.startsWith('data:image/svg+xml,')).toBe(true);
    expect(decodeURIComponent(href)).toContain('>🎮</text>');
  }
});

test('double-tap zoom is off everywhere (Safari ignores user-scalable=no)', async ({ page }) => {
  // manipulation everywhere, except where a game asked for none (stricter, also no zoom)
  const values = await page.$$eval('*', els => [...new Set(els.map(e => getComputedStyle(e).touchAction))]);
  expect(values.every(v => v === 'manipulation' || v === 'none')).toBe(true);
});

test('a quick double-tap still gives the game both taps, but cancels the second (no Safari zoom)', async ({ page }) => {
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.style.cssText = 'position:fixed;left:100px;top:300px;width:80px;height:80px;z-index:999';
    window.clicks = 0;
    window.cancelled = [];
    b.addEventListener('click', () => clicks++);
    document.addEventListener('touchend', e => cancelled.push(e.defaultPrevented));
    document.body.appendChild(b);
  });
  await page.touchscreen.tap(140, 340);
  await page.touchscreen.tap(140, 340);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => cancelled)).toEqual([false, true]);
  expect(await page.evaluate(() => clicks)).toBe(2);

  // A slow second tap is an ordinary tap: nothing cancelled
  await page.waitForTimeout(500);
  await page.touchscreen.tap(140, 340);
  expect(await page.evaluate(() => cancelled)).toEqual([false, true, false]);
  expect(await page.evaluate(() => clicks)).toBe(3);
});
