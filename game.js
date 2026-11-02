const CELL = 30;            // board cells per axis
const SIZE = CELL * CELL;  // canvas pixel size
const START_SPEED = 8;      // ticks per second at level 1
const SPEED_STEP = 0.45;    // ticks/sec added per level
const MAX_SPEED = 22;
const SPEEDUP_AT = 5;       // fruits eaten per level

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const lengthEl = document.getElementById('length');
const overlay = document.getElementById('overlay');
const overlayEyebrow = document.getElementById('overlayEyebrow');
const overlayTitle = document.getElementById('overlayTitle');
const overlayBody = document.getElementById('overlayBody');
const playBtn = document.getElementById('playBtn');
const touchpad = document.getElementById('touchpad');

const STORAGE_KEY = 'snake.best';

const DIRS = {
  up:    { x: 0,  y: -1 },
  down:  { x: 0,  y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1,  y: 0 },
};

const state = {
  snake: [],
  dir: DIRS.right,
  queued: [],
  food: { x: 0, y: 0 },
  score: 0,
  best: Number(localStorage.getItem(STORAGE_KEY) || 0),
  level: 1,
  running: false,
  paused: false,
  over: false,
  tick: 0,
  acc: 0,
  last: 0,
  deadCells: [],
  deathAt: 0,
};

canvas.width = SIZE;
canvas.height = SIZE;

// ---------------------------------------------------------------- helpers

function cellToPx(c) {
  return c * CELL;
}

function wrap(v) {
  return (v + CELL) % CELL;
}

function randomFreeCell() {
  const free = [];
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const taken = state.snake.some((s) => s.x === x && s.y === y);
      if (!taken) free.push({ x, y });
    }
  }
  if (!free.length) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function speed() {
  return Math.min(MAX_SPEED, START_SPEED + (state.level - 1) * SPEED_STEP);
}

// ---------------------------------------------------------------- game flow

function reset() {
  const midY = Math.floor(CELL / 2);
  state.snake = [
    { x: 5, y: midY },
    { x: 4, y: midY },
    { x: 3, y: midY },
  ];
  state.dir = DIRS.right;
  state.queued = [];
  state.score = 0;
  state.level = 1;
  state.over = false;
  state.paused = false;
  state.deadCells = [];
  state.deathAt = 0;
  state.food = randomFreeCell() || { x: 0, y: 0 };
  syncHud();
  draw();
}

function start() {
  reset();
  state.running = true;
  state.last = performance.now();
  state.acc = 0;
  hideOverlay();
  requestAnimationFrame(loop);
}

function endGame() {
  state.running = false;
  state.over = true;
  state.deathAt = performance.now();
  state.deadCells = state.snake.slice();
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.best));
  }
  syncHud();
  showOverlay({
    eyebrow: 'Game over',
    title: `Score ${state.score}`,
    body: state.score >= state.best && state.score > 0
      ? 'New personal best. Press space or click to run it back.'
      : 'Press space or click to try again.',
    button: 'Play again',
  });
}

function togglePause() {
  if (!state.running || state.over) return;
  state.paused = !state.paused;
  if (state.paused) {
    showOverlay({
      eyebrow: 'Paused',
      title: 'Take your time',
      body: 'Press space to resume.',
      button: 'Resume',
    });
  } else {
    hideOverlay();
    state.last = performance.now();
    state.acc = 0;
  }
}

// ---------------------------------------------------------------- movement

function step() {
  // Apply at most one queued turn per tick, so fast double-taps don't self-cross.
  if (state.queued.length) {
    const next = state.queued.shift();
    const opposite = { x: -state.dir.x, y: -state.dir.y };
    if (!(next.x === opposite.x && next.y === opposite.y)) {
      state.dir = next;
    }
  }

  const head = state.snake[0];
  const nx = wrap(head.x + state.dir.x);
  const ny = wrap(head.y + state.dir.y);

  // Hitting a wall is fatal; hitting yourself is fatal. Tail cell is free.
  const body = state.snake.slice(0, -1);
  if (body.some((s) => s.x === nx && s.y === ny)) {
    state.snake.unshift({ x: nx, y: ny });
    endGame();
    return;
  }

  state.snake.unshift({ x: nx, y: ny });

  if (state.food && nx === state.food.x && ny === state.food.y) {
    state.score += 10;
    state.food = randomFreeCell();
    if (state.score / 10 % SPEEDUP_AT === 0) state.level++;
    if (!state.food) {
      // Board is full — you win.
      state.running = false;
      state.over = true;
      if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem(STORAGE_KEY, String(state.best));
      }
      syncHud();
      showOverlay({
        eyebrow: 'Perfect run',
        title: 'Board cleared!',
        body: `You filled the grid. Final score ${state.score}.`,
        button: 'Play again',
      });
      return;
    }
  } else {
    state.snake.pop();
  }

  syncHud();
}

