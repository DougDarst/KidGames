# Ellie's Games

A collection of touch-friendly browser games for Ellie and Grandpa.

## How it's served

The games are played in **Chrome on an iPhone**, straight from GitHub Pages (https://dougdarst.github.io/KidGames/), which serves `main` as-is. Every push to `main` is a live deploy, so run `npm test` first. iPhone Chrome uses Apple's WebKit engine, which is why the tests run on WebKit.

## Shared kit

Every page loads `shared/kit.css` and `shared/kit.js`. A game keeps only what is specific to it.

- `kit.css` — reset, `bgShift`, the `#stars` field, `.back-btn`, `.top-spacer`, `.new-game-btn`, `.play-again-btn`, the `.overlay` / `.result-card` game-over screen, and confetti (`.confetti-wrap`, `.cp`). A game may override a property locally (e.g. `paint.html` shrinks its back button); it must not copy whole rules.
- `kit.js` — on load, blocks pinch/double-tap zoom and fills `#stars` with 70 stars. Then provides:
  - `Kit.confetti(count = 80)` — drop confetti into `#confetti` (created if missing); pieces remove themselves.
  - `Kit.shuffle(arr)` — shuffled copy.
  - `Kit.audio()` — the shared `AudioContext`, resumed if iOS suspended it. Use this instead of `new AudioContext`.
  - `Kit.tone(freq, dur = 0.15, type = 'sine', vol = 0.15)` — a single fading beep.
- **Paths must stay relative** (`shared/kit.js`, no leading `/`) — the site lives under `/KidGames/` on Pages.
- **Cache-busting:** Pages caches files for 10 minutes, so every page references `?v=N`. After changing anything in `shared/`, run `npm run bump-kit` to bump `N` everywhere. Tests fail if versions disagree.

## Adding a new game

1. Create a new `.html` file for the game (e.g. `mygame.html`). Start from `matching.html`: keep the `<link rel="stylesheet" href="shared/kit.css?v=N">` before `<style>`, and `<script src="shared/kit.js?v=N"></script>` right before the game's own `<script>`. Everything else is inline in the file. No other external files or CDNs.
2. Follow the UI patterns below, using the kit's classes and `Kit.*` helpers rather than copying them.
3. Add the game to `index.html` — copy an existing `<a class="game-card">` block, update the `href`, colors (`--c1`/`--c2`), icon, name, and description.
4. Run `npm test`. New games are picked up automatically by the convention and smoke tests; add rule tests to `tests/logic.spec.js` if the game has logic worth checking.

## Tests

Playwright, on iPhone WebKit (what iPhone Chrome actually uses) and Chromium — `npm install` once, `npx playwright install chromium webkit`, then `npm test`. CI runs them on every push (`.github/workflows/test.yml`).

- `tests/conventions.spec.js` — static checks for the rules in this file (kit loaded with the current `?v=`, nothing external, no copies of kit code), plus `index.html` link integrity.
- `tests/kit.spec.js` — the shared kit itself.
- `tests/smoke.spec.js` — loads every game linked from `index.html`, taps/drags, fails on any JS error.
- `tests/logic.spec.js` — game rules, tested by calling each page's top-level functions via `page.evaluate`. Don't rename those functions/variables without updating the tests.

## UI patterns (from matching.html)

- **Background:** dark purple animated gradient (`bgShift` keyframe, from the kit), with a twinkling star field (an empty `<div id="stars"></div>` — the kit fills it).
- **Layout:** centered `.game` column, `max-width: 420px`, `gap: 12px`, `z-index: 1` above stars.
- **Top bar:** `.top-bar` flex row with a `← Games` back link (`.back-btn`) linking to `index.html`, a centered `<h1>`, and a `.top-spacer` to balance it.
- **Stat/score cards:** `.player-card` or `.stat-card` — `rgba(255,255,255,0.08)` background, `backdrop-filter: blur(12px)`, `border-radius: 20px`, gold (`#ffd700`) value text.
- **Status bar:** full-width pill (`border-radius: 50px`) with `rgba(255,255,255,0.1)` background for turn/level indicators.
- **Buttons:** 
  - Secondary: `rgba(255,255,255,0.12)` background, white border, `border-radius: 50px` (`.new-game-btn` style).
  - Primary / play-again: gold-to-orange gradient, dark text, `border-radius: 50px` (`.play-again-btn` style).
- **Game over overlay:** `.overlay` fixed full-screen blur (`rgba(5,0,20,0.80)`), containing a `.result-card` with gradient dark background, gold border, result emoji, title, scores, message, and a Play Again button. Show by adding `.show` class.
- **Confetti:** `<div class="confetti-wrap" id="confetti"></div>`; call `Kit.confetti()` on a win.
- **Fonts:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Rounded, sans-serif`; white text throughout.
- **Touch:** `user-scalable=no` viewport, `-webkit-tap-highlight-color: transparent`, `touch-action: none` on interactive elements.

## File structure

```
index.html          — game picker / home screen
shared/kit.css      — shared styles (see "Shared kit")
shared/kit.js       — shared helpers (see "Shared kit")
scripts/bump-kit.js — `npm run bump-kit`: bump the kit's ?v= cache-buster everywhere
matching.html       — Emoji Match (2-player memory game)
tictactoe_v2.html   — Tic-Tac-Toe (Unicorn vs Dragon)
simon.html          — Simon Says
music.html          — Music Bars
balloons.html       — Pop Balloons
dots.html           — Dot Art (connect the dots)
letters.html        — First Letter (emoji alphabet game)
puzzle.html         — Unicorn Puzzle (3×3 sliding tile puzzle)
counting.html       — Count It! (count the emojis, pick the number 1–10)
addition.html       — Add It Up! (addition, sums up to 10)
pong.html           — Pong! (2-player, top/bottom paddles, landscape recommended)
mole.html           — Whack-a-Mole (tap moles before they hide, 60-second timer)
fishing.html        — Fishing! (drag hook to catch fish, 60-second timer, 8 fish types)
shapes.html         — Shape Sorter (drag shapes to matching outlines, snaps on drop, for toddlers)
emojifun.html       — Emoji Fun (drag finger to spawn animal emoji trails, for toddlers)
stickers.html       — Sticker Scene (drag emoji stickers onto beach/space/meadow/forest scenes)
colormatch.html     — Color Match! (tap the circle matching a colored shape, 8 colors, 6 shapes)
paint.html          — Paint! (finger painting canvas, 18 colors, 3 brush sizes, rainbow brush, undo)
soccer.html         — Tap to Shoot! (tap to kick at goal, goalie dives, GOAL! celebration + confetti)
hideseek.html       — Hide & Seek Bear! (bear hides in scene, tap spots to find, wrong spots reveal funny animals)
plinko.html         — Plinko! (drop marble through rainbow pegs, bouncy cups, physics sounds, JACKPOT celebration)
puppy.html          — Wash the Puppy! (drag sponge to scrub mud off SVG puppy, bubbles, water spray, tail wag on win)
feed-the-dragon-sparkles.html — Feed the Dragon! (2-player dice game, roll and feed candies to the dragon, triggers ACHOO sneeze at 20 candies)
rainbow-archery.html       — Rainbow Archery! (drag to aim and shoot arrows at a moving target, 5 arrows per round, confetti on hit)
candy-rescue.html         — Candy Rescue! (Space Invaders-style, shoot candy 🍬 at 4×3 animal grid, waves auto-advance, score tracked)
rainbow-brick-burst.html  — Rainbow Brick Burst! (Breakout/Arkanoid-style, 🪄 wand paddle, sparkle ball, 8×5 pastel brick grid, no fail state — ball respawns, score/level carry over)
connect-four.html, road-racer.html, whack-a-mole.html — older games, not linked from index.html
tests/              — Playwright tests
CLAUDE.md           — this file
```
