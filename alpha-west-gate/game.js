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
  const catchStyle=document.createElement('style');catchStyle.textContent='#modal.catching #modal-buttons{display:flex;justify-content:center}#modal.catching .catch-button{width:min(360px,100%);min-height:78px;font-size:2rem;font-weight:900;letter-spacing:.1em;background:linear-gradient(#77bd59,#3d8748);color:#fff8dc;border:3px solid #a5e37b;border-radius:18px;box-shadow:0 0 18px #72dd7190;cursor:pointer}';document.head.appendChild(catchStyle);

  const musicButton = document.querySelector('#music-toggle');
  const audioVersion = new URL(document.currentScript?.src || window.location.href, window.location.href).searchParams.get('v') || Date.now().toString(36);
  const ambientMusic = new Audio(`assets/village-to-forest.mp3?v=${encodeURIComponent(audioVersion)}`);
  ambientMusic.loop = true;
  ambientMusic.volume = 0.32;
  let musicEnabled = false;

  function setMusicButton(enabled) {
    musicButton.textContent = enabled ? '♫ Music: On' : '♫ Music: Off';
    musicButton.setAttribute('aria-pressed', String(enabled));
    musicButton.setAttribute('aria-label', enabled ? 'Turn ambient music off' : 'Turn ambient music on');
  }

  function startAmbientMusic() {
    musicEnabled = true;
    setMusicButton(true);
    ambientMusic.play().catch(() => {
      musicEnabled = false;
      setMusicButton(false);
    });
  }

  function stopAmbientMusic() {
    musicEnabled = false;
    ambientMusic.pause();
    setMusicButton(false);
  }

  musicButton.addEventListener('click', () => {
    if (musicEnabled) stopAmbientMusic();
    else startAmbientMusic();
  });

  const startMusicOnInput = (event) => {
    if (!musicButton.contains(event.target)) startAmbientMusic();
  };
  document.addEventListener('pointerdown', startMusicOnInput, { once: true });
  document.addEventListener('keydown', startMusicOnInput, { once: true });

  const s = {
    screen: '13', x: 605, y: 335, face: 'down', speed: 215,
    scene: 'outside', interior: '', rodents: 0, rodentQuestStarted: false, mice: [], activeCatchTarget: null, basementEntered: false,
    grandpaRemedyStarted: false, healingWater: false, grandpaHealed: false,
    bakerQuestStarted: false, berriesPicked: false, bakerQuestComplete: false, muffin: false,
    waterQuestStarted: false, carryingWater: false, grandmaHelped: false, grandmaHouseKey: false, grandparentsHouseUnlocked: false,
    returnX: 0, returnY: 0, outsideX: 0, outsideY: 0,
    flowers: { sunpetal: false, bluebell: false, mooncap: false, lavender: false, amberleaf: false, fern: false }, alchemistTalked: false, alchemyMushroomRequested: false, alchemyMushroomCollected: false, alchemyMushroomDelivered: false, vinesStarted: false,
    key: false, gateOpen: false, logGone: false, logCrossingStarted: false, returnGateOpen: false, potion: false,
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
    '13': { west: '12', north: '09' },
    '09': { south: '13', west: '06', north: '08' },
    '12': { east: '13', west: '11' },
    '11': { east: '12', north: '05', south: '16' },
    '16': { north: '11', south: '21' },
    '21': { north: '16' },
    '05': { south: '11', east: '06' },
    '06': { east: '09', north: '07', west: '05' },
    '07': { south: '06' },
    '08': { south: '09' }
  };

  // Each exit is placed where the hand-drawn path meets the edge of its panel.
  const roomDoors = {
    '13': { west: 360, north: 830 }, '09': { south: 830, west: 360, north: 830 }, '12': { east: 360, west: 360 },
    '11': { east: 360, north: 220, south: 560 }, '16': { north: 560, south: 560 },
    '21': { north: 560 }, '05': { south: 220, east: 360 }, '06': { east: 360, north: 560, west: 360 }, '07': { south: 560 }, '08': { south: 830 }
  };

  const roomObjects = {
    '05': [
      { id: 'mossyMarker', name: 'Mossy Trail Marker', x: 475, y: 265, r: 36, description: 'A small trail marker is nearly hidden beneath moss. A faded crescent is carved into its rounded stone face.' },
      { id: 'fireflies', name: 'Firefly Ferns', x: 820, y: 505, r: 42, description: 'Ferns grow in a shady hollow. A few golden fireflies blink among their curled leaves.' },
      { id: 'riverStone', name: 'Rainworn Stone', x: 295, y: 500, r: 34, description: 'Rain has smoothed the stone until it feels like cool glass. A tiny spiral is carved on its top.' }
    ],
    '09': [
      { id: 'meadowFlowers', name: 'Windflower Patch', x: 385, y: 485, r: 52, description: 'Blue and gold windflowers lean together in the breeze. A tiny butterfly keeps circling the tallest bloom.' },
      { id: 'meadowStone', name: 'Carved Meadow Stone', x: 735, y: 250, r: 34, description: 'A pale standing stone has a spiral carved into its face. The old trail bends around it.' },
      { id: 'meadowTree', name: 'Old Apple Tree', x: 950, y: 450, r: 48, description: 'A broad apple tree shades the meadow. Its fallen fruit feeds a family of field mice.' },
      { id: 'meadowLantern', name: 'Trail Lantern', x: 545, y: 225, r: 34, description: 'A small lantern hangs from a wooden hook to mark the trail after dusk.' },
      { id: 'returnGate', name: 'Old Village Gate', x: 830, y: 615, r: 48, description: 'An old timber gate closes the path back to the village. Its latch can be reached from this side.' }
    ],
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
      { id: 'garden', name: 'Grandma’s Herb Garden', x: 960, y: 520, r: 48, description: 'Mint, thyme, and tiny blue flowers grow together in Grandma’s sunny garden beside her home.' },
      { id: 'berryBush', name: 'Berry Bush', x: 450, y: 330, r: 38, description: 'Glossy leaves hide clusters of plump blue berries. The bush grows beside the village path.' },
      { id: 'villageOak', name: 'Old Village Oak', x: 140, y: 510, r: 48, description: 'The oak’s knotted roots make a perfect seat. A tiny wooden bird is tucked into its bark.' }
    ],
    '12': [
      { id: 'riverReeds', name: 'River Reeds', x: 735, y: 170, r: 38, description: 'The reeds whisper as the river bends around the stones. A dragonfly rests on one leaf.' },
      { id: 'riverStone', name: 'Old River Stone', x: 370, y: 520, r: 32, description: 'A smooth stone has a spiral carved into it. The river has polished it for years.' },
      { id: 'riverWillow', name: 'River Willow', x: 180, y: 210, r: 48, description: 'Long branches dip toward the water. A nest rests safely between the leaves.' }
    ],
    '11': [
      { id: 'thorns', name: 'Thorny Vines', x: 225, y: 155, r: 125, description: 'A towering, tangled hedge of hooked briars blocks the northern trail. The fresh green shoots look as if they appeared overnight.' },
      { id: 'fallenLog', name: 'Fallen Log', x: 815, y: 560, r: 44, description: 'Moss covers the fallen log. Little white mushrooms peek out from underneath.' },
      { id: 'logMushroom', name: 'Glowcap Mushroom', x: 842, y: 533, r: 30, description: 'A rare Glowcap Mushroom glimmers beneath a shelf of bark. Its pale blue cap grows in the cool, damp shade of the fallen log.' },
      { id: 'mossyMarker', name: 'Mossy Waystone', x: 660, y: 205, r: 34, description: 'An old waystone bears a faded arrow and a carving of a crescent moon.' },
      { id: 'scaredVillager', name: 'Worried Traveler', x: 475, y: 270, r: 38, description: 'A traveler keeps glancing toward the thorny wall. Their walking stick is scratched with fresh green sap.' },
      { id: 'trailKeeper', name: 'Trail Keeper', x: 650, y: 510, r: 38, description: 'The keeper watches over this stretch of trail and listens to the forest.' }
    ],
    '16': [
      { id: 'oldOak', name: 'Old Oak', x: 835, y: 190, r: 48, description: 'This oak is so old its roots rise above the earth like a little wooden bridge.' },
      { id: 'stoneRing', name: 'Stone Circle', x: 760, y: 490, r: 55, description: 'Seven old standing stones make a complete circle around a mossy patch of earth. Tiny flowers grow between them.' },
      { id: 'pathHermit', name: 'Meadow Walker', x: 430, y: 390, r: 38, description: 'A quiet walker points down the trail. “The hermit in the southern glade has lived alone for years. They know plants better than anyone.”' }
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
      { id: 'pond', name: 'Moonlit Pond', x: 820, y: 500, r: 104, description: 'The wide, clear pond mirrors a pale moon-shaped patch of sky. Water lilies drift near the mossy edge.' },
      { id: 'mushrooms', name: 'Twilight Mushrooms', x: 730, y: 200, r: 34, description: 'These tiny violet mushrooms glow softly beneath the trees.' },
      { id: 'moonTree', name: 'Silverleaf Tree', x: 830, y: 86, r: 48, description: 'Pale leaves catch the light like little pieces of the moon.' }
    ],
    '08': [
      { id: 'ruin', name: 'Overgrown Arch', x: 875, y: 245, r: 46, description: 'Thick ivy nearly swallows the broken stone arch. A warm breeze slips through its leafy opening.' },
      { id: 'healingSpring', name: 'Moonwell Fountain', x: 735, y: 365, r: 48, description: 'A carved stone fountain curls around a pool of clear spring water. Silver leaves are etched into its rim, and the water glows softly in the shade of the arch.' },
      { id: 'appleTree', name: 'Wild Apple Tree', x: 945, y: 485, r: 48, description: 'Small red apples peek between the leaves. One has a tiny bite taken out of it.' }
    ],
    '07': [
      { id: 'trailLantern', name: 'Mossy Trail Lantern', x: 330, y: 275, r: 34, description: 'A glass lantern hangs from a crooked post. Someone has left a little sprig of rosemary beside it.' },
      { id: 'fireflies', name: 'Firefly Hollow', x: 815, y: 425, r: 40, description: 'A few fireflies blink above the ferns, even though the sun is still out.' },
      { id: 'trailRanger', name: 'Forest Rambler', x: 610, y: 540, r: 38, description: 'A well-traveled rambler studies the tree line and hums a hiking tune.' }
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
    const inventory=[];
    if(s.grandmaHouseKey)inventory.push('🗝 House Key');
    if(s.carryingWater)inventory.push('🥤 Cup of Water');
    if(s.key)inventory.push('🗝 West Gate Key');
    if(s.potion)inventory.push('🧪 Vine Potion');
    if(s.berriesPicked)inventory.push('🫐 Blueberries');
    if(s.muffin)inventory.push('Blueberry Muffin');
    if(s.alchemyMushroomCollected)inventory.push('Glowcap Mushroom');
    if(s.healingWater)inventory.push('💧 Healing Water');
    itemsEl.textContent=inventory.length?inventory.join(' · '):'Empty';
    let quest='';
    if(!s.waterQuestStarted)quest='<strong>First Steps</strong>Explore the Village';
    else if(!s.grandmaHelped&&!s.carryingWater)quest='<strong>Grandma’s Request</strong>Fetch a cup of water.';
    else if(!s.grandmaHelped)quest='<strong>Grandma’s Request</strong>Bring the water to Grandma.';
    else if(!s.rodentQuestStarted)quest='<strong>Quest</strong>Talk to Grandpa inside.';
    else if(!s.key&&s.rodents<5)quest='<strong>Quest</strong>Catch 5 rodents: '+s.rodents+'/5';
    else if(!s.gateOpen&&!s.key&&s.rodents>=5)quest='<strong>Quest</strong>Talk to Grandfather.';
    else if(s.key&&!s.gateOpen)quest='<strong>Quest</strong>Unlock the West Gate';
    else if(s.alchemistTalked&&!s.potion&&!s.thorns){
      const count=requiredFlowers.filter(id=>s.flowers[id]).length;
      quest=count<3?'<strong>Alchemist’s Request</strong>'+requiredFlowers.map(id=>'1 '+flowerNames[id]+' '+(s.flowers[id]?'1/1':'0/1')).join(' · '):
        !s.alchemyMushroomRequested?'<strong>Quest</strong>Talk to the Alchemist.':
        !s.alchemyMushroomCollected?'<strong>Quest</strong>Find the Glowcap Mushroom on the fallen log.':'<strong>Quest</strong>Bring the Glowcap Mushroom to the Alchemist.';
    }
    else if(s.gateOpen&&!s.vinesStarted)quest='<strong>Quest</strong>Investigate the Vines';
    else if(s.vinesStarted&&!s.alchemistTalked)quest='<strong>Quest</strong>Find a way to remove the Vines.';
    else if(s.vinesStarted&&s.potion&&!s.thorns)quest='<strong>Quest</strong>Use the potion on the Vines.';
    else if(s.thorns&&!s.returned&&!s.grandpaRemedyStarted)quest='<strong>Quest</strong>Find and unlock the gate back to the village.';
    else if(s.grandpaHealed)quest='<strong>Quest Complete</strong>Grandpa is resting and recovering.';
    else if(s.thorns&&s.healingWater)quest='<strong>Grandpa’s Remedy</strong>Bring the healing water to Grandpa.';
    else if(s.thorns&&s.returnGateOpen)quest='<strong>Grandpa’s Remedy</strong>Find healing water at the Moonwell Fountain.';
    else if(s.thorns&&!s.returned)quest='<strong>Quest</strong>Follow the path back to the village.';
    const optionalQuest=s.bakerQuestStarted&&!s.bakerQuestComplete?'<div class="optional-quest"><strong>Optional Errand</strong>'+(s.berriesPicked?'Bring the berries to Tomas.':'Pick berries for Tomas.')+'</div>':'';
    const remedyQuest=s.grandpaRemedyStarted&&!s.grandpaHealed?'<div class="optional-quest"><strong>Grandpa’s Remedy</strong>'+(!s.thorns?'Find a way through the vines to reach the healing spring.':!s.returnGateOpen?'Open the gate back to the village.':s.healingWater?'Bring the spring water to Grandpa.':'Fill a cup at the Moonwell Fountain beyond the arch.')+'</div>':'';
    questEl.innerHTML=quest+optionalQuest+remedyQuest;
    questEl.classList.toggle('empty',!quest&&!optionalQuest&&!remedyQuest);
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
    modal.classList.toggle('catching', title === 'Catch this rodent?');
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.classList.remove('compact');
    modal.classList.remove('catching'); s.activeCatchTarget=null;
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
    if (type === 'grandpa' && s.grandmaHouseKey) { s.grandmaHouseKey = false; s.grandparentsHouseUnlocked = true; toast('Grandma’s key unlocks the house.'); }
    s.scene = 'interior'; s.interior = type;
    s.x = 560; s.y = 520;
    updateHud();
  }

  function leaveInterior() {
    s.scene = 'outside'; s.interior = '';
    s.x = s.outsideX || 560; s.y = s.outsideY || 335;
    updateHud();
  }

  function talkToGrandma() {
    if (!s.waterQuestStarted) {
      s.waterQuestStarted = true;
      updateHud();
      openModal('Grandma', '👵', '<p>I’m getting on in years, and my arthritis is really flaring up today. Could you bring me a fresh cup of water from the village well?</p>', () => makeButton('I’ll get some water', closeModal), true);
      return;
    }
    if (s.carryingWater && !s.grandmaHelped) {
      s.carryingWater = false; s.grandmaHelped = true; s.grandmaHouseKey = true;
      updateHud();
      openModal('Grandma', '👵', '<p>Thank you, dear. Here’s our house key. Your Grandpa could use a hand with the rodents in his basement. You can find him inside.</p>', () => makeButton('I’ll go see him', closeModal), true);
      return;
    }
    if (!s.grandmaHelped) {
      openModal('Grandma', '👵', '<p>The village well is nearby. Please bring me a cup of fresh water when you can.</p>', () => makeButton('Okay', closeModal), true);
      return;
    }
    openModal('Grandma', '👵', '<p>Thank you for the water, dear. Grandpa is inside and could use your help with the rodents in his basement.</p>', () => makeButton('I’ll go see him', closeModal), true);
  }

  function talkToTomas() {
    if (!s.bakerQuestStarted) {
      s.bakerQuestStarted = true;
      updateHud();
      openModal('Tomas the Baker', '🥖', '<p>I’m baking something seasonal for the village. Could you pick a handful of blueberries from the bush beside the village path?</p>', () => makeButton('I’ll look for berries', closeModal), true);
      return;
    }
    if (s.berriesPicked && !s.bakerQuestComplete) {
      s.berriesPicked = false;
      s.bakerQuestComplete = true;
      s.muffin = true;
      updateHud();
      openModal('Tomas the Baker', '🥖', '<p>Perfect berries! Here’s a blueberry muffin, fresh from the oven. Keep it for a tough moment ahead; if you save this errand for later, you’ll need another way through.</p>', () => makeButton('Thanks, Tomas!', closeModal), true);
      return;
    }
    if (!s.bakerQuestComplete) {
      openModal('Tomas the Baker', '🥖', '<p>That berry bush beside the village path should have a handful of ripe berries.</p>', () => makeButton('I’ll find them', closeModal), true);
      return;
    }
    openModal('Tomas the Baker', '🥖', '<p>I hope you enjoy that muffin. Blueberries make the best seasonal treats!</p>', () => makeButton('Thanks again', closeModal), true);
  }

  function openHouseTalk() {
    if (!s.rodentQuestStarted) { s.rodentQuestStarted=true; updateHud(); openModal('Grandfather','🧓','<p>I need a favor, if you have time. You can find me inside.</p>',()=>makeButton('I’ll help!',closeModal),true); return; }
    if (s.rodents<5) { openModal('Grandfather','🧓','<p>Catch all 5 rodents downstairs and I’ll give you the West Gate key.</p>',()=>makeButton('Okay',closeModal),true); return; }
    if (s.grandpaRemedyStarted && s.healingWater && !s.grandpaHealed) { s.healingWater=false;s.grandpaHealed=true;updateHud();openModal('Grandfather','🧓','<p>That cool spring water is just what I needed. I already feel stronger. I was bitten while clearing out the rodents, and you came through for me. The gates beyond our village are yours to explore whenever you are ready.</p>',()=>makeButton('I’m glad you’re better',closeModal),true);return; }
    if (s.grandpaHealed) { openModal('Grandfather','🧓','<p>I’m feeling much better now, thanks to you. The village feels a little bigger knowing you’ve explored beyond the gates.</p>',()=>makeButton('You’re welcome',closeModal),true);return; }
    if (s.grandpaRemedyStarted) { openModal('Grandfather','🧓','<p>I’m still feeling weak from that bite. The Moonwell Fountain beyond the overgrown arch may hold the healing water I need.</p>',()=>makeButton('I’ll find it',closeModal),true);return; }
    s.key=true;s.grandpaRemedyStarted=true;updateHud();
    openModal('Grandfather','🧓','<p>Thank you for catching the rodents. Here is the West Gate key. One bit me while I was clearing the basement, and I’m suddenly feeling quite ill. An old Moonwell Fountain near an overgrown arch may hold healing water. You always wanted to escape the same village routine; now you have a real reason to explore and help your family.</p>',()=>makeButton('I’ll find a remedy',closeModal),true);
  }

  function talkToAlchemist() {
    s.alchemistTalked = true;
    const count = requiredFlowers.filter((id) => s.flowers[id]).length;
    const ingredients = requiredFlowers.map((id) => `1 ${flowerNames[id]}`);
    const requested = ingredients.length < 2
      ? ingredients[0]
      : `${ingredients.slice(0, -1).join(', ')} and ${ingredients[ingredients.length - 1]}`;
    if (s.potion || s.thorns) {
      openModal('The Alchemist', '🧙', '<p>The Glowcap gave the potion its final spark. I hope it helps on your journey.</p>', () => makeButton('Thanks', closeModal), true);
      return;
    }
    if (count < 3) {
      updateHud();
      const intro=s.vinesStarted?'I’ve heard about the thorny vines. I can brew a potion to help.':'I haven’t seen the vines myself, but I can prepare a potion in case they threaten the trail.';
      openModal('The Alchemist','🧙','<p>'+intro+' Please bring me '+requested+'.</p>',()=>makeButton('I’ll look for them',closeModal),true);
      return;
    }
    if (!s.alchemyMushroomRequested) {
      s.alchemyMushroomRequested = true;
      updateHud();
      openModal('The Alchemist', '🧙', '<p>These flowers are perfect. Before I brew the potion, I need one more rare ingredient: a Glowcap Mushroom. They grow beneath fallen logs, and there is one near the thorny vines.</p>', () => makeButton('I’ll find it', closeModal), true);
      return;
    }
    if (!s.alchemyMushroomCollected) {
      updateHud();
      openModal('The Alchemist', '🧙', '<p>Please bring me the Glowcap Mushroom from beneath the fallen log near the vines.</p>', () => makeButton('I’ll look for it', closeModal), true);
      return;
    }
    updateHud();
    openModal('The Alchemist', '🧙', '<p>You found the Glowcap! Its gentle light will give the potion the strength it needs. I’ll brew it now.</p>', () => {
      makeButton('Take the potion', () => { s.alchemyMushroomCollected = false; s.alchemyMushroomDelivered = true; s.potion = true; closeModal(); toast('You received a Vine Potion.'); updateHud(); });
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
      if (object.id === 'logMushroom') return s.alchemyMushroomRequested && !s.alchemyMushroomCollected;
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
        objectOptions('Your Home', '🏠', 'A cozy cottage with a blue door and a little window box full of flowers. The path home is easy to spot from anywhere in the village.', [{ label: 'ENTER', run: () => enterInterior('home') }]);
        break;
      case 'grandpa':
        objectOptions('Grandma and Grandpa’s House', '🏠', s.grandmaHouseKey || s.grandparentsHouseUnlocked
          ? 'Warm lamplight shines through the windows. Grandma’s little brass key fits the front door.'
          : 'The front door is locked. Grandma is outside and may have the key.', s.grandmaHouseKey || s.grandparentsHouseUnlocked
          ? [{ label: 'ENTER', run: () => enterInterior('grandpa') }]
          : [{ label: 'TRY DOOR', run: () => simpleModal('The house is locked', '🏠', 'The door will not open. Grandma is outside and may have a key.') }]);
        break;
      case 'villageGrandma':
        objectOptions('Grandma', '👵', object.description, [{ label: 'TALK', run: talkToGrandma }]);
        break;
      case 'villagerMara':
        objectOptions('Mara the Gardener', '🌼', 'Mara tends the village garden and knows every flower along the paths.', [{ label: 'TALK', run: () => simpleModal('Mara the Gardener', '🌼', 'The meadow flowers are prettiest where the morning sun reaches them.') }]);
        break;
      case 'villagerPip':
        objectOptions('Pip', '🧢', 'A young villager with a pocket full of interesting things.', [{ label: 'TALK', run: () => simpleModal('Pip', '🧢', 'I found a shiny pebble by the river. I’m saving it for my collection!') }]);
        break;
      case 'villagerTomas':
        objectOptions('Tomas the Baker', '🥖', 'Tomas is planning a batch of seasonal pastries and is checking the village berry bushes.', [{ label: 'TALK', run: talkToTomas }]);
        break;
      case 'gate':
        objectOptions('West Gate', '🚪', 'Thick oak planks and iron bands hold the gate shut. A star-shaped keyhole is set into its latch.', s.gateOpen ? [] : [{
          label: s.key ? 'UNLOCK' : 'TRY GATE',
          run: () => {
            if (!s.key) simpleModal('The West Gate is locked', '🚪', 'The gate is locked. You need a key.');
            else { s.key = false; s.gateOpen = true; toast('The key opens the West Gate.'); updateHud(); }
          }
        }]);
        break;
      case 'northGate':
        objectOptions('Village Gate', '🚪', 'A sturdy gate marks the path back toward the village.', s.returnGateOpen ? [] : s.thorns ? [{ label: 'UNLOCK', run: () => { s.returnGateOpen = true; toast('The village gate swings open.'); updateHud(); } }] : [{ label: 'TRY GATE', run: () => simpleModal('Village Gate', '🚪', 'The gate is locked fast. Clear the thorny vines to release its latch.') }]);
        break;
      case 'returnGate':
        objectOptions('Old Village Gate', '🚪', s.returnGateOpen ? 'The old gate stands open, revealing the familiar path home.' : 'The gate is latched from this side. Beyond it, the path winds back to the village.', s.returnGateOpen ? [] : s.thorns ? [{ label: 'UNLOCK', run: () => { s.returnGateOpen = true; toast('The village gate swings open.'); updateHud(); } }] : [{ label: 'TRY GATE', run: () => simpleModal('Old Village Gate', '🚪', 'The gate is locked fast. Clear the thorny vines to release its latch.') }]);
        break;
      case 'thorns':
        s.vinesStarted = true;
        updateHud();
        objectOptions('Thorny Vines', '🌿', object.description, s.potion ? [{
          label: 'USE POTION', run: () => { s.potion = false; s.thorns = true; toast('The potion clears the Vines. The sky grows dim…'); updateHud(); }
        }] : []);
        break;
      case 'hut':
        objectOptions('Alchemist’s Hut', '⚗️', 'A mossy green roof almost disappears beneath leaves. A little potion sign hangs above the crooked front door.', [{ label: 'ENTER', run: () => enterInterior('hut') }]);
        break;
      case 'well':
        objectOptions(object.name, '💧', object.description, s.waterQuestStarted && !s.carryingWater && !s.grandmaHelped
          ? [{ label: 'FILL CUP', run: () => { s.carryingWater = true; toast('You filled a cup with fresh water.'); updateHud(); } }]
          : []);
        break;
      case 'healingSpring':
        objectOptions(object.name,'💧',object.description,s.grandpaRemedyStarted&&s.thorns&&s.returnGateOpen&&!s.healingWater&&!s.grandpaHealed?[{label:'FILL HEALING CUP',run:()=>{s.healingWater=true;toast('You filled a cup with healing spring water.');updateHud();}}]:[]);
        break;
      case 'berryBush':
        objectOptions('Berry Bush', '🫐', s.berriesPicked ? 'The bush is resting after giving up its ripe berries. New fruit will grow in time.' : 'Glossy leaves hide clusters of plump blue berries. The bush grows beside the village path.', s.bakerQuestStarted && !s.berriesPicked && !s.bakerQuestComplete ? [{ label: 'PICK BERRIES', run: () => { s.berriesPicked = true; toast('You picked a handful of blueberries.'); updateHud(); } }] : []);
        break;
      case 'logMushroom':
        objectOptions('Glowcap Mushroom', '🍄', object.description, s.alchemyMushroomRequested && !s.alchemyMushroomCollected ? [{ label: 'GATHER MUSHROOM', run: () => { s.alchemyMushroomCollected = true; toast('You gathered a Glowcap Mushroom.'); updateHud(); } }] : []);
        break;
      case 'garden': case 'riverReeds': case 'riverStone': case 'fallenLog': case 'mossyMarker': case 'oldOak': case 'stoneRing': case 'pond': case 'mushrooms': case 'signpost': case 'ruin': case 'villageOak': case 'riverWillow': case 'forestOak': case 'moonTree': case 'appleTree': case 'trailLantern': case 'fireflies': case 'meadowStone': case 'meadowLantern':
        objectOptions(object.name, object.id==='pond'?'💧':object.id==='mushrooms'?'🍄':'✦', object.description);
        break;
      case 'scaredVillager':
        objectOptions('Worried Traveler','❔',object.description,[{label:'TALK',run:()=>simpleModal('Worried Traveler','❔','“Those thorny vines sprang up overnight. I heard the Alchemist farther south might know what to do.”')}]);
        break;
      case 'meadowFlowers':
        objectOptions('Windflower Patch','🌼',object.description);
        break;
      case 'trailKeeper':
        objectOptions('Trail Keeper','🪶',object.description,[{label:'TALK',run:()=>simpleModal('Trail Keeper','🪶','“No one remembers seeing vines like those before. Keep to the path, and watch for thorns.”')}]);
        break;
      case 'pathHermit':
        objectOptions('Meadow Walker','🧭',object.description,[{label:'TALK',run:()=>simpleModal('Meadow Walker','🧭','“The hermit has lived in the southern glade for many years. If anyone can help with the vines, they can.”')}]);
        break;
      case 'trailRanger':
        objectOptions('Forest Rambler','🧺',object.description,[{label:'TALK',run:()=>simpleModal('Forest Rambler','🧺','“The woods are peaceful today. I could follow these old paths all afternoon.”')}]);
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
    if (s.screen === '13' && direction === 'north' && !s.returnGateOpen) {
      toast('The village gate is locked. Examine it to unlock it after clearing the Vines.'); return false;
    }
    if (s.screen === '09' && direction === 'south' && !s.returnGateOpen) {
      toast('The village gate is locked. Examine it to unlock it after clearing the Vines.'); return false;
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

  function drawPath(points, width = 88) {
    // One flat gravel fill keeps junctions seamless; rounded strokes give every
    // trail end a soft cap, while exit routes continue beyond the screen edge.
    const samples = [];
    const stepsPerSegment = 12;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)], p1 = points[i];
      const p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
      for (let step = 0; step < stepsPerSegment; step++) {
        const t = step / stepsPerSegment, t2 = t * t, t3 = t2 * t;
        const x = .5 * (2*p1[0] + (-p0[0]+p2[0])*t + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
        const y = .5 * (2*p1[1] + (-p0[1]+p2[1])*t + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
        samples.push([x, y]);
      }
    }
    samples.push(points[points.length - 1].slice());

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i], next = points[i + 1];
      ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
    }
    ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
    ctx.strokeStyle = '#bba17d';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    const lengths = [0];
    for (let i = 1; i < samples.length; i++) {
      lengths[i] = lengths[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]);
    }
    const totalLength = lengths[lengths.length - 1];
    let seed = 2166136261;
    for (const point of points) seed = Math.imul(seed ^ ((point[0] | 0) + ((point[1] | 0) << 1)), 16777619) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const gravel = ['#d8c6a433', '#927b5b4d', '#e4d2b144', '#8b76584a'];
    const pebbleCount = Math.max(18, Math.floor(totalLength * width / 1500));
    for (let i = 0; i < pebbleCount; i++) {
      const target = random() * totalLength;
      let at = 1;
      while (at < lengths.length - 1 && lengths[at] < target) at++;
      const span = lengths[at] - lengths[at - 1] || 1;
      const mix = (target - lengths[at - 1]) / span;
      const x = samples[at - 1][0] + (samples[at][0] - samples[at - 1][0]) * mix;
      const y = samples[at - 1][1] + (samples[at][1] - samples[at - 1][1]) * mix;
      const before = samples[Math.max(0, at - 1)], after = samples[Math.min(samples.length - 1, at + 1)];
      const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1;
      const offset = (random() - .5) * width * .76;
      const size = 1.2 + random() * 2.2;
      ctx.fillStyle = gravel[Math.floor(random() * gravel.length)];
      ctx.beginPath();
      ctx.ellipse(x - dy / length * offset, y + dx / length * offset, size * 1.45, size * .72, Math.atan2(dy, dx), 0, Math.PI * 2);
      ctx.fill();
    }
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
    ctx.restore();
  }

  function drawPotionSign(x,y) {
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#533c2f';ctx.beginPath();ctx.roundRect(-29,-13,58,28,9);ctx.fill();
    ctx.fillStyle='#f1dfb4';ctx.beginPath();ctx.roundRect(-26,-11,52,24,7);ctx.fill();
    ctx.fillStyle='#6b4b37';ctx.fillRect(-5,-7,10,4);ctx.fillRect(-4,-10,8,4);
    const bottle=ctx.createLinearGradient(-9,-5,10,10);bottle.addColorStop(0,'#77cda1');bottle.addColorStop(.55,'#388b72');bottle.addColorStop(1,'#256452');
    ctx.fillStyle=bottle;ctx.beginPath();ctx.moveTo(-5,-3);ctx.lineTo(5,-3);ctx.lineTo(5,1);ctx.quadraticCurveTo(12,7,10,12);ctx.quadraticCurveTo(0,16,-10,12);ctx.quadraticCurveTo(-12,7,-5,1);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d8e897';ctx.beginPath();ctx.ellipse(0,9,8,3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffffaa';ctx.beginPath();ctx.ellipse(-4,4,2,4,-.2,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function drawFlora(id, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle='#355b3848';ctx.beginPath();ctx.ellipse(0,25,24,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#4c804e';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*9,18,8,3,side*.65,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#a9cc7a';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-12,23);ctx.lineTo(-5,17);ctx.moveTo(12,23);ctx.lineTo(5,17);ctx.stroke();
    if (id === 'sunpetal') {
      ctx.strokeStyle = '#477b49'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 12); ctx.quadraticCurveTo(-3,23,0,32); ctx.stroke();
      ctx.fillStyle='#528b50';ctx.beginPath();ctx.ellipse(-8,22,8,4,-.55,0,Math.PI*2);ctx.ellipse(8,28,8,4,.55,0,Math.PI*2);ctx.fill();
      const petal=ctx.createLinearGradient(0,-18,0,18);petal.addColorStop(0,'#fff09b');petal.addColorStop(.55,'#f4c849');petal.addColorStop(1,'#dd9c35');
      for (let i = 0; i < 10; i++) { ctx.fillStyle=petal;ctx.beginPath();ctx.ellipse(Math.cos(i*Math.PI/5)*13,Math.sin(i*Math.PI/5)*13,7,14,i*Math.PI/5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fbe99a';ctx.lineWidth=1;ctx.stroke(); }
      ctx.fillStyle = '#825237'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();ctx.fillStyle='#d99a41';for(let i=0;i<9;i++){const a=i*2.4;ctx.beginPath();ctx.arc(Math.cos(a)*4,Math.sin(a)*4,1.2,0,Math.PI*2);ctx.fill();}
    } else if (id === 'bluebell') {
      ctx.strokeStyle = '#47804e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(-5, 0, 0, -22); ctx.stroke();
      [[-12,-13], [3,-22], [15,-8]].forEach(([bx,by],i)=>{const g=ctx.createLinearGradient(bx,by-12,bx,by+12);g.addColorStop(0,['#9caff1','#b8a4ed','#8ebde9'][i]);g.addColorStop(1,['#506cb5','#705db7','#477ab6'][i]);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(bx-8,by-3);ctx.quadraticCurveTo(bx,by-15,bx+8,by-3);ctx.lineTo(bx+5,by+7);ctx.quadraticCurveTo(bx,by+12,bx-5,by+7);ctx.closePath();ctx.fill();ctx.strokeStyle='#cbd6f7';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#f4e5a1';ctx.beginPath();ctx.arc(bx,by+5,1.5,0,Math.PI*2);ctx.fill();});
    } else if (id === 'mooncap') {
      ctx.fillStyle = '#f0e9d3';ctx.beginPath();ctx.roundRect(-5,-1,10,26,4);ctx.fill();ctx.fillStyle='#c8b8d3';ctx.fillRect(-3,5,2,16);
      const mush=ctx.createLinearGradient(0,-15,0,3);mush.addColorStop(0,'#c39bd0');mush.addColorStop(.55,'#90669f');mush.addColorStop(1,'#614968');ctx.fillStyle=mush;ctx.beginPath();ctx.ellipse(0,0,26,15,-.12,Math.PI,0);ctx.fill();ctx.strokeStyle='#d8c0dc';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,25,14,-.12,Math.PI,0);ctx.stroke();
      ctx.fillStyle = '#f4e8bf'; for (let i = -16; i <= 16; i += 8) { ctx.beginPath(); ctx.ellipse(i, -6-Math.abs(i)*.05, 2.3, 1.7, 0, 0, Math.PI * 2); ctx.fill(); }
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
      { coat:'#8d687f',trim:'#f3d48f',hair:'#f0e2c0',hat:'#788c5d' },
      { coat:'#976f55',trim:'#ead8ad',hair:'#d1d0c2',hat:'#8b9a7b' },
      { coat:'#725b82',trim:'#d9c98a',hair:'#493c39',hat:'#b28760' },
      { coat:'#547c77',trim:'#e7c478',hair:'#7a4d39',hat:'#ba795a' }
    ][Math.min(style,7)];
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#20392d3d';ctx.beginPath();ctx.ellipse(0,18,21,9,0,0,Math.PI*2);ctx.fill();
    const tallHat = style===0 || style===5 || style===7;
    ctx.fillStyle='#493b31';ctx.beginPath();ctx.ellipse(0,-8,14,15,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f2c99d';ctx.beginPath();ctx.ellipse(0,-5,10,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=palettes.hair;ctx.beginPath();
    if(style===1||style===6){ctx.ellipse(0,-14,12,7,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-12,-14,5,18);ctx.fillRect(7,-13,5,17);}
    else if(style===2){ctx.arc(0,-13,12,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-11,-12,22,5);}
    else {ctx.arc(0,-11,11,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-10,-12,4,10);}
    ctx.fillStyle='#3e342e';ctx.beginPath();ctx.arc(-3,-5,1.2,0,Math.PI*2);ctx.arc(4,-5,1.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b76f61';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(.5,-1,3,.15,Math.PI-.15);ctx.stroke();
    ctx.fillStyle=palettes.coat;ctx.beginPath();
    if(style===1||style===5||style===7){ctx.moveTo(-11,5);ctx.lineTo(-22,10);ctx.lineTo(-20,24);ctx.quadraticCurveTo(0,34,20,24);ctx.lineTo(22,10);ctx.lineTo(11,5);ctx.quadraticCurveTo(0,12,-11,5);}
    else if(style===4){ctx.moveTo(-12,6);ctx.quadraticCurveTo(-19,7,-18,18);ctx.lineTo(-22,29);ctx.quadraticCurveTo(0,37,22,29);ctx.lineTo(18,18);ctx.quadraticCurveTo(18,7,12,6);ctx.quadraticCurveTo(0,13,-12,6);}
    else if(style===3){ctx.moveTo(-11,5);ctx.quadraticCurveTo(-17,7,-16,19);ctx.quadraticCurveTo(0,26,16,19);ctx.lineTo(11,5);ctx.closePath();}
    else {ctx.moveTo(-13,6);ctx.quadraticCurveTo(-18,9,-18,23);ctx.quadraticCurveTo(0,30,18,23);ctx.quadraticCurveTo(17,9,13,6);ctx.quadraticCurveTo(0,13,-13,6);}
    ctx.closePath();ctx.fill();
    ctx.fillStyle=palettes.trim;ctx.beginPath();ctx.ellipse(0,21,17,4,0,0,Math.PI*2);ctx.fill();
    if(style===0){ctx.fillStyle='#f4ead0';ctx.beginPath();ctx.moveTo(-8,8);ctx.lineTo(8,8);ctx.lineTo(11,24);ctx.lineTo(-11,24);ctx.closePath();ctx.fill();ctx.strokeStyle='#c1b38f';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#c77b54';ctx.beginPath();ctx.arc(0,17,2,0,Math.PI*2);ctx.fill();}
    if(style===1||style===5){ctx.fillStyle=style===5?'#54475e':'#665944';ctx.beginPath();ctx.moveTo(-12,5);ctx.lineTo(-21,10);ctx.lineTo(-24,27);ctx.lineTo(-12,23);ctx.lineTo(-8,9);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(12,5);ctx.lineTo(21,10);ctx.lineTo(24,27);ctx.lineTo(12,23);ctx.lineTo(8,9);ctx.closePath();ctx.fill();ctx.strokeStyle='#c8b987';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(0,28);ctx.stroke();}
    if(style===2){ctx.fillStyle='#f0dfbd';ctx.beginPath();ctx.moveTo(-8,10);ctx.lineTo(8,10);ctx.lineTo(10,25);ctx.lineTo(-10,25);ctx.closePath();ctx.fill();ctx.strokeStyle='#8b714c';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#d2b079';ctx.beginPath();ctx.arc(0,19,2,0,Math.PI*2);ctx.fill();}
    if(style===4){ctx.fillStyle='#756c83';ctx.beginPath();ctx.moveTo(-13,4);ctx.lineTo(0,11);ctx.lineTo(13,4);ctx.lineTo(18,18);ctx.lineTo(0,14);ctx.lineTo(-18,18);ctx.closePath();ctx.fill();}
    if(style===6){ctx.fillStyle='#d2b58f';ctx.beginPath();ctx.moveTo(-8,-1);ctx.lineTo(7,-1);ctx.lineTo(11,5);ctx.lineTo(0,13);ctx.lineTo(-11,5);ctx.closePath();ctx.fill();}
    if(style===7){ctx.fillStyle='#314d66';ctx.beginPath();ctx.moveTo(-11,4);ctx.lineTo(0,10);ctx.lineTo(11,4);ctx.lineTo(20,26);ctx.quadraticCurveTo(0,35,-20,26);ctx.closePath();ctx.fill();ctx.strokeStyle='#a9c1b0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,11);ctx.lineTo(0,31);ctx.stroke();}
    ctx.fillStyle='#80533a';ctx.fillRect(-11,24,8,5);ctx.fillRect(4,24,8,5);
    if(tallHat){
      ctx.fillStyle=palettes.hat;ctx.beginPath();ctx.ellipse(0,-16,17,5,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-10,-21,20,6);
      if(style===5){ctx.beginPath();ctx.moveTo(-9,-20);ctx.lineTo(0,-39);ctx.lineTo(11,-20);ctx.closePath();ctx.fill();}
      if(style===7){ctx.beginPath();ctx.ellipse(0,-28,4,12,-.18,0,Math.PI*2);ctx.fill();}
    } else if(style===4){
      // A soft, fitted bonnet follows Grandma’s head instead of hovering above it.
      ctx.fillStyle=palettes.hair;ctx.beginPath();ctx.arc(10,-10,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=palettes.hat;ctx.beginPath();ctx.moveTo(-14,-8);ctx.quadraticCurveTo(-17,-21,-6,-23);ctx.quadraticCurveTo(3,-27,12,-20);ctx.quadraticCurveTo(16,-16,14,-8);ctx.quadraticCurveTo(0,-12,-14,-8);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.ellipse(0,-9,15,4,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#5f704d';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-11,-12);ctx.quadraticCurveTo(0,-17,11,-12);ctx.stroke();
      ctx.fillStyle='#d8b779';ctx.beginPath();ctx.arc(6,-19,2.4,0,Math.PI*2);ctx.fill();}
    else if(style===3){ctx.fillStyle=palettes.hat;ctx.beginPath();ctx.ellipse(0,-15,18,8,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-7,-20,14,6);}
    else {ctx.fillStyle=palettes.hat;ctx.beginPath();ctx.ellipse(0,-15,16,5,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-10,-20,20,5);}
    // Each villager carries a different tool or keepsake, so their silhouettes read apart.
    if(style===0){ctx.fillStyle='#f5f1e0';ctx.beginPath();ctx.roundRect(-8,-27,16,7,4);ctx.fill();ctx.beginPath();ctx.arc(-5,-27,4,Math.PI,Math.PI*2);ctx.arc(0,-29,5,Math.PI,Math.PI*2);ctx.arc(5,-27,4,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#c58c4b';ctx.fillRect(14,5,5,20);ctx.fillStyle='#6d4c35';ctx.fillRect(12,5,9,5);}
    if(style===1){ctx.strokeStyle='#9a7147';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18,7);ctx.lineTo(-20,29);ctx.stroke();ctx.fillStyle='#d8b56d';ctx.beginPath();ctx.arc(-20,5,4,0,Math.PI*2);ctx.fill();}
    if(style===2){ctx.fillStyle='#658b50';ctx.beginPath();ctx.ellipse(-17,10,7,3,-.5,0,Math.PI*2);ctx.ellipse(17,13,7,3,.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9c978';ctx.beginPath();ctx.arc(10,-22,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f0dfbd';for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.arc(10+Math.cos(a)*4,-22+Math.sin(a)*4,2,0,Math.PI*2);ctx.fill();}}
    if(style===3){ctx.fillStyle='#a86c46';ctx.beginPath();ctx.roundRect(12,8,12,15,3);ctx.fill();ctx.fillStyle='#e9cf91';ctx.beginPath();ctx.arc(18,11,2,0,Math.PI*2);ctx.fill();}
    if(style===4){ctx.fillStyle='#b88852';ctx.beginPath();ctx.ellipse(-18,17,9,6,-.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ead5a6';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(-18,17,6,3,-.2,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#e1d2b4';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(-4,-5,4,0,Math.PI*2);ctx.arc(5,-5,4,0,Math.PI*2);ctx.moveTo(0,-5);ctx.lineTo(1,-5);ctx.stroke();}
    if(style===5){ctx.fillStyle='#e4d7b1';ctx.fillRect(-13,10,4,15);ctx.fillStyle='#9b7651';ctx.beginPath();ctx.arc(-11,9,4,0,Math.PI*2);ctx.fill();}
    if(style===6){ctx.fillStyle='#b5b5a0';ctx.beginPath();ctx.arc(-11,-4,3,0,Math.PI*2);ctx.arc(11,-4,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d7d0b8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,6,6,.2,Math.PI-.2);ctx.stroke();}
    if(style===7){ctx.fillStyle='#7690aa';ctx.beginPath();ctx.moveTo(-17,9);ctx.lineTo(-23,28);ctx.lineTo(-15,25);ctx.closePath();ctx.fill();}
    ctx.restore();
  }

  function drawGround() {
    const palettes={
      '13':['#b7d794','#78ad70'],'09':['#acd38a','#79ab72'],'12':['#afd493','#78ad70'],'11':['#b7d996','#7aaa70'],
      '16':['#b1d28b','#76a96d'],'21':['#c4dfa0','#85b877'],'05':['#99c882','#618b68'],'06':['#94c27c','#568f62'],'07':['#a9cf89','#61916a'],'08':['#b9d995','#7daf70']
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
      case '09':
        drawPath([[830, 800], [750, 570], [665, 480], [625, 380], [700, 275], [780, 180], [830, -80]], 122);
        drawPath([[-80, 360], [220, 360], [395, 365], [515, 420], [625, 485], [700, 535]], 112);
        break;
      case '05': drawPath([[220, 800], [285, 560], [405, 470], [600, 410], [800, 360], [1200, 360]], 122); break;
      case '13': drawPath([[-80, 360], [190, 360], [320, 520], [510, 540], [700, 500], [820, 390], [790, 265], [785, 165], [830, -80]], 122); break;
      case '12':
        drawPath([[1200, 360], [900, 360], [760, 360], [660, 360], [560, 360], [460, 360], [330, 360], [180, 360], [-80, 360]], 122);
        drawWindingRiver();
        if (!s.logGone) {
          const rc=riverCenter(360); roundedRect(rc-132, 322, 264, 76, 18, '#68452f');
          roundedRect(rc-120, 330, 240, 58, 14, '#a87949');
          ctx.strokeStyle = '#76502f'; ctx.lineWidth = 4;
          for (let x = rc-100; x < rc+120; x += 34) { ctx.beginPath(); ctx.moveTo(x, 332); ctx.lineTo(x, 386); ctx.stroke(); }
        }
        break;
      case '11':
        drawPath([[1200, 360], [890, 360], [730, 390], [570, 390], [430, 330], [330, 245], [225, 155], [220, 80], [220, -80]], 122);
        drawPath([[570,390],[470,425],[390,490],[435,545],[520,595],[560,650],[560,800]],116);
        break;
      case '16': drawPath([[560, -80], [470, 150], [340, 230], [245, 350], [270, 490], [390, 585], [485, 650], [560, 800]], 122); break;
      case '21': drawPath([[560, -80], [520, 170], [460, 285], [370, 370], [260, 430], [250, 470]], 112); break;
      case '06':
        drawPath([[560, 610], [535, 570], [540, 460], [590, 340], [680, 230], [700, 130], [560, -80]], 122);
        drawPath([[540,460],[430,420],[320,380],[200,360],[-80,360]],112);
        drawPath([[600,360],[740,355],[900,350],[1200,360]],112);
        break;
      case '07': drawPath([[560, 104], [525, 160], [500, 280], [545, 400], [620, 505], [560, 800]], 122); break;
      case '08': drawPath([[560, 104], [525, 150], [445, 225], [390, 310], [475, 405], [625, 470], [750, 565], [830, 800]], 122); break;
    }
  }

  function drawWorldProp(id) {
    ctx.save();
    if(id==='healingSpring'){ctx.fillStyle='#29453855';ctx.beginPath();ctx.ellipse(0,19,51,20,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9d9b80';ctx.beginPath();ctx.ellipse(0,6,47,26,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6fc0bc';ctx.beginPath();ctx.ellipse(0,1,30,12,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d9e6c0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,1,30,12,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#777b69';ctx.beginPath();ctx.moveTo(-12,-5);ctx.lineTo(-9,-39);ctx.lineTo(-4,-45);ctx.lineTo(5,-43);ctx.lineTo(11,-33);ctx.lineTo(11,-5);ctx.closePath();ctx.fill();ctx.fillStyle='#bac2a1';ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(-6,-36);ctx.lineTo(-2,-40);ctx.lineTo(5,-38);ctx.lineTo(7,-8);ctx.closePath();ctx.fill();ctx.strokeStyle='#d4e8c8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-1,-35);ctx.quadraticCurveTo(12,-26,2,-16);ctx.stroke();}
    else if(id==='well') { ctx.fillStyle='#3a5844';ctx.beginPath();ctx.ellipse(0,12,40,19,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#786047';ctx.beginPath();ctx.ellipse(0,0,35,22,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#68a9a6';ctx.beginPath();ctx.ellipse(0,-4,27,13,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#dcc391';ctx.lineWidth=5;ctx.strokeRect(-30,-20,60,8);ctx.fillStyle='#795638';ctx.fillRect(-28,-29,5,32);ctx.fillRect(23,-29,5,32);ctx.fillRect(-35,-33,70,7); }
    else if(id==='garden'||id==='berryBush'||id==='mushrooms'||id==='riverReeds') { for(let i=0;i<6;i++){let x=(i-2.5)*12,y=(i%2)*5;ctx.fillStyle=id==='berryBush'?'#477a45':id==='mushrooms'?'#5c8047':'#4e8a55';ctx.beginPath();ctx.ellipse(x,y,12,18,(i%3-.8)*.35,0,Math.PI*2);ctx.fill();if(id==='berryBush'){ctx.fillStyle=i%2?'#3f6cbb':'#547fce';ctx.beginPath();ctx.arc(x+4,y-6,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c6ddf5';ctx.beginPath();ctx.arc(x+3,y-7,1.1,0,Math.PI*2);ctx.fill();}if(id==='mushrooms'){ctx.fillStyle='#eee2c4';ctx.fillRect(x-2,y-4,4,13);ctx.fillStyle='#9e75b8';ctx.beginPath();ctx.ellipse(x,y-5,8,5,0,Math.PI,Math.PI*2);ctx.fill();}} }
    else if(id==='stoneRing'){
      ctx.fillStyle='#31523d55';ctx.beginPath();ctx.ellipse(0,12,62,38,-.12,0,Math.PI*2);ctx.fill();
      for(let i=0;i<7;i++){const a=-Math.PI/2+i*Math.PI*2/7,cx=Math.cos(a)*43,cy=Math.sin(a)*25;const h=22+(i%3)*5;
        ctx.fillStyle='#596f65';ctx.beginPath();ctx.moveTo(cx-12,cy+7);ctx.lineTo(cx-10,cy-h+8);ctx.lineTo(cx-4,cy-h);ctx.lineTo(cx+9,cy-h+2);ctx.lineTo(cx+13,cy+8);ctx.closePath();ctx.fill();
        const stone=ctx.createLinearGradient(cx-10,cy,cx+10,cy);stone.addColorStop(0,'#687c70');stone.addColorStop(.45,'#b1b9a2');stone.addColorStop(1,'#718477');ctx.fillStyle=stone;ctx.beginPath();ctx.moveTo(cx-10,cy+5);ctx.lineTo(cx-8,cy-h+8);ctx.lineTo(cx+2,cy-h+4);ctx.lineTo(cx+10,cy-h+9);ctx.lineTo(cx+11,cy+5);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#d1d4b8';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx-5,cy-h+10);ctx.lineTo(cx-3,cy-2);ctx.stroke();
      }
      ctx.fillStyle='#668457';ctx.beginPath();ctx.ellipse(0,3,21,11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5d48a';for(let i=0;i<5;i++){const a=i*1.25;ctx.beginPath();ctx.arc(Math.cos(a)*15,Math.sin(a)*8,2.3,0,Math.PI*2);ctx.fill();}
    }
    else if(id==='riverStone'||id==='mossyMarker'){ctx.fillStyle='#3e6148';ctx.beginPath();ctx.ellipse(0,14,30,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8c9581';ctx.beginPath();ctx.moveTo(-23,12);ctx.lineTo(-18,-14);ctx.lineTo(-6,-23);ctx.lineTo(19,-17);ctx.lineTo(25,12);ctx.closePath();ctx.fill();ctx.strokeStyle='#c7c5a2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-6);ctx.quadraticCurveTo(2,-16,13,-5);ctx.stroke();ctx.fillStyle='#6f9660';ctx.beginPath();ctx.ellipse(-7,-16,7,3,-.5,0,Math.PI*2);ctx.fill();}
    else if(id==='logMushroom'){ctx.fillStyle='#40533f';ctx.beginPath();ctx.ellipse(0,11,21,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dce8cb';ctx.beginPath();ctx.moveTo(-5,8);ctx.quadraticCurveTo(-7,-3,-3,-12);ctx.lineTo(4,-12);ctx.quadraticCurveTo(8,-1,5,8);ctx.closePath();ctx.fill();const cap=ctx.createRadialGradient(-4,-18,2,0,-16,19);cap.addColorStop(0,'#e9f5d3');cap.addColorStop(.62,'#a8d7ce');cap.addColorStop(1,'#5d9ca1');ctx.fillStyle=cap;ctx.beginPath();ctx.moveTo(-19,-13);ctx.quadraticCurveTo(-16,-31,0,-31);ctx.quadraticCurveTo(17,-29,19,-13);ctx.quadraticCurveTo(1,-7,-19,-13);ctx.fill();ctx.strokeStyle='#d9f0dd';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-14,14,3,0,0,Math.PI);ctx.stroke();ctx.fillStyle='#f3edc8';ctx.beginPath();ctx.arc(-7,-21,2,0,Math.PI*2);ctx.arc(5,-24,1.6,0,Math.PI*2);ctx.fill();}
    else if(id==='fallenLog'||id==='oldOak'){ctx.fillStyle='#435744';ctx.beginPath();ctx.ellipse(0,16,42,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#80583b';ctx.beginPath();ctx.ellipse(0,0,39,15,-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#bb8a58';ctx.beginPath();ctx.ellipse(28,-1,8,13,-.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#56754c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-22,-8);ctx.quadraticCurveTo(0,-20,19,-7);ctx.stroke();}
    else if(id==='pond'){ctx.fillStyle='#31543e70';ctx.beginPath();ctx.ellipse(0,15,97,59,-.12,0,Math.PI*2);ctx.fill();const shore=ctx.createLinearGradient(0,-48,0,52);shore.addColorStop(0,'#8c9a66');shore.addColorStop(.4,'#567657');shore.addColorStop(1,'#344f43');ctx.fillStyle=shore;ctx.beginPath();ctx.ellipse(0,0,92,55,-.12,0,Math.PI*2);ctx.fill();const water=ctx.createLinearGradient(-30,-35,35,38);water.addColorStop(0,'#9dd9cf');water.addColorStop(.52,'#4f9da2');water.addColorStop(1,'#357882');ctx.fillStyle=water;ctx.beginPath();ctx.ellipse(-2,-5,77,42,-.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c3ece0';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(-12,-10,37,14,.12,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#d8efcf99';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(22,2,16,6,-.2,0,Math.PI*2);ctx.stroke();
      for(const [x,y] of [[-96,-10],[98,2],[-42,-58],[48,54]]){ctx.fillStyle='#507a4e';ctx.beginPath();ctx.ellipse(x,y,9,4,x*.01,0,Math.PI*2);ctx.fill();ctx.fillStyle='#74a45a';ctx.beginPath();ctx.ellipse(x+3,y-3,5,3,-.5,0,Math.PI*2);ctx.fill();}
      for(const [x,y] of [[-38,-5],[35,-22]]){ctx.fillStyle='#6b9b63';ctx.beginPath();ctx.ellipse(x,y,12,7,-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f7edce';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*4,y+Math.sin(a)*3,3,2,a,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#e5c765';ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}}
    else if(id==='signpost'){ctx.fillStyle='#614932';ctx.fillRect(-4,-5,8,43);ctx.fillStyle='#a77a4c';ctx.beginPath();ctx.moveTo(-28,-23);ctx.lineTo(25,-23);ctx.lineTo(35,-12);ctx.lineTo(25,-2);ctx.lineTo(-28,-2);ctx.closePath();ctx.fill();ctx.strokeStyle='#d2aa70';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#e6c78a';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('←',-12,-10);ctx.fillText('↑',6,-10);ctx.fillText('✦',23,-10);}
    else if(id==='ruin'){
      ctx.fillStyle='#34583c50';ctx.beginPath();ctx.ellipse(0,30,69,15,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#82907b';ctx.beginPath();ctx.moveTo(-54,25);ctx.lineTo(-50,-31);ctx.lineTo(-36,-37);ctx.lineTo(-25,-29);ctx.lineTo(-23,25);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(24,25);ctx.lineTo(24,-25);ctx.lineTo(36,-38);ctx.lineTo(52,-29);ctx.lineTo(54,25);ctx.closePath();ctx.fill();
      ctx.fillStyle='#a0a58a';ctx.beginPath();ctx.moveTo(-47,-28);ctx.lineTo(-35,-52);ctx.lineTo(-17,-50);ctx.lineTo(-5,-41);ctx.lineTo(8,-48);ctx.lineTo(30,-48);ctx.lineTo(48,-35);ctx.lineTo(45,-23);ctx.lineTo(21,-29);ctx.lineTo(2,-33);ctx.lineTo(-17,-28);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#d0cbaa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-40,-22);ctx.lineTo(-38,15);ctx.moveTo(36,-20);ctx.lineTo(39,14);ctx.stroke();
      // Ivy fully blankets the arch crown and both pillars; dangling tendrils break the outline.
      const leaves=[[-42,-38],[-31,-44],[-19,-42],[-6,-40],[8,-42],[21,-43],[35,-39],[-43,-18],[-29,-12],[-27,4],[-43,12],[35,-20],[45,-14],[32,0],[44,9],[-4,-36],[12,-32],[0,-31]];
      ctx.strokeStyle='#3f7048';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-45,18);ctx.bezierCurveTo(-24,-4,-37,-32,-13,-36);ctx.bezierCurveTo(5,-48,15,-24,37,-39);ctx.bezierCurveTo(50,-18,32,-2,46,18);ctx.stroke();
      leaves.forEach(([x,y],i)=>{ctx.fillStyle=i%2?'#5d914e':'#78a957';ctx.beginPath();ctx.ellipse(x,y,7,4,i%2?-.65:.65,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a1c16d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-3,y+1);ctx.lineTo(x+4,y-1);ctx.stroke();});
      ctx.fillStyle='#7ea85d';ctx.beginPath();ctx.moveTo(-39,-12);ctx.quadraticCurveTo(-57,-2,-40,4);ctx.quadraticCurveTo(-31,0,-39,-12);ctx.fill();ctx.beginPath();ctx.moveTo(42,-10);ctx.quadraticCurveTo(58,-2,43,5);ctx.quadraticCurveTo(34,0,42,-10);ctx.fill();
    }
    else if(id==='trailLantern'){ctx.fillStyle='#59442f';ctx.fillRect(-3,-8,6,43);ctx.strokeStyle='#735236';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,-38);ctx.quadraticCurveTo(20,-50,28,-33);ctx.stroke();ctx.fillStyle='#d3ad65';ctx.beginPath();ctx.roundRect(7,-34,20,25,5);ctx.fill();ctx.fillStyle='#f9d984';ctx.beginPath();ctx.roundRect(11,-30,12,17,3);ctx.fill();ctx.fillStyle='#ffeeb2';ctx.beginPath();ctx.arc(17,-22,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#426d48';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-15,15);ctx.lineTo(-12,1);ctx.moveTo(-12,4);ctx.lineTo(-20,-2);ctx.moveTo(-12,4);ctx.lineTo(-4,-5);ctx.stroke();}
    else if(id==='fireflies'){ctx.fillStyle='#4a794c';for(let i=0;i<7;i++){const x=(i-3)*9,y=(i%3)*4;ctx.beginPath();ctx.ellipse(x,y+12,9,14,(i%2-.5)*.7,0,Math.PI*2);ctx.fill();}for(let i=0;i<5;i++){const x=(i*23)%60-28,y=-16-(i%2)*15;ctx.shadowColor='#f9e68b';ctx.shadowBlur=13;ctx.fillStyle='#fff0a2';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}}
    ctx.restore();
  }

  function drawSelectionOutline(id, pulse) {
    ctx.save(); ctx.strokeStyle=`rgba(100,255,130,${.55 + pulse*.35})`; ctx.lineWidth=2.5+pulse*1.3; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.shadowColor='#5dff7e'; ctx.shadowBlur=4+pulse*7;
    ctx.beginPath();
    if(id==='home') {ctx.moveTo(-77,66);ctx.lineTo(-77,-11);ctx.lineTo(0,-64);ctx.lineTo(77,-11);ctx.lineTo(66,-11);ctx.lineTo(66,66);ctx.closePath();}
    else if(id==='hut') {ctx.moveTo(-86,68);ctx.lineTo(-86,-12);ctx.lineTo(0,-75);ctx.lineTo(86,-12);ctx.lineTo(72,-12);ctx.lineTo(72,68);ctx.closePath();}
    else if(id==='grandpa') {ctx.roundRect(-67,-27,134,81,8);}
    else if(id.includes('villager')||id==='villageGrandma'||id==='scaredVillager'||id==='trailKeeper'||id==='pathHermit'||id==='trailRanger') {ctx.moveTo(-18,25);ctx.quadraticCurveTo(-24,14,-17,5);ctx.lineTo(-12,0);ctx.arc(0,-7,12,Math.PI,0);ctx.lineTo(17,5);ctx.quadraticCurveTo(24,14,18,25);ctx.quadraticCurveTo(0,33,-18,25);ctx.closePath();}
    else if(id==='gate'||id==='northGate') {ctx.moveTo(-36,50);ctx.lineTo(-36,-48);ctx.lineTo(36,-48);ctx.lineTo(36,50);ctx.closePath();}
    else if(id==='returnGate') {ctx.roundRect(-60,-36,120,72,7);}
    else if(id==='thorns') {ctx.moveTo(-117,34);ctx.lineTo(-115,7);ctx.lineTo(-103,-21);ctx.lineTo(-92,-12);ctx.lineTo(-83,-43);ctx.lineTo(-67,-21);ctx.lineTo(-51,-53);ctx.lineTo(-37,-23);ctx.lineTo(-17,-48);ctx.lineTo(-4,-21);ctx.lineTo(14,-54);ctx.lineTo(30,-20);ctx.lineTo(47,-45);ctx.lineTo(60,-18);ctx.lineTo(78,-39);ctx.lineTo(88,-9);ctx.lineTo(106,-27);ctx.lineTo(117,8);ctx.lineTo(115,35);ctx.closePath();}
    else if(['villageOak','riverWillow','forestOak','oldOak','moonTree','appleTree','meadowTree'].includes(id)) {ctx.moveTo(-51,2);ctx.bezierCurveTo(-61,-20,-41,-43,-23,-39);ctx.bezierCurveTo(-16,-66,18,-68,28,-41);ctx.bezierCurveTo(55,-39,62,-13,48,5);ctx.bezierCurveTo(56,28,30,40,9,31);ctx.bezierCurveTo(-13,45,-47,31,-51,2);ctx.closePath();}
    else if(id==='pond') {ctx.ellipse(0,0,96,58,-.12,0,Math.PI*2);}
    else if(id==='stoneRing') {ctx.ellipse(0,0,63,42,-.08,0,Math.PI*2);}
    else if(id==='well') {ctx.ellipse(0,0,41,30,0,0,Math.PI*2);}
    else if(id==='ruin') {ctx.moveTo(-58,31);ctx.lineTo(-58,-34);ctx.lineTo(-42,-55);ctx.lineTo(-24,-47);ctx.lineTo(-8,-42);ctx.lineTo(6,-51);ctx.lineTo(32,-52);ctx.lineTo(58,-35);ctx.lineTo(58,31);ctx.lineTo(32,31);ctx.lineTo(32,-15);ctx.lineTo(20,-27);ctx.lineTo(-20,-27);ctx.lineTo(-32,-14);ctx.lineTo(-32,31);ctx.closePath();}
    else if(id==='fallenLog'||id==='riverStone'||id==='mossyMarker'||id==='meadowStone') {ctx.ellipse(0,0,43,25,-.12,0,Math.PI*2);}
    else if(id==='fireflies'||id==='mushrooms'||id==='trailLantern'||id==='meadowLantern') {ctx.moveTo(-40,15);ctx.quadraticCurveTo(-44,-4,-31,-20);ctx.quadraticCurveTo(-16,-30,-8,-13);ctx.quadraticCurveTo(0,-35,12,-19);ctx.quadraticCurveTo(31,-29,40,-7);ctx.lineTo(37,17);ctx.closePath();}
    else if(id==='meadowFlowers') {ctx.moveTo(-52,20);ctx.quadraticCurveTo(-58,-2,-39,-15);ctx.quadraticCurveTo(-19,-30,-7,-11);ctx.quadraticCurveTo(0,-39,11,-12);ctx.quadraticCurveTo(34,-31,49,-8);ctx.quadraticCurveTo(60,8,49,21);ctx.closePath();}
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
      case 'villageGrandma': drawVillager(0,0,4,''); break;
      case 'villageOak': case 'riverWillow': case 'forestOak': case 'oldOak': case 'moonTree': case 'appleTree':
        tree(0,0,1.18);
        if(object.id==='appleTree'){ctx.fillStyle='#c94c4d';[[-23,-34],[14,-51],[27,-25],[-4,-13]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();});}
        if(object.id==='moonTree'){ctx.fillStyle='#e6e5b5';[[-24,-37],[13,-51],[28,-25],[-2,-13]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();});}
        break;
      case 'meadowTree':
        tree(0,0,1.22);ctx.fillStyle='#c94c4d';[[-23,-34],[14,-51],[27,-25],[-4,-13],[3,-39]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();});break;
      case 'healingSpring': drawWorldProp('healingSpring'); break;
      case 'meadowStone': drawWorldProp('riverStone'); break;
      case 'meadowLantern': drawWorldProp('trailLantern'); break;
      case 'meadowFlowers':
        for(const [fx,fy,id] of [[-20,4,'bluebell'],[0,-9,'sunpetal'],[22,6,'bluebell']]){ctx.save();ctx.translate(fx,fy);ctx.scale(.78,.78);drawFlora(id,0,0);ctx.restore();}
        ctx.fillStyle='#527d4d';for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(-34+i*9,21,7,3,(i%2?-.45:.45),0,Math.PI*2);ctx.fill();}break;
      case 'villagerMara': drawVillager(0,0,2,'Mara'); break;
      case 'villagerPip': drawVillager(0,0,3,'Pip'); break;
      case 'villagerTomas': drawVillager(0,0,0,'Tomas'); break;
      case 'scaredVillager': drawVillager(0,0,6,''); break;
      case 'trailKeeper': drawVillager(0,0,1,''); break;
      case 'pathHermit': drawVillager(0,0,5,''); break;
      case 'trailRanger': drawVillager(0,0,7,''); break;
      case 'gate':
        ctx.fillStyle='#294235';ctx.beginPath();ctx.ellipse(0,48,46,11,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#78664d';ctx.fillRect(-39,-47,12,98);ctx.fillRect(27,-47,12,98);ctx.fillStyle='#a69a76';ctx.fillRect(-44,-51,22,10);ctx.fillRect(22,-51,22,10);
        ctx.fillStyle=s.gateOpen?'#b8c995':'#76553a';ctx.beginPath();ctx.moveTo(-27,44);ctx.lineTo(-27,-28);ctx.quadraticCurveTo(0,-53,27,-28);ctx.lineTo(27,44);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#c4a66e';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-22,-4);ctx.quadraticCurveTo(0,0,22,-4);ctx.moveTo(-22,29);ctx.quadraticCurveTo(0,33,22,29);ctx.stroke();
        ctx.strokeStyle='#594331';ctx.lineWidth=3;for(let gx=-16;gx<=16;gx+=16){ctx.beginPath();ctx.moveTo(gx,-30);ctx.lineTo(gx,42);ctx.stroke();}
        ctx.fillStyle='#c9a66c';ctx.beginPath();ctx.arc(0,11,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5f4a35';ctx.beginPath();ctx.arc(0,11,2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#657d59';ctx.beginPath();ctx.ellipse(-35,44,13,8,-.3,0,Math.PI*2);ctx.ellipse(35,44,13,8,.3,0,Math.PI*2);ctx.fill();break;
      case 'returnGate': {
        ctx.fillStyle='#4d392c';ctx.fillRect(-58,-34,12,68);ctx.fillRect(46,-34,12,68);
        const returnWood=ctx.createLinearGradient(-46,0,46,0);returnWood.addColorStop(0,'#825837');returnWood.addColorStop(.45,'#c18c52');returnWood.addColorStop(1,'#755032');
        if(s.returnGateOpen){ctx.save();ctx.translate(-45,0);ctx.rotate(-.95);ctx.fillStyle=returnWood;ctx.fillRect(-4,-29,62,58);ctx.strokeStyle='#e0bb78';ctx.lineWidth=4;ctx.strokeRect(-4,-29,62,58);ctx.restore();}
        else {ctx.fillStyle=returnWood;ctx.fillRect(-46,-30,92,60);ctx.strokeStyle='#68472e';ctx.lineWidth=3;for(let x=-32;x<=32;x+=16){ctx.beginPath();ctx.moveTo(x,-25);ctx.lineTo(x,25);ctx.stroke();}ctx.strokeStyle='#e0bb78';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-44,-18);ctx.lineTo(44,-18);ctx.moveTo(-44,18);ctx.lineTo(44,18);ctx.stroke();ctx.fillStyle='#f0d596';ctx.beginPath();ctx.arc(12,0,3,0,Math.PI*2);ctx.fill();}
        break;
      }
      case 'northGate':
        ctx.fillStyle='#294235';ctx.beginPath();ctx.ellipse(0,43,48,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#81735a';ctx.fillRect(-42,-47,14,93);ctx.fillRect(28,-47,14,93);
        ctx.fillStyle='#b0a384';ctx.fillRect(-47,-51,24,10);ctx.fillRect(23,-51,24,10);ctx.fillStyle=s.returnGateOpen?'#b8c995':'#6e5239';ctx.beginPath();ctx.moveTo(-28,40);ctx.lineTo(-28,-29);ctx.quadraticCurveTo(0,-54,28,-29);ctx.lineTo(28,40);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#c5a976';ctx.lineWidth=4;for(let gy=-14;gy<34;gy+=24){ctx.beginPath();ctx.moveTo(-25,gy);ctx.quadraticCurveTo(0,gy+3,25,gy);ctx.stroke();}
        ctx.fillStyle='#d7ba7e';ctx.beginPath();ctx.arc(0,7,5,0,Math.PI*2);ctx.fill();break;
      case 'thorns':
        if(!s.thorns){
          ctx.fillStyle='#263f2f66';ctx.beginPath();ctx.ellipse(0,38,124,23,-.08,0,Math.PI*2);ctx.fill();
          for(let i=0;i<11;i++){
            const bx=-104+i*20, top=-35-(i%3)*14, sway=(i%2?1:-1)*8;
            ctx.strokeStyle=i%2?'#31583b':'#426e43';ctx.lineWidth=7+(i%3);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(bx,34);ctx.bezierCurveTo(bx-13,-4,bx+17,7,bx+sway,top);ctx.stroke();
            for(let j=0;j<5;j++){const lx=bx-11+(j%2)*13,ly=22-j*14+(i%3)*3;const leaf=ctx.createLinearGradient(lx-9,ly-4,lx+10,ly+5);leaf.addColorStop(0,(i+j)%2?'#8ab967':'#719e55');leaf.addColorStop(1,(i+j)%2?'#416d41':'#355d3b');ctx.fillStyle=leaf;ctx.beginPath();ctx.ellipse(lx,ly,11,6,(i+j)%2?-.48:.48,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b2cc78';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(lx-5,ly+2);ctx.lineTo(lx+6,ly-2);ctx.stroke();}
            for(let j=0;j<3;j++){const tx=bx+(i%2?4:-4),ty=17-j*22;ctx.fillStyle='#e4d8ad';ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+(i%2?12:-12),ty-9);ctx.lineTo(tx+(i%2?6:-6),ty+3);ctx.closePath();ctx.fill();}
          }
          ctx.fillStyle='#5b9a55';for(let i=0;i<9;i++){const x=-99+i*24,y=-25+(i%3)*9;ctx.beginPath();ctx.arc(x,y,9+(i%2)*2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7bae5b';ctx.beginPath();ctx.arc(x-3,y-4,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5b9a55';}
        }
        break;
      case 'hut':
        drawHouse(0,0,'#798d5b','',1.5,true);
        drawPotionSign(0,-34);
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
    const side=s.face==='left'||s.face==='right',dir=s.face==='left'?-1:1;
    ctx.fillStyle='#b97855';ctx.beginPath();ctx.ellipse(side?dir:0,-6,side?10:11,11,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f3c99d';ctx.beginPath();ctx.ellipse(side?dir*1.5:0,-5,side?7.5:8,9,0,0,Math.PI*2);ctx.fill();
    if(s.face==='up'){ctx.fillStyle='#704c36';ctx.beginPath();ctx.ellipse(0,-8,11,10,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#574434';ctx.beginPath();ctx.ellipse(0,-8,9,7,0,0,Math.PI*2);ctx.fill();}
    else if(side){ctx.fillStyle='#704c36';ctx.beginPath();ctx.ellipse(-dir*2,-12,10,6,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(dir>0?-12:8,-12,4,8);ctx.fillStyle='#4a3830';ctx.beginPath();ctx.ellipse(dir*2.5,-6,1.35,1.8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e6b88c';ctx.beginPath();ctx.moveTo(dir*7,-4);ctx.lineTo(dir*12,-2);ctx.lineTo(dir*7,1);ctx.closePath();ctx.fill();ctx.strokeStyle='#b96f60';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(dir*1,2);ctx.quadraticCurveTo(dir*4,4,dir*7,2);ctx.stroke();}
    else{ctx.fillStyle='#704c36';ctx.beginPath();ctx.arc(0,-11,10,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#4a3830';ctx.beginPath();ctx.arc(-3,-6,1.4,0,Math.PI*2);ctx.arc(3,-6,1.4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b96f60';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-2,2.6,.2,Math.PI-.2);ctx.stroke();}
    ctx.fillStyle='#43513c';ctx.beginPath();ctx.ellipse(0,-14,11,4,0,0,Math.PI*2);ctx.fill();ctx.fillRect(-7,-20,14,6);ctx.fillStyle='#d5b365';ctx.fillRect(-3,-18,6,2);
    ctx.fillStyle='#b8714e';ctx.fillRect(s.face==='left'?8:-14,5,4,9);
    ctx.restore();
  }

  function drawInteriorPerson(x, y, robe = '#617d63') {
    const alchemist=robe==='#716483';
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#263a3048';ctx.beginPath();ctx.ellipse(2,31,29,11,-.08,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#72523a';ctx.beginPath();ctx.ellipse(-10,29,9,5,-.12,0,Math.PI*2);ctx.ellipse(11,29,9,5,.12,0,Math.PI*2);ctx.fill();
    const cloth=ctx.createLinearGradient(-22,0,22,0);cloth.addColorStop(0,alchemist?'#4b4564':'#50634c');cloth.addColorStop(.48,robe);cloth.addColorStop(1,alchemist?'#544b70':'#53634b');
    ctx.fillStyle=cloth;ctx.beginPath();ctx.moveTo(-12,-1);ctx.quadraticCurveTo(-24,0,-25,15);ctx.lineTo(-22,29);ctx.quadraticCurveTo(0,39,23,29);ctx.lineTo(25,14);ctx.quadraticCurveTo(22,1,12,-1);ctx.quadraticCurveTo(0,7,-12,-1);ctx.closePath();ctx.fill();
    ctx.fillStyle=alchemist?'#c4b47a':'#cfb776';ctx.fillRect(-15,10,30,4);ctx.fillStyle='#f3da92';ctx.beginPath();ctx.arc(0,12,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e2b990';ctx.beginPath();ctx.ellipse(-20,13,5,7,-.22,0,Math.PI*2);ctx.ellipse(20,13,5,7,.22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#533f35';ctx.beginPath();ctx.ellipse(0,-12,17,19,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#efc99f';ctx.beginPath();ctx.ellipse(0,-13,13,15,0,0,Math.PI*2);ctx.fill();
    if(alchemist){ctx.fillStyle='#8a789c';ctx.beginPath();ctx.arc(0,-16,16,Math.PI,Math.PI*2);ctx.lineTo(20,-8);ctx.quadraticCurveTo(0,-3,-20,-8);ctx.closePath();ctx.fill();ctx.fillStyle='#b2a0c5';ctx.beginPath();ctx.moveTo(-16,-18);ctx.lineTo(0,-39);ctx.lineTo(14,-18);ctx.closePath();ctx.fill();ctx.fillStyle='#e7c979';ctx.beginPath();ctx.arc(0,-26,2.5,0,Math.PI*2);ctx.fill();}
    else {ctx.fillStyle='#e6dfc9';ctx.beginPath();ctx.arc(-13,-19,5,0,Math.PI*2);ctx.arc(-7,-25,6,0,Math.PI*2);ctx.arc(1,-27,6,0,Math.PI*2);ctx.arc(10,-23,6,0,Math.PI*2);ctx.arc(14,-17,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d9d1bc';ctx.beginPath();ctx.moveTo(-11,-8);ctx.quadraticCurveTo(0,-4,11,-8);ctx.lineTo(9,2);ctx.quadraticCurveTo(0,13,-9,2);ctx.closePath();ctx.fill();}
    ctx.fillStyle='#473831';ctx.beginPath();ctx.arc(-5,-14,1.5,0,Math.PI*2);ctx.arc(5,-14,1.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ad6559';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,-8,3,.1,Math.PI-.1);ctx.stroke();
    if(alchemist){ctx.strokeStyle='#d9d2c4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,-4);ctx.quadraticCurveTo(0,1,3,-4);ctx.stroke();}
    ctx.restore();
  }

  function drawGrandpaRoomDetails() {
    // A woven family rug and low table turn the center of the room into a lived-in space.
    ctx.fillStyle='#263b2d34';ctx.beginPath();ctx.ellipse(789,411,201,112,-.04,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#824d45';ctx.beginPath();ctx.roundRect(586,298,404,219,23);ctx.fill();
    ctx.fillStyle='#d4ae72';ctx.beginPath();ctx.roundRect(598,310,380,195,18);ctx.fill();
    ctx.fillStyle='#8c554b';ctx.beginPath();ctx.roundRect(611,323,354,169,14);ctx.fill();
    ctx.strokeStyle='#dfbd81';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(624,336,328,143,9);ctx.stroke();
    for(let x=638;x<946;x+=24){ctx.fillStyle=x%48?'#e3c68f':'#c79f68';ctx.beginPath();ctx.arc(x,344,2.5,0,Math.PI*2);ctx.arc(x,471,2.5,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#d0ad72';ctx.beginPath();ctx.arc(788,408,26,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8c5549';ctx.beginPath();ctx.moveTo(788,389);ctx.lineTo(803,407);ctx.lineTo(788,426);ctx.lineTo(773,407);ctx.closePath();ctx.fill();
    // Tall casement window with a painted meadow, carved frame and gathered curtains.
    ctx.fillStyle='#46372d';ctx.beginPath();ctx.roundRect(700,116,244,151,13);ctx.fill();
    ctx.fillStyle='#d9bb83';ctx.beginPath();ctx.roundRect(709,125,226,134,9);ctx.fill();
    const sky=ctx.createLinearGradient(0,133,0,250);sky.addColorStop(0,'#7cb6bd');sky.addColorStop(.62,'#b9d4a0');sky.addColorStop(1,'#71956d');ctx.fillStyle=sky;ctx.beginPath();ctx.roundRect(721,137,202,110,5);ctx.fill();
    ctx.fillStyle='#f2dc98';ctx.beginPath();ctx.arc(870,158,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#557e59';ctx.beginPath();ctx.moveTo(721,220);ctx.quadraticCurveTo(760,193,790,219);ctx.quadraticCurveTo(828,182,857,218);ctx.quadraticCurveTo(891,191,923,213);ctx.lineTo(923,247);ctx.lineTo(721,247);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#d9bb83';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(822,137);ctx.lineTo(822,247);ctx.moveTo(721,194);ctx.lineTo(923,194);ctx.stroke();
    ctx.fillStyle='#aa6f61';ctx.beginPath();ctx.moveTo(697,127);ctx.lineTo(718,139);ctx.lineTo(718,228);ctx.quadraticCurveTo(696,218,697,127);ctx.fill();ctx.beginPath();ctx.moveTo(948,127);ctx.lineTo(927,139);ctx.lineTo(927,228);ctx.quadraticCurveTo(949,218,948,127);ctx.fill();
    ctx.fillStyle='#d8b77f';ctx.beginPath();ctx.ellipse(708,136,10,5,0,0,Math.PI*2);ctx.ellipse(937,136,10,5,0,0,Math.PI*2);ctx.fill();
    // A framed embroidery, candle sconces, and a potted herb soften the walls.
    ctx.fillStyle='#4a392e';ctx.beginPath();ctx.roundRect(684,279,78,83,7);ctx.fill();
    ctx.fillStyle='#d8bf8c';ctx.beginPath();ctx.roundRect(691,286,64,69,4);ctx.fill();
    ctx.fillStyle='#70936b';ctx.beginPath();ctx.moveTo(700,343);ctx.lineTo(722,305);ctx.lineTo(745,343);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d5a85e';ctx.beginPath();ctx.arc(722,301,5,0,Math.PI*2);ctx.fill();
    for(const x of [660,977]){ctx.fillStyle='#705038';ctx.fillRect(x-3,273,6,21);ctx.fillStyle='#e9bc66';ctx.beginPath();ctx.moveTo(x,263);ctx.quadraticCurveTo(x-8,276,x,281);ctx.quadraticCurveTo(x+8,276,x,263);ctx.fill();}
    ctx.fillStyle='#35544455';ctx.beginPath();ctx.ellipse(940,395,33,11,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#805b3d';ctx.beginPath();ctx.moveTo(917,385);ctx.lineTo(925,408);ctx.lineTo(956,408);ctx.lineTo(964,385);ctx.closePath();ctx.fill();
    ctx.fillStyle='#c48d64';ctx.fillRect(919,383,43,6);
    for(let i=0;i<5;i++){ctx.strokeStyle=['#527a4d','#668a50','#527a4d','#779350','#55784d'][i];ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(940,385);ctx.quadraticCurveTo(925+i*7,369-(i%2)*8,920+i*8,351);ctx.stroke();ctx.fillStyle='#71965b';ctx.beginPath();ctx.ellipse(923+i*8,361-(i%2)*8,5,10,-.5,0,Math.PI*2);ctx.fill();}
    // Bookcase: individual worn spines, brass labels, carved supports and a small keepsake.
    ctx.fillStyle='#392b24';ctx.beginPath();ctx.roundRect(196,127,289,122,13);ctx.fill();
    ctx.fillStyle='#895d40';ctx.beginPath();ctx.roundRect(204,135,273,107,9);ctx.fill();
    ctx.fillStyle='#c29a62';ctx.fillRect(211,139,259,8);ctx.fillRect(211,228,259,8);
    const books=[['#9c5948',58],['#647c5d',66],['#567d9b',57],['#b2834f',68],['#90658b',60],['#a6674c',64],['#6d875f',54]];
    let bx=218;for(let i=0;i<books.length;i++){const [color,h]=books[i],w=i%2?29:31;ctx.fillStyle='#523b2f';ctx.beginPath();ctx.roundRect(bx,147+(66-h),w,h,3);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(bx+3,150+(66-h),w-6,h-7,2);ctx.fill();ctx.fillStyle='#e2c784';ctx.fillRect(bx+6,160+(66-h),w-12,3);ctx.fillRect(bx+6,184+(66-h),w-12,2);ctx.strokeStyle='#f0d7a3';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx+5,153+(66-h));ctx.lineTo(bx+5,205);ctx.stroke();bx+=35;}
    ctx.fillStyle='#e5c77f';ctx.beginPath();ctx.arc(459,156,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#74543b';ctx.beginPath();ctx.ellipse(458,214,12,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d2b374';ctx.beginPath();ctx.ellipse(458,211,8,6,0,0,Math.PI*2);ctx.fill();
    // The basement opening is a deep, timber-framed stairwell, not a flat ladder.
    ctx.fillStyle='#3d2c23';ctx.beginPath();ctx.roundRect(485,99,150,175,16);ctx.fill();
    ctx.fillStyle='#976d45';ctx.beginPath();ctx.roundRect(493,106,134,161,12);ctx.fill();
    ctx.fillStyle='#292b25';ctx.beginPath();ctx.roundRect(507,116,106,137,8);ctx.fill();
    const stair=ctx.createLinearGradient(0,119,0,252);stair.addColorStop(0,'#745238');stair.addColorStop(1,'#332e27');ctx.fillStyle=stair;ctx.beginPath();ctx.roundRect(513,121,94,124,6);ctx.fill();
    for(let i=0;i<7;i++){const y=126+i*17;ctx.fillStyle=i%2?'#b58a56':'#c69a60';ctx.beginPath();ctx.moveTo(516,y);ctx.lineTo(604,y);ctx.lineTo(599,y+9);ctx.lineTo(521,y+9);ctx.closePath();ctx.fill();ctx.strokeStyle='#64452f';ctx.lineWidth=2;ctx.stroke();}
    ctx.fillStyle='#342f28';ctx.beginPath();ctx.ellipse(560,244,40,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d9bb83';ctx.fillRect(487,103,146,7);ctx.fillRect(487,263,146,7);
    // A sturdy trestle worktable, with map, ink, a mug and small tools.
    ctx.fillStyle='#263b2d45';ctx.beginPath();ctx.ellipse(815,530,103,37,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#604331';ctx.fillRect(748,486,13,64);ctx.fillRect(871,486,13,64);
    ctx.fillStyle='#845c3d';ctx.beginPath();ctx.roundRect(726,449,177,91,11);ctx.fill();
    const wood=ctx.createLinearGradient(0,453,0,535);wood.addColorStop(0,'#c4945c');wood.addColorStop(.45,'#a87548');wood.addColorStop(1,'#80563b');ctx.fillStyle=wood;ctx.beginPath();ctx.roundRect(734,457,161,74,8);ctx.fill();
    ctx.strokeStyle='#d4ab70';ctx.lineWidth=2;for(let y=466;y<526;y+=17){ctx.beginPath();ctx.moveTo(742,y);ctx.quadraticCurveTo(805,y+5,886,y-2);ctx.stroke();}
    ctx.fillStyle='#e7d6ad';ctx.beginPath();ctx.moveTo(759,470);ctx.lineTo(811,465);ctx.lineTo(821,503);ctx.lineTo(766,508);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#8c6b4d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(767,481);ctx.lineTo(809,478);ctx.moveTo(769,489);ctx.lineTo(812,486);ctx.moveTo(771,497);ctx.lineTo(814,494);ctx.stroke();
    ctx.fillStyle='#6c4b35';ctx.beginPath();ctx.ellipse(858,478,11,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d4b16f';ctx.beginPath();ctx.ellipse(858,475,8,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ddb86d';ctx.fillRect(840,502,31,5);ctx.fillRect(844,510,23,4);
    // Small bench at the foot of the bookshelf.
    ctx.fillStyle='#65482f';ctx.beginPath();ctx.roundRect(232,480,170,42,8);ctx.fill();
    ctx.fillStyle='#a97a4a';ctx.beginPath();ctx.roundRect(238,474,158,31,7);ctx.fill();
    ctx.strokeStyle='#d0a86b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(246,483);ctx.quadraticCurveTo(310,492,389,481);ctx.stroke();
    ctx.fillStyle='#74543b';ctx.fillRect(249,502,8,25);ctx.fillRect(378,502,8,25);
  }

  function drawHomeRoomAccents() {
    // Stitching and a quilt pattern make the oversized bed feel like a crafted object.
    ctx.strokeStyle='#e6dfba';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(245,231);ctx.lineTo(437,231);ctx.moveTo(245,270);ctx.lineTo(437,270);ctx.stroke();
    for(let x=253;x<433;x+=24){ctx.strokeStyle=x%48?'#6d986d':'#d3dfb0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,238);ctx.lineTo(x+8,247);ctx.lineTo(x,256);ctx.lineTo(x-8,247);ctx.closePath();ctx.stroke();}
    ctx.fillStyle='#73533a';ctx.beginPath();ctx.ellipse(492,220,34,15,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#a97a4d';ctx.beginPath();ctx.roundRect(462,198,60,39,6);ctx.fill();
    ctx.fillStyle='#d5b87d';ctx.beginPath();ctx.arc(492,207,8,0,Math.PI*2);ctx.fill();
    // Keepsake cabinet with a family portrait and small colored curios.
    ctx.fillStyle='#714e36';ctx.beginPath();ctx.roundRect(704,137,214,128,15);ctx.fill();
    ctx.fillStyle='#c59a61';ctx.beginPath();ctx.roundRect(713,146,196,110,10);ctx.fill();
    ctx.strokeStyle='#80583b';ctx.lineWidth=3;for(let x=720;x<905;x+=61){ctx.beginPath();ctx.moveTo(x,151);ctx.lineTo(x,250);ctx.stroke();}
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){const x=733+col*59,y=160+row*27;ctx.fillStyle=['#9b6250','#67846b','#6987a5','#b48651'][((row*3+col)%4)];ctx.beginPath();ctx.roundRect(x,y,39,19,3);ctx.fill();ctx.fillStyle='#e1c488';ctx.beginPath();ctx.arc(x+20,y+10,2.5,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#e6d9b8';ctx.beginPath();ctx.roundRect(816,161,48,42,5);ctx.fill();ctx.fillStyle='#71906a';ctx.beginPath();ctx.arc(840,178,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d59d7a';ctx.beginPath();ctx.arc(840,190,7,Math.PI,0);ctx.fill();
    // A woven oval rug and a little teacup make the sitting corner feel used.
    ctx.strokeStyle='#dfd1a5';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(392,480,75-i*13,27-i*5,0,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#6c5842';ctx.beginPath();ctx.ellipse(465,467,12,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f1dfb9';ctx.beginPath();ctx.ellipse(463,464,8,5,0,0,Math.PI*2);ctx.fill();
  }

  function drawHutRoomAccents() {
    // Wall racks keep the flower studies, working ingredients and tools in clear zones.
    ctx.fillStyle='#392d2d';ctx.beginPath();ctx.roundRect(665,112,300,172,11);ctx.fill();
    ctx.fillStyle='#6d4a38';ctx.beginPath();ctx.roundRect(674,120,282,157,7);ctx.fill();
    ctx.fillStyle='#9b7048';ctx.fillRect(672,204,286,10);ctx.fillRect(672,271,286,10);
    ctx.fillStyle='#d2ad70';ctx.fillRect(674,208,282,3);ctx.fillRect(674,275,282,3);
    // Hanging herb bundles with stems and tied ribbons.
    for(let i=0;i<6;i++){const x=694+i*43;ctx.strokeStyle='#446a43';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,131);ctx.lineTo(x+3,166);ctx.moveTo(x+3,143);ctx.lineTo(x-5,135);ctx.moveTo(x+3,148);ctx.lineTo(x+10,138);ctx.stroke();ctx.fillStyle=['#668b50','#728b54','#90759d'][i%3];for(let j=0;j<4;j++){ctx.beginPath();ctx.ellipse(x+(j%2?5:-4),143+j*5,4,2,.5,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#c68c63';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-3,159);ctx.lineTo(x+8,159);ctx.stroke();}
    // Distinct stoppered bottles, each filled with a different glowing ingredient.
    const colors=['#5aa783','#8b73ba','#d19a47','#548ca2','#bd6470','#a0ad56'];
    for(let i=0;i<6;i++){const x=691+i*42;const g=ctx.createLinearGradient(x,220,x+25,260);g.addColorStop(0,'#fff0c977');g.addColorStop(.25,colors[i]);g.addColorStop(1,'#394c4a');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x+7,223);ctx.lineTo(x+18,223);ctx.lineTo(x+18,230);ctx.quadraticCurveTo(x+27,240,x+25,258);ctx.quadraticCurveTo(x+12,264,x,258);ctx.quadraticCurveTo(x-2,240,x+7,230);ctx.closePath();ctx.fill();ctx.strokeStyle='#dec792';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#60432e';ctx.fillRect(x+8,217,10,7);ctx.fillStyle='#fff2bfaa';ctx.beginPath();ctx.ellipse(x+6,242,2,8,-.15,0,Math.PI*2);ctx.fill();}
    // Painted herbarium and hanging measuring tools add shape to the bare wall.
    ctx.fillStyle='#604532';ctx.beginPath();ctx.roundRect(655,317,94,66,7);ctx.fill();ctx.fillStyle='#e4d1a4';ctx.beginPath();ctx.roundRect(660,322,84,56,4);ctx.fill();
    ctx.strokeStyle='#5b874e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(702,370);ctx.quadraticCurveTo(688,350,705,332);ctx.moveTo(702,358);ctx.lineTo(687,347);ctx.moveTo(701,350);ctx.lineTo(716,338);ctx.stroke();
    for(const [x,y] of [[689,350],[715,342],[701,334]]){ctx.fillStyle='#819b5c';ctx.beginPath();ctx.ellipse(x,y,6,3,-.6,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#d5bd82';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(938,310);ctx.lineTo(938,365);ctx.arc(938,372,7,Math.PI,0);ctx.lineTo(938,391);ctx.stroke();
    ctx.fillStyle='#9b8057';ctx.beginPath();ctx.roundRect(915,401,48,9,4);ctx.fill();
    ctx.fillStyle='#c5a36a';ctx.beginPath();ctx.ellipse(939,400,18,6,0,0,Math.PI*2);ctx.fill();
  }

  function drawHutWorkbench() {
    // A little stone bench holds a pestle, an open field journal, and a moon crystal.
    ctx.fillStyle='#263b2d30';ctx.beginPath();ctx.ellipse(695,474,72,23,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#715137';ctx.beginPath();ctx.roundRect(635,420,124,54,9);ctx.fill();
    ctx.fillStyle='#a77d4c';ctx.beginPath();ctx.roundRect(641,414,112,15,7);ctx.fill();
    ctx.fillStyle='#827764';ctx.beginPath();ctx.ellipse(683,407,22,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a5a38c';ctx.beginPath();ctx.ellipse(683,404,18,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#6b5238';ctx.save();ctx.translate(703,395);ctx.rotate(-.45);ctx.beginPath();ctx.roundRect(-4,-5,37,8,4);ctx.fill();ctx.restore();
    ctx.fillStyle='#553f31';ctx.beginPath();ctx.roundRect(885,431,88,56,6);ctx.fill();ctx.fillStyle='#d7c28f';ctx.beginPath();ctx.roundRect(891,436,76,46,4);ctx.fill();
    ctx.strokeStyle='#967651';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(929,438);ctx.lineTo(929,480);ctx.stroke();
    ctx.strokeStyle='#67845a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(910,472);ctx.quadraticCurveTo(903,452,916,445);ctx.moveTo(910,465);ctx.lineTo(900,457);ctx.moveTo(911,457);ctx.lineTo(921,451);ctx.stroke();
    ctx.fillStyle='#6c5a99';ctx.beginPath();ctx.moveTo(820,416);ctx.lineTo(835,388);ctx.lineTo(848,416);ctx.lineTo(838,427);ctx.lineTo(824,425);ctx.closePath();ctx.fill();
    const crystal=ctx.createLinearGradient(820,388,846,427);crystal.addColorStop(0,'#f6e9ff');crystal.addColorStop(.3,'#b7a3dc');crystal.addColorStop(1,'#6e609d');ctx.fillStyle=crystal;ctx.beginPath();ctx.moveTo(831,390);ctx.lineTo(843,414);ctx.lineTo(836,427);ctx.lineTo(823,425);ctx.lineTo(819,411);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#eadfae';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(832,397);ctx.lineTo(833,417);ctx.stroke();
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
      drawHomeRoomAccents();
    } else if (s.interior === 'grandpa') {
      drawGrandpaRoomDetails();
      drawInteriorPerson(805,335,'#71846a');
      if(Math.hypot(s.x-560,s.y-178)<94){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.beginPath();ctx.roundRect(485,99,150,175,16);ctx.stroke();ctx.restore();}
      if(Math.hypot(s.x-805,s.y-335)<125){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.beginPath();ctx.moveTo(781,357);ctx.quadraticCurveTo(778,329,786,315);ctx.arc(805,322,20,Math.PI,0);ctx.quadraticCurveTo(832,333,829,357);ctx.quadraticCurveTo(805,370,781,357);ctx.closePath();ctx.stroke();ctx.restore();}
    } else if (s.interior === 'hut') {
      drawHutRoomAccents();
      drawHutGuide();
      drawHutWorkbench();
      ctx.fillStyle='#263b2d35';ctx.beginPath();ctx.ellipse(822,487,110,35,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#74563d';ctx.beginPath();ctx.ellipse(820,465,93,47,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#557b54';ctx.beginPath();ctx.ellipse(820,464,80,36,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#4c9880';ctx.beginPath();ctx.ellipse(820,455,67,28,0,0,Math.PI*2);ctx.fill();
      const brew=ctx.createRadialGradient(802,443,2,820,455,56);brew.addColorStop(0,'#c8e390');brew.addColorStop(.5,'#7dc484');brew.addColorStop(1,'#42846f');ctx.fillStyle=brew;ctx.beginPath();ctx.ellipse(820,455,54,20,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f1dbad';ctx.fillRect(800,430,40,32);ctx.fillStyle='#714b36';ctx.fillRect(796,426,48,7);
      ctx.fillStyle='#f0dfae';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(784+i*24,412-(i%2)*11,4+i%2,0,Math.PI*2);ctx.fill();}
      roundedRect(735,507,170,17,8,'#6d513d');ctx.fillStyle='#d7b27b';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(755+i*31,515,5,0,Math.PI*2);ctx.fill();}
      if(Math.hypot(s.x-820,s.y-465)<105){const p=(Math.sin(performance.now()/230)+1)/2;ctx.save();ctx.strokeStyle=`rgba(100,255,130,${.76+p*.18})`;ctx.lineWidth=3+p;ctx.shadowColor='#5dff7e';ctx.shadowBlur=8+p*11;ctx.beginPath();ctx.ellipse(820,465,94,49,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
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
    // A warm, lived-in cellar with timber framing, hand-cut stone, storage, and lantern light.
    ctx.fillStyle = '#0d211fbb'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.shadowColor = '#071612aa'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12;
    roundedRect(118, 68, 884, 592, 28, '#34261f');
    ctx.restore();
    const frame = ctx.createLinearGradient(0, 76, 0, 650);
    frame.addColorStop(0, '#775139'); frame.addColorStop(.45, '#4f3729'); frame.addColorStop(1, '#302820');
    roundedRect(130, 78, 860, 572, 24, frame);

    // Stone foundation wall with staggered, hand-cut blocks.
    ctx.save(); ctx.beginPath(); ctx.roundRect(145, 92, 830, 140, 15); ctx.clip();
    const wall = ctx.createLinearGradient(0, 92, 0, 232);
    wall.addColorStop(0, '#8d7760'); wall.addColorStop(1, '#625343');
    ctx.fillStyle = wall; ctx.fillRect(145, 92, 830, 140);
    const stoneColors = ['#a28a6a','#8f795f','#78684f','#9a8467','#6e604e'];
    for (let row = 0; row < 4; row++) {
      const y = 96 + row * 34, offset = row % 2 ? -42 : 0;
      for (let x = 145 + offset; x < 985; x += 96) {
        const shade = stoneColors[(row * 3 + Math.floor((x + 42) / 96)) % stoneColors.length];
        roundedRect(x + 3, y + 3, 88, 28, 5, shade);
        ctx.strokeStyle = '#d3b68a55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 10, y + 8); ctx.lineTo(x + 70, y + 8); ctx.stroke();
      }
    }
    ctx.restore();

    // Broad flagstone floor replaces the old flat plank grid.
    const floor = ctx.createLinearGradient(0, 215, 0, 615);
    floor.addColorStop(0, '#8c8068'); floor.addColorStop(.55, '#746c5b'); floor.addColorStop(1, '#615b4e');
    roundedRect(148, 210, 824, 414, 15, floor);
    ctx.save(); ctx.beginPath(); ctx.roundRect(152, 214, 816, 406, 13); ctx.clip();
    const flagstones = ['#97896d','#887d64','#7c745f','#9b8e73','#837a65','#706d5c'];
    for (let row = 0; row < 8; row++) {
      const y = 216 + row * 52, shift = row % 2 ? -43 : 0;
      for (let x = 150 + shift; x < 990; x += 90) {
        const col = flagstones[(row * 5 + Math.floor((x + 43) / 90)) % flagstones.length];
        roundedRect(x + 3, y + 3, 84, 46, 6, col);
        ctx.strokeStyle = '#c4b28b55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 11, y + 9); ctx.lineTo(x + 68, y + 9); ctx.stroke();
      }
    }
    // Scattered grit and old water marks keep the floor from reading as a grid.
    for (let i = 0; i < 42; i++) {
      const x = 180 + (i * 173) % 750, y = 235 + (i * 97) % 360;
      ctx.fillStyle = i % 2 ? '#d7c59b36' : '#343d3450';
      ctx.beginPath(); ctx.ellipse(x, y, 2 + i % 3, 1.2 + i % 2, -.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Timber frame, wall ledges, and warm pools from the cellar lamps.
    const beam = ctx.createLinearGradient(135, 0, 170, 0);
    beam.addColorStop(0, '#3d2b20'); beam.addColorStop(.5, '#a57243'); beam.addColorStop(1, '#533723');
    ctx.fillStyle = beam; ctx.fillRect(140, 90, 26, 528); ctx.fillRect(954, 90, 26, 528);
    ctx.fillStyle = '#5b3d29'; ctx.fillRect(140, 216, 840, 17); ctx.fillRect(140, 601, 840, 18);
    ctx.fillStyle = '#bf9057'; ctx.fillRect(145, 218, 830, 4); ctx.fillRect(145, 603, 830, 4);

    for (const [lx, ly] of [[190, 166], [928, 166]]) {
      const glow = ctx.createRadialGradient(lx, ly + 10, 5, lx, ly + 18, 115);
      glow.addColorStop(0, '#ffd47d38'); glow.addColorStop(1, '#ffd47d00');
      ctx.fillStyle = glow; ctx.fillRect(lx - 120, ly - 95, 240, 230);
      ctx.fillStyle = '#392b22'; ctx.fillRect(lx - 12, ly - 29, 24, 9);
      ctx.fillStyle = '#bd8950'; ctx.fillRect(lx - 8, ly - 24, 16, 4);
      ctx.fillStyle = '#f4ca72'; ctx.beginPath(); ctx.ellipse(lx, ly - 13, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.arc(lx, ly - 16, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Storage shelves loaded with glass jars and folded sacks.
    function cellarShelf(x, y, w) {
      ctx.fillStyle = '#343027'; ctx.fillRect(x + 5, y + 37, w - 10, 9);
      ctx.fillStyle = '#92653d'; ctx.fillRect(x, y + 28, w, 9);
      ctx.fillStyle = '#c09058'; ctx.fillRect(x + 3, y + 27, w - 6, 4);
      ctx.fillStyle = '#64452e'; ctx.fillRect(x + 6, y - 13, 7, 42); ctx.fillRect(x + w - 13, y - 13, 7, 42);
      const jarColors = ['#7da28b','#bf9864','#6d91a0','#a97672','#cfb77a'];
      for (let i = 0; i < Math.floor(w / 22); i++) {
        const jx = x + 15 + i * 22, color = jarColors[i % jarColors.length];
        ctx.fillStyle = '#49372b'; ctx.fillRect(jx + 4, y - 4, 12, 30);
        ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(jx + 2, y - 8, 16, 28, 5); ctx.fill();
        ctx.fillStyle = '#e5d3a277'; ctx.fillRect(jx + 5, y - 4, 3, 16);
        ctx.fillStyle = '#d6bb84'; ctx.fillRect(jx + 5, y - 12, 10, 5);
      }
    }
    cellarShelf(204, 191, 132); cellarShelf(784, 191, 150);

    // Stair opening is framed in oak; bright treads show the way upstairs.
    roundedRect(505, 94, 110, 123, 12, '#493124');
    roundedRect(515, 101, 90, 111, 8, '#91623d');
    ctx.fillStyle = '#38291f'; ctx.fillRect(520, 104, 80, 103);
    for (let y = 108, n = 0; y < 205; y += 16, n++) {
      const tread = ctx.createLinearGradient(0, y, 0, y + 11);
      tread.addColorStop(0, n % 2 ? '#d0ad75' : '#e0c18b'); tread.addColorStop(1, '#98704b');
      ctx.fillStyle = tread; ctx.fillRect(522, y, 76, 10);
      ctx.strokeStyle = '#6b4a31'; ctx.lineWidth = 1; ctx.strokeRect(522, y, 76, 10);
    }
    ctx.fillStyle = '#c5a16b'; ctx.fillRect(499, 94, 122, 8);

    // Three sturdy barrels with hoops, wood grain, and dark openings.
    for (const [x, y, r] of [[250, 435, 25], [875, 320, 25], [760, 525, 25]]) {
      ctx.fillStyle = '#242b25a8'; ctx.beginPath(); ctx.ellipse(x + 4, y + 13, r + 8, 13, 0, 0, Math.PI * 2); ctx.fill();
      const wood = ctx.createLinearGradient(x - r, y, x + r, y);
      wood.addColorStop(0, '#63402b'); wood.addColorStop(.35, '#a16d3f'); wood.addColorStop(.7, '#8b5c35'); wood.addColorStop(1, '#4d3528');
      ctx.fillStyle = wood; ctx.beginPath(); ctx.ellipse(x, y, r, r * .73, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4b3527'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, r - 5, r * .48, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#c2985d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, r - 3, r * .58, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 13, y - 5); ctx.quadraticCurveTo(x, y - 13, x + 13, y - 5); ctx.stroke();
    }
    // A low woven rug sits away from the rodent-catching lanes.
    roundedRect(398, 556, 238, 38, 12, '#675141');
    roundedRect(405, 560, 224, 30, 9, '#9b7650');
    ctx.strokeStyle = '#dbc18a'; ctx.lineWidth = 2; ctx.strokeRect(414, 565, 206, 20);
    for (let x = 428; x < 612; x += 24) { ctx.fillStyle = '#d7bf8e'; ctx.fillRect(x, 569, 7, 12); }

    // Dusty cobwebs and a little carved crest tie this room back to the home above.
    ctx.strokeStyle = '#e5d8ba66'; ctx.lineWidth = 2;
    for (const [cx, cy, dx, dy] of [[152, 95, 58, 55], [968, 95, -58, 55]]) {
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx, cy + dy);
      ctx.moveTo(cx, cy + dy); ctx.lineTo(cx + dx, cy);
      for (let i = 1; i < 5; i++) {
        const t = i / 5; ctx.beginPath(); ctx.moveTo(cx + dx * t, cy + dy * .2);
        ctx.quadraticCurveTo(cx + dx * t * .7, cy + dy * .65, cx + dx * t, cy + dy); ctx.stroke();
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#563d2b'; ctx.beginPath(); ctx.moveTo(560, 238); ctx.lineTo(581, 248); ctx.lineTo(576, 273); ctx.lineTo(560, 284); ctx.lineTo(544, 273); ctx.lineTo(539, 248); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d7bb77'; ctx.beginPath(); ctx.moveTo(560, 245); ctx.lineTo(574, 252); ctx.lineTo(571, 269); ctx.lineTo(560, 277); ctx.lineTo(549, 269); ctx.lineTo(546, 252); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#56825b'; ctx.beginPath(); ctx.arc(560, 261, 5, 0, Math.PI * 2); ctx.fill();

    if (Math.hypot(s.x - 560, s.y - 175) < 88) {
      const p = (Math.sin(performance.now() / 230) + 1) / 2;
      ctx.save(); ctx.strokeStyle = 'rgba(100,255,130,' + (.72 + p * .18) + ')'; ctx.lineWidth = 3 + p;
      ctx.shadowColor = '#5dff7e'; ctx.shadowBlur = 8 + p * 11; ctx.strokeRect(510, 95, 100, 119); ctx.restore();
    }
    [...s.mice.map(mouse => ({ y: mouse.y, draw: () => drawBasementMouse(mouse) })), { y: s.y, draw: drawBoy }]
      .sort((a, b) => a.y - b.y).forEach(layer => layer.draw());
  }

  function updateMice(now,dt){
    if(s.scene!=='basement'||(modal.classList.contains('open')&&!modal.classList.contains('catching')))return;
    for(const mouse of s.mice){
      if(!mouse.moving&&now>=mouse.pauseUntil){mouse.targetX=235+Math.random()*650;mouse.targetY=245+Math.random()*285;mouse.moving=true;}
      if(!mouse.moving)continue;const dx=mouse.targetX-mouse.x,dy=mouse.targetY-mouse.y,d=Math.hypot(dx,dy);
      if(d<4){mouse.x=mouse.targetX;mouse.y=mouse.targetY;mouse.moving=false;mouse.pauseUntil=now+900+Math.random()*2300;}
      else{const step=Math.min(d,(160+(mouse.id%3)*44)*dt);mouse.x+=dx/d*step;mouse.y+=dy/d*step;mouse.face=Math.atan2(dy,dx);}
    }
    if(modal.classList.contains('catching')&&s.activeCatchTarget!=null){const m=s.mice.find(v=>v.id===s.activeCatchTarget);if(!m||Math.hypot(s.x-m.x,s.y-m.y)>112){closeModal();toast('The rodent scurried out of reach!');}}
  }

  const trailLayouts={'05':[[[220,800],[285,560],[405,470],[600,410],[800,360],[1200,360],122]],'06':[[[560,610],[535,570],[540,460],[590,340],[680,230],[700,130],[560,-80],122],[[540,460],[430,420],[320,380],[200,360],[-80,360],112],[[600,360],[740,355],[900,350],[1200,360],112]],'07':[[[560,104],[525,160],[500,280],[545,400],[620,505],[560,800],122]],'08':[[[560,104],[525,150],[445,225],[390,310],[475,405],[625,470],[750,565],[830,800],122]],'09':[[[830,800],[750,570],[665,480],[625,380],[700,275],[780,180],[830,-80],122],[[-80,360],[220,360],[395,365],[515,420],[625,485],[700,535],112]],'11':[[[1200,360],[890,360],[730,390],[570,390],[430,330],[330,245],[225,155],[220,80],[220,-80],122],[[570,390],[470,425],[390,490],[435,545],[520,595],[560,650],[560,800],116]],'12':[[[1200,360],[900,360],[760,360],[660,360],[560,360],[460,360],[330,360],[180,360],[-80,360],122]],'13':[[[-80,360],[190,360],[320,520],[510,540],[700,500],[820,390],[790,265],[785,165],[830,-80],122]],'16':[[[560,-80],[470,150],[340,230],[245,350],[270,490],[390,585],[485,650],[560,800],122]],'21':[[[560,-80],[520,170],[460,285],[370,370],[260,430],[250,470],112]]};
  function treeOverlapsTrail(screen,x,y){return(trailLayouts[screen]||[]).some(route=>{const w=route[route.length-1],pts=route.slice(0,-1);for(let i=0;i<pts.length-1;i++)if(pointSegmentDistance(x,y,...pts[i],...pts[i+1])<w/2+28)return true;return false;});}
  function draw() {
    drawGround(); drawRoomPath();
    if (s.screen === '13') { drawVillageFence(); drawVillageHomes(); }
    if (s.scene === 'outside') {
      const visible=(roomObjects[s.screen]||[]).filter(o=>getAvailableObjects().some(active=>active.id===o.id));
      const trees=[[34,54],[1082,52],[32,657],[1080,652],[340,35],[780,676],[1020,215],[140,510],[250,80],[900,660]].filter(([x,y])=>!(s.screen==='09'&&x>700&&y>600));
      if(s.screen!=='13'&&s.screen!=='11') trees.push([180,210],[945,485],[380,620]);
      if(s.screen==='06') trees.push([700,85],[1040,100],[1080,255],[690,300],[1030,650],[620,120]);
      const cleanTrees=trees.filter(([x,y])=>s.screen!=='11'&&!treeOverlapsTrail(s.screen,x,y));
      const layers=[...cleanTrees.map(([x,y],i)=>({y:y+25,draw:()=>tree(x,y,1.15+(i%3)*.12)})),
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
    if (!s.returnGateOpen) fence.push([770,100,890,100]);
    if (!s.gateOpen) fence.push([100,305,100,415]);
    return fence.some((line) => hitsSegment(x, y, line));
  }

  function solidCircles() {
    const treeEdges = [];
    const groundTrees = [[34,54],[1082,52],[32,657],[1080,652],[340,35],[780,676],[1020,215],[140,510]];
    const sceneTrees = s.screen === '06'
      ? [[700,85],[1040,100],[1080,255],[690,300],[1030,650],[620,120]]
      : s.screen === '09' ? [[180,210],[1030,170],[180,610],[1060,620]]
      : s.screen === '12' ? [[180,210]]
      : s.screen === '21' || s.screen === '08' ? [[945,485]]
      : s.screen === '16' ? [[835,190]] : [];
    for (const [x,y] of [...groundTrees,...sceneTrees]) {
      if (x > 80 && x < W-80 && y > 80 && y < H-80 && s.screen!=='11' && !treeOverlapsTrail(s.screen,x,y)) treeEdges.push([x,y,35]);
    }
    const fixed = {
      '13': [[560,280,58],[850,520,58],[265,205,52],[930,455,27],[405,245,27],[670,545,27],[320,405,27]],
      '11': s.thorns ? [[475,270,24],[650,510,24]] : [[225,155,98],[475,270,24],[650,510,24]],
      '16': [[430,390,24]],
      '07': [[610,540,24]],
      '09': [[950,450,38]],
      '21': [[250,390,68]],
      '08': [[735,365,42]],
      '08': [[735,365,42]],
      '06': [[730,200,20]]
    };
    const objects = fixed[s.screen] || [];
    const gate = s.screen === '13' && !s.gateOpen ? [[100,360,36]] : [];
    const northGate = s.screen === '13' && !s.returnGateOpen ? [[830,100,36]] : [];
    return [...treeEdges, ...objects, ...gate, ...northGate];
  }

  function hitsWorldObject(x, y) {
    if (s.scene === 'outside') {
      if (villageFenceBlocks(x, y)) return true;
      if (s.screen === '09' && !s.returnGateOpen && hitsSegment(x, y, [720, 625, 940, 625], 16)) return true;
      if (s.screen === '06' && ((x - 820) / 102) ** 2 + ((y - 500) / 67) ** 2 < 1) return true;
      if (circleHits(x, y, solidCircles())) return true;
    }
    if (s.scene === 'interior') {
      const furniture = s.interior === 'grandpa'
        ? [[340,185,63],[815,500,54],[560,180,35],[805,335,30],[820,190,43]]
        : s.interior === 'home'
          ? [[335,225,82],[810,198,45],[392,480,57]]
          : [[820,465,55],[820,345,30],[683,404,24],[929,455,28],[830,414,19],...hutGuideCards.map((c)=>[c.x,c.y,34])];
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
    const offLogRiverEntry = s.screen === '12' && inRiver(nx,s.y) && (s.logGone || s.y < 320 || s.y > 378);
    if (s.screen === '13' && !s.returnGateOpen && ny < 118 && nx > 755 && nx < 905) {
      toast('The gate is locked from the other side.');
    } else if (!returnAcrossVanishedLog && !offLogRiverEntry && !(s.screen === '13' && !s.gateOpen && nx < 125 && ny > 290 && ny < 430) && !hitsWorldObject(nx,ny)) {
      s.x = nx;
    }

    ny = clamp(s.y + dy * step, minY, maxY);
    const riverOverlap = inRiver(s.x,ny);
    const onLog = !s.logGone && ny >= 320 && ny <= 378;
    const riverBlocks = riverOverlap && !onLog;
    const crossedAfterLog = s.screen === '12' && s.logGone && s.x < riverCenter(ny)-112 && nx >= riverCenter(ny)-112;
    if (!riverBlocks && !crossedAfterLog && !(s.screen === '13' && !s.returnGateOpen && ny < 118 && s.x > 755 && s.x < 905) && !hitsWorldObject(s.x,ny)) {
      s.y = ny;
    }

    if (s.screen === '12' && !s.logGone && s.y >= 320 && s.y <= 378) {
      const center=riverCenter(s.y);
      if(dx<0 && oldX>center+40 && s.x<=center+40) s.logCrossingStarted=true;
      if(s.logCrossingStarted && s.x<center-150) {
        s.logGone=true;s.logCrossingStarted=false;
        toast('You reach the far bank. The log drifts away.');
      }
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
      if (s.interior === 'grandpa' && x > 195 && x < 485 && y > 120 && y < 255) {
        if (near(340,185,132)) simpleModal('Grandfather’s Bookshelf','📚','Every book is full of maps, old stories, and notes in Grandfather’s tiny handwriting.');
        return;
      }
      if (s.interior === 'grandpa' && x > 695 && x < 950 && y > 110 && y < 270) {
        if (near(820,190,145)) simpleModal('Meadow Window','🌙','The little moon carving above the window has watched over this room for as long as anyone can remember.');
        return;
      }
      if (s.interior === 'grandpa' && x > 485 && x < 635 && y > 100 && y < 265) {
        if (near(560, 180, 94)) { s.returnX = s.x; s.returnY = s.y; showBasement(); }
        return;
      }
      if (s.interior === 'grandpa' && x > 720 && x < 910 && y > 445 && y < 555) {
        if (near(815,500,145)) simpleModal('Grandfather’s Worktable','🗺️','An unfinished map, a jar of ink, and a warm mug cover the table. The map has a path marked with a tiny star.');
        return;
      }
      if (s.interior === 'grandpa' && Math.hypot(x-805,y-335)<58) {
        if (near(805,335,125)) objectOptions('Grandfather', '🧓', s.rodentQuestStarted ? 'Grandfather is waiting to hear how the basement is going.' : 'Grandpa’s warm smile makes every visit feel like coming home. He always has a story to share and time to listen.', [{ label: 'TALK', run: openHouseTalk }]);
        return;
      }
      if (s.interior === 'hut' && Math.hypot(x-820,y-345)<58) {
        if (near(820,345,110)) objectOptions('The Alchemist', '🧙', 'The Alchemist studies plants and brews potions.', [{ label: 'TALK', run: talkToAlchemist }]);
        return;
      }
      if (s.interior === 'hut') {
        if(x>660&&x<960&&y>112&&y<285&&near(810,200,230)) { simpleModal('Potion and Herb Shelves','🧪','Stoppered bottles hold dew, berry syrup, and glowing flower pollen. Bundles of moon mint hang above them to dry.'); return; }
        if(x>650&&x<750&&y>315&&y<390&&near(700,350,130)) { simpleModal('Pressed Plant Study','🌿','The Alchemist pressed a moon fern between sheets of handmade paper. Tiny notes mark the best time to gather it.'); return; }
        if(x>910&&x<970&&y>300&&y<410&&near(940,355,130)) { simpleModal('Brass Measuring Set','⚖️','Little brass weights balance on a narrow beam. Each one is etched with a different moon phase.'); return; }
        if(x>650&&x<730&&y>385&&y<425&&near(683,404,115)) { simpleModal('Stone Mortar and Pestle','🪨','The stone bowl is stained green from crushed herbs. A wooden pestle rests beside a pinch of golden seeds.'); return; }
        if(x>885&&x<975&&y>430&&y<490&&near(929,455,125)) { simpleModal('Alchemist’s Field Journal','📖','A plant sketch fills one page. The other is covered with careful notes about mixing flowers and rainwater.'); return; }
        if(x>805&&x<855&&y>385&&y<430&&near(830,414,115)) { simpleModal('Moon Crystal','🔮','A cool lavender crystal catches the light and scatters tiny violet reflections across the floor.'); return; }
        if(x>725&&x<915&&y>420&&y<515&&near(820,465,125)) { simpleModal('Bubbling Cauldron', '⚗️', 'A copper cauldron bubbles with a bright green brew. A slow spiral of steam smells faintly of mint.'); return; }
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
      if (s.interior === 'home' && x > 700 && x < 920 && y > 140 && y < 265) {
        if (near(810,200,140)) simpleModal('Keepsake Cabinet','🪵','Small treasures from the village are tucked into each little drawer. One holds a smooth blue pebble.');
        return;
      }
      if (s.interior === 'home' && x > 265 && x < 520 && y > 415 && y < 550) {
        if (near(392,480,145)) simpleModal('Handmade Table','🕯️','The table was carved from a fallen oak. A warm candle makes the wood glow like honey.');
        return;
      }
      return;
    }
    if (s.scene === 'basement') {
      const nearBasementProp=(px,py,r=118)=>Math.hypot(s.x-px,s.y-py)<r;
      if(x>205&&x<330&&y>170&&y<240&&nearBasementProp(270,204)) { simpleModal('Old Supply Shelf','🧺','Dusty jars, twine, and a bundle of carrots sit here. The rodents have nibbled the label off one jar.'); return; }
      if(x>775&&x<915&&y>165&&y<225&&nearBasementProp(846,194)) { simpleModal('Crate of Keepsakes','📦','Grandfather keeps old buttons and polished stones in this crate. A mouse has made a nest from the packing straw.'); return; }
      const barrel=[{x:250,y:435,name:'Pickle Barrel',copy:'It smells of dill and garlic. A very small paw print is stamped in the dust.'},{x:875,y:320,name:'Rainwater Barrel',copy:'A little water drips from the lid. The rodents use it as a tiny swimming pool.'},{x:760,y:525,name:'Apple Cider Cask',copy:'The cask is almost empty, but it still smells sweet and crisp.'}].find(item=>Math.hypot(x-item.x,y-item.y)<31);
      if(barrel&&nearBasementProp(barrel.x,barrel.y,105)){simpleModal(barrel.name,'🪵',barrel.copy);return;}
      const mouse = s.mice
        .map((item) => ({ ...item, distance: Math.hypot(x - item.x, y - item.y) }))
        .filter((item) => item.distance < 34)
        .sort((a, b) => a.distance - b.distance)[0];
      if (mouse) {
        if (Math.hypot(s.x - mouse.x, s.y - mouse.y) < 76) {
          s.activeCatchTarget=mouse.id;mouse.moving=true;mouse.pauseUntil=0;mouse.targetX=235+Math.random()*650;mouse.targetY=245+Math.random()*285;
          openModal('Catch this rodent?','🐭','<p>Catch it before it scurries off!</p>',()=>{const button=makeButton('CATCH!',()=>catchRodent(mouse.id));button.classList.add('catch-button');},true);
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
  setMusicButton(false);
  updateHud();
})();


