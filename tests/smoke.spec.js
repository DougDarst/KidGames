// Load every game in a real browser, poke it, and make sure nothing throws.
const { test, expect } = require('@playwright/test');
const { linkedGames, gameUrl, trackErrors } = require('./helpers');

test('home screen loads and shows every game card', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(gameUrl('index.html'));
  await expect(page.locator('a.game-card')).toHaveCount(linkedGames().length);
  expect(errors).toEqual([]);
});

for (const file of linkedGames()) {
  test(`${file} loads and survives taps without errors`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(gameUrl(file));

    // Let animation loops and timers run for a moment.
    await page.waitForTimeout(800);

    // Tap and drag around the play area like a toddler would.
    const { width, height } = page.viewportSize();
    for (const [x, y] of [[0.5, 0.5], [0.3, 0.6], [0.7, 0.4], [0.5, 0.8]]) {
      await page.mouse.click(width * x, height * y);
    }
    await page.mouse.move(width * 0.2, height * 0.5);
    await page.mouse.down();
    await page.mouse.move(width * 0.8, height * 0.6, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
}
