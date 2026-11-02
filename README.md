# Snake

A neon-grid snake game. No build step, no dependencies — plain HTML, CSS and JS.

## Files

```
SnakeG/
├── index.html    # markup + HUD + overlay
├── styles.css    # styling (dark neon theme, responsive, touch controls)
├── game.js       # game logic, rendering and input
└── .claude/
    └── launch.json  # dev-server config for the Claude Code browser pane
```

## Run it

The game is pure static files, so any static server works.

**Python (already installed on this machine):**

```bash
cd /Users/mac/Desktop/SnakeG
python3 -m http.server 8123
```

Then open <http://localhost:8123> in your browser.

**Or Node, if you have it:**

```bash
cd /Users/mac/Desktop/SnakeG
npx serve -l 8123 .
```

**Or just open the file directly** — double-click `index.html`, or:

```bash
open /Users/mac/Desktop/SnakeG/index.html
```

`file://` works too: there is no `fetch`, no modules and no CORS-sensitive loading, so the
page runs without a server. A server is only nicer because you get reload-on-save.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / `W` `A` `S` `D` | Steer |
| `Space` | Pause / resume, and start a new game |
| On-screen pad / swipe | Steer on touch devices |

## Rules

- Eat the pink fruit: **+10 points**, and the snake grows by one segment.
- The grid wraps around the edges — there are no walls to hit.
- Running into your own body ends the game.
- Every **5 fruits** raises the level and speeds the snake up (8 → 22 ticks/sec).
- Filling the whole board is a perfect run and wins.
- Your best score is kept in `localStorage`.

## Config

Tunables live at the top of `game.js`:

```js
const CELL = 30;            // board cells per axis
const START_SPEED = 8;      // ticks per second at level 1
const SPEED_STEP = 0.45;    // ticks/sec added per level
const MAX_SPEED = 22;
const SPEEDUP_AT = 5;       // fruits eaten per level
```

The canvas is `CELL * CELL` pixels and scales to fit the page with CSS, so the game
looks the same at any window size.

## Running it in the Claude Code browser pane

`.claude/launch.json` already points at the Python server on port 8123, so the
`snake` entry is ready to use. Start it from the app's browser/preview controls, or
run the server yourself in a terminal and point the browser pane at
<http://localhost:8123>.