function syncHud() {
  scoreEl.textContent = state.score;
  bestEl.textContent = state.best;
  lengthEl.textContent = state.snake.length;
}

// ---------------------------------------------------------------- loop

function loop(now) {
  if (!state.running) {
    draw();
    return;
  }

  const dt = Math.min(0.25, (now - state.last) / 1000);
  state.last = now;

  if (!state.paused) {
    state.acc += dt;
    const interval = 1 / speed();
    while (state.acc >= interval) {
      state.acc -= interval;
      step();
      if (!state.running) break;
    }
  }

  draw();
  if (state.running) requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- rendering

function draw() {
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawGrid();
  drawFood();
  drawSnake();
}

function drawGrid() {
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < CELL; i++) {
    const p = i * CELL + 0.5;
    ctx.moveTo(p, 0); ctx.lineTo(p, SIZE);
    ctx.moveTo(0, p); ctx.lineTo(SIZE, p);
  }
  ctx.stroke();
}

function drawFood() {
  if (!state.food) return;
  const cx = cellToPx(state.food.x) + CELL / 2;
  const cy = cellToPx(state.food.y) + CELL / 2;
  const pulse = 1 + Math.sin(performance.now() / 260) * 0.09;

  const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, CELL * 0.85);
  glow.addColorStop(0, 'rgba(251, 113, 133, 0.45)');
  glow.addColorStop(1, 'rgba(251, 113, 133, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - CELL, cy - CELL, CELL * 2, CELL * 2);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.arc(0, 0, CELL * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSnake() {
  for (let i = state.snake.length - 1; i >= 0; i--) {
    const seg = state.snake[i];
    const t = 1 - i / Math.max(1, state.snake.length);
    const pad = 2;
    const x = cellToPx(seg.x) + pad;
    const y = cellToPx(seg.y) + pad;
    const w = CELL - pad * 2;

    const hue = 160 - t * 40;
    const light = 44 + t * 16;
    ctx.fillStyle = `hsl(${hue}, 72%, ${light}%)`;
    ctx.beginPath();
    ctx.roundRect(x, y, w, w, 7);
    ctx.fill();

    if (i === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Eyes on the head, oriented to the direction of travel.
  const head = state.snake[0];
  if (!head) return;
  const hx = cellToPx(head.x);
  const hy = cellToPx(head.y);
  const perp = { x: -state.dir.y, y: state.dir.x };
  const forward = { x: state.dir.x * 5, y: state.dir.y * 5 };
  const side = { x: perp.x * 5, y: perp.y * 5 };
  const base = { x: hx + CELL / 2, y: hy + CELL / 2 };

  ctx.fillStyle = '#04140d';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(
      base.x + forward.x + side.x * s,
      base.y + forward.y + side.y * s,
      2.6,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

// ---------------------------------------------------------------- input

function requestDir(name) {
  const dir = DIRS[name];
  if (!dir) return;
  if (state.over) {
    start();
    return;
  }
  if (!state.running) {
    start();
    return;
  }
  if (state.paused) {
    togglePause();
    return;
  }
  const last = state.queued.length ? state.queued[state.queued.length - 1] : state.dir;
  if (dir.x === last.x && dir.y === last.y) return;
  if (state.queued.length < 2) state.queued.push(dir);
}

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', a: 'left', s: 'down', d: 'right',
  W: 'up', A: 'left', S: 'down', D: 'right',
};

window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (state.over) start();
    else togglePause();
    return;
  }
  const dir = KEYMAP[e.key];
  if (dir) {
    e.preventDefault();
    requestDir(dir);
  }
});

playBtn.addEventListener('click', () => {
  if (state.over || !state.running) start();
  else togglePause();
});

touchpad.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dir]');
  if (btn) requestDir(btn.dataset.dir);
});

// Swipe support on the canvas.
let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) requestDir(dx > 0 ? 'right' : 'left');
  else requestDir(dy > 0 ? 'down' : 'up');
}, { passive: true });

// ---------------------------------------------------------------- overlay

function showOverlay({ eyebrow, title, body, button }) {
  overlayEyebrow.textContent = eyebrow;
  overlayTitle.textContent = title;
  overlayBody.innerHTML = body;
  playBtn.textContent = button;
  overlay.dataset.visible = 'true';
}

function hideOverlay() {
  overlay.dataset.visible = 'false';
}

// ---------------------------------------------------------------- boot

bestEl.textContent = state.best;
reset();

// Keep the food pulse animating while idle.
(function idleLoop(now) {
  if (!state.running) draw();
  requestAnimationFrame(idleLoop);
})(performance.now());
