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
  const panels = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, exits: {}, objects: [], solids: [], roads: [] }));
  // Connections traced from the Guide's revised paper map.
  // Panels 2 and 3 have NO roads. Panel 1 exits SOUTH into 6.
  const connections = [
    [1,6],[6,11],[11,12],[12,7],[7,8],[8,13],[13,18],
    [18,17],[17,16],[16,21],[21,22],[22,23],[23,24],
    [24,19],[19,14],[14,9],[9,4],[4,5],[5,10],
    [10,15],[15,20],[20,25]
  ];
  // Rough roads traced from the Guide's second map (not final-art collision).
  // Edge positions are shared by both neighboring panels so transitions align.
  const ROAD_WIDTH = 420;
  const edgePosition = {
    "1-6":.50,"6-11":.24,"11-12":.78,"12-7":.32,
    "7-8":.62,"8-13":.48,"13-18":.56,"18-17":.36,
    "17-16":.72,"16-21":.35,"21-22":.72,"22-23":.54,
    "23-24":.52,"24-19":.42,"19-14":.31,"14-9":.34,
    "9-4":.28,"4-5":.55,"5-10":.85,"10-15":.69,
    "15-20":.68,"20-25":.58
  };
  const reverseDirection = {east:"west",west:"east",north:"south",south:"north"};
  const edgePoint = (direction, fraction) => ({
    east:[WORLD_W, WORLD_H*fraction], west:[0,WORLD_H*fraction],
    north:[WORLD_W*fraction,0], south:[WORLD_W*fraction,WORLD_H]
  })[direction];
  for (const [a,b] of connections) {
    const diff=b-a;
    const direction=diff===1?"east":diff===-1?"west":diff===5?"south":diff===-5?"north":null;
    if (!direction || (Math.abs(diff)===1 && Math.floor((a-1)/5)!==Math.floor((b-1)/5)))
      throw Error("Invalid Team 3 panel connection: "+a+" / "+b);
    const reverse=reverseDirection[direction];
    const fraction=edgePosition[a+"-"+b] ?? edgePosition[b+"-"+a];
    panels[a-1].exits[direction]={panel:b, fraction};
    panels[b-1].exits[reverse]={panel:a, fraction};
  }
  // Curved centerline control points in panel-local proportions. Every endpoint
  // is taken from the shared exit definition; no extra connections are created.
  const bends = {
    1:[[.31,.19],[.44,.26],[.59,.40],[.58,.56],[.43,.74],[.24,.88]],
    6:[[.50,.20],[.42,.43],[.34,.67],[.24,.85]],
    7:[[.30,.55],[.52,.37]],
    8:[[.31,.40],[.50,.55]],
    9:[[.28,.25],[.36,.65]],
    10:[[.69,.30],[.68,.62]],
    11:[[.24,.43],[.43,.65],[.62,.66]],
    12:[[.25,.58],[.35,.38]],
    13:[[.48,.27],[.48,.54],[.56,.76]],
    14:[[.34,.35],[.43,.65]],
    15:[[.69,.35],[.68,.65]],
    16:[[.35,.28],[.48,.45],[.65,.48]],
    17:[[.38,.48],[.58,.46]],
    18:[[.56,.35],[.48,.55],[.36,.58]],
    19:[[.34,.26],[.31,.55]],
    20:[[.68,.28],[.58,.70]],
    21:[[.35,.45],[.55,.68]],
    22:[[.30,.55],[.54,.54]],
    23:[[.30,.52],[.52,.51]],
    24:[[.35,.52],[.42,.38]],
    25:[[.58,.30],[.53,.58],[.60,.76]]
  };
  function buildRoads(panel) {
    const ports=Object.entries(panel.exits).map(([direction,exit])=>edgePoint(direction,exit.fraction));
    if (!ports.length) return [];
    const points=(bends[panel.id]||[[.5,.5]]).map(p=>[p[0]*WORLD_W,p[1]*WORLD_H]);
    // Connect each entrance to the shared curved interior route.
    // Multiple exits share the same walkable region at junctions.
    const lines=[];
    for (const port of ports) {
      const nearest=points.reduce((best,p,i)=>Math.hypot(p[0]-port[0],p[1]-port[1])<Math.hypot(points[best][0]-port[0],points[best][1]-port[1])?i:best,0);
      const route=port[0]===0||port[1]===0?[port,...points.slice(nearest)]:[...points.slice(0,nearest+1),port];
      for(let i=1;i<route.length;i++) lines.push([route[i-1],route[i]]);
    }
    // Connect the entire interior spine, including when ports join at different points.
    for(let i=1;i<points.length;i++) lines.push([points[i-1],points[i]]);
    return lines;
  }
  for (const panel of panels) panel.roads=buildRoads(panel);
  function onRoad(x,y,panel=currentPanel()) {
    const clearance=ROAD_WIDTH/2-24;
    return panel.roads.some(([a,b])=>{
      const vx=b[0]-a[0],vy=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy)));
      return Math.hypot(x-a[0]-t*vx,y-a[1]-t*vy)<=clearance;
    });
  }
  let lastTime = performance.now();
  let activeObject = null;
  let grassPattern = null;

  function resize() {
    // Keep the world at its native resolution even in smaller embeds.
    // Previously the canvas was rasterized at viewport size and then stretched.
    const scale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(WORLD_W * scale);
    canvas.height = Math.round(WORLD_H * scale);
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
  function isSolid(x,y) {
    const radius = 24;
    if (x < radius || x > WORLD_W-radius || y < radius || y > WORLD_H-radius) return true;
    if (!onRoad(x,y)) return true;
    return currentPanel().solids.some(s => x+radius>s.x && x-radius<s.x+s.w && y+radius>s.y && y-radius<s.y+s.h);
  }
  function transition(direction, along) {
    const exit = currentPanel().exits[direction];
    if (!exit || Math.abs(along - (direction === "east" || direction === "west" ? WORLD_H*exit.fraction : WORLD_W*exit.fraction)) > ROAD_WIDTH/2-24) return false;
    const old = gameState.panel, ox=hero.x, oy=hero.y;
    gameState.panel=exit.panel;
    if (direction==="east") {hero.x=32;hero.y=along;}
    if (direction==="west") {hero.x=WORLD_W-32;hero.y=along;}
    if (direction==="north") {hero.x=along;hero.y=WORLD_H-32;}
    if (direction==="south") {hero.x=along;hero.y=32;}
    if (isSolid(hero.x,hero.y)) {gameState.panel=old;hero.x=ox;hero.y=oy;return false;}
    return true;
  }
  function move(dx,dy) {
    const nx=hero.x+dx, ny=hero.y+dy;
    if (nx > WORLD_W-24 && transition("east",hero.y)) return;
    if (nx < 24 && transition("west",hero.y)) return;
    if (ny > WORLD_H-24 && transition("south",hero.x)) return;
    if (ny < 24 && transition("north",hero.x)) return;
    // A screen may begin with a one-way-looking corridor; both movement axes
    // remain available, and the road itself (not the sprite art) sets collision.
    if (!isSolid(nx,hero.y)) hero.x=nx;
    if (!isSolid(hero.x,ny)) hero.y=ny;
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
    // A sandy, walkable corridor. The grass outside the road is impassable.
    ctx.lineCap="round";ctx.lineJoin="round";
    for (const [a,b] of currentPanel().roads) {
      ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);
      ctx.strokeStyle="#ad8b5e";ctx.lineWidth=ROAD_WIDTH+16;ctx.stroke();
      ctx.strokeStyle="#dfc394";ctx.lineWidth=ROAD_WIDTH;ctx.stroke();
    }
    // Temporary Bunny Knight home marker. Final panel art will replace this.
    if (gameState.panel === 1) {
      ctx.save();
      ctx.translate(320, 135);
      ctx.fillStyle="#8d6546"; ctx.fillRect(-83,-18,166,116);
      ctx.fillStyle="#f1d7a3"; ctx.fillRect(-72,-9,144,96);
      ctx.fillStyle="#a74f3d";
      ctx.beginPath(); ctx.moveTo(-103,-18);ctx.lineTo(0,-106);ctx.lineTo(103,-18);ctx.closePath();ctx.fill();
      ctx.strokeStyle="#6b3f30";ctx.lineWidth=7;ctx.stroke();
      ctx.fillStyle="#72513c";ctx.fillRect(-22,35,44,52);
      ctx.fillStyle="#d8eddb";ctx.fillRect(-58,13,28,27);ctx.fillRect(30,13,28,27);
      ctx.restore();
    }
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
  // Guide-only teleport menu: choose any screen without changing quest or inventory.
  // The embedded page may cache an older index.html. Build the debug controls
  // from the game script itself when the HTML has not updated yet.
  if (!document.querySelector("#debug-toggle")) {
    const style = document.createElement("style");
    style.textContent = ".debug{position:absolute;right:14px;bottom:14px;z-index:10;font:800 12px system-ui;color:#31483c}.debug-toggle,.debug-go{border:2px solid #e7d7ad;background:#fff9eb;color:#28704f;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer}.debug-panel{position:absolute;bottom:42px;right:0;width:215px;padding:12px;border:2px solid #e7d7ad;border-radius:13px;background:#fff9eb;box-shadow:0 8px 24px #18352566}.debug-panel[hidden]{display:none}.debug-panel label{display:block;margin-bottom:6px}.debug-panel select{width:100%;padding:7px;margin-bottom:9px;border:1px solid #bca979;border-radius:8px;background:white}.debug-panel .debug-go{width:100%;background:#3d9b68;color:white}.debug-commit{display:block;margin-top:9px;font-size:11px;overflow-wrap:anywhere}.controls{left:14px!important}";
    document.head.appendChild(style);
    const wrapper = document.createElement("div");
    wrapper.className = "debug";
    wrapper.innerHTML = '<button id="debug-toggle" class="debug-toggle" type="button" aria-expanded="false">DEBUG</button><div id="debug-panel" class="debug-panel" hidden><label for="debug-select">Panel</label><select id="debug-select"></select><button id="debug-go" class="debug-go" type="button">GO</button><span id="debug-commit" class="debug-commit">Commit: Checking…</span></div>';
    document.querySelector("#game").appendChild(wrapper);
  }
  const debugToggle = document.querySelector("#debug-toggle");
  const debugPanel = document.querySelector("#debug-panel");
  const debugSelect = document.querySelector("#debug-select");
  const debugCommit = document.querySelector("#debug-commit");
  for (let i = 1; i <= 25; i++) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = "Panel " + String(i).padStart(2, "0");
    debugSelect.appendChild(option);
  }
  debugSelect.value = String(gameState.panel);
  debugToggle.addEventListener("click", () => {
    debugPanel.hidden = !debugPanel.hidden;
    debugToggle.setAttribute("aria-expanded", String(!debugPanel.hidden));
    debugSelect.value = String(gameState.panel);
  });
  document.querySelector("#debug-go").addEventListener("click", () => {
    const target = Number(debugSelect.value);
    if (!Number.isInteger(target) || target < 1 || target > 25) return;
    gameState.panel = target;
    const safe = currentPanel().roads[0]?.[0] || [WORLD_W / 2, WORLD_H / 2];
    hero.x = safe[0] === 0 ? 32 : safe[0] === WORLD_W ? WORLD_W-32 : safe[0];
    hero.y = safe[1] === 0 ? 32 : safe[1] === WORLD_H ? WORLD_H-32 : safe[1];
    keys.clear();
    closePopup();
    debugPanel.hidden = true;
    debugToggle.setAttribute("aria-expanded", "false");
    draw();
  });
  // Show the actual latest Team 3 source commit rather than a stale hardcoded number.
  // GitHub's public API is used only to read the commit; gameplay works if unavailable.
  fetch("https://api.github.com/repos/clarkwyatt/prototypes/commits?path=alpha-team-3-first-playable%2Fgame.js&per_page=1", {cache:"no-store"})
    .then(response => { if (!response.ok) throw Error("Commit lookup unavailable"); return response.json(); })
    .then(commits => {
      const sha = commits[0]?.sha;
      debugCommit.textContent = sha ? "Commit: " + sha.slice(0, 7) : "Commit: Unavailable";
    })
    .catch(() => { debugCommit.textContent = "Commit: Unavailable"; });
  window.addEventListener("resize", resize);
  refreshUI();
  resize();
  requestAnimationFrame(update);
})();
