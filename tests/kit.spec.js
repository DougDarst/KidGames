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
