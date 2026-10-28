// Bump the ?v= cache-buster on shared/kit.css + kit.js in every page.
// Run after editing anything in shared/, so phones don't mix new HTML with a cached old kit.
//   npm run bump-kit
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const kitJs = fs.readFileSync(path.join(ROOT, 'shared/kit.js'), 'utf8');
const current = Number(kitJs.match(/kit\.js\?v=(\d+)/)[1]);
const next = current + 1;

const files = ['shared/kit.css', 'shared/kit.js', ...fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))];
let changed = 0;
for (const f of files) {
  const p = path.join(ROOT, f);
  const before = fs.readFileSync(p, 'utf8');
  const after = before.replace(/(shared\/)?kit\.(css|js)\?v=\d+/g, (m, dir, ext) => `${dir || ''}kit.${ext}?v=${next}`);
  if (after !== before) { fs.writeFileSync(p, after); changed++; }
}
console.log(`kit v${current} → v${next} in ${changed} files`);
