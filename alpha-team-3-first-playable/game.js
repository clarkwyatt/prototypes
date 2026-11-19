// Team 3 foundation. The level map and gameplay content will be supplied by the students.
(() => {
  const canvas = document.querySelector("#world");
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const hero = { x: 816, y: 480, speed: 235 };
  const heroSize = 120;
  const WORLD_W = 1632, WORLD_H = 960;
  const heroImage = new Image();
  heroImage.src = new URL("bunny-knight.svg", document.currentScript.src).href;
  heroImage.addEventListener("load", draw);
  const questText = document.querySelector("#quest-text");
  const itemsText = document.querySelector("#items");
  const modal = document.querySelector("#modal");
  const modalTitle = document.querySelector("#modal-title");
  const modalCopy = document.querySelector("#modal-copy");
  const modalButtons = document.querySelector("#modal-buttons");
  const gameState = { panel: 1, inventory: [], quest: "", world: {}, encounters: {} };
  const panels = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, exits: {}, objects: [], solids: [] }));
  let lastTime = performance.now();
  let activeObject = null;
  let grassPattern = null;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    draw();
  }
  function makeGrassPattern() {
    const tile = document.createElement("canvas");
    tile.width = 160; tile.height = 160;
    const g = tile.getContext("2d");
    g.fillStyle = "#78b65d";
    g.fillRect(0, 0, 160, 160);
    let seed = 3927;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 75; i++) {
      const x = random() * 160, y = random() * 160;
      g.strokeStyle = i % 3 ? "#6da951" : "#8bc36a";
      g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x - 2, y); g.moveTo(x, y + 4); g.lineTo(x + 2, y - 2); g.stroke();
    }
    grassPattern = ctx.createPattern(tile, "repeat");
  }
  function currentPanel() { return panels[gameState.panel - 1]; }
  function isSolid(x, y) {
    const radius = 24;
    if (x < radius || x > WORLD_W - radius || y < radius || y > WORLD_H - radius) return true;
    return currentPanel().solids.some(s => x + radius > s.x && x - radius < s.x + s.w && y + radius > s.y && y - radius < s.y + s.h);
  }
  function moveToPanel(direction) {
    const exit = currentPanel().exits[direction];
    if (!exit) return false;
    const previousPanel = gameState.panel;
    const previousX = hero.x, previousY = hero.y;
    gameState.panel = exit.panel;
    hero.x = exit.x; hero.y = exit.y;
    if (isSolid(hero.x, hero.y)) {
      gameState.panel = previousPanel; hero.x = previousX; hero.y = previousY;
      return false;
    }
    return true;
  }
  function move(dx, dy) {
    const nx = hero.x + dx, ny = hero.y + dy;
    if (!isSolid(nx, hero.y)) hero.x = nx;
    if (!isSolid(hero.x, ny)) hero.y = ny;
    // Panel exits are intentionally empty until the students' level map is provided.
  }
  function visibleObjects() {
    return currentPanel().objects.filter(o => !o.hidden && (!o.visibleWhen || o.visibleWhen(gameState)));
  }
  function near(o) {
    const ix = o.interactX ?? o.x, iy = o.interactY ?? o.y;
    return Math.hypot(hero.x - ix, hero.y - iy) <= (o.range || 115);
  }
  function hit(o, x, y) {
    const r = o.hitbox;
    return r && x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
  }
  function closePopup() {
    modal.classList.remove("open");
    activeObject = null;
    keys.clear();
  }
  function openPopup(o) {
    activeObject = o;
    modalTitle.textContent = o.name || "";
    modalCopy.textContent = "";
    modalButtons.replaceChildren();
    const actions = (o.actions || []).filter(a => !a.when || a.when(gameState));
    for (const action of actions) {
      const button = document.createElement("button");
      button.textContent = action.label;
      if (action.secondary || action.label === "EXAMINE" || action.label === "TALK") button.classList.add("secondary");
      button.addEventListener("click", () => {
        const result = action.run?.(gameState, o);
        modalCopy.textContent = typeof result === "string" ? result : "";
        refreshUI();
        if (result === null) closePopup();
      });
      modalButtons.appendChild(button);
    }
    modal.classList.add("open");
    keys.clear();
  }
  function refreshUI() {
    questText.textContent = gameState.quest;
    itemsText.textContent = gameState.inventory.length ? gameState.inventory.join(", ") : "Empty";
  }
  canvas.addEventListener("pointerdown", event => {
    if (modal.classList.contains("open")) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * WORLD_W / bounds.width;
    const y = (event.clientY - bounds.top) * WORLD_H / bounds.height;
    const object = visibleObjects().find(o => near(o) && hit(o, x, y));
    if (object) openPopup(object);
  });
  modal.addEventListener("pointerdown", event => { if (event.target === modal) closePopup(); });
  document.querySelector("#modal-close").addEventListener("click", closePopup);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePopup();
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key.startsWith("Arrow")) event.preventDefault();
    if (!modal.classList.contains("open")) keys.add(key);
  });
  document.addEventListener("keyup", event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
  window.addEventListener("blur", () => keys.clear());
  document.querySelectorAll(".touch button").forEach(button => {
    const key = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }[button.dataset.dir];
    button.addEventListener("pointerdown", event => { event.preventDefault(); if (!modal.classList.contains("open")) keys.add(key); button.setPointerCapture(event.pointerId); });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(type, () => keys.delete(key));
  });
  function draw() {
    if (!canvas.width || !canvas.height) return;
    ctx.setTransform(canvas.width / WORLD_W, 0, 0, canvas.height / WORLD_H, 0, 0);
    if (!grassPattern) makeGrassPattern();
    ctx.fillStyle = grassPattern; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    const now = performance.now();
    for (const o of visibleObjects()) {
      if (!near(o) || !o.highlight) continue;
      ctx.save();
      ctx.strokeStyle = "#55f37d";
      ctx.lineWidth = 4 + Math.sin(now / 260) * 1.3;
      ctx.shadowColor = "#3aff65"; ctx.shadowBlur = 14;
      const h = o.highlight;
      if (h.points?.length) {
        ctx.beginPath(); ctx.moveTo(h.points[0][0], h.points[0][1]);
        for (const p of h.points.slice(1)) ctx.lineTo(p[0], p[1]);
        ctx.closePath(); ctx.stroke();
      } else if (h.w && h.h) ctx.strokeRect(h.x, h.y, h.w, h.h);
      ctx.restore();
    }
    if (heroImage.complete && heroImage.naturalWidth) {
      const w = heroSize * heroImage.naturalWidth / heroImage.naturalHeight;
      ctx.drawImage(heroImage, hero.x - w / 2, hero.y - heroSize / 2, w, heroSize);
    }
  }
  function update(now) {
    const dt = Math.min((now - lastTime) / 1000, .04);
    lastTime = now;
    if (!modal.classList.contains("open")) {
      let dx = Number(keys.has("d") || keys.has("ArrowRight")) - Number(keys.has("a") || keys.has("ArrowLeft"));
      let dy = Number(keys.has("s") || keys.has("ArrowDown")) - Number(keys.has("w") || keys.has("ArrowUp"));
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
      move(dx * hero.speed * dt, dy * hero.speed * dt);
    }
    draw();
    requestAnimationFrame(update);
  }
  window.addEventListener("resize", resize);
  refreshUI();
  resize();
  requestAnimationFrame(update);
})();
