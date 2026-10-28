const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

// Older files still in the repo but not linked from index.html.
const ORPHANS = ['connect-four.html', 'road-racer.html', 'whack-a-mole.html'];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function htmlFiles() {
  return fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
}

/** Games linked from the home screen, in the order they appear. */
function linkedGames() {
  const html = read('index.html');
  return [...html.matchAll(/<a class="game-card" href="([^"]+)"/g)].map(m => m[1]);
}

function gameUrl(file) {
  return pathToFileURL(path.join(ROOT, file)).href;
}

/** Collect uncaught exceptions and console.error messages from a page. */
function trackErrors(page) {
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

module.exports = { ROOT, ORPHANS, read, htmlFiles, linkedGames, gameUrl, trackErrors };
