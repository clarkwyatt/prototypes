// Alpha Workshop first-playable starter
// One empty gray screen. The hero begins in the center and can move with WASD or arrow keys.
// Add your team's world, story, obstacles, and interactions here.

(() => {
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const hero = { x: 0, y: 0, speed: 220 };
  let width = 0;
  let height = 0;
  let lastTime = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (hero.x === 0 && hero.y === 0) {
      hero.x = width / 2;
      hero.y = height / 2;
    } else {
      hero.x = Math.min(Math.max(hero.x, 28), width - 28);
      hero.y = Math.min(Math.max(hero.y, 42), height - 28);
    }
    draw();
  }

  function drawHero() {
    // Simple friendly placeholder hero, drawn directly in the game file.
    ctx.save();
    ctx.translate(hero.x, hero.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.ellipse(0, 25, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs and shoes
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-6, 7); ctx.lineTo(-8, 19);
    ctx.moveTo(6, 7); ctx.lineTo(8, 19);
    ctx.stroke();
    ctx.strokeStyle = "#252525";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-9, 20); ctx.lineTo(-3, 20);
    ctx.moveTo(5, 20); ctx.lineTo(11, 20);
    ctx.stroke();

    // Shorts
    ctx.fillStyle = "#386a9b";
    ctx.beginPath();
    ctx.roundRect(-11, 2, 22, 11, 4);
    ctx.fill();

    // Arms
    ctx.strokeStyle = "#efbd91";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(-15, 2);
    ctx.moveTo(10, -10); ctx.lineTo(15, 2);
    ctx.stroke();

    // T-shirt
    ctx.fillStyle = "#5b9a68";
    ctx.beginPath();
    ctx.roundRect(-12, -16, 24, 22, 6);
    ctx.fill();

    // Neck and head
    ctx.fillStyle = "#efbd91";
    ctx.fillRect(-4, -20, 8, 7);
    ctx.beginPath();
    ctx.arc(0, -27, 11, 0, Math.PI * 2);
    ctx.fill();

    // Hair and face
    ctx.fillStyle = "#49372e";
    ctx.beginPath();
    ctx.arc(0, -30, 11, Math.PI, Math.PI * 2);
    ctx.lineTo(10, -27); ctx.quadraticCurveTo(0, -34, -10, -27);
    ctx.fill();
    ctx.fillStyle = "#27342f";
    ctx.beginPath();
    ctx.arc(-4, -27, 1.1, 0, Math.PI * 2);
    ctx.arc(4, -27, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9b5947";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -24, 3.5, .2, Math.PI - .2);
    ctx.stroke();

    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, width, height);
    drawHero();
  }

  function update(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.04);
    lastTime = now;
    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) dx--;
    if (keys.has("ArrowRight") || keys.has("d")) dx++;
    if (keys.has("ArrowUp") || keys.has("w")) dy--;
    if (keys.has("ArrowDown") || keys.has("s")) dy++;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    hero.x = Math.min(Math.max(hero.x + dx * hero.speed * dt, 22), width - 22);
    hero.y = Math.min(Math.max(hero.y + dy * hero.speed * dt, 40), height - 22);
    draw();
    requestAnimationFrame(update);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.add(key);
    if (key.startsWith("Arrow")) event.preventDefault();
  });
  window.addEventListener("keyup", event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  });
  window.addEventListener("blur", () => keys.clear());

  resize();
  requestAnimationFrame(update);
})();
