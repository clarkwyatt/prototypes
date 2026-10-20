(() => {
  const canvas = document.querySelector('#world');
  const ctx = canvas.getContext('2d');
  const game = document.querySelector('#game');
  const questEl = document.querySelector('#quest');
  const itemsEl = document.querySelector('#items');
  const hintEl = document.querySelector('#hint');
  const modal = document.querySelector('#modal');
  const toastEl = document.querySelector('#toast');
  const W = 1120, H = 720;
  let dpr = 1, toastTimer = 0;
  const keys = {};

  const s = {
    screen: '13', x: 605, y: 335, face: 'left', speed: 215,
    scene: 'outside', interior: '', rodents: 0, mice: [], basementEntered: false,
    returnX: 0, returnY: 0, flowers: 0,
    key: false, gateOpen: false, logGone: false, potion: false,
    thorns: false, strength: false, boulders: false,
    giantHits: 0, giantDown: false, returned: false
  };

  const roomNeighbors = {
    '13': { west: '12', north: '08' },
    '12': { east: '13', west: '11' },
    '11': { east: '12', north: '06', south: '16' },
    '16': { north: '11', south: '21' },
    '21': { north: '16' },
    '06': { south: '11', north: '01' },
    '01': { south: '06', east: '02' },
    '02': { west: '01', east: '03' },
    '03': { west: '02', south: '08' },
    '08': { north: '03', south: '13' }
  };

  const roomObjects = {
    '13': [
      { id: 'home', name: 'Your Home', x: 560, y: 280, r: 57 },
      { id: 'grandpa', name: 'Grandfather’s House', x: 850, y: 520, r: 58 },
      { id: 'gate', name: 'West Gate', x: 65, y: 375, r: 44 }
    ],
    '12': [{ id: 'log', name: 'River Log', x: 530, y: 360, r: 55 }],
    '11': [{ id: 'thorns', name: 'Thorny Vines', x: 330, y: 205, r: 72 }],
    '21': [
      { id: 'hut', name: 'Alchemist’s Hut', x: 260, y: 390, r: 64 },
      { id: 'flowers', name: 'Bright Flowers', x: 700, y: 425, r: 55 }
    ],
    '01': [
      { id: 'shrine', name: 'White Shrine', x: 550, y: 235, r: 62 },
      { id: 'fountain', name: 'Blue Fountain', x: 550, y: 400, r: 48 }
    ],
    '02': [{ id: 'boulders', name: 'Boulder Blockage', x: 1000, y: 360, r: 64 }],
    '03': [{ id: 'cave', name: 'Giant’s Cave', x: 750, y: 360, r: 75 }],
    '08': [{ id: 'return', name: 'Village Path', x: 560, y: 620, r: 45 }]
  };

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function resize() {
    const rect = game.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  new ResizeObserver(resize).observe(game);
  resize();

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2100);
  }

  function updateHud() {
    const inventory = [];
    if (s.key) inventory.push('🗝 West Gate Key');
    if (s.potion) inventory.push('🧪 Vine Potion');
    if (s.strength) inventory.push('✦ Super Strength');
    itemsEl.textContent = inventory.length ? inventory.join(' · ') : 'Empty';
    hintEl.textContent = s.scene === 'basement'
      ? 'Move with WASD or arrows · Get close, left-click a rodent, then choose CATCH · Click the stairs to leave'
      : 'Move with WASD or arrow keys · Left-click nearby objects to interact';

    if (s.scene !== 'outside') {
      questEl.innerHTML = `<strong>Basement Challenge</strong>Catch the runaway rodents: ${s.rodents}/5`;
    } else if (!s.key) {
      questEl.innerHTML = `<strong>First Quest</strong>Catch 5 rodents in Grandfather’s basement: ${s.rodents}/5`;
    } else if (!s.logGone) {
      questEl.innerHTML = '<strong>West Gate</strong>Unlock the gate and cross the river on the log.';
    } else if (!s.potion) {
      questEl.innerHTML = `<strong>Alchemist’s Request</strong>Find 3 bright flowers, then bring them to the hut: ${s.flowers}/3`;
    } else if (!s.thorns) {
      questEl.innerHTML = '<strong>Clear the Way</strong>Use the potion on the thorny vines.';
    } else if (!s.strength) {
      questEl.innerHTML = '<strong>The White Shrine</strong>Drink from the fountain to gain strength.';
    } else if (!s.boulders) {
      questEl.innerHTML = '<strong>Open the Cave</strong>Push the boulders aside.';
    } else if (!s.giantDown) {
      questEl.innerHTML = `<strong>Giant Cave</strong>Push falling boulders into the Giant: ${s.giantHits}/3`;
    } else {
      questEl.innerHTML = '<strong>To Be Continued…</strong>Find the path back to the village.';
    }
  }

  function makeButton(label, fn, secondary = false) {
    const button = document.createElement('button');
    button.className = `btn${secondary ? ' secondary' : ''}`;
    button.textContent = label;
    button.onclick = fn;
    document.querySelector('#modal-buttons').appendChild(button);
    return button;
  }

  function openModal(title, emoji, copy, buttons) {
    document.querySelector('#modal-title').textContent = title;
    document.querySelector('#modal-scene').textContent = emoji;
    document.querySelector('#modal-copy').innerHTML = copy;
    const buttonArea = document.querySelector('#modal-buttons');
    buttonArea.replaceChildren();
    buttons(buttonArea);
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    if (s.scene === 'interior') {
      s.scene = 'outside';
      s.interior = '';
    }
    updateHud();
  }

  function simpleModal(title, emoji, text) {
    openModal(title, emoji, `<p>${text}</p>`, () => makeButton('Got it!', closeModal));
  }

  function openInterior(title, emoji, text, buttons) {
    s.scene = 'interior';
    s.interior = title;
    openModal(title, emoji, `<p>${text}</p>`, buttons);
  }

  function showBasement() {
    s.scene = 'basement';
    s.interior = 'basement';
    s.x = 560; s.y = 490;
    if (!s.basementEntered) {
      s.mice = [
        { id: 1, x: 270, y: 250 }, { id: 2, x: 440, y: 350 },
        { id: 3, x: 760, y: 260 }, { id: 4, x: 850, y: 430 },
        { id: 5, x: 370, y: 500 }
      ].map((mouse) => ({ ...mouse, targetX: mouse.x, targetY: mouse.y, pauseUntil: performance.now() + 700 + Math.random() * 2200, moving: false, face: 1 }));
      s.basementEntered = true;
    }
    modal.classList.remove('open');
    updateHud();
  }

  function exitBasement() {
    s.scene = 'outside'; s.interior = '';
    s.x = s.returnX || 850; s.y = s.returnY || 520;
    updateHud();
  }

  function catchRodent(id) {
    s.mice = s.mice.filter((mouse) => mouse.id !== id);
    s.rodents++;
    updateHud();
    if (s.rodents >= 5) {
      s.key = true;
      openModal('West Gate Key!', '🗝️', '<p>All 5 rodents are caught. You have the West Gate key.</p>', () => {
        makeButton('Go upstairs', () => { closeModal(); exitBasement(); });
      });
    } else closeModal();
  }

  function enterRoom(id, entrySide) {
    s.screen = id;
    if (entrySide === 'west') { s.x = 36; s.y = H / 2; }
    if (entrySide === 'east') { s.x = W - 36; s.y = H / 2; }
    if (entrySide === 'north') { s.x = W / 2; s.y = 38; }
    if (entrySide === 'south') { s.x = W / 2; s.y = H - 38; }
    updateHud();
    if (id === '13' && s.giantDown && !s.returned) {
      s.returned = true;
      setTimeout(() => simpleModal('Back in the Village', '🏘️', 'The Giant is defeated, but thorny vines have spread through the village. To Be Continued…'), 180);
    }
  }

  function getAvailableObjects() {
    return (roomObjects[s.screen] || []).filter((object) => {
      if (object.id === 'gate') return true;
      if (object.id === 'log') return !s.logGone;
      if (object.id === 'thorns') return !s.thorns;
      if (object.id === 'flowers') return s.flowers < 3;
      if (object.id === 'boulders') return !s.boulders;
      if (object.id === 'cave') return !s.giantDown;
      return true;
    });
  }

  function nearestObject() {
    if (s.scene !== 'outside') return null;
    return getAvailableObjects()
      .map((object) => ({ ...object, distance: Math.hypot(object.x - s.x, object.y - s.y) }))
      .filter((object) => object.distance < object.r + 28)
      .sort((a, b) => a.distance - b.distance)[0] || null;
  }

  function interact(object = nearestObject()) {
    if (!object) { toast('Move closer to an object first.'); return; }
    switch (object.id) {
      case 'home':
        openInterior('Your Home', '🏠', 'A little house in the village. This is where the adventure begins.', () => makeButton('Step outside', closeModal));
        break;
      case 'grandpa':
        openInterior('Grandfather’s House', '🪵', 'Grandfather asks for help in the basement. Catch all 5 runaway rodents and he’ll give you the West Gate key.', () => {
          makeButton('Go to the basement', () => { s.returnX = s.x; s.returnY = s.y; showBasement(); });
          makeButton('Not now', closeModal, true);
        });
        break;
      case 'gate':
        if (s.gateOpen) toast('The West Gate is open. Walk left to screen 12.');
        else if (!s.key) simpleModal('The West Gate is locked', '🚪', 'Grandfather may have a key.');
        else { s.key = false; s.gateOpen = true; toast('The key opens the West Gate. Walk left to screen 12.'); updateHud(); }
        break;
      case 'log':
        if (!s.gateOpen) simpleModal('River Crossing', '🌊', 'The West Gate must be open before you can reach the log.');
        else {
          s.logGone = true;
          enterRoom('11', 'east');
          toast('You crossed the river. The log drifts away.');
        }
        break;
      case 'thorns':
        if (!s.potion) simpleModal('Thorny Vines', '🌿', 'These vines block the north path. The alchemist may be able to help.');
        else { s.potion = false; s.thorns = true; toast('The potion clears the vines. The sky grows dim…'); updateHud(); }
        break;
      case 'hut':
        openInterior('The Alchemist’s Hut', '⚗️', s.flowers >= 3 ? 'The alchemist can brew your potion with these flowers.' : 'The retired alchemist needs 3 bright flowers to brew a potion.', () => {
          if (s.flowers >= 3 && !s.potion && !s.thorns) makeButton('Give the flowers', () => { s.flowers = 0; s.potion = true; closeModal(); toast('You received a Vine Potion.'); updateHud(); });
          makeButton('Leave the hut', closeModal, true);
        });
        break;
      case 'flowers':
        s.flowers++;
        toast(`Bright flower collected: ${s.flowers}/3`);
        updateHud();
        if (s.flowers === 3) simpleModal('That’s all 3 flowers!', '🌼', 'Bring them to the alchemist’s hut.');
        break;
      case 'shrine':
        simpleModal('A Quiet Clearing', '⛩️', 'A white shrine stands in the trees. A small blue fountain bubbles nearby.');
        break;
      case 'fountain':
        if (!s.strength) openModal('The Shrine Fountain', '💧', '<p>The blue liquid sparkles in the light. Do you drink it?</p>', () => {
          makeButton('Drink', () => { s.strength = true; closeModal(); toast('You feel much stronger!'); updateHud(); });
          makeButton('Not yet', closeModal, true);
        });
        else simpleModal('The Shrine Fountain', '💧', 'You feel strong enough to push the boulders.');
        break;
      case 'boulders':
        if (!s.strength) simpleModal('Heavy Boulders', '🪨', 'They won’t budge. Drink from the shrine fountain first.');
        else { s.boulders = true; toast('Super strength! You push the boulders aside.'); updateHud(); }
        break;
      case 'cave':
        if (!s.boulders) simpleModal('Giant’s Cave', '🕳️', 'The boulders block the cave entrance.');
        else startGiantFight();
        break;
      case 'return':
        if (s.giantDown) enterRoom('13', 'north');
        else simpleModal('The Path Home', '🌳', 'The Giant is still in the cave.');
        break;
    }
  }

  function startGiantFight() {
    s.scene = 'cave';
    s.interior = 'giant cave';
    s.giantHits = 0;
    function fight() {
      openModal('The Giant’s Cave', '👹', `<p>The Giant is furious! Wait for falling boulders, then push one toward him. Hit him 3 times.</p><div style="font-size:64px;margin:10px">👹</div><div id="boss-count" style="font-weight:900;color:#286448">Hits: ${s.giantHits} / 3</div>`, () => {
        makeButton('Wait for a boulder', () => {
          const count = document.querySelector('#boss-count');
          if (count) count.textContent = 'Shadows blink… push now!';
          setTimeout(() => {
            if (!modal.classList.contains('open')) return;
            s.giantHits++;
            if (s.giantHits >= 3) {
              s.giantDown = true;
              s.scene = 'outside';
              s.interior = '';
              openModal('The Giant Is Down!', '💫', '<p>The cave exit downward opens. Follow the path through screen 08 to return to the village.</p>', () => makeButton('Leave the cave', () => { closeModal(); enterRoom('08', 'north'); }));
            } else fight();
          }, 850);
        });
        makeButton('Not yet', () => { closeModal(); s.scene = 'outside'; s.interior = ''; }, true);
      });
    }
    fight();
  }

  function moveToRoom(direction) {
    const next = roomNeighbors[s.screen]?.[direction];
    if (!next) return false;
    if (s.screen === '13' && direction === 'west') {
      if (!s.gateOpen) {
        if (!s.key) { toast('The West Gate is locked.'); return false; }
        s.key = false;
        s.gateOpen = true;
        toast('The key opens the West Gate.');
        updateHud();
      }
    }
    if (s.screen === '12' && direction === 'west') {
      if (s.logGone) { toast('The log is gone. There’s no way back across the river.'); return false; }
      if (s.y < 300 || s.y > 420) { toast('Cross the river at the log.'); return false; }
      s.logGone = true;
      enterRoom(next, 'east');
      toast('You crossed the river. The log drifts away.');
      return true;
    }
    if (s.screen === '11' && direction === 'north' && !s.thorns) { toast('The thorny vines block the north path.'); return false; }
    if (s.screen === '02' && direction === 'east' && !s.boulders) { toast('The boulders block the path to the cave.'); return false; }
    if (s.screen === '03' && direction === 'south' && !s.giantDown) { toast('The cave exits are blocked while the Giant is awake.'); return false; }
    let entering = { west: 'east', east: 'west', north: 'south', south: 'north' }[direction];
    enterRoom(next, entering);
    return true;
  }

  function roundedRect(x, y, w, h, r, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  }

  function tree(x, y, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = '#77583d'; ctx.fillRect(-5, 8, 10, 24);
    ['#4e8757', '#5d9a5f', '#72aa66'].forEach((color, i) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -6 - i * 9, 22 - i * 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  function flower(x, y, color = '#f1d469') {
    ctx.fillStyle = '#f6e5a1';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(x + Math.cos(i * 1.256) * 5, y + Math.sin(i * 1.256) * 5, 3, 4, i * 1.256, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawPath(points, width = 88) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8eaa69'; ctx.lineWidth = width + 18;
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 3) {
      if (points[i + 2]) ctx.bezierCurveTo(...points[i], ...points[i + 1], ...points[i + 2]);
      else ctx.lineTo(...points[i]);
    }
    ctx.stroke(); ctx.strokeStyle = '#e0c991'; ctx.lineWidth = width; ctx.stroke();
    ctx.strokeStyle = '#efdfb4'; ctx.lineWidth = width - 14; ctx.stroke(); ctx.restore();
  }

  function drawHouse(x, y, roof, label, scale = 1, peaked = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = '#6b503b'; ctx.fillRect(-43, -7, 86, 56);
    ctx.fillStyle = roof;
    if (peaked) { ctx.beginPath(); ctx.moveTo(-52, -5); ctx.lineTo(0, -47); ctx.lineTo(52, -5); ctx.closePath(); ctx.fill(); }
    else ctx.fillRect(-49, -17, 98, 13);
    ctx.fillStyle = '#f2d69d'; ctx.fillRect(-9, 15, 18, 34);
    ctx.fillStyle = '#9ad3db'; ctx.fillRect(-33, 8, 15, 14); ctx.fillRect(18, 8, 15, 14);
    if (label) { ctx.fillStyle = '#395f48'; ctx.font = '800 13px Nunito'; ctx.textAlign = 'center'; ctx.fillText(label, 0, 69); }
    ctx.restore();
  }

  function drawGround() {
    const colors = s.screen === '03' ? ['#78906b', '#637e63'] : ['#b8d89a', '#84b778'];
    const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) {
      const x = (i * 197 + 53) % W, y = (i * 113 + 31) % H;
      ctx.fillStyle = i % 2 ? '#a7ce85' : '#9fc67e'; ctx.globalAlpha = .22;
      ctx.beginPath(); ctx.ellipse(x, y, 74, 25, (i % 5) * .35, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    [[34, 54], [1082, 52], [32, 657], [1080, 652], [340, 35], [780, 676], [1020, 215], [140, 510]].forEach((point, i) => tree(...point, .82 + (i % 3) * .12));
    for (let i = 0; i < 35; i++) flower((i * 83 + 37) % W, (i * 139 + 58) % H, ['#fff1d0', '#f4c76a', '#d88c9a'][i % 3]);
    if (s.screen === '13') drawVillageHomes();
  }

  function drawVillageHomes() {
    drawHouse(265, 205, '#897553', '', .78);
    drawHouse(885, 195, '#897553', '', .78);
    drawHouse(1035, 360, '#897553', '', .78);
    drawHouse(275, 560, '#897553', '', .78);
    drawHouse(635, 585, '#897553', '', .78);
  }

  function drawRoomPath() {
    switch (s.screen) {
      case '13': drawPath([[45, 375], [175, 375], [240, 520], [390, 520], [555, 520], [710, 440], [655, 345], [610, 245], [515, 160], [560, 38]], 76); break;
      case '12':
        drawPath([[1080, 360], [910, 360], [820, 255], [680, 255], [530, 255], [425, 405], [280, 430], [130, 450], [80, 375], [40, 360]], 76);
        ctx.fillStyle = '#6eafc0'; ctx.fillRect(430, 0, 155, H);
        ctx.strokeStyle = '#b7e3e6'; ctx.lineWidth = 4;
        for (let y = 35; y < H; y += 76) { ctx.beginPath(); ctx.moveTo(445, y); ctx.bezierCurveTo(485, y + 12, 525, y - 12, 570, y); ctx.stroke(); }
        if (!s.logGone) { roundedRect(427, 337, 164, 46, 14, '#8b5f38'); ctx.fillStyle = '#c0915b'; for (let x = 444; x < 578; x += 24) { ctx.beginPath(); ctx.arc(x, 359, 3, 0, Math.PI * 2); ctx.fill(); } }
        break;
      case '11':
        drawPath([[1080, 360], [900, 360], [780, 330], [650, 330], [520, 330], [420, 250], [330, 205], [235, 155], [220, 95], [220, 38]], 76);
        drawPath([[520, 330], [405, 355], [290, 420], [250, 505], [220, 590], [340, 635], [430, 680], [560, 680]], 70);
        break;
      case '16': drawPath([[560, 35], [500, 170], [365, 215], [240, 280], [180, 390], [230, 525], [370, 565], [500, 610], [560, 685]], 82); break;
      case '21': drawPath([[560, 40], [555, 175], [680, 240], [760, 350], [670, 470], [520, 520], [390, 545], [250, 505], [190, 390], [40, 360]], 84); break;
      case '06': drawPath([[560, 680], [490, 535], [370, 475], [270, 390], [350, 270], [455, 200], [520, 135], [560, 38]], 82); break;
      case '01': drawPath([[560, 685], [515, 550], [470, 430], [560, 320], [660, 220], [600, 105], [560, 40]], 86); break;
      case '02': drawPath([[40, 360], [180, 360], [320, 265], [510, 260], [700, 260], [850, 300], [1078, 360]], 82); break;
      case '03': drawPath([[42, 360], [240, 360], [370, 300], [500, 220], [690, 205], [850, 250], [910, 360], [855, 485], [770, 585], [560, 680]], 88); break;
      case '08': drawPath([[560, 40], [485, 165], [440, 280], [550, 375], [665, 475], [630, 585], [560, 680]], 80); break;
    }
  }

  function drawObject(object) {
    const selected = nearestObject()?.id === object.id;
    ctx.save(); ctx.translate(object.x, object.y);
    if (selected) { ctx.strokeStyle = '#fff7cb'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 15, object.r * 1.1, object.r * .62, 0, 0, Math.PI * 2); ctx.stroke(); }
    switch (object.id) {
      case 'home': drawHouse(0, 0, '#b76352', '', .92, true); break;
      case 'grandpa': drawHouse(0, 0, '#8c6947', '', .94); break;
      case 'gate':
        ctx.fillStyle = '#775332'; ctx.fillRect(-28, -46, 10, 92); ctx.fillRect(18, -46, 10, 92);
        ctx.fillStyle = s.gateOpen ? '#b5cc84' : '#ad8154'; ctx.fillRect(-18, -38, 36, 76);
        if (!s.gateOpen) { ctx.strokeStyle = '#f0d596'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -7, 9, Math.PI, 0); ctx.lineTo(9, 8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.stroke(); ctx.fillStyle = '#f0d596'; ctx.beginPath(); ctx.arc(0, 4, 3, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'thorns':
        if (!s.thorns) { for (let i = 0; i < 8; i++) { ctx.strokeStyle = i % 2 ? '#465e39' : '#607343'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-43 + i * 12, 25); ctx.bezierCurveTo(-25 + i * 8, -24, 8 + i * 4, 40, 39 - i * 8, -28); ctx.stroke(); } }
        break;
      case 'hut': drawHouse(0, 0, '#a98259', '', 1); ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.fillText('⚗️', 0, -28); break;
      case 'flowers': for (let i = 0; i < 12; i++) flower(-35 + (i % 4) * 24, -22 + Math.floor(i / 4) * 24, ['#f8d568', '#dc91a1', '#f5efe0'][i % 3]); break;
      case 'shrine':
        ctx.fillStyle = '#fff9e9'; ctx.strokeStyle = '#c4b99e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-43, -20); ctx.lineTo(0, -58); ctx.lineTo(43, -20); ctx.lineTo(35, 35); ctx.lineTo(-35, 35); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#9fd5db'; ctx.fillRect(-9, 4, 18, 31); break;
      case 'fountain':
        ctx.fillStyle = '#b8dbe1'; ctx.beginPath(); ctx.ellipse(0, 0, 43, 23, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#f5f2de'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = '#71b8c4'; ctx.beginPath(); ctx.ellipse(0, -3, 27, 12, 0, 0, Math.PI * 2); ctx.fill(); break;
      case 'boulders':
        if (!s.boulders) for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#8a8b78', '#777d70', '#9d9b83', '#747b70'][i % 4]; ctx.beginPath(); ctx.ellipse(-52 + i * 24, Math.sin(i) * 9, 23, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#bbc0a5'; ctx.lineWidth = 2; ctx.stroke(); }
        break;
      case 'cave':
        ctx.fillStyle = '#574d46'; ctx.beginPath(); ctx.ellipse(0, 0, 88, 65, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#233c36'; ctx.beginPath(); ctx.ellipse(0, 10, 65, 46, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        if (!s.giantDown) { ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.fillText('👹', 0, 18); }
        break;
      case 'return': ctx.fillStyle = '#456f49'; ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.fill(); break;
    }
    ctx.restore();
  }

  function drawBoy() {
    ctx.save(); ctx.translate(s.x, s.y);
    ctx.fillStyle = '#21362d48'; ctx.beginPath(); ctx.ellipse(0, 14, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5b4a3b'; ctx.beginPath(); ctx.arc(0, -7, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e3b77f'; ctx.beginPath(); ctx.arc(0, -6, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#416d52'; ctx.beginPath(); ctx.ellipse(0, 9, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d0a551'; ctx.fillRect(-9, 20, 7, 5); ctx.fillRect(2, 20, 7, 5);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.face === 'left' ? -3 : 3, -8, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawInterior() {
    ctx.fillStyle = '#18372f'; ctx.fillRect(0, 0, W, H);
    roundedRect(185, 120, 750, 500, 24, '#bd9b66');
    ctx.strokeStyle = '#e5d1a2'; ctx.lineWidth = 14; ctx.strokeRect(188, 123, 744, 494);
    for (let y = 170; y < 610; y += 75) { ctx.strokeStyle = '#a98655'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(200, y); ctx.lineTo(920, y); ctx.stroke(); }
  }

  function drawBasementMouse(mouse) {
    const distance = Math.hypot(mouse.x - s.x, mouse.y - s.y);
    ctx.save(); ctx.translate(mouse.x, mouse.y); ctx.rotate(mouse.face || 0);
    if (distance < 76) { ctx.strokeStyle = '#fff1b9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 5, 36, 27, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = '#b77d76'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-19, 4); ctx.quadraticCurveTo(-35, 12, -38, 24); ctx.stroke();
    ctx.fillStyle = '#777a78'; ctx.beginPath(); ctx.ellipse(-2, 4, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#929594'; ctx.beginPath(); ctx.ellipse(15, 1, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#bc8785'; ctx.beginPath(); ctx.arc(10, -8, 6, 0, Math.PI * 2); ctx.arc(20, -7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3735'; ctx.beginPath(); ctx.arc(20, -1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#eee4d6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(23, 3); ctx.lineTo(34, -2); ctx.moveTo(23, 5); ctx.lineTo(35, 7); ctx.stroke();
    ctx.restore();
  }

  function drawBasement() {
    ctx.fillStyle = '#102a27bb'; ctx.fillRect(0, 0, W, H);
    roundedRect(145, 105, 830, 520, 28, '#553b2c');
    roundedRect(165, 125, 790, 480, 18, '#c9a16a');
    ctx.save(); ctx.beginPath(); ctx.roundRect(165, 125, 790, 480, 18); ctx.clip();
    for (let y = 150; y < 610; y += 54) {
      ctx.fillStyle = y % 108 ? '#d3ad76' : '#c7a06a'; ctx.fillRect(170, y, 780, 51);
      ctx.strokeStyle = '#ad8757'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(170, y + 52); ctx.lineTo(950, y + 52); ctx.stroke();
      for (let x = 215 + (y % 2) * 85; x < 940; x += 170) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 52); ctx.stroke(); }
    }
    ctx.restore();
    ctx.strokeStyle = '#ead09c'; ctx.lineWidth = 8; ctx.strokeRect(169, 129, 782, 472);

    // Top-down shelves, crates, and barrels around the play area.
    roundedRect(215, 175, 112, 58, 9, '#805a39'); roundedRect(225, 184, 92, 40, 5, '#a77c4d');
    roundedRect(780, 170, 132, 48, 8, '#805a39'); roundedRect(790, 178, 112, 32, 4, '#a77c4d');
    [[250, 435], [875, 320], [760, 525]].forEach(([x, y]) => {
      ctx.fillStyle = '#805a39'; ctx.beginPath(); ctx.arc(x, y, 27, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#aa8052'; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#795333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke();
    });
    // A small stairwell is the way back upstairs.
    roundedRect(510, 128, 100, 80, 10, '#755238');
    for (let y = 139; y < 200; y += 15) { ctx.strokeStyle = '#d2b17c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(518, y); ctx.lineTo(602, y); ctx.stroke(); }
    if (Math.hypot(s.x - 560, s.y - 175) < 88) { ctx.strokeStyle = '#fff1b9'; ctx.lineWidth = 4; ctx.strokeRect(505, 123, 110, 90); }
    s.mice.forEach(drawBasementMouse);
    drawBoy();
  }

  function updateMice(now, dt) {
    if (s.scene !== 'basement' || modal.classList.contains('open')) return;
    for (const mouse of s.mice) {
      if (!mouse.moving && now >= mouse.pauseUntil) {
        mouse.targetX = 235 + Math.random() * 650;
        mouse.targetY = 245 + Math.random() * 285;
        mouse.moving = true;
      }
      if (!mouse.moving) continue;
      const dx = mouse.targetX - mouse.x, dy = mouse.targetY - mouse.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 4) {
        mouse.x = mouse.targetX; mouse.y = mouse.targetY; mouse.moving = false;
        mouse.pauseUntil = now + 900 + Math.random() * 2300;
      } else {
        const step = Math.min(distance, (80 + (mouse.id % 3) * 22) * dt);
        mouse.x += dx / distance * step; mouse.y += dy / distance * step;
        mouse.face = Math.atan2(dy, dx);
      }
    }
  }

  function draw() {
    drawGround(); drawRoomPath();
    (roomObjects[s.screen] || []).filter((o) => getAvailableObjects().some((active) => active.id === o.id)).forEach(drawObject);
    if (s.scene === 'outside') drawBoy();
    else if (s.scene === 'basement') drawBasement();
    else drawInterior();
    updateHud(); requestAnimationFrame(draw);
  }

  function transitionAtEdge(nx, ny) {
    const doorY = ny > 305 && ny < 425;
    const doorX = nx > 395 && nx < 725;
    if (nx < 12 && doorY) return moveToRoom('west');
    if (nx > W - 12 && doorY) return moveToRoom('east');
    if (ny < 10 && doorX) return moveToRoom('north');
    if (ny > H - 10 && doorX) return moveToRoom('south');
    return false;
  }

  function move(dt) {
    if ((s.scene !== 'outside' && s.scene !== 'basement') || modal.classList.contains('open')) return;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a || keys.A) dx--;
    if (keys.ArrowRight || keys.d || keys.D) dx++;
    if (keys.ArrowUp || keys.w || keys.W) dy--;
    if (keys.ArrowDown || keys.s || keys.S) dy++;
    const length = Math.hypot(dx, dy) || 1; dx /= length; dy /= length;
    if (dx) s.face = dx < 0 ? 'left' : 'right';
    const nx = s.x + dx * s.speed * dt, ny = s.y + dy * s.speed * dt;
    if (s.scene === 'basement') {
      s.x = clamp(nx, 215, 905); s.y = clamp(ny, 175, 545);
      return;
    }
    if (s.screen === '13' && nx < 85 && ny > 305 && ny < 425 && !s.gateOpen) { toast('The West Gate is locked.'); return; }
    if (s.screen === '12' && nx > 400 && nx < 620 && (ny < 300 || ny > 420)) return;
    if (s.screen === '12' && s.logGone && nx < 600 && nx > 400) { toast('The log is gone.'); return; }
    if (s.screen === '11' && !s.thorns && ny < 120 && nx < 270) { toast('The vines block the north exit.'); return; }
    if (s.screen === '02' && !s.boulders && nx > 925 && ny > 285 && ny < 435) { toast('The boulders block the east path.'); return; }
    s.x = clamp(nx, 8, W - 8); s.y = clamp(ny, 8, H - 8);
    transitionAtEdge(s.x, s.y);
  }

  let last = performance.now();
  function loop(now) { const dt = Math.min((now - last) / 1000, .04); last = now; move(dt); updateMice(now, dt); requestAnimationFrame(loop); }
  requestAnimationFrame(loop); draw();

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    keys[event.key] = true;
    if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
  window.addEventListener('keyup', (event) => { keys[event.key] = false; });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || modal.classList.contains('open')) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * W;
    const y = (event.clientY - rect.top) / rect.height * H;
    if (s.scene === 'basement') {
      const mouse = s.mice
        .map((item) => ({ ...item, distance: Math.hypot(x - item.x, y - item.y) }))
        .filter((item) => item.distance < 34)
        .sort((a, b) => a.distance - b.distance)[0];
      if (mouse) {
        if (Math.hypot(s.x - mouse.x, s.y - mouse.y) < 76) {
          openModal('Catch this rodent?', '🐭', '<p>It is close enough to catch!</p>', () => {
            makeButton('CATCH', () => catchRodent(mouse.id));
            makeButton('Not yet', closeModal, true);
          });
        } else toast('Get closer to catch it.');
        return;
      }
      if (Math.hypot(x - 560, y - 170) < 58) {
        if (Math.hypot(s.x - 560, s.y - 175) < 88) exitBasement();
        else toast('Walk over to the stairs.');
      }
      return;
    }
    if (s.scene !== 'outside') return;
    const object = getAvailableObjects()
      .map((o) => ({ ...o, distance: Math.hypot(x - o.x, y - o.y) }))
      .filter((o) => o.distance < o.r + 12)
      .sort((a, b) => a.distance - b.distance)[0];
    if (object && Math.hypot(s.x - object.x, s.y - object.y) < object.r + 40) interact(object);
    else if (object) toast('Walk closer, then click the object.');
  });

  document.querySelectorAll('.touch button').forEach((button) => {
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[button.dataset.dir];
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); keys[key] = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => button.addEventListener(name, () => { keys[key] = false; }));
  });
  updateHud();
})();
