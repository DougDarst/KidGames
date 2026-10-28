// Retake the README screenshots on an iPhone-sized screen.
//   npm run screenshots            — the games listed in SHOTS
//   npm run screenshots -- --all   — every game (to pick new ones)
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium, devices } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/screenshots');

// Each shot can play a few moves first so the picture shows the game in action.
const SHOTS = {
  'index.html': async () => {},
  'matching.html': async page => {
    // Flip one matching pair, plus an already-matched pair elsewhere.
    const deck = await page.evaluate(() => board.map(c => c.emoji));
    const cards = page.locator('#grid .card');
    await cards.nth(deck.indexOf(deck[5])).click();
    await cards.nth(deck.lastIndexOf(deck[5])).click();
    await page.waitForTimeout(1500);
    await cards.nth(0).click();
    await page.waitForTimeout(500);
  },
  'tictactoe_v2.html': async page => {
    for (const i of [4, 0, 8, 2]) await page.locator('#board > *').nth(i).click();
    await page.waitForTimeout(600);
  },
  'paint.html': async page => {
    await page.locator('#specialSec .sp-btn').first().click();
    const box = await page.locator('#canvas').boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let t = 0; t < 14; t += 0.1) {
      const r = 12 + t * 11;
      await page.mouse.move(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
    }
    await page.mouse.up();
  },
  'puppy.html': async page => {
    const box = await page.locator('#mc').boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    for (let i = 0; i < 40; i++) {
      await page.mouse.move(box.x + box.width * (0.3 + (i % 2) * 0.4), box.y + box.height * (0.25 + i * 0.008), { steps: 4 });
    }
    await page.mouse.up();
    await page.waitForTimeout(300);
  },
  'plinko.html': async page => {
    const box = await page.locator('canvas').first().boundingBox();
    await page.mouse.click(box.x + box.width * 0.45, box.y + 60);
    await page.waitForTimeout(900);
  },
  'candy-rescue.html': async page => {
    for (let i = 0; i < 3; i++) { await page.locator('#shootBtn').click(); await page.waitForTimeout(250); }
  },
  'rainbow-brick-burst.html': async page => { await page.waitForTimeout(2500); },
  'feed-the-dragon-sparkles.html': async () => {},
  'hideseek.html': async () => {},
  'puzzle.html': async () => {},
  'soccer.html': async () => {},
  'counting.html': async () => {},
};

async function main() {
  const all = process.argv.includes('--all');
  const games = all
    ? ['index.html', ...[...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/class="game-card" href="([^"]+)"/g)].map(m => m[1])]
    : Object.keys(SHOTS);
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  // Chromium rather than WebKit: headless WebKit draws the backs of flipped cards.
  const { defaultBrowserType, ...iphone } = devices['iPhone 13'];
  await Promise.all(games.map(async file => {
    const page = await browser.newPage({ ...iphone, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(path.join(ROOT, file)).href);
    await page.waitForTimeout(1500);
    await (SHOTS[file] || (async () => {}))(page);
    await page.screenshot({ path: path.join(OUT, file.replace('.html', '.jpg')), type: 'jpeg', quality: 82 });
    await page.close();
  }));
  await browser.close();
  console.log(`saved ${games.length} screenshots to docs/screenshots/`);
}

main();
