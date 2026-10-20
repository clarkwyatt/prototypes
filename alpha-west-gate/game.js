(() => {
  const canvas = document.querySelector('#world');
  const ctx = canvas.getContext('2d');
  const game = document.querySelector('#game');
  const questEl = document.querySelector('#quest');
  const itemsEl = document.querySelector('#items');
  const modal = document.querySelector('#modal');
  const toastEl = document.querySelector('#toast');
  const W = 1120, H = 720;
  let dpr = 1, toastTimer = 0;
  const keys = {};

  const s = {
    screen: '13', x: 605, y: 335, face: 'down', speed: 215,
    scene: 'outside', interior: '', rodents: 0, rodentQuestStarted: false, mice: [], basementEntered: false,
    returnX: 0, returnY: 0, outsideX: 0, outsideY: 0,
    flowers: { sunpetal: false, bluebell: false, mooncap: false, lavender: false, amberleaf: false, fern: false }, alchemistTalked: false, vinesStarted: false,
    key: false, gateOpen: false, logGone: false, potion: false,
    thorns: false, returned: false
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
    '06': { south: '11', north: '08' },
    '08': { north: '06', south: '13' }
  };

  // Each exit is placed where the hand-drawn path meets the edge of its panel.
  const roomDoors = {
    '13': { west: 360, north: 830 }, '12': { east: 360, west: 360 },
    '11': { east: 360, north: 220, south: 560 }, '16': { north: 560, south: 560 },
    '21': { north: 560 }, '06': { south: 220, north: 560 }, '08': { north: 560, south: 830 }
  };

  const roomObjects = {
    '13': [
      { id: 'home', name: 'Your Home', x: 560, y: 280, r: 57 },
      { id: 'grandpa', name: 'Grandfather’s House', x: 850, y: 520, r: 58 },
      { id: 'villageGrandma', name: 'Grandma', x: 930, y: 455, r: 42, description: 'Grandma enjoys the sun outside Grandfather’s house. Her flower basket smells of mint and wild thyme.' },
      { id: 'villagerMara', name: 'Mara the Gardener', x: 405, y: 245, r: 38, description: 'Mara tends the village garden and knows every flower along the paths.' },
      { id: 'villagerPip', name: 'Pip', x: 670, y: 545, r: 36, description: 'Pip collects river stones and keeps the shiniest one in a tiny pocket.' },
      { id: 'villagerTomas', name: 'Tomas the Baker', x: 320, y: 405, r: 39, description: 'Tomas is the village baker. A warm berry bun is cooling in his basket.' },
      { id: 'gate', name: 'West Gate', x: 90, y: 360, r: 44 },
      { id: 'northGate', name: 'North Gate', x: 830, y: 80, r: 48, description: 'A weathered gate with little brass stars hammered into its posts.' },
      { id: 'well', name: 'Wishing Well', x: 710, y: 245, r: 34, description: 'Coins glimmer beneath the clear water. Someone wished for a safe journey.' },
      { id: 'garden', name: 'Grandma’s Herb Garden', x: 450, y: 330, r: 48, description: 'Mint, thyme, and tiny blue flowers grow together in the sunny garden.' },
      { id: 'berryBush', name: 'Berry Bush', x: 785, y: 545, r: 38, description: 'A few ripe red berries hide beneath the glossy leaves. Birds have been here too.' },
      { id: 'villageOak', name: 'Old Village Oak', x: 140, y: 510, r: 48, description: 'The oak’s knotted roots make a perfect seat. A tiny wooden bird is tucked into its bark.' }
    ],
    '12': [
      { id: 'riverReeds', name: 'River Reeds', x: 735, y: 170, r: 38, description: 'The reeds whisper as the river bends around the stones. A dragonfly rests on one leaf.' },
      { id: 'riverStone', name: 'Old River Stone', x: 370, y: 520, r: 32, description: 'A smooth stone has a spiral carved into it. The river has polished it for years.' },
      { id: 'riverWillow', name: 'River Willow', x: 180, y: 210, r: 48, description: 'Long branches dip toward the water. A nest rests safely between the leaves.' }
    ],
    '11': [
      { id: 'thorns', name: 'Thorny Vines', x: 225, y: 155, r: 82 },
      { id: 'fallenLog', name: 'Fallen Log', x: 815, y: 560, r: 44, description: 'Moss covers the fallen log. Little white mushrooms peek out from underneath.' },
      { id: 'mossyMarker', name: 'Mossy Waystone', x: 660, y: 205, r: 34, description: 'An old waystone bears a faded arrow and a carving of a crescent moon.' },
      { id: 'forestOak', name: 'Bent Forest Oak', x: 945, y: 485, r: 48, description: 'One crooked branch points north, as if the old tree is showing the way.' }
    ],
    '16': [
      { id: 'oldOak', name: 'Old Oak', x: 835, y: 190, r: 48, description: 'This oak is so old its roots rise above the earth like a little wooden bridge.' },
      { id: 'stoneRing', name: 'Stone Circle', x: 760, y: 490, r: 42, description: 'Three small stones form a ring. Wildflowers grow where a fourth stone once stood.' }
    ],
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
      { id: 'pond', name: 'Moonlit Pond', x: 820, y: 500, r: 50, description: 'Even in daylight, the pond reflects a pale moon-shaped patch of sky.' },
      { id: 'mushrooms', name: 'Twilight Mushrooms', x: 730, y: 200, r: 34, description: 'These tiny violet mushrooms glow softly beneath the trees.' },
      { id: 'moonTree', name: 'Silverleaf Tree', x: 700, y: 85, r: 48, description: 'Pale leaves catch the light like little pieces of the moon.' }
    ],
    '08': [
      { id: 'signpost', name: 'Old Signpost', x: 390, y: 310, r: 36, description: 'The painted arrows point to the village, the meadow, and a place marked only with a star.' },
      { id: 'ruin', name: 'Overgrown Arch', x: 875, y: 245, r: 46, description: 'Vines curl around the ancient stone arch. A warm breeze hums through its opening.' },
      { id: 'appleTree', name: 'Wild Apple Tree', x: 945, y: 485, r: 48, description: 'Small red apples peek between the leaves. One has a tiny bite taken out of it.' }
    ]
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
    itemsEl.textContent = inventory.length ? inventory.join(' · ') : 'Empty';

    let quest = '';
    if (!s.rodentQuestStarted) quest = '<strong>First Steps</strong>Explore the Village';
    else if (!s.key && s.rodents < 5) quest = `<strong>Quest</strong>Catch 5 rodents: ${s.rodents}/5`;
    else if (!s.gateOpen && !s.key && s.rodents >= 5) quest = '<strong>Quest</strong>Talk to Grandfather.';
    else if (s.key && !s.gateOpen) quest = '<strong>Quest</strong>Unlock the West Gate';
    else if (s.gateOpen && !s.vinesStarted) quest = '<strong>Quest</strong>Investigate the Vines';
    else if (s.vinesStarted && !s.alchemistTalked) quest = '<strong>Quest</strong>Find a way to remove the Vines.';
    else if (s.vinesStarted && s.alchemistTalked && !s.potion && !s.thorns) {
      const count = requiredFlowers.filter((id) => s.flowers[id]).length;
      quest = count < 3
        ? `<strong>Quest</strong>${requiredFlowers.map((id) => `1 ${flowerNames[id]} ${s.flowers[id] ? '1/1' : '0/1'}`).join(' · ')}`
        : '<strong>Quest</strong>Talk to the Alchemist for the potion.';
    }
    else if (s.vinesStarted && s.potion && !s.thorns) quest = '<strong>Quest</strong>Use the potion on the Vines.';
    else if (s.thorns && !s.returned) quest = '<strong>Quest</strong>Follow the path back to the village.';
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

  function objectOptions(title, emoji, description, actions = []) {
    openModal(title, emoji, '', () => {
      makeButton('EXAMINE', () => simpleModal(title, emoji, description), true);
      for (const action of actions) {
        makeButton(action.label, () => { closeModal(); action.run(); });
      }
    }, true);
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
    if (!s.rodentQuestStarted) {
      s.rodentQuestStarted = true;
      updateHud();
      openModal('Grandfather', '🧓', '<p>Would you help me with a little problem in the basement? There are five cheeky rodents down there.</p>', () => makeButton('I’ll help!', closeModal), true);
      return;
    }
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
    const ingredients = requiredFlowers.map((id) => `1 ${flowerNames[id]}`);
    const requested = ingredients.length < 2
      ? ingredients[0]
      : `${ingredients.slice(0, -1).join(', ')} and ${ingredients[ingredients.length - 1]}`;
    updateHud();
    if (count < 3) {
      openModal('The Alchemist', '🧙', `<p>Please bring me ${requested}.</p>`, () => makeButton('I’ll look for them', closeModal), true);
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
    // Arrive below the stair collision so the player can move freely upstairs.
    s.x = 560; s.y = 280;
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
    if (entrySide === 'west') { s.x = 98; s.y = lane ?? H / 2; }
    if (entrySide === 'east') { s.x = W - 98; s.y = lane ?? H / 2; }
    if (entrySide === 'north') { s.x = lane ?? W / 2; s.y = 65; }
    if (entrySide === 'south') { s.x = lane ?? W / 2; s.y = H - 65; }
    updateHud();
    if (id === '13' && s.thorns && !s.returned) {
      s.returned = true;
      updateHud();
      setTimeout(() => simpleModal('Back in the Village', '🏘️', 'The Vines have overtaken the village.'), 180);
    }
  }

  function getAvailableObjects() {
    return (roomObjects[s.screen] || []).filter((object) => {
      if (object.id === 'gate') return true;
      if (object.id === 'thorns') return !s.thorns;
      if (object.id in s.flowers) return !requiredFlowers.includes(object.id) || !s.flowers[object.id];
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
    if (!object) return;
    switch (object.id) {
      case 'home':
        objectOptions('Your Home', '🏠', 'A small house in the village.', [{ label: 'ENTER', run: () => enterInterior('home') }]);
        break;
      case 'grandpa':
        objectOptions('Grandfather’s House', '🏠', 'Grandfather lives here.', [{ label: 'ENTER', run: () => enterInterior('grandpa') }]);
        break;
      case 'villageGrandma':
        objectOptions('Grandma', '👵', object.description, [{ label: 'TALK', run: () => simpleModal('Grandma', '👵', 'Your grandfather is downstairs with the rodents. I’ll keep an eye on the village while you help him!') }]);
        break;
      case 'villagerMara':
        objectOptions('Mara the Gardener', '🌼', 'Mara tends the village garden and knows every flower along the paths.', [{ label: 'TALK', run: () => simpleModal('Mara the Gardener', '🌼', 'The meadow flowers are prettiest where the morning sun reaches them.') }]);
        break;
      case 'villagerPip':
        objectOptions('Pip', '🧢', 'A young villager with a pocket full of interesting things.', [{ label: 'TALK', run: () => simpleModal('Pip', '🧢', 'I found a shiny pebble by the river. I’m saving it for my collection!') }]);
        break;
      case 'villagerTomas':
        objectOptions('Tomas the Baker', '🥖', 'The village baker is taking a break outside the bakery.', [{ label: 'TALK', run: () => simpleModal('Tomas the Baker', '🥖', 'The berry buns are still warm. I hope you get to try one!') }]);
        break;
      case 'gate':
        objectOptions('West Gate', '🚪', 'A wooden gate marks the western exit from the village.', s.gateOpen ? [] : [{
          label: s.key ? 'UNLOCK' : 'TRY GATE',
          run: () => {
            if (!s.key) simpleModal('The West Gate is locked', '🚪', 'The gate is locked. You need a key.');
            else { s.key = false; s.gateOpen = true; toast('The key opens the West Gate.'); updateHud(); }
          }
        }]);
        break;
      case 'northGate':
        objectOptions('Gate', '🚪', 'A sturdy gate blocks the path back to the village.', s.thorns ? [] : [{
          label: 'TRY GATE',
          run: () => simpleModal('Gate', '🚪', 'The gate is locked from the other side.')
        }]);
        break;
      case 'thorns':
        s.vinesStarted = true;
        updateHud();
        objectOptions('Thorny Vines', '🌿', 'A dense wall of thorny vines covers the path. The tangled stems cannot be pulled apart by hand.', [{
          label: 'USE POTION',
          run: () => {
            if (!s.potion) { simpleModal('Thorny Vines', '🌿', 'You need a Vine Potion to clear the Vines.'); return; }
            s.potion = false; s.thorns = true;
            toast('The potion clears the Vines. The sky grows dim…');
            updateHud();
          }
        }]);
        break;
      case 'hut':
        objectOptions('Alchemist’s Hut', '⚗️', 'A small hut where the Alchemist brews potions.', [{ label: 'ENTER', run: () => enterInterior('hut') }]);
        break;
      case 'well': case 'garden': case 'berryBush': case 'riverReeds': case 'riverStone': case 'fallenLog': case 'mossyMarker': case 'oldOak': case 'stoneRing': case 'pond': case 'mushrooms': case 'signpost': case 'ruin': case 'villageOak': case 'riverWillow': case 'forestOak': case 'moonTree': case 'appleTree':
        objectOptions(object.name, object.id==='pond'?'💧':object.id==='mushrooms'?'🍄':'✦', object.description);
        break;
      case 'sunpetal': case 'bluebell': case 'mooncap': case 'lavender': case 'amberleaf': case 'fern': {
        const description = flowerDetails[object.id] || 'A little piece of local plant life.';
        const actions = requiredFlowers.includes(object.id) && s.alchemistTalked && !s.flowers[object.id]
          ? [{ label: 'PICK', run: () => { s.flowers[object.id] = true; toast(`${object.name} collected.`); updateHud(); } }]
          : [];
        objectOptions(object.name, object.id === 'fern' ? '🌿' : '🌸', description, actions);
        break;
      }
    }
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
    if (s.screen === '13' && direction === 'north' && !s.thorns) {
      toast('The gate is locked from the other side.'); return false;
    }
    if (s.screen === '12' && direction === 'west' && !s.logGone) {
      toast('Cross the river on the log.'); return false;
    }
    if (s.screen === '11' && direction === 'east' && s.logGone) { toast('The log is gone. The crossing is one-way.'); return false; }
    if (s.screen === '11' && direction === 'north' && !s.thorns) { toast('The thorny vines block the north path.'); return false; }
    let entering = { west: 'east', east: 'west', north: 'south', south: 'north' }[direction];
    enterRoom(next, entering);
    return true;
  }

  function roundedRect(x, y, w, h, r, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  }

  function tree(x, y, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = '#233b2a44'; ctx.beginPath(); ctx.ellipse(5, 29, 34, 13, 0, 0, Math.PI * 2); ctx.fill();
    const bark = ctx.createLinearGradient(-10, 0, 12, 0); bark.addColorStop(0, '#65432f'); bark.addColorStop(.5, '#aa7142'); bark.addColorStop(1, '#563c2e');
    ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(-10, 27); ctx.lineTo(-8, -3); ctx.lineTo(-2, -12); ctx.lineTo(8, -12); ctx.lineTo(12, 28); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d09458'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, 20); ctx.lineTo(-1, -3); ctx.moveTo(5, 23); ctx.lineTo(4, -4); ctx.stroke();
    const canopy = ctx.createRadialGradient(-8, -35, 5, 0, -24, 49); canopy.addColorStop(0, '#9acb73'); canopy.addColorStop(.52, '#4f9858'); canopy.addColorStop(1, '#286b49');
    [[-17,-19,28], [12,-22,32], [-3,-43,30], [0,-13,26]].forEach(([cx,cy,r]) => { ctx.fillStyle=canopy; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#c4dd8b77'; ctx.beginPath(); ctx.ellipse(-11,-44,13,5,-.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#386f49'; for(let i=0;i<10;i++){const a=i*2.4,r=15+(i%3)*7;ctx.beginPath();ctx.arc(Math.cos(a)*r,-28+Math.sin(a)*r*.66,2,0,Math.PI*2);ctx.fill();}
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
      ctx.beginPath(); ctx.ellipse(x + Math.cos(i * 1.256) * 6, y + Math.sin(i * 1.256) * 6, 4, 5, i * 1.256, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }

  function drawPath(points, width = 88, colors = ['#254c31', '#315d39', '#3d6d43']) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor='#1b3e2d66';ctx.shadowBlur=12;ctx.shadowOffsetY=8;
    ctx.strokeStyle = '#203e2f'; ctx.lineWidth = width + 26;
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i], next = points[i + 1];
      ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
    }
    ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
    ctx.stroke(); ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle = colors[0]; ctx.lineWidth = width + 8; ctx.stroke();
    ctx.strokeStyle = colors[1]; ctx.lineWidth = width - 8; ctx.stroke();
    ctx.strokeStyle = colors[2]; ctx.lineWidth = width - 24; ctx.stroke();
    // Soft stepping-stone flecks break up the broad path while keeping its dark-green color.
    const count=Math.max(18,Math.floor(points.reduce((n,p,i)=>i?n+Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1]):n,0)/30));
    for(let i=0;i<count;i++){const t=(i+.5)/count,seg=Math.min(points.length-2,Math.floor(t*(points.length-1))),u=t*(points.length-1)-seg,a=points[seg],b=points[seg+1],x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u;ctx.fillStyle=i%3?'#99ad7a22':'#b8c38b24';ctx.beginPath();ctx.ellipse(x+Math.sin(i*9)*width*.19,y+Math.cos(i*7)*width*.19,4+(i%3),2.5,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }

  function drawHouse(x, y, roof, label, scale = 1, peaked = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle='#243a2c44';ctx.beginPath();ctx.ellipse(7,51,58,13,0,0,Math.PI*2);ctx.fill();
    const wall=ctx.createLinearGradient(-45,0,45,0);wall.addColorStop(0,'#694b39');wall.addColorStop(.5,'#9c7150');wall.addColorStop(1,'#674736');
    ctx.fillStyle=wall;ctx.fillRect(-43,-7,86,56);
    ctx.fillStyle='#d5a775';ctx.fillRect(-43,-7,86,7);
    if(peaked){
      ctx.fillStyle='#704739';ctx.beginPath();ctx.moveTo(-57,-5);ctx.lineTo(0,-53);ctx.lineTo(57,-5);ctx.closePath();ctx.fill();
      const roofGrad=ctx.createLinearGradient(0,-50,0,0);roofGrad.addColorStop(0,roof);roofGrad.addColorStop(1,'#783f3a');ctx.fillStyle=roofGrad;ctx.beginPath();ctx.moveTo(-51,-8);ctx.lineTo(0,-47);ctx.lineTo(51,-8);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#e09a7566';ctx.lineWidth=2;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*9,-11-Math.abs(i)*5);ctx.lineTo(i*9,-14-Math.abs(i)*5);ctx.stroke();}
      ctx.fillStyle='#6a4634';ctx.fillRect(27,-48,10,23);ctx.fillStyle='#d5a775';ctx.fillRect(25,-51,14,5);
    } else {
      ctx.fillStyle='#5d4034';ctx.fillRect(-50,-19,100,18);
      const roofGrad=ctx.createLinearGradient(0,-19,0,0);roofGrad.addColorStop(0,roof);roofGrad.addColorStop(1,'#745439');ctx.fillStyle=roofGrad;ctx.fillRect(-48,-17,96,13);
      ctx.strokeStyle='#e0bd7c66';ctx.lineWidth=2;for(let xx=-42;xx<45;xx+=14){ctx.beginPath();ctx.moveTo(xx,-16);ctx.lineTo(xx+9,-5);ctx.stroke();}
    }
    for(const wx of [-31,21]){ctx.fillStyle='#4b3c34';ctx.fillRect(wx-2,5,21,22);ctx.fillStyle='#8dd3dd';ctx.fillRect(wx,7,17,17);ctx.fillStyle='#d9b781';ctx.fillRect(wx+7,7,3,17);ctx.fillRect(wx,14,17,2);ctx.fillStyle='#6c5038';ctx.fillRect(wx-4,3,3,26);ctx.fillRect(wx+19,3,3,26);}
    ctx.fillStyle='#563b30';ctx.fillRect(-12,14,24,35);ctx.fillStyle='#d9b476';ctx.fillRect(-9,17,18,31);ctx.fillStyle='#8acbd0';ctx.fillRect(-5,20,10,10);ctx.fillStyle='#805536';ctx.beginPath();ctx.arc(6,35,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#405d3c';ctx.fillRect(-45,34,4,11);ctx.fillRect(41,34,4,11);ctx.fillStyle='#dd9971';ctx.beginPath();ctx.arc(-43,31,5,0,Math.PI*2);ctx.arc(43,31,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#4c6d45';for(const px of [-48,48]){ctx.beginPath();ctx.ellipse(px,39,7,4,0,0,Math.PI*2);ctx.fill();}
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

  function drawVillager(x, y, style, label) {
    const palettes=[
      { coat:'#d77c5d',trim:'#f2c575',hair:'#684734',hat:'#f1cb77' },
      { coat:'#668fba',trim:'#e7bd6e',hair:'#5b4639',hat:'#d98b66' },
      { coat:'#789b64',trim:'#f2d28b',hair:'#704937',hat:'#e2a86f' },
      { coat:'#9a79ad',trim:'#edd18b',hair:'#463a36',hat:'#82a56b' },
      { coat:'#8d687f',trim:'#f3d48f',hair:'#f0e2c0',hat:'#788c5d' }
    ][Math.min(style,4)];
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#20392d3d';ctx.beginPath();ctx.ellipse(0,18,21,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#493b31';ctx.beginPath();ctx.ellipse(0,-8,14,15,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f2c99d';ctx.beginPath();ctx.ellipse(0,-5,10,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=palettes.hair;ctx.beginPath();ctx.arc(0,-11,11,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-10,-12,4,10);
    ctx.fillStyle='#3e342e';ctx.beginPath();ctx.arc(-3,-5,1.2,0,Math.PI*2);ctx.arc(4,-5,1.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b76f61';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(.5,-1,3,.15,Math.PI-.15);ctx.stroke();
    ctx.fillStyle=palettes.coat;ctx.beginPath();ctx.moveTo(-13,6);ctx.quadraticCurveTo(-18,9,-18,23);ctx.quadraticCurveTo(0,30,18,23);ctx.quadraticCurveTo(17,9,13,6);ctx.quadraticCurveTo(0,13,-13,6);ctx.fill();
    ctx.fillStyle=palettes.trim;ctx.beginPath();ctx.ellipse(0,21,17,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#80533a';ctx.fillRect(-11,24,8,5);ctx.fillRect(4,24,8,5);
    if(style===4){ctx.fillStyle=palettes.hair;ctx.beginPath();ctx.arc(10,-13,5,0,Math.PI*2);ctx.fill();ctx.fillStyle=palettes.hat;ctx.beginPath();ctx.ellipse(0,-15,16,5,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-10,-20,20,5);ctx.fillStyle='#d8b779';ctx.beginPath();ctx.arc(0,-18,2.4,0,Math.PI*2);ctx.fill();}else{ctx.fillStyle=palettes.hat;ctx.beginPath();ctx.ellipse(0,-15,16,5,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-10,-20,20,5);}
    ctx.fillStyle='#fff8e8';ctx.font='800 12px Nunito, system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#294739cc';ctx.strokeText(label,0,47);ctx.fillText(label,0,47);
    ctx.restore();
  }

  function drawGround() {
    const palettes={
      '13':['#b7d794','#78ad70'],'12':['#afd493','#78ad70'],'11':['#b7d996','#7aaa70'],
      '16':['#b1d28b','#76a96d'],'21':['#c4dfa0','#85b877'],'06':['#94c27c','#568f62'],'08':['#b9d995','#7daf70']
    };
    const colors=palettes[s.screen]||palettes['13'];
    const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, colors[0]); grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    const glow=ctx.createRadialGradient(250,110,12,430,280,780);glow.addColorStop(0,'#fff5c326');glow.addColorStop(1,'#ffffff00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    // Fine, varied grass tufts create texture without competing with the paths or characters.
    for(let i=0;i<190;i++){
      const x=(i*193+47)%W,y=(i*127+23)%H;
      ctx.strokeStyle=i%3?'#426f483b':'#e2edb445';ctx.lineWidth=i%5===0?2:1.4;ctx.beginPath();ctx.moveTo(x,y+5);ctx.quadraticCurveTo(x-4,y-2,x-6,y-7);ctx.moveTo(x,y+5);ctx.quadraticCurveTo(x+1,y-3,x+5,y-9);ctx.stroke();
    }
    ctx.globalAlpha=1;
    for(let i=0;i<35;i++){
      const x=(i*281+92)%W,y=(i*163+74)%H;
      if(s.screen==='13'&&x>730&&y<145)continue;
      if(i%3===0)flower(x,y,['#fff2cc','#f4c76a','#d88c9a'][i%3]);
    }
    // A softly shaded frame keeps the playable area readable on every panel.
    const vignette=ctx.createRadialGradient(W/2,H/2,230,W/2,H/2,760);vignette.addColorStop(0,'#163b2b00');vignette.addColorStop(1,'#163b2b30');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  }

  function drawEdgeTrees() {
    const treePoints = [[34, 54], [1082, 52], [32, 657], [1080, 652], [340, 35], [780, 676], [1020, 215], [140, 510], [250, 80], [900, 660]];
    treePoints.forEach((point, i) => tree(...point, 1.15 + (i % 3) * .12));
    if (s.screen !== '13') { tree(180,210,1.08); tree(945,485,1.24); tree(380,620,1.12); }
  }

  function drawVillageHomes() {
    drawHouse(265, 205, '#897553', '', 1.24);
    // A tiny shared garden gives the village its own landmark between the homes.
    ctx.fillStyle='#314b3540';ctx.beginPath();ctx.ellipse(710,255,55,25,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#76543a';ctx.beginPath();ctx.ellipse(710,248,45,24,0,0,Math.PI*2);ctx.fill();
    const water=ctx.createLinearGradient(0,225,0,268);water.addColorStop(0,'#8fd3d2');water.addColorStop(1,'#4c9da7');ctx.fillStyle=water;ctx.beginPath();ctx.ellipse(710,243,34,14,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d9bd84';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(681,226);ctx.lineTo(739,226);ctx.stroke();
    ctx.fillStyle='#735038';ctx.fillRect(678,212,7,34);ctx.fillRect(735,212,7,34);ctx.fillStyle='#b08351';ctx.fillRect(674,208,72,7);
    ctx.strokeStyle='#9a6d45';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(688,239);ctx.lineTo(688,225);ctx.lineTo(732,225);ctx.lineTo(732,239);ctx.stroke();
    [[430,320],[480,306],[453,345],[768,530],[800,542],[770,564]].forEach(([x,y],i)=>{
      ctx.fillStyle='#355f3d88';ctx.beginPath();ctx.ellipse(x,y+6,19,9,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=['#5c9656','#75a95f','#4b844d'][i%3];ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.arc(x+12,y+3,10,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#b7cc82';ctx.beginPath();ctx.ellipse(x-4,y-4,5,2,-.5,0,Math.PI*2);ctx.fill();
    });
  }

  function riverCenter(y) { return 560 + Math.sin((y - 105) / 118) * 42 + Math.sin(y / 71) * 12; }

  function drawWindingRiver() {
    const left = [], right = [];
    for (let y = -20; y <= H + 20; y += 22) { const c = riverCenter(y); left.push([c - 112, y]); right.push([c + 112, y]); }
    ctx.save(); ctx.beginPath(); ctx.moveTo(...left[0]); for (let i=1;i<left.length;i++) ctx.lineTo(...left[i]);
    for (let i=right.length-1;i>=0;i--) ctx.lineTo(...right[i]); ctx.closePath();
    ctx.fillStyle='#416e61';ctx.fill();ctx.strokeStyle='#d0d59b';ctx.lineWidth=16;ctx.stroke();
    ctx.strokeStyle='#8fc9c2';ctx.lineWidth=5;ctx.stroke();
    for(let y=18;y<H;y+=74){const c=riverCenter(y);ctx.strokeStyle='#c2ece0aa';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(c-75,y);ctx.bezierCurveTo(c-40,y+12,c+35,y-13,c+78,y+2);ctx.stroke();}
    ctx.restore();
  }

  function drawRoomPath() {
    switch (s.screen) {
      case '13': drawPath([[90, 360], [190, 360], [320, 520], [510, 540], [700, 500], [820, 390], [790, 265], [785, 165], [830, 40]], 180); break;
      case '12':
        drawPath([[1080, 360], [900, 360], [760, 360], [660, 360], [560, 360], [460, 360], [330, 360], [180, 360], [40, 360]], 180);
        drawWindingRiver();
        if (!s.logGone) {
          const rc=riverCenter(360); roundedRect(rc-132, 322, 264, 76, 18, '#68452f');
          roundedRect(rc-120, 330, 240, 58, 14, '#a87949');
          ctx.strokeStyle = '#76502f'; ctx.lineWidth = 4;
          for (let x = rc-100; x < rc+120; x += 34) { ctx.beginPath(); ctx.moveTo(x, 332); ctx.lineTo(x, 386); ctx.stroke(); }
        }
        break;
      case '11':
        drawPath([[1080, 360], [890, 360], [730, 390], [570, 390], [430, 330], [330, 245], [225, 155], [220, 80], [220, 38]], 174);
        drawPath([[570, 390], [470, 425], [370, 500], [350, 600], [420, 675], [560, 680]], 164);
        break;
      case '16': drawPath([[560, 35], [470, 150], [340, 230], [245, 350], [270, 490], [390, 585], [485, 650], [560, 685]], 180); break;
      case '21': drawPath([[560, 40], [520, 170], [460, 285], [370, 370], [260, 390]], 460, ['#254c31', '#315d39', '#3d6d43']); break;
      case '06':
        drawPath([[220, 680], [255, 560], [335, 455], [420, 350], [500, 255], [560, 40]], 180);
        break;
      case '08': drawPath([[560, 40], [585, 155], [630, 270], [690, 385], [750, 510], [830, 680]], 180); break;
    }
  }

  function drawWorldProp(id) {
    ctx.save();
    if(id==='well') { ctx.fillStyle='#3a5844';ctx.beginPath();ctx.ellipse(0,12,40,19,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#786047';ctx.beginPath();ctx.ellipse(0,0,35,22,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#68a9a6';ctx.beginPath();ctx.ellipse(0,-4,27,13,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#dcc391';ctx.lineWidth=5;ctx.strokeRect(-30,-20,60,8);ctx.fillStyle='#795638';ctx.fillRect(-28,-29,5,32);ctx.fillRect(23,-29,5,32);ctx.fillRect(-35,-33,70,7); }
    else if(id==='garden'||id==='berryBush'||id==='mushrooms'||id==='riverReeds') { for(let i=0;i<6;i++){let x=(i-2.5)*12,y=(i%2)*5;ctx.fillStyle=id==='berryBush'?'#477a45':id==='mushrooms'?'#5c8047':'#4e8a55';ctx.beginPath();ctx.ellipse(x,y,12,18,(i%3-.8)*.35,0,Math.PI*2);ctx.fill();if(id==='berryBush'){ctx.fillStyle=i%2?'#c95058':'#d96161';ctx.beginPath();ctx.arc(x+4,y-6,3.5,0,Math.PI*2);ctx.fill();}if(id==='mushrooms'){ctx.fillStyle='#eee2c4';ctx.fillRect(x-2,y-4,4,13);ctx.fillStyle='#9e75b8';ctx.beginPath();ctx.ellipse(x,y-5,8,5,0,Math.PI,Math.PI*2);ctx.fill();}} }
    else if(id==='riverStone'||id==='stoneRing'||id==='mossyMarker'){ctx.fillStyle='#3e6148';ctx.beginPath();ctx.ellipse(0,14,30,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8c9581';ctx.beginPath();ctx.moveTo(-23,12);ctx.lineTo(-18,-14);ctx.lineTo(-6,-23);ctx.lineTo(19,-17);ctx.lineTo(25,12);ctx.closePath();ctx.fill();ctx.strokeStyle='#c7c5a2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-6);ctx.quadraticCurveTo(2,-16,13,-5);ctx.stroke();ctx.fillStyle='#6f9660';ctx.beginPath();ctx.ellipse(-7,-16,7,3,-.5,0,Math.PI*2);ctx.fill();}
    else if(id==='fallenLog'||id==='oldOak'){ctx.fillStyle='#435744';ctx.beginPath();ctx.ellipse(0,16,42,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#80583b';ctx.beginPath();ctx.ellipse(0,0,39,15,-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#bb8a58';ctx.beginPath();ctx.ellipse(28,-1,8,13,-.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#56754c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-22,-8);ctx.quadraticCurveTo(0,-20,19,-7);ctx.stroke();}
    else if(id==='pond'){ctx.fillStyle='#385f4a';ctx.beginPath();ctx.ellipse(0,10,48,28,-.12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a9fa0';ctx.beginPath();ctx.ellipse(0,0,40,20,-.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#bfe4c5';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(-6,-2,19,7,0,0,Math.PI*2);ctx.stroke();}
    else if(id==='signpost'){ctx.fillStyle='#614932';ctx.fillRect(-4,-5,8,43);ctx.fillStyle='#a77a4c';ctx.beginPath();ctx.moveTo(-28,-23);ctx.lineTo(25,-23);ctx.lineTo(35,-12);ctx.lineTo(25,-2);ctx.lineTo(-28,-2);ctx.closePath();ctx.fill();ctx.fillStyle='#e6c78a';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('✦',0,-10);}
    else if(id==='ruin'){ctx.fillStyle='#7e8b74';ctx.fillRect(-34,-32,12,61);ctx.fillRect(21,-32,12,61);ctx.fillStyle='#929b7b';ctx.fillRect(-40,-37,78,13);ctx.fillStyle='#557c4c';ctx.strokeStyle='#557c4c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-23,-28);ctx.bezierCurveTo(-6,-10,10,-41,26,-16);ctx.stroke();}
    ctx.restore();
  }

  function drawSelectionOutline(id, pulse) {
    ctx.save(); ctx.strokeStyle=`rgba(100,255,130,${.76 + pulse*.18})`; ctx.lineWidth=2.5+pulse*1.3; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.shadowColor='#5dff7e'; ctx.shadowBlur=8+pulse*11;
    ctx.beginPath();
    if(id==='home') {ctx.moveTo(-77,66);ctx.lineTo(-77,-11);ctx.lineTo(0,-64);ctx.lineTo(77,-11);ctx.lineTo(66,-11);ctx.lineTo(66,66);ctx.closePath();}
    else if(id==='hut') {ctx.moveTo(-86,68);ctx.lineTo(-86,-12);ctx.lineTo(0,-75);ctx.lineTo(86,-12);ctx.lineTo(72,-12);ctx.lineTo(72,68);ctx.closePath();}
    else if(id==='grandpa') {ctx.roundRect(-67,-27,134,81,8);}
    else if(id.includes('villager')||id==='villageGrandma') {ctx.moveTo(-18,25);ctx.quadraticCurveTo(-24,14,-17,5);ctx.lineTo(-12,0);ctx.arc(0,-7,12,Math.PI,0);ctx.lineTo(17,5);ctx.quadraticCurveTo(24,14,18,25);ctx.quadraticCurveTo(0,33,-18,25);ctx.closePath();}
    else if(id==='gate'||id==='northGate') {ctx.moveTo(-36,50);ctx.lineTo(-36,-48);ctx.lineTo(36,-48);ctx.lineTo(36,50);ctx.closePath();}
    else if(id==='thorns') {ctx.moveTo(-56,35);for(let x=-45;x<=50;x+=15)ctx.bezierCurveTo(x-8,-16,x+13,26,x+8,-37);ctx.lineTo(52,40);ctx.closePath();}
    else if(['sunpetal','bluebell','mooncap','lavender','amberleaf','fern'].includes(id)) {ctx.moveTo(0,30);ctx.quadraticCurveTo(-26,8,-25,-2);ctx.quadraticCurveTo(-6,-8,0,-35);ctx.quadraticCurveTo(9,-8,27,-2);ctx.quadraticCurveTo(25,12,0,30);ctx.closePath();}
    else {ctx.roundRect(-34,-28,68,52,9);}
    ctx.stroke(); ctx.restore();
  }

  function drawObject(object) {
    const selected = nearestObject()?.id === object.id;
    ctx.save(); ctx.translate(object.x, object.y);
    const pulse=(Math.sin(performance.now()/230)+1)/2;
    switch (object.id) {
      case 'home': drawHouse(0, 0, '#b76352', '', 1.35, true); break;
      case 'grandpa': drawHouse(0, 0, '#8c6947', '', 1.34); break;
      case 'villageGrandma': drawVillager(0,0,4,'Grandma'); break;
      case 'villageOak': case 'riverWillow': case 'forestOak': case 'oldOak': case 'moonTree': case 'appleTree':
        tree(0,0,1.18);
        if(object.id==='appleTree'){ctx.fillStyle='#c94c4d';[[-23,-34],[14,-51],[27,-25],[-4,-13]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();});}
        if(object.id==='moonTree'){ctx.fillStyle='#e6e5b5';[[-24,-37],[13,-51],[28,-25],[-2,-13]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();});}
        break;
      case 'villagerMara': drawVillager(0,0,2,'Mara'); break;
      case 'villagerPip': drawVillager(0,0,3,'Pip'); break;
      case 'villagerTomas': drawVillager(0,0,0,'Tomas'); break;
      case 'gate':
        ctx.fillStyle='#4e3a2c';ctx.fillRect(-32,-49,13,100);ctx.fillRect(19,-49,13,100);
        const gateWood=ctx.createLinearGradient(-18,0,18,0);gateWood.addColorStop(0,'#906440');gateWood.addColorStop(.5,'#c28e53');gateWood.addColorStop(1,'#845737');
        ctx.fillStyle=s.gateOpen?'#b5cc84':gateWood;ctx.fillRect(-18,-38,36,76);
        if(!s.gateOpen){ctx.strokeStyle='#67452f';ctx.lineWidth=2;for(let gx=-11;gx<=11;gx+=11){ctx.beginPath();ctx.moveTo(gx,-34);ctx.lineTo(gx,34);ctx.stroke();}ctx.strokeStyle='#e0bb78';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-17,-24);ctx.lineTo(17,-24);ctx.moveTo(-17,22);ctx.lineTo(17,22);ctx.stroke();}
        ctx.fillStyle='#d8b477';ctx.beginPath();ctx.arc(-9,-17,2.5,0,Math.PI*2);ctx.arc(9,15,2.5,0,Math.PI*2);ctx.fill();
        if (!s.gateOpen) { ctx.strokeStyle = '#f0d596'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -7, 9, Math.PI, 0); ctx.lineTo(9, 8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.stroke(); ctx.fillStyle = '#f0d596'; ctx.beginPath(); ctx.arc(0, 4, 3, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'northGate':
        ctx.fillStyle='#4d392c';ctx.fillRect(-35,-38,12,80);ctx.fillRect(23,-38,12,80);
        const northWood=ctx.createLinearGradient(-23,0,23,0);northWood.addColorStop(0,'#8b6040');northWood.addColorStop(.5,'#bd8950');northWood.addColorStop(1,'#815536');
        ctx.fillStyle=s.thorns?'#b5cc84':northWood;ctx.fillRect(-23,-28,46,62);
        ctx.fillStyle='#6f4b34';ctx.fillRect(-29,-36,58,10);ctx.fillStyle='#d5aa69';ctx.fillRect(-29,-38,58,5);
        if(!s.thorns){ctx.strokeStyle='#e0bb78';ctx.lineWidth=4;for(let x=-14;x<=14;x+=14){ctx.beginPath();ctx.moveTo(x,-19);ctx.lineTo(x,28);ctx.stroke();}}
        break;
      case 'thorns':
        if(!s.thorns){
          for(let i=0;i<7;i++){
            ctx.strokeStyle=i%2?'#31583c':'#477649';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-48+i*15,34);ctx.bezierCurveTo(-32+i*11,-20,18-i*5,38,42-i*13,-36);ctx.stroke();
            for(let j=0;j<4;j++){const lx=-34+i*12+j*9,ly=20-j*15+(i%2)*7;ctx.fillStyle=(i+j)%2?'#6c9d57':'#81ad60';ctx.beginPath();ctx.ellipse(lx,ly,10,5,-.8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d8c98f';ctx.beginPath();ctx.moveTo(lx+4,ly-2);ctx.lineTo(lx+11,ly-8);ctx.lineTo(lx+6,ly+1);ctx.fill();}
          }
          ctx.fillStyle='#f4da91';ctx.font='800 12px Nunito';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#335439';ctx.strokeText('VINES',0,-48);ctx.fillText('VINES',0,-48);
        }
        break;
      case 'hut':
        drawHouse(0,0,'#798d5b','',1.5,true);
        ctx.fillStyle='#f2d894';ctx.beginPath();ctx.roundRect(-36,-42,72,19,6);ctx.fill();ctx.fillStyle='#405d43';ctx.font='900 11px Nunito';ctx.textAlign='center';ctx.fillText('ALCHEMY',0,-29);
        drawFlora('fern',-61,34);drawFlora('lavender',63,33);break;
      case 'sunpetal': case 'bluebell': case 'mooncap': case 'lavender': case 'amberleaf': case 'fern': drawFlora(object.id, 0, 0); break;
      default: drawWorldProp(object.id);

    }
    if(selected) drawSelectionOutline(object.id,pulse);
    ctx.restore();
  }

  function drawBoy() {
    const scale = s.scene === 'basement' ? 1.75 : s.scene === 'interior' ? 1.72 : 1.2;
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(scale,scale);
    ctx.fillStyle = '#18362d4d'; ctx.beginPath(); ctx.ellipse(1, 19, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle='#78533a';ctx.beginPath();ctx.ellipse(0,23,8,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d1a75d';ctx.beginPath();ctx.roundRect(-10,18,8,7,3);ctx.roundRect(3,18,8,7,3);ctx.fill();
    const tunic=ctx.createLinearGradient(-12,0,12,0);tunic.addColorStop(0,'#315d4c');tunic.addColorStop(.5,'#54886a');tunic.addColorStop(1,'#2f604d');
    ctx.fillStyle=tunic;ctx.beginPath();ctx.moveTo(-11,0);ctx.quadraticCurveTo(-18,3,-16,18);ctx.quadraticCurveTo(0,28,16,18);ctx.quadraticCurveTo(18,4,11,0);ctx.quadraticCurveTo(0,8,-11,0);ctx.fill();
    ctx.fillStyle='#e0bb70';ctx.fillRect(-11,7,22,3);ctx.fillStyle='#ecd18f';ctx.beginPath();ctx.arc(0,9,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b97855';ctx.beginPath();ctx.arc(0,-6,11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f3c99d';ctx.beginPath();ctx.ellipse(0,-5,8,9,0,0,Math.PI*2);ctx.fill();
    if(s.face==='up'){ctx.fillStyle='#704c36';ctx.beginPath();ctx.arc(0,-7,11,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#574434';ctx.beginPath();ctx.ellipse(0,-8,9,7,0,0,Math.PI*2);ctx.fill();}
    else {ctx.fillStyle='#704c36';ctx.beginPath();ctx.arc(0,-11,10,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(s.face==='left'?-10:6,-12,4,8);}
    ctx.fillStyle='#43513c';ctx.beginPath();ctx.ellipse(0,-14,11,4,0,0,Math.PI*2);ctx.fill();ctx.fillRect(-7,-20,14,6);ctx.fillStyle='#d5b365';ctx.fillRect(-3,-18,6,2);
    if(s.face==='down'){ctx.fillStyle='#4a3830';ctx.beginPath();ctx.arc(-3,-6,1.4,0,Math.PI*2);ctx.arc(3,-6,1.4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b96f60';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-2,2.6,.2,Math.PI-.2);ctx.stroke();}
    else if(s.face==='left'||s.face==='right'){ctx.fillStyle='#4a3830';ctx.beginPath();ctx.arc(s.face==='left'?-5:5,-6,1.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b96f60';ctx.beginPath();ctx.arc(s.face==='left'?-9:9,-2,2,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#b8714e';ctx.fillRect(s.face==='left'?8:-14,5,4,9);
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
      if(highlighted){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=2.5+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=7+p*10;ctx.strokeRect(card.x-48,card.y-39,96,82);ctx.restore();}
      ctx.restore();
    }
  }

  function drawInterior() {
    const warm=s.interior==='hut'?'#b9c295':'#d2b27b';
    ctx.fillStyle = '#263b34'; ctx.fillRect(0, 0, W, H);
    const wall=ctx.createLinearGradient(0,40,0,100);wall.addColorStop(0,'#526b54');wall.addColorStop(1,'#314a3d');
    roundedRect(82, 37, 956, 646, 30, '#172f29');roundedRect(91,45,938,632,27,wall);
    roundedRect(112, 67, 896, 586, 19, '#e8d5a8');
    const floor=ctx.createLinearGradient(0,85,0,640);floor.addColorStop(0,warm);floor.addColorStop(1,s.interior==='hut'?'#9caa78':'#ad875c');
    roundedRect(124, 79, 872, 562, 15, floor);
    // Warm plank flooring, fine seams, and a soft center glow.
    ctx.save(); ctx.beginPath(); ctx.roundRect(124, 79, 872, 562, 18); ctx.clip();
    for (let y=92,row=0;y<650;y+=48,row++) {
      ctx.fillStyle = row%2 ? '#ffffff09' : '#563d2810'; ctx.fillRect(128,y,864,47);
      ctx.strokeStyle = '#73563b45'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(128,y+47); ctx.lineTo(992,y+47); ctx.stroke();
      for(let x=168+(row%2)*82;x<990;x+=164){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+47);ctx.stroke();}
      ctx.strokeStyle='#f2dcaa24';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(140,y+8);ctx.lineTo(980,y+8);ctx.stroke();
    }
    const roomGlow=ctx.createRadialGradient(540,270,30,540,300,490);roomGlow.addColorStop(0,'#fff7cf25');roomGlow.addColorStop(1,'#fff7cf00');ctx.fillStyle=roomGlow;ctx.fillRect(124,79,872,562);
    ctx.restore();
    ctx.strokeStyle = '#f0ddb0'; ctx.lineWidth = 13; ctx.strokeRect(124,79,872,562);

    if (s.interior === 'home') {
      roundedRect(205,150,255,150,15,'#654c3b');roundedRect(213,158,239,130,12,'#eee1c4');
      roundedRect(224,169,217,108,10,'#829c75');roundedRect(233,177,199,92,8,'#a8bd91');
      ctx.strokeStyle='#d9c697';ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(240+i*38,180);ctx.lineTo(240+i*38,265);ctx.stroke();}
      // Familiar bed in the top-left is the room's scale reference.
      roundedRect(208,145,260,158,18,'#755039');roundedRect(219,156,238,136,15,'#f2e8d0');
      roundedRect(229,166,218,116,13,'#8ca982');roundedRect(236,174,204,99,11,'#abc39a');
      roundedRect(245,180,52,43,10,'#fff5dc');roundedRect(303,180,52,43,10,'#fff5dc');
      ctx.strokeStyle='#d9e3bf';ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(342+i*15,226);ctx.lineTo(342+i*15,262);ctx.stroke();}
      ctx.fillStyle='#d1aa64';ctx.beginPath();ctx.arc(339,245,5,0,Math.PI*2);ctx.fill();
      if(Math.hypot(s.x-335,s.y-225)<130){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.strokeRect(200,145,265,160);ctx.restore();}
      roundedRect(712,145,198,112,12,'#604637');roundedRect(720,153,182,96,9,'#bc9664');
      for(let yy=0;yy<3;yy++){roundedRect(735,163+yy*25,70,19,4,'#d1ad78');roundedRect(816,163+yy*25,70,19,4,'#d1ad78');ctx.fillStyle='#805a3d';ctx.beginPath();ctx.arc(795,173+yy*25,2,0,Math.PI*2);ctx.arc(876,173+yy*25,2,0,Math.PI*2);ctx.fill();}
      roundedRect(270,420,245,120,18,'#5d7554');roundedRect(281,430,223,100,13,'#9ab286');
      ctx.strokeStyle='#e1d8ad';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(392,480,82,33,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#f3d68a';ctx.beginPath();ctx.arc(392,480,8,0,Math.PI*2);ctx.fill();
    } else if (s.interior === 'grandpa') {
      roundedRect(206,132,270,104,14,'#543b30');roundedRect(217,142,248,82,9,'#9b714b');
      ctx.fillStyle='#ead49c';for(let i=0;i<5;i++){ctx.fillRect(232+i*44,156,32,55);ctx.fillStyle=['#8e5246','#617d62','#6989aa','#b38348','#9d6590'][i];roundedRect(235+i*44,160,25,46,3,ctx.fillStyle);ctx.fillStyle='#ead49c';}
      roundedRect(735,455,160,95,12,'#654936');roundedRect(746,465,138,76,8,'#ba8c58');
      for(let i=0;i<3;i++){ctx.fillStyle='#e9d5aa';ctx.fillRect(760+i*36,476,24,7);ctx.fillRect(760+i*36,493,24,7);ctx.fillRect(760+i*36,510,24,7);}
      // Basement stairs
      roundedRect(495,105,130,155,14,'#755238');
      for(let y=117;y<252;y+=19){ctx.strokeStyle='#d2b17c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(505,y);ctx.lineTo(615,y);ctx.stroke();}
      drawInteriorPerson(805,335,'#71846a');
      if(Math.hypot(s.x-560,s.y-178)<94){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.strokeRect(495,105,130,155);ctx.restore();}
      if(Math.hypot(s.x-805,s.y-335)<125){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.beginPath();ctx.moveTo(781,357);ctx.quadraticCurveTo(778,329,786,315);ctx.arc(805,322,20,Math.PI,0);ctx.quadraticCurveTo(832,333,829,357);ctx.quadraticCurveTo(805,370,781,357);ctx.closePath();ctx.stroke();ctx.restore();}
    } else if (s.interior === 'hut') {
      drawHutGuide();
      ctx.fillStyle='#74563d';ctx.beginPath();ctx.ellipse(820,240,93,47,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#557b54';ctx.beginPath();ctx.ellipse(820,239,80,36,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#4c9880';ctx.beginPath();ctx.ellipse(820,230,67,28,0,0,Math.PI*2);ctx.fill();
      const brew=ctx.createRadialGradient(802,218,2,820,230,56);brew.addColorStop(0,'#c8e390');brew.addColorStop(.5,'#7dc484');brew.addColorStop(1,'#42846f');ctx.fillStyle=brew;ctx.beginPath();ctx.ellipse(820,230,54,20,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f1dbad';ctx.fillRect(800,205,40,32);ctx.fillStyle='#714b36';ctx.fillRect(796,201,48,7);
      ctx.fillStyle='#f0dfae';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(784+i*24,187-(i%2)*11,4+i%2,0,Math.PI*2);ctx.fill();}
      roundedRect(735,282,170,17,8,'#6d513d');ctx.fillStyle='#d7b27b';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(755+i*31,290,5,0,Math.PI*2);ctx.fill();}
      if(Math.hypot(s.x-820,s.y-240)<105){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.beginPath();ctx.ellipse(820,240,94,49,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
      if(Math.hypot(s.x-820,s.y-345)<110){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.beginPath();ctx.moveTo(798,365);ctx.quadraticCurveTo(794,340,800,329);ctx.arc(820,338,19,Math.PI,0);ctx.quadraticCurveTo(846,344,842,366);ctx.quadraticCurveTo(820,379,798,365);ctx.closePath();ctx.stroke();ctx.restore();}
      drawInteriorPerson(820,345,'#716483');
    }
    // Exterior doorway is always centered at the south wall.
    if(Math.hypot(s.x-560,s.y-620)<105){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.beginPath();ctx.moveTo(510,655);ctx.lineTo(510,615);ctx.quadraticCurveTo(510,590,535,590);ctx.lineTo(585,590);ctx.quadraticCurveTo(610,590,610,615);ctx.lineTo(610,655);ctx.stroke();ctx.restore();}
    ctx.fillStyle='#392f28';ctx.beginPath();ctx.roundRect(510,600,100,55,14,14);ctx.fill();
    ctx.fillStyle='#dfc181';ctx.beginPath();ctx.arc(590,628,5,0,Math.PI*2);ctx.fill();
    drawBoy();
  }

  function drawBasementMouse(mouse) {
    const distance = Math.hypot(mouse.x - s.x, mouse.y - s.y);
    ctx.save(); ctx.translate(mouse.x, mouse.y); ctx.rotate(mouse.face || 0);
    if (distance < 76) { const pulse=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+pulse*.18})`;ctx.lineWidth=2.5+pulse;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+pulse*11;ctx.beginPath();ctx.moveTo(-25,7);ctx.quadraticCurveTo(-25,-9,-4,-11);ctx.lineTo(7,-8);ctx.lineTo(13,-17);ctx.quadraticCurveTo(22,-20,25,-8);ctx.quadraticCurveTo(36,1,24,9);ctx.lineTo(-18,17);ctx.quadraticCurveTo(-27,15,-25,7);ctx.closePath();ctx.stroke();ctx.restore(); }
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
    if (Math.hypot(s.x - 560, s.y - 175) < 88) { const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.strokeRect(510,128,100,80);ctx.restore(); }
    [...s.mice.map(mouse=>({y:mouse.y,draw:()=>drawBasementMouse(mouse)})),{y:s.y,draw:drawBoy}].sort((a,b)=>a.y-b.y).forEach(layer=>layer.draw());
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
    if (s.screen === '13') { drawVillageFence(); drawVillageHomes(); }
    if (s.scene === 'outside') {
      const visible=(roomObjects[s.screen]||[]).filter(o=>getAvailableObjects().some(active=>active.id===o.id));
      const trees=[[34,54],[1082,52],[32,657],[1080,652],[340,35],[780,676],[1020,215],[140,510],[250,80],[900,660]];
      if(s.screen!=='13') trees.push([180,210],[945,485],[380,620]);
      if(s.screen==='06') trees.push([700,85],[1040,100],[1080,255],[690,300],[1030,650],[620,120]);
      const layers=[...trees.map(([x,y],i)=>({y:y+25,draw:()=>tree(x,y,1.15+(i%3)*.12)})),
        ...visible.map(object=>({y:object.y,draw:()=>drawObject(object)})),{y:s.y,draw:drawBoy}].sort((a,b)=>a.y-b.y);
      layers.forEach(layer=>layer.draw());
    } else if (s.scene === 'basement') { drawEdgeTrees(); drawBasement(); }
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
    if (!s.thorns) fence.push([770,100,890,100]);
    if (!s.gateOpen) fence.push([100,305,100,415]);
    return fence.some((line) => hitsSegment(x, y, line));
  }

  function solidCircles() {
    const treeEdges = [];
    const groundTrees = [[34,54],[1082,52],[32,657],[1080,652],[340,35],[780,676],[1020,215],[140,510]];
    const sceneTrees = s.screen === '06'
      ? [[700,85],[1040,100],[1080,255],[690,300],[1030,650],[620,120]]
      : s.screen === '12' ? [[180,210]]
      : s.screen === '11' || s.screen === '21' || s.screen === '08' ? [[945,485]]
      : s.screen === '16' ? [[835,190]] : [];
    for (const [x,y] of [...groundTrees,...sceneTrees]) {
      if (x > 80 && x < W-80 && y > 80 && y < H-80) treeEdges.push([x,y,35]);
    }
    const fixed = {
      '13': [[560,280,58],[850,520,58],[265,205,52],[930,455,27],[405,245,27],[670,545,27],[320,405,27]],
      '11': s.thorns ? [] : [[225,155,58]],
      '21': [[250,390,68]],
      '06': []
    };
    const objects = fixed[s.screen] || [];
    const gate = s.screen === '13' && !s.gateOpen ? [[100,360,36]] : [];
    const northGate = s.screen === '13' && !s.thorns ? [[830,100,36]] : [];
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
          : [[820,240,55],[820,345,30],...hutGuideCards.map((c)=>[c.x,c.y,34])];
      if (circleHits(x,y,furniture,13)) return true;
    }
    if (s.scene === 'basement') {
      if (circleHits(x,y,[[270,204,40],[846,194,38],[250,435,25],[875,320,25],[760,525,25],[560,170,32]],14)) return true;
    }
    return false;
  }

  function transitionAtEdge(nx, ny) {
    const lanes = roomDoors[s.screen] || {};
    if (nx <= 86 && lanes.west != null && Math.abs(ny - lanes.west) < 90) return moveToRoom('west');
    if (nx >= W - 86 && lanes.east != null && Math.abs(ny - lanes.east) < 90) return moveToRoom('east');
    if (ny <= 55 && lanes.north != null && Math.abs(nx - lanes.north) < 105) return moveToRoom('north');
    if (ny >= H - 55 && lanes.south != null && Math.abs(nx - lanes.south) < 105) return moveToRoom('south');
    return false;
  }

  function inRiver(x,y){return s.screen==='12'&&Math.abs(x-riverCenter(y))<112;}

  function move(dt) {
    if (modal.classList.contains('open')) return;
    if (!['outside','basement','interior'].includes(s.scene)) return;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a || keys.A) dx--;
    if (keys.ArrowRight || keys.d || keys.D) dx++;
    if (keys.ArrowUp || keys.w || keys.W) dy--;
    if (keys.ArrowDown || keys.s || keys.S) dy++;
    const length = Math.hypot(dx, dy) || 1; dx /= length; dy /= length;
    if(Math.abs(dx)>Math.abs(dy)&&dx) s.face=dx<0?'left':'right';
    else if(dy) s.face=dy<0?'up':'down';
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

    const minX = 86, maxX = W - 86, minY = 55, maxY = H - 55;
    nx = clamp(nx, minX, maxX);
    const oldX = s.x;
    const riverCenterAtY=riverCenter(s.y);
    const returnAcrossVanishedLog = s.screen === '12' && s.logGone && oldX < riverCenterAtY-112 && nx >= riverCenterAtY-112;
    const offLogRiverEntry = s.screen === '12' && inRiver(nx,s.y) && (s.y < 342 || s.y > 378);
    if (s.screen === '13' && !s.thorns && ny < 118 && nx > 755 && nx < 905) {
      toast('The gate is locked from the other side.');
    } else if (!returnAcrossVanishedLog && !offLogRiverEntry && !(s.screen === '13' && !s.gateOpen && nx < 125 && ny > 290 && ny < 430) && !hitsWorldObject(nx,ny)) {
      s.x = nx;
    }

    ny = clamp(s.y + dy * step, minY, maxY);
    const riverOverlap = inRiver(s.x,ny);
    const onLog = ny >= 342 && ny <= 378;
    const riverBlocks = riverOverlap && !onLog;
    const crossedAfterLog = s.screen === '12' && s.logGone && s.x < riverCenter(ny)-112 && nx >= riverCenter(ny)-112;
    if (!riverBlocks && !crossedAfterLog && !(s.screen === '13' && !s.thorns && ny < 118 && s.x > 755 && s.x < 905) && !hitsWorldObject(s.x,ny)) {
      s.y = ny;
    }

    if (s.screen === '12' && !s.logGone && oldX > riverCenter(s.y)+112 && s.x <= riverCenter(s.y)+112 && s.y >= 342 && s.y <= 378) {
      s.logGone = true;
      toast('You cross the river. The log drifts away.');
    }
    if (s.screen === '11' && s.logGone && s.x >= W - 34 && s.y > 270 && s.y < 450) {
      s.x = W - 34; toast('The log is gone. The crossing is one-way.'); return;
    }
    if (s.screen === '11' && !s.thorns && s.y <= 112 && s.x > 115 && s.x < 335) { s.y = 112; toast('The Vines block the north path.'); }
    

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
        if (near(805,335,125)) objectOptions('Grandfather', '🧓', 'Grandfather is waiting to hear how the basement is going.', [{ label: 'TALK', run: openHouseTalk }]);
        return;
      }
      if (s.interior === 'hut' && Math.hypot(x-820,y-345)<58) {
        if (near(820,345,110)) objectOptions('The Alchemist', '🧙', 'The Alchemist studies plants and brews potions.', [{ label: 'TALK', run: talkToAlchemist }]);
        return;
      }
      if (s.interior === 'hut') {
        const card = hutGuideCards.find((entry) => Math.abs(x-entry.x)<48 && Math.abs(y-entry.y)<41);
        if (card && near(card.x,card.y,86)) {
          simpleModal(flowerNames[card.id], card.id==='fern'?'🌿':'🌸', flowerDetails[card.id]);
        }
        return;
      }
      if (s.interior === 'home' && x > 205 && x < 465 && y > 145 && y < 310) {
        if (near(335,225,130)) simpleModal('A Cozy Bed', '🛏️', 'A soft place to rest.');
        return;
      }
      if (s.interior === 'hut' && x > 735 && x < 910 && y > 155 && y < 325) {
        if (near(820,240,105)) simpleModal('Bubbling Cauldron', '⚗️', 'A heavy cauldron bubbles with a bright green brew.');
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

