// Alpha Workshop first-playable starter
// One empty moon-gray screen. The alien in a UFO begins in the center and can move with WASD or arrow keys.
// Add your team's world, story, obstacles, and interactions here.

(() => {
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  canvas.setAttribute("aria-label", "An alien riding in a UFO on a moon-gray background");
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
      hero.x = Math.min(Math.max(hero.x, 32), width - 32);
      hero.y = Math.min(Math.max(hero.y, 42), height - 28);
    }
    draw();
  }

  function drawHero() {
    // An alien pilot inside a glass-domed flying saucer.
    ctx.save();
    ctx.translate(hero.x, hero.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Hovering shadow.
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 23, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glass cockpit.
    ctx.fillStyle = "#b9eff5";
    ctx.strokeStyle = "#417b97";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -10, 21, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Alien shoulders and head.
    ctx.fillStyle = "#70d94a";
    ctx.beginPath();
    ctx.ellipse(0, -3, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -18, 12, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Big dark eyes and a small smile.
    ctx.fillStyle = "#172634";
    ctx.beginPath();
    ctx.ellipse(-5, -20, 3.5, 5, -.35, 0, Math.PI * 2);
    ctx.ellipse(5, -20, 3.5, 5, .35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#285a24";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -13, 3, .2, Math.PI - .2);
    ctx.stroke();

    // Cockpit shine.
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, -19);
    ctx.quadraticCurveTo(-16, -26, -10, -28);
    ctx.stroke();

    // Silver saucer and its raised rim.
    ctx.fillStyle = "#72899e";
    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 7, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#cbd9e5";
    ctx.beginPath();
    ctx.ellipse(0, 1, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Saucer lights.
    ctx.fillStyle = "#ffe36b";
    for (const x of [-19, 0, 19]) {
      ctx.beginPath();
      ctx.ellipse(x, x === 0 ? 7 : 4, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = "#a0a0a0";
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
    hero.x = Math.min(Math.max(hero.x + dx * hero.speed * dt, 32), width - 32);
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
