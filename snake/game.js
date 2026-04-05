(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const elScore = document.getElementById("score");
  const elBest = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const btnRestart = document.getElementById("btn-restart");

  const COLS = 20;
  const ROWS = 20;
  const BASE_MS = 130;
  const MIN_MS = 55;
  const STORAGE_KEY = "snake-best";

  let cell = 20;
  let dpr = 1;

  let snake;
  let dir;
  let nextDir;
  let food;
  let score;
  let best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  let running;
  let paused;
  let lastTick;
  let tickInterval;

  function syncSize() {
    const maxCss = Math.min(420, Math.floor(window.innerWidth - 32));
    cell = Math.floor(maxCss / COLS);
    const cssW = cell * COLS;
    const cssH = cell * ROWS;
    dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function spawnFood() {
    let x;
    let y;
    let ok;
    do {
      ok = true;
      x = randInt(COLS);
      y = randInt(ROWS);
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === x && snake[i].y === y) {
          ok = false;
          break;
        }
      }
    } while (!ok);
    food = { x, y };
  }

  function reset() {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { ...dir };
    score = 0;
    running = true;
    paused = false;
    lastTick = 0;
    tickInterval = BASE_MS;
    spawnFood();
    elScore.textContent = "0";
    elBest.textContent = String(best);
    overlay.classList.remove("visible");
  }

  function opposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function setDirection(dx, dy) {
    if (!running) return;
    const cand = { x: dx, y: dy };
    if (opposite(cand, dir)) return;
    nextDir = cand;
    if (paused) paused = false;
  }

  function gameOver() {
    running = false;
    overlayTitle.textContent = "游戏结束";
    overlayMsg.textContent = `得分 ${score} · 空格或按钮重新开始`;
    overlay.classList.add("visible");
    if (score > best) {
      best = score;
      localStorage.setItem(STORAGE_KEY, String(best));
      elBest.textContent = String(best);
    }
  }

  function tick() {
    dir = nextDir;
    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      gameOver();
      return;
    }
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === nx && snake[i].y === ny) {
        gameOver();
        return;
      }
    }

    snake.unshift({ x: nx, y: ny });

    if (nx === food.x && ny === food.y) {
      score += 10;
      elScore.textContent = String(score);
      spawnFood();
      tickInterval = Math.max(MIN_MS, BASE_MS - Math.floor(score / 50) * 8);
    } else {
      snake.pop();
    }
  }

  function drawCell(x, y, color, glow) {
    const pad = 1;
    const w = cell - pad * 2;
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
    }
    ctx.beginPath();
    ctx.roundRect(x * cell + pad, y * cell + pad, w, w, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const w = COLS * cell;
    const h = ROWS * cell;
    ctx.fillStyle = "#0d131c";
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.02)";
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }

    drawCell(food.x, food.y, "#f472b6", true);

    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const isHead = i === 0;
      drawCell(seg.x, seg.y, isHead ? "#2dd4bf" : "#5eead4", isHead);
    }

    if (paused && running) {
      ctx.fillStyle = "rgba(12, 17, 24, 0.55)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#e8edf4";
      ctx.font = `600 ${Math.max(14, cell * 0.9)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("暂停", w / 2, h / 2);
    }
  }

  function loop(t) {
    requestAnimationFrame(loop);
    if (!running && !paused) {
      draw();
      return;
    }
    if (paused) {
      draw();
      return;
    }
    if (lastTick === 0) lastTick = t;
    if (t - lastTick >= tickInterval) {
      lastTick = t;
      tick();
    }
    draw();
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!running) {
        reset();
        return;
      }
      paused = !paused;
      return;
    }
    const map = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      KeyW: [0, -1],
      KeyS: [0, 1],
      KeyA: [-1, 0],
      KeyD: [1, 0],
    };
    const m = map[e.code];
    if (m) {
      e.preventDefault();
      setDirection(m[0], m[1]);
    }
  });

  document.getElementById("btn-up").addEventListener("click", () => setDirection(0, -1));
  document.getElementById("btn-down").addEventListener("click", () => setDirection(0, 1));
  document.getElementById("btn-left").addEventListener("click", () => setDirection(-1, 0));
  document.getElementById("btn-right").addEventListener("click", () => setDirection(1, 0));

  btnRestart.addEventListener("click", () => reset());

  window.addEventListener("resize", () => {
    syncSize();
    draw();
  });

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      this.closePath();
    };
  }

  elBest.textContent = String(best);
  syncSize();
  reset();
  requestAnimationFrame(loop);
})();
