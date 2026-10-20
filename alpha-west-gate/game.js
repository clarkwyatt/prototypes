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
    returnX: 0, returnY: 0, outsideX: 0, outsideY: 0,
    flowers: { sunpetal: false, bluebell: false, mooncap: false, lavender: false, amberleaf: false, fern: false }, alchemistTalked: false, vinesStarted: false,
    key: false, gateOpen: false, logGone: false, potion: false,
    thorns: false, strength: false, boulders: false,
    giantHits: 0, giantDown: false, returned: false
  };

  const flowerNames = { sunpetal: 'Sunpetal', bluebell: 'Bluebell', mooncap: 'Mooncap', lavender: 'Lavender', amberleaf: 'Amberleaf', fern: 'Fern' };
  const flowerDetails = {
    sunpetal: 'A golden flower with bright, round petals.', bluebell: 'A blue, bell-shaped flower growing on a curved stem.',
    mooncap: 'A pale mushroom with a violet cap.', lavender: 'A cluster of slender purple flower spikes.',
    amberleaf: 'A plant with warm gold and green leaves.', fern: 'A leafy green plant with curling fronds.'
  };
  const hutGuideCards = [
    { id:'sunpetal', x:255, y:165 }, { id:'bluebell', x:390, y:165 }, { id:'mooncap', x:525, y:165 },
    { id:'lavender', x:255, y:285 }, { id:'amberleaf', x:390, y:285 }, { id:'fern', x:525, y:285 }
  ];
  const requiredFlowers = Object.keys(flowerNames).sort(() => Math.random() - 0.5).slice(0, 3);

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

  // Each exit is placed where the hand-drawn path meets the edge of its panel.
  const roomDoors = {
    '13': { west: 360, north: 830 }, '12': { east: 360, west: 360 },
    '11': { east: 360, north: 220, south: 560 }, '16': { north: 560, south: 560 },
    '21': { north: 560 }, '06': { south: 220, north: 560 },
    '01': { south: 560, east: 360 }, '02': { west: 360, east: 360 },
    '03': { west: 360, south: 560 }, '08': { north: 560, south: 830 }
  };

  const roomObjects = {
    '13': [
      { id: 'home', name: 'Your Home', x: 560, y: 280, r: 57 },
      { id: 'grandpa', name: 'Grandfather’s House', x: 850, y: 520, r: 58 },
      { id: 'gate', name: 'West Gate', x: 90, y: 360, r: 44 },
      { id: 'northGate', name: 'North Gate', x: 830, y: 80, r: 48 }
    ],
    '11': [{ id: 'thorns', name: 'Thorny Vines', x: 225, y: 155, r: 82 }],
    '21': [
      { id: 'hut', name: 'Alchemist’s Hut', x: 250, y: 390, r: 72 },
      { id: 'sunpetal', name: 'Sunpetal', x: 760, y: 180, r: 42 },
      { id: 'bluebell', name: 'Bluebell', x: 830, y: 470, r: 42 },
      { id: 'mooncap', name: 'Mooncap', x: 460, y: 540, r: 42 },
      { id: 'lavender', name: 'Lavender', x: 600, y: 260, r: 40 },
      { id: 'amberleaf', name: 'Amberleaf', x: 940, y: 320, r: 40 },
      { id: 'fern', name: 'Fern', x: 410, y: 250, r: 40 }
    ],
    '06': [
      { id: 'shrine', name: 'White Shrine', x: 850, y: 195, r: 68 },
      { id: 'fountain', name: 'Blue Fountain', x: 850, y: 315, r: 52 }
    ],
    '01': [{ id: 'boulders', name: 'Boulder Blockage', x: 1000, y: 360, r: 64 }],
    '02': [],
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
      : s.scene === 'interior'
        ? 'Move with WASD or arrows · Left-click highlighted objects'
      : 'Move with WASD or arrow keys · Left-click highlighted objects';

    let quest = '';
    if (!s.key && s.rodents < 5) quest = `<strong>First Quest</strong>Catch 5 rodents: ${s.rodents}/5`;
    else if (!s.gateOpen && !s.key && s.rodents >= 5) quest = '<strong>Quest</strong>Talk to Grandfather.';
    else if (s.key && !s.gateOpen) quest = '<strong>Quest</strong>Unlock the West Gate';
    else if (s.vinesStarted && !s.alchemistTalked) quest = '<strong>Quest</strong>Find a way to remove the Vines.';
    else if (s.vinesStarted && s.alchemistTalked && !s.potion && !s.thorns) {
      const count = requiredFlowers.filter((id) => s.flowers[id]).length;
      quest = count < 3
        ? `<strong>Quest</strong>${requiredFlowers.map((id) => `${flowerNames[id]} ${s.flowers[id] ? '1/1' : '0/1'}`).join(' · ')}`
        : '<strong>Quest</strong>Talk to the Alchemist for the potion.';
    }
    else if (s.vinesStarted && s.potion && !s.thorns) quest = '<strong>Quest</strong>Use the potion on the Vines.';
    else if (s.thorns && !s.strength) quest = '<strong>Quest</strong>Find the Shrine and drink the blue water.';
    else if (s.strength && !s.boulders) quest = '<strong>Quest</strong>Push the boulders aside.';
    else if (s.boulders && !s.giantDown) quest = `<strong>Quest</strong>Defeat the Giant: ${s.giantHits}/3`;
    else if (s.giantDown) quest = '<strong>Quest</strong>Follow the path back to the village.';
    questEl.innerHTML = quest;
    questEl.classList.toggle('empty', !quest);
  }

  function makeButton(label, fn, secondary = false) {
    const button = document.createElement('button');
    button.className = `btn${secondary ? ' secondary' : ''}`;
    button.textContent = label;
    button.onclick = fn;
    document.querySelector('#modal-buttons').appendChild(button);
    return button;
  }

  function openModal(title, emoji, copy, buttons, compact = false) {
    document.querySelector('#modal-title').textContent = title;
    document.querySelector('#modal-scene').textContent = emoji;
    document.querySelector('#modal-copy').innerHTML = copy;
    const buttonArea = document.querySelector('#modal-buttons');
    buttonArea.replaceChildren();
    buttons(buttonArea);
    document.querySelector('#modal-close').onclick = closeModal;
    modal.classList.toggle('compact', compact);
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.classList.remove('compact');
    updateHud();
  }

  function simpleModal(title, emoji, text) {
    openModal(title, emoji, `<p>${text}</p>`, () => makeButton('Got it!', closeModal), true);
  }

  function enterInterior(type) {
    s.outsideX = s.x; s.outsideY = s.y;
    s.scene = 'interior'; s.interior = type;
    s.x = 560; s.y = 520;
    updateHud();
  }

  function leaveInterior() {
    s.scene = 'outside'; s.interior = '';
    s.x = s.outsideX || 560; s.y = s.outsideY || 335;
    updateHud();
  }

  function openHouseTalk() {
    if (s.rodents < 5) {
      openModal('Grandfather', '🧓', '<p>Catch all 5 rodents downstairs and I’ll give you the West Gate key.</p>', () => makeButton('Okay', closeModal), true);
    } else {
      s.key = true;
      openModal('Grandfather', '🧓', '<p>Thank you for catching the rodents. Here is the West Gate key.</p>', () => makeButton('Thanks', closeModal), true);
      updateHud();
    }
  }

  function talkToAlchemist() {
    s.alchemistTalked = true;
    const count = requiredFlowers.filter((id) => s.flowers[id]).length;
    const requested = requiredFlowers.map((id) => `${flowerNames[id]} (1 needed)`).join(', ');
    updateHud();
    if (count < 3) {
      openModal('The Alchemist', '🧙', `<p>I can make a potion to clear the Vines. Please bring me these flowers: ${requested}.</p>`, () => makeButton('I’ll look for them', closeModal), true);
      return;
    }
    openModal('The Alchemist', '🧙', '<p>You found all three flowers. I’ll brew the potion for you.</p>', () => {
      makeButton('Take the potion', () => { s.potion = true; closeModal(); toast('You received a Vine Potion.'); updateHud(); });
    }, true);
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
    modal.classList.remove('compact');
    updateHud();
  }

  function exitBasement() {
    s.scene = 'interior'; s.interior = 'grandpa';
    s.x = 560; s.y = 205;
    updateHud();
  }

  function catchRodent(id) {
    s.mice = s.mice.filter((mouse) => mouse.id !== id);
    s.rodents++;
    updateHud();
    if (s.rodents >= 5) {
      closeModal();
      toast('All 5 rodents caught. Talk to Grandfather.');
    } else closeModal();
  }

  function enterRoom(id, entrySide) {
    s.screen = id;
    const lane = roomDoors[id]?.[entrySide];
    if (entrySide === 'west') { s.x = 46; s.y = lane ?? H / 2; }
    if (entrySide === 'east') { s.x = W - 46; s.y = lane ?? H / 2; }
    if (entrySide === 'north') { s.x = lane ?? W / 2; s.y = 46; }
    if (entrySide === 'south') { s.x = lane ?? W / 2; s.y = H - 46; }
    updateHud();
    if (id === '13' && s.giantDown && !s.returned) {
      s.returned = true;
      setTimeout(() => simpleModal('Back in the Village', '🏘️', 'The Giant is defeated, but thorny vines have spread through the village. To Be Continued…'), 180);
    }
  }

  function getAvailableObjects() {
    return (roomObjects[s.screen] || []).filter((object) => {
      if (object.id === 'gate') return true;
      if (object.id === 'thorns') return !s.thorns;
      if (object.id in s.flowers) return !requiredFlowers.includes(object.id) || !s.flowers[object.id];
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
      case 'home': enterInterior('home'); break;
      case 'grandpa': enterInterior('grandpa'); break;
      case 'gate':
        if (s.gateOpen) toast('The West Gate is open.');
        else if (!s.key) simpleModal('The West Gate is locked', '🚪', 'Grandfather may have a key.');
        else { s.key = false; s.gateOpen = true; toast('The key opens the West Gate.'); updateHud(); }
        break;
      case 'northGate':
        if (s.giantDown) toast('The gate is open. Follow the path home.');
        else simpleModal('North Gate', '🚪', 'The gate is locked from the other side.');
        break;
      case 'thorns':
        s.vinesStarted = true;
        if (!s.potion) simpleModal('Thorny Vines', '🌿', 'The Vines block the path. Find a way to remove them.');
        else { s.potion = false; s.thorns = true; toast('The potion clears the Vines. The sky grows dim…'); updateHud(); }
        break;
      case 'hut': enterInterior('hut'); break;
      case 'sunpetal': case 'bluebell': case 'mooncap': case 'lavender': case 'amberleaf': case 'fern':
        if (requiredFlowers.includes(object.id) && s.alchemistTalked) { s.flowers[object.id] = true; toast(`${object.name} collected.`); updateHud(); }
        else simpleModal(object.name, object.id === 'fern' ? '🌿' : '🌸', 'A bit of local plant life.');
        break;
      case 'shrine':
        simpleModal('A Quiet Clearing', '⛩️', 'A white shrine stands in the trees. A small blue fountain bubbles nearby.');
        break;
      case 'fountain':
        if (!s.strength) openModal('The Shrine Fountain', '💧', '<p>The blue liquid sparkles in the light. Do you drink it?</p>', () => {
          makeButton('Drink', () => { s.strength = true; closeModal(); toast('You feel much stronger!'); updateHud(); });
          makeButton('Not yet', closeModal, true);
        }, true);
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
              openModal('The Giant Is Down!', '💫', '<p>The cave exit opens below. Follow the path back to the village.</p>', () => makeButton('Leave the cave', () => { closeModal(); enterRoom('08', 'north'); }));
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
    if (s.screen === '13' && direction === 'north' && !s.giantDown) {
      toast('The gate is locked from the other side.'); return false;
    }
    if (s.screen === '12' && direction === 'west' && !s.logGone) {
      toast('Cross the river on the log.'); return false;
    }
    if (s.screen === '11' && direction === 'east' && s.logGone) { toast('The log is gone. The crossing is one-way.'); return false; }
    if (s.screen === '11' && direction === 'north' && !s.thorns) { toast('The thorny vines block the north path.'); return false; }
    if (s.screen === '01' && direction === 'east' && !s.boulders) { toast('The boulders block the path to the cave.'); return false; }
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

  function fenceSegment(x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = '#805a37'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x1,y1+8); ctx.lineTo(x2,y2+8); ctx.stroke();
    ctx.strokeStyle = '#b88752'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    const length = Math.hypot(x2-x1,y2-y1), steps = Math.max(1, Math.floor(length/30));
    for(let i=0;i<=steps;i++){const t=i/steps,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;ctx.fillStyle='#875e39';ctx.fillRect(x-4,y-10,8,34);ctx.fillStyle='#c99a60';ctx.fillRect(x-4,y-10,8,6);}
    ctx.restore();
  }

  function drawVillageFence() {
    // The enclosure sits inside the camera frame, with a west and north gate.
    fenceSegment(100,100,770,100); fenceSegment(890,100,1020,100);
    fenceSegment(100,620,1020,620);
    fenceSegment(100,100,100,305); fenceSegment(100,415,100,620);
    fenceSegment(1020,100,1020,620);
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
    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i], next = points[i + 1];
      ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
    }
    ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
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

  function drawFlora(id, x, y) {
    ctx.save(); ctx.translate(x, y);
    if (id === 'sunpetal') {
      ctx.strokeStyle = '#477b49'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 32); ctx.stroke();
      for (let i = 0; i < 8; i++) { ctx.fillStyle = '#f3c94e'; ctx.beginPath(); ctx.ellipse(Math.cos(i * Math.PI / 4) * 15, Math.sin(i * Math.PI / 4) * 15, 9, 15, i * Math.PI / 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#945d38'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'bluebell') {
      ctx.strokeStyle = '#47804e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(-5, 0, 0, -22); ctx.stroke();
      [[-12,-13], [3,-22], [15,-8]].forEach(([bx,by],i)=>{ctx.fillStyle=['#667fd0','#8276d3','#5c92d2'][i];ctx.beginPath();ctx.moveTo(bx-8,by-3);ctx.quadraticCurveTo(bx,by-15,bx+8,by-3);ctx.lineTo(bx+5,by+7);ctx.quadraticCurveTo(bx,by+12,bx-5,by+7);ctx.closePath();ctx.fill();});
    } else if (id === 'mooncap') {
      ctx.fillStyle = '#f0e9d3'; ctx.fillRect(-5, 0, 10, 23); ctx.fillStyle = '#9c6e9f'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 14, -.12, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e3d9b4'; for (let i = -12; i <= 12; i += 12) { ctx.beginPath(); ctx.arc(i, -5, 2.5, 0, Math.PI * 2); ctx.fill(); }
    } else if (id === 'lavender') {
      ctx.strokeStyle = '#4f7f4c'; ctx.lineWidth = 4; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(j * 10, 25); ctx.lineTo(j * 8, -15); ctx.stroke(); for (let k=0;k<4;k++){ctx.fillStyle='#9376bd';ctx.beginPath();ctx.ellipse(j*8+(k%2)*4,-14+k*8,4,7,.4,0,Math.PI*2);ctx.fill();} }
    } else if (id === 'amberleaf') {
      for (let i=0;i<5;i++){ctx.fillStyle=i%2?'#7e9b4d':'#b4a24f';ctx.beginPath();ctx.ellipse(Math.cos(i*1.25)*12,Math.sin(i*1.25)*10,9,18,i*1.25,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='#536e42';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-14,16);ctx.lineTo(16,-16);ctx.stroke();
    } else {
      ctx.strokeStyle='#477b49';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,26);ctx.quadraticCurveTo(-8,4,-23,-8);ctx.moveTo(0,26);ctx.quadraticCurveTo(9,5,24,-12);ctx.stroke();
      for(let i=0;i<5;i++){ctx.fillStyle='#568959';ctx.beginPath();ctx.ellipse(-14+i*7,6-Math.abs(2-i)*5,8,16,-.5+i*.25,0,Math.PI*2);ctx.fill();}
    }
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
    const treePoints = s.screen === '01'
      ? [[34, 54], [1082, 52], [32, 657], [1080, 652], [340, 35], [780, 676]]
      : [[34, 54], [1082, 52], [32, 657], [1080, 652], [340, 35], [780, 676], [1020, 215], [140, 510]];
    treePoints.forEach((point, i) => tree(...point, 1.2 + (i % 3) * .14));
    if (s.screen !== '21') for (let i = 0; i < 17; i++) flower((i * 137 + 53) % W, (i * 211 + 75) % H, ['#fff1d0', '#f4c76a', '#d88c9a'][i % 3]);
  }

  function drawVillageHomes() {
    drawHouse(265, 205, '#897553', '', 1.08);
    drawHouse(970, 195, '#897553', '', 1.08);
    drawHouse(275, 560, '#897553', '', 1.08);
  }

  function drawRoomPath() {
    switch (s.screen) {
      case '13': drawPath([[90, 360], [190, 360], [320, 520], [510, 540], [700, 500], [820, 390], [790, 265], [785, 165], [830, 40]], 142); break;
      case '12':
        drawPath([[1080, 360], [900, 360], [760, 360], [660, 360], [560, 360], [460, 360], [330, 360], [180, 360], [40, 360]], 142);
        ctx.fillStyle = '#6eafc0'; ctx.fillRect(445, 0, 230, H);
        ctx.strokeStyle = '#b7e3e6'; ctx.lineWidth = 5;
        for (let y = 24; y < H; y += 76) { ctx.beginPath(); ctx.moveTo(455, y); ctx.bezierCurveTo(515, y + 16, 590, y - 16, 665, y); ctx.stroke(); }
        if (!s.logGone) {
          roundedRect(428, 322, 264, 76, 18, '#805632');
          roundedRect(440, 330, 240, 58, 14, '#a87949');
          ctx.strokeStyle = '#76502f'; ctx.lineWidth = 4;
          for (let x = 460; x < 675; x += 34) { ctx.beginPath(); ctx.moveTo(x, 332); ctx.lineTo(x, 386); ctx.stroke(); }
        }
        break;
      case '11':
        drawPath([[1080, 360], [890, 360], [730, 390], [570, 390], [430, 330], [330, 245], [225, 155], [220, 80], [220, 38]], 136);
        drawPath([[570, 390], [470, 425], [370, 500], [350, 600], [420, 675], [560, 680]], 126);
        break;
      case '16': drawPath([[560, 35], [470, 150], [340, 230], [245, 350], [270, 490], [390, 585], [485, 650], [560, 685]], 142); break;
      case '21': drawPath([[560, 40], [520, 170], [460, 285], [370, 370], [260, 390]], 144); break;
      case '06':
        drawPath([[220, 680], [255, 560], [335, 455], [420, 350], [500, 255], [560, 40]], 142);
        [[700,85],[1040,100],[1080,255],[690,300],[1030,650],[620,120]].forEach((p,i)=>tree(...p,1.15+(i%2)*.14));
        break;
      case '01':
        drawPath([[560, 685], [560, 590], [600, 500], [720, 440], [860, 390], [990, 360], [1080, 360]], 142);
        // A quiet, open clearing frames the shrine in the upper-right.
        [[700, 85], [1035, 105], [1080, 250], [685, 270], [1005, 650], [570, 120]].forEach((p, i) => tree(...p, .9 + (i % 2) * .12));
        break;
      case '02': drawPath([[40, 360], [190, 360], [340, 360], [500, 360], [660, 360], [800, 360], [1078, 360]], 142); break;
      case '03':
        ctx.fillStyle = '#5a6253'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#776f5b'; ctx.beginPath(); ctx.ellipse(560, 360, 535, 340, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#927f60'; ctx.beginPath(); ctx.ellipse(560, 360, 475, 285, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9a8966'; ctx.beginPath(); ctx.ellipse(565, 375, 345, 205, 0, 0, Math.PI * 2); ctx.fill();
        [[160,180,44],[320,115,34],[530,92,38],[790,115,48],[960,205,38],[1020,500,48],[800,605,38],[565,630,46],[330,585,40],[130,450,44]].forEach(([x,y,r],i)=>{ctx.fillStyle=i%2?'#615d50':'#6d6857';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b0a17c';ctx.lineWidth=5;ctx.stroke();});
        ctx.fillStyle = '#26332f'; ctx.beginPath(); ctx.ellipse(560, 170, 85, 48, 0, Math.PI, Math.PI * 2); ctx.fill();
        if (!s.giantDown) { ctx.font = '86px serif'; ctx.textAlign = 'center'; ctx.fillText('👹', 560, 360); }
        break;
      case '08': drawPath([[560, 40], [580, 160], [640, 270], [715, 380], [770, 500], [830, 680]], 142); break;
    }
  }

  function drawObject(object) {
    const selected = nearestObject()?.id === object.id;
    ctx.save(); ctx.translate(object.x, object.y);
    if (selected) { ctx.strokeStyle = '#fff7cb'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 15, object.r * 1.1, object.r * .62, 0, 0, Math.PI * 2); ctx.stroke(); }
    switch (object.id) {
      case 'home': drawHouse(0, 0, '#b76352', '', 1.15, true); break;
      case 'grandpa': drawHouse(0, 0, '#8c6947', '', 1.16); break;
      case 'gate':
        ctx.fillStyle = '#775332'; ctx.fillRect(-28, -46, 10, 92); ctx.fillRect(18, -46, 10, 92);
        ctx.fillStyle = s.gateOpen ? '#b5cc84' : '#ad8154'; ctx.fillRect(-18, -38, 36, 76);
        if (!s.gateOpen) { ctx.strokeStyle = '#f0d596'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -7, 9, Math.PI, 0); ctx.lineTo(9, 8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.stroke(); ctx.fillStyle = '#f0d596'; ctx.beginPath(); ctx.arc(0, 4, 3, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'northGate':
        ctx.fillStyle='#775332';ctx.fillRect(-35,-34,12,76);ctx.fillRect(23,-34,12,76);
        ctx.fillStyle=s.giantDown?'#b5cc84':'#ad8154';ctx.fillRect(-23,-28,46,62);
        ctx.fillStyle='#8c663e';ctx.fillRect(-23,-28,46,9);
        if(!s.giantDown){ctx.strokeStyle='#d8bd83';ctx.lineWidth=4;for(let x=-14;x<=14;x+=14){ctx.beginPath();ctx.moveTo(x,-18);ctx.lineTo(x,27);ctx.stroke();}}
        break;
      case 'thorns':
        if (!s.thorns) { for (let i = 0; i < 8; i++) { ctx.strokeStyle = i % 2 ? '#465e39' : '#607343'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-43 + i * 12, 25); ctx.bezierCurveTo(-25 + i * 8, -24, 8 + i * 4, 40, 39 - i * 8, -28); ctx.stroke(); } }
        break;
      case 'hut': drawHouse(0, 0, '#a98259', '', 1.5); ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.fillText('⚗️', 0, -34); break;
      case 'sunpetal': case 'bluebell': case 'mooncap': case 'lavender': case 'amberleaf': case 'fern': drawFlora(object.id, 0, 0); break;
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
    const scale = s.scene === 'basement' ? 1.2 : s.scene === 'interior' ? 1 : .82;
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(scale,scale);
    ctx.fillStyle = '#21362d48'; ctx.beginPath(); ctx.ellipse(0, 14, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5b4a3b'; ctx.beginPath(); ctx.arc(0, -7, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e3b77f'; ctx.beginPath(); ctx.arc(0, -6, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#416d52'; ctx.beginPath(); ctx.ellipse(0, 9, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d0a551'; ctx.fillRect(-9, 20, 7, 5); ctx.fillRect(2, 20, 7, 5);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.face === 'left' ? -3 : 3, -8, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawInteriorPerson(x, y, robe = '#617d63') {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#302e2a'; ctx.beginPath(); ctx.arc(0, -13, 18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e6bd94'; ctx.beginPath(); ctx.arc(0, -12, 13, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = robe; ctx.beginPath(); ctx.ellipse(0, 15, 20, 25, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawHutGuide() {
    for (const card of hutGuideCards) {
      const highlighted = Math.hypot(s.x-card.x,s.y-card.y) < 86;
      ctx.save();
      roundedRect(card.x-48,card.y-39,96,82,9,highlighted?'#fff0bf':'#78583b');
      roundedRect(card.x-42,card.y-33,84,70,6,highlighted?'#fff9e8':'#e6d6ad');
      ctx.save();ctx.translate(card.x,card.y-7);ctx.scale(.52,.52);drawFlora(card.id,0,0);ctx.restore();
      ctx.fillStyle='#425b48';ctx.font='800 11px Nunito';ctx.textAlign='center';ctx.fillText(flowerNames[card.id],card.x,card.y+30);
      if(highlighted){ctx.strokeStyle='#fff3b8';ctx.lineWidth=4;ctx.strokeRect(card.x-49,card.y-40,98,84);}
      ctx.restore();
    }
  }

  function drawInterior() {
    ctx.fillStyle = '#263b34'; ctx.fillRect(0, 0, W, H);
    roundedRect(100, 55, 920, 610, 28, '#e0c68f');
    roundedRect(124, 79, 872, 562, 18, s.interior === 'hut' ? '#b7a675' : '#bd9b66');
    // Broad top-down floorboards and perimeter walls make this read as a room.
    ctx.save(); ctx.beginPath(); ctx.roundRect(124, 79, 872, 562, 18); ctx.clip();
    for (let y=100;y<645;y+=66) {
      ctx.fillStyle = y%132 ? '#cba873' : '#d3b47d'; ctx.fillRect(128,y,864,62);
      ctx.strokeStyle = '#ae895b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(128,y+63); ctx.lineTo(992,y+63); ctx.stroke();
      for(let x=210+(Math.floor(y/66)%2)*90;x<990;x+=180){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+62);ctx.stroke();}
    }
    ctx.restore();
    ctx.strokeStyle = '#f0ddb0'; ctx.lineWidth = 13; ctx.strokeRect(124,79,872,562);

    if (s.interior === 'home') {
      roundedRect(205,150,255,150,15,'#775b43'); roundedRect(218,160,229,124,12,'#d9ccaa');
      if(Math.hypot(s.x-335,s.y-225)<130){ctx.strokeStyle='#fff1b9';ctx.lineWidth=5;ctx.strokeRect(200,145,265,160);}
      roundedRect(715,145,190,105,12,'#805e3e'); roundedRect(730,160,160,76,8,'#b98b55');
      roundedRect(270,420,245,120,18,'#6e8c68'); roundedRect(285,435,215,90,12,'#9db78a');
    } else if (s.interior === 'grandpa') {
      roundedRect(220,145,240,82,10,'#765238'); roundedRect(235,157,210,57,6,'#a77c4d');
      roundedRect(735,455,160,95,12,'#805a39'); roundedRect(750,467,130,70,6,'#a77c4d');
      // Basement stairs
      roundedRect(495,105,130,155,14,'#755238');
      for(let y=117;y<252;y+=19){ctx.strokeStyle='#d2b17c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(505,y);ctx.lineTo(615,y);ctx.stroke();}
      drawInteriorPerson(805,335,'#71846a');
      if(Math.hypot(s.x-560,s.y-178)<94){ctx.strokeStyle='#fff1b9';ctx.lineWidth=5;ctx.strokeRect(490,100,140,165);}
      if(Math.hypot(s.x-805,s.y-335)<125){ctx.strokeStyle='#fff1b9';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(805,350,39,52,0,0,Math.PI*2);ctx.stroke();}
    } else if (s.interior === 'hut') {
      drawHutGuide();
      ctx.fillStyle='#74563d';ctx.beginPath();ctx.ellipse(585,300,86,42,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#508b7c';ctx.beginPath();ctx.ellipse(585,290,68,31,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d7c091';ctx.fillRect(565,260,40,42);
      if(Math.hypot(s.x-585,s.y-300)<105){ctx.strokeStyle='#fff1b9';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(585,300,96,52,0,0,Math.PI*2);ctx.stroke();}
      if(Math.hypot(s.x-820,s.y-345)<110){ctx.strokeStyle='#fff1b9';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(820,355,35,49,0,0,Math.PI*2);ctx.stroke();}
      drawInteriorPerson(820,345,'#716483');
    }
    // Exterior doorway is always centered at the south wall.
    if(Math.hypot(s.x-560,s.y-620)<105){ctx.strokeStyle='#fff1b9';ctx.lineWidth=5;ctx.strokeRect(505,590,110,65);}
    ctx.fillStyle='#392f28';ctx.beginPath();ctx.roundRect(510,600,100,55,14,14);ctx.fill();
    ctx.fillStyle='#dfc181';ctx.beginPath();ctx.arc(590,628,5,0,Math.PI*2);ctx.fill();
    drawBoy();
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
    drawGround(); if (s.screen === '13') drawVillageFence(); drawRoomPath();
    if (s.screen === '13') drawVillageHomes();
    (roomObjects[s.screen] || []).filter((o) => getAvailableObjects().some((active) => active.id === o.id)).forEach(drawObject);
    if (s.scene === 'outside' || s.scene === 'cave') drawBoy();
    else if (s.scene === 'basement') drawBasement();
    else if (s.scene === 'interior') drawInterior();
    updateHud(); requestAnimationFrame(draw);
  }

  function circleHits(x, y, circles, radius = 14) {
    return circles.some(([cx, cy, cr]) => Math.hypot(x - cx, y - cy) < cr + radius);
  }

  function pointSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function hitsSegment(x, y, segment, radius = 15) {
    return pointSegmentDistance(x, y, ...segment) < radius;
  }

  function villageFenceBlocks(x, y) {
    if (s.screen !== '13') return false;
    const fence = [
      [100,100,770,100], [890,100,1020,100], [100,620,1020,620],
      [100,100,100,305], [100,415,100,620], [1020,100,1020,620]
    ];
    if (!s.giantDown) fence.push([770,100,890,100]);
    if (!s.gateOpen) fence.push([100,305,100,415]);
    return fence.some((line) => hitsSegment(x, y, line));
  }

  function solidCircles() {
    const treeEdges = [];
    const groundTrees = s.screen === '01'
      ? [[34,54],[1082,52],[32,657],[1080,652],[340,35],[780,676]]
      : [[34,54],[1082,52],[32,657],[1080,652],[340,35],[780,676],[1020,215],[140,510]];
    const sceneTrees = s.screen === '06'
      ? [[700,85],[1040,100],[1080,255],[690,300],[1030,650],[620,120]]
      : s.screen === '01'
        ? [[700,85],[1035,105],[1080,250],[685,270],[1005,650],[570,120]] : [];
    for (const [x,y] of [...groundTrees,...sceneTrees]) {
      if (x > 80 && x < W-80 && y > 80 && y < H-80) treeEdges.push([x,y,29]);
    }
    const fixed = {
      '13': [[560,280,47],[850,520,48],[265,205,43],[970,195,43],[275,560,43]],
      '11': s.thorns ? [] : [[225,155,48]],
      '21': [[250,390,58]],
      '06': [[850,195,48],[850,315,30]],
      '01': s.boulders ? [] : [[1000,360,47]],
      '03': [[750,360,55]],
      '08': []
    };
    const objects = fixed[s.screen] || [];
    const gate = s.screen === '13' && !s.gateOpen ? [[100,360,30]] : [];
    const northGate = s.screen === '13' && !s.giantDown ? [[830,100,30]] : [];
    return [...treeEdges, ...objects, ...gate, ...northGate];
  }

  function hitsWorldObject(x, y) {
    if (s.scene === 'outside') {
      if (villageFenceBlocks(x, y)) return true;
      if (circleHits(x, y, solidCircles())) return true;
    }
    if (s.scene === 'interior') {
      const furniture = s.interior === 'grandpa'
        ? [[340,185,63],[815,500,54],[560,180,35],[805,335,30]]
        : s.interior === 'home'
          ? [[335,225,82],[810,198,45],[392,480,57]]
          : [[585,300,55],[820,345,30],...hutGuideCards.map((c)=>[c.x,c.y,34])];
      if (circleHits(x,y,furniture,13)) return true;
    }
    if (s.scene === 'basement') {
      if (circleHits(x,y,[[270,204,40],[846,194,38],[250,435,25],[875,320,25],[760,525,25],[560,170,32]],14)) return true;
    }
    return false;
  }

  function transitionAtEdge(nx, ny) {
    const lanes = roomDoors[s.screen] || {};
    if (nx <= 28 && lanes.west != null && Math.abs(ny - lanes.west) < 90) return moveToRoom('west');
    if (nx >= W - 28 && lanes.east != null && Math.abs(ny - lanes.east) < 90) return moveToRoom('east');
    if (ny <= 28 && lanes.north != null && Math.abs(nx - lanes.north) < 105) return moveToRoom('north');
    if (ny >= H - 28 && lanes.south != null && Math.abs(nx - lanes.south) < 105) return moveToRoom('south');
    return false;
  }

  function move(dt) {
    if (modal.classList.contains('open')) return;
    if (!['outside','basement','interior'].includes(s.scene)) return;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a || keys.A) dx--;
    if (keys.ArrowRight || keys.d || keys.D) dx++;
    if (keys.ArrowUp || keys.w || keys.W) dy--;
    if (keys.ArrowDown || keys.s || keys.S) dy++;
    const length = Math.hypot(dx, dy) || 1; dx /= length; dy /= length;
    if (dx) s.face = dx < 0 ? 'left' : 'right';
    const step = s.speed * dt;
    let nx = s.x + dx * step, ny = s.y;

    if (s.scene === 'interior') {
      nx = clamp(nx, 140, 980);
      if (!hitsWorldObject(nx,ny)) s.x = nx;
      ny = clamp(s.y + dy * step, 95, 625);
      if (!hitsWorldObject(s.x,ny)) s.y = ny;
      return;
    }
    if (s.scene === 'basement') {
      nx = clamp(nx, 185, 935);
      if (!hitsWorldObject(nx,ny)) s.x = nx;
      ny = clamp(s.y + dy * step, 145, 585);
      if (!hitsWorldObject(s.x,ny)) s.y = ny;
      return;
    }

    const minX = 28, maxX = W - 28, minY = 28, maxY = H - 28;
    nx = clamp(nx, minX, maxX);
    const oldX = s.x;
    const returnAcrossVanishedLog = s.screen === '12' && s.logGone && oldX <= 430 && nx > 430;
    const offLogRiverEntry = s.screen === '12' && nx > 430 && nx < 690 && (s.y < 342 || s.y > 378);
    if (s.screen === '13' && !s.giantDown && ny < 118 && nx > 755 && nx < 905) {
      toast('The gate is locked from the other side.');
    } else if (!returnAcrossVanishedLog && !offLogRiverEntry && !(s.screen === '13' && !s.gateOpen && nx < 125 && ny > 290 && ny < 430) && !hitsWorldObject(nx,ny)) {
      s.x = nx;
    }

    ny = clamp(s.y + dy * step, minY, maxY);
    const riverOverlap = s.screen === '12' && s.x > 430 && s.x < 690;
    const onLog = ny >= 342 && ny <= 378;
    const riverBlocks = riverOverlap && !onLog;
    const crossedAfterLog = s.screen === '12' && s.logGone && s.x <= 430 && nx > 430;
    if (!riverBlocks && !crossedAfterLog && !(s.screen === '13' && !s.giantDown && ny < 118 && s.x > 755 && s.x < 905) && !hitsWorldObject(s.x,ny)) {
      s.y = ny;
    }

    if (s.screen === '12' && !s.logGone && oldX > 430 && s.x <= 430 && s.y >= 342 && s.y <= 378) {
      s.logGone = true;
      toast('You cross the river. The log drifts away.');
    }
    if (s.screen === '11' && s.logGone && s.x >= W - 34 && s.y > 270 && s.y < 450) {
      s.x = W - 34; toast('The log is gone. The crossing is one-way.'); return;
    }
    if (s.screen === '11' && !s.thorns && s.y <= 112 && s.x > 115 && s.x < 335) { s.y = 112; toast('The Vines block the north path.'); }
    if (s.screen === '01' && !s.boulders && s.x >= 920 && s.y > 280 && s.y < 440) { s.x = 920; toast('The boulders block the east path.'); }

    const reachedEdge = (s.x <= minX && dx < 0) || (s.x >= maxX && dx > 0) || (s.y <= minY && dy < 0) || (s.y >= maxY && dy > 0);
    if (reachedEdge) {
      const moved = transitionAtEdge(s.x,s.y);
      if (!moved) {
        s.x = clamp(s.x, minX + 2, maxX - 2);
        s.y = clamp(s.y, minY + 2, maxY - 2);
      }
    }
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
    if (s.scene === 'interior') {
      const near = (px, py, radius = 115) => Math.hypot(s.x - px, s.y - py) < radius;
      if (x > 495 && x < 625 && y > 590 && near(560, 620, 105)) { leaveInterior(); return; }
      if (s.interior === 'grandpa' && x > 485 && x < 635 && y > 100 && y < 265) {
        if (near(560, 180, 94)) { s.returnX = s.x; s.returnY = s.y; showBasement(); }
        return;
      }
      if (s.interior === 'grandpa' && Math.hypot(x-805,y-335)<58) {
        if (near(805,335,125)) openHouseTalk();
        return;
      }
      if (s.interior === 'hut' && Math.hypot(x-820,y-345)<58) {
        if (near(820,345,110)) talkToAlchemist();
        return;
      }
      if (s.interior === 'hut') {
        const card = hutGuideCards.find((entry) => Math.abs(x-entry.x)<48 && Math.abs(y-entry.y)<41);
        if (card && near(card.x,card.y,86)) {
          const requested = requiredFlowers.includes(card.id);
          const status = requested ? (s.flowers[card.id] ? 'This is one of the Alchemist’s requested ingredients, and you have collected it.' : 'This is one of the Alchemist’s requested ingredients.') : 'This flower is in the field guide, but is not on the Alchemist’s list this time.';
          simpleModal(flowerNames[card.id], card.id==='fern'?'🌿':'🌸', `${flowerDetails[card.id]} ${status}`);
        }
        return;
      }
      if (s.interior === 'home' && x > 205 && x < 465 && y > 145 && y < 310) {
        if (near(335,225,130)) simpleModal('A Cozy Bed', '🛏️', 'A soft place to rest.');
        return;
      }
      if (s.interior === 'hut' && x > 500 && x < 670 && y > 245 && y < 350) {
        if (near(585,300,105)) simpleModal('Bubbling Cauldron', '⚗️', 'The cauldron is ready for a potion.');
        return;
      }
      return;
    }
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
          }, true);
        }
        return;
      }
      if (Math.hypot(x - 560, y - 170) < 58) {
        if (Math.hypot(s.x - 560, s.y - 175) < 88) exitBasement();
      }
      return;
    }
    if (s.scene !== 'outside') return;
    const object = getAvailableObjects()
      .map((o) => ({ ...o, distance: Math.hypot(x - o.x, y - o.y) }))
      .filter((o) => o.distance < o.r + 12)
      .sort((a, b) => a.distance - b.distance)[0];
    if (object && nearestObject()?.id === object.id && Math.hypot(s.x - object.x, s.y - object.y) < object.r + 28) interact(object);
  });

  document.querySelectorAll('.touch button').forEach((button) => {
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[button.dataset.dir];
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); keys[key] = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => button.addEventListener(name, () => { keys[key] = false; }));
  });
  updateHud();
})();
