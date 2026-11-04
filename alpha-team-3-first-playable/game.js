// Alpha Workshop first-playable starter
// One empty red screen. The hero begins in the center and can move with WASD or arrow keys.
// Add your team's world, story, obstacles, and interactions here.

(() => {
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const hero = { x: 0, y: 0, speed: 220 };
  const heroWidth = 120;
  const heroHeight = 120;
  const heroImage = new Image();
  heroImage.src = new URL("bunny-knight.svg", document.currentScript.src).href;
  heroImage.addEventListener("load", draw);
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
      hero.x = Math.min(Math.max(hero.x, heroWidth / 2), Math.max(heroWidth / 2, width - heroWidth / 2));
      hero.y = Math.min(Math.max(hero.y, heroHeight / 2), Math.max(heroHeight / 2, height - heroHeight / 2));
    }
    draw();
  }

  function drawHero() {
    if (!heroImage.complete || !heroImage.naturalWidth) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const drawWidth = heroHeight * heroImage.naturalWidth / heroImage.naturalHeight;
    ctx.drawImage(heroImage, hero.x - drawWidth / 2, hero.y - heroHeight / 2,
      drawWidth, heroHeight);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = "#ff0000";
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
    hero.x = Math.min(Math.max(hero.x + dx * hero.speed * dt, heroWidth / 2), Math.max(heroWidth / 2, width - heroWidth / 2));
    hero.y = Math.min(Math.max(hero.y + dy * hero.speed * dt, heroHeight / 2), Math.max(heroHeight / 2, height - heroHeight / 2));
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
