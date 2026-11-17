// Team 1 first playable: fixed-camera panels from the students' map.
// Terrain and scenery only; quests and interactions will be added later.
(() => {
  const canvas = document.querySelector("#world");
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const hero = { x: .51, y: .81, speed: 220 };
  const panels = new Set(Array.from({length:25},(_,i)=>i+1));
  let panel = 1, width = 0, height = 0, lastTime = performance.now();
  const objects = {
    1: [["T",.16,.20],["H",.78,.19],["H",.18,.78],["B",.82,.78],["HOME",.36,.24]],
    2: [["T",.17,.24],["H",.70,.20],["B",.35,.46],["H",.18,.77],["H",.68,.69]],
    6: [["T",.14,.19],["T",.87,.19],["H",.78,.30],["B",.15,.77],["H",.83,.79]],
    7: [["T",.26,.23],["H",.75,.22],["H",.25,.72],["B",.69,.66]],
    11: [["B",.14,.22],["B",.48,.73]],
    12: [["LAKE",.48,.29],["H",.88,.80]],
    16: [["B",.73,.83]],
    17: [["T",.72,.20],["T",.29,.79],["B",.73,.81]],
    21: [["B",.16,.19],["B",.81,.49],["H",.77,.81]],
    22: [["H",.76,.40]],
    5: [["B",.70,.23]], 10: [["B",.23,.72]], 15: [["T",.27,.32],["T",.70,.68]],
    19: [["B",.76,.76]], 20: [["B",.28,.70],["B",.78,.26]],
    24: [["T",.77,.27],["H",.79,.73]]
  };
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth; height = innerHeight;
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw();
  }
  function shape(x,y,w,h,color) {
    ctx.fillStyle=color; ctx.fillRect(x,y,w,h);
  }
  function ellipse(x,y,rx,ry,color) {
    ctx.fillStyle=color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill();
  }
  function path(points,thickness,color) {
    ctx.strokeStyle=color; ctx.lineWidth=thickness; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x*width,y*height):ctx.moveTo(x*width,y*height)); ctx.stroke();
  }
  const descriptions = {
    T: ["Ancient Tree", "Its leafy branches whisper in the breeze. Some say these trees remember the first cats who explored this valley."],
    B: ["Wild Berry Bush", "A thick tangle of glossy leaves. Tiny berries hide beneath the branches, but the forest creatures seem to have found them first."],
    H: ["Village Cottage", "A cozy little cottage with warm windows and a sturdy roof. Perhaps a friendly traveler lives here."],
    HOME: ["Cat's Home", "Home sweet home! A snug little house where a brave cat can dream of grand adventures."],
    LAKE: ["Moonlight Lake", "Clear blue water ripples gently against the shore. Legends say magical fish swim beneath its surface."],
    DOCK: ["Wooden Dock", "Weathered boards stretch out over the lake. It's a perfect place to watch the fish dart through the water."],
    FORCE: ["Magic Force Field", "A shimmering wall of enchanted energy blocks a hidden trail. It hums with old magic."],
    DOOR: ["Locked Wooden Door", "An old oak door with an iron lock. A key is needed to open the way."],
    NPC: ["Lake Keeper", "A friendly keeper watches over the lake and knows the secret of the locked door."]
  };
  let nearby=null, dialogOpen=false;
  let hasRod=false, fish=0, hasKey=false, doorOpen=false;
  let hasPotion=false, forceFieldRemoved=false;
  let hasGateKey=false; // Temporary pickup at the cat\'s home
  let villageGateOpen=false;
  const questEl=document.querySelector("#quest"),itemsEl=document.querySelector("#items");
  function updateHud(){
    questEl.textContent=hasKey&&!doorOpen?"• Unlock the old wooden door":doorOpen?"• Explore beyond the door":"• Explore the Village";
    itemsEl.textContent=[hasRod?"Fishing Rod":"",fish?"Fish":"",hasKey?"Golden Key":"",hasPotion?"Magic Potion":"",hasGateKey?"Gate Key":""].filter(Boolean).join(" · ")||"Empty";
  }
  const modal=document.createElement("section");
  modal.id="interaction-modal";
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-label","Object interaction");
  modal.innerHTML='<div class="interaction-card"><button class="interaction-close" type="button" aria-label="Close">×</button><h2 id="interaction-title"></h2><p id="interaction-description"></p><div id="interaction-actions"></div></div>';
  document.querySelector("#game").appendChild(modal);
  modal.querySelector(".interaction-close").addEventListener("click",closeInteraction);
  function closeInteraction(){dialogOpen=false;modal.classList.remove("open");keys.clear();}
  function button(label,action){
    const b=document.createElement("button");b.textContent=label;b.type="button";
    b.className="interaction-btn"+(label==="EXAMINE"||label==="CLOSE"||label==="OK"?" secondary":"");
    b.addEventListener("click",action);return b;
  }
  function playGateUnlockSfx(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      const audio=new AC(),t=audio.currentTime;
      for(const [offset,pitch] of [[0,320],[.12,440],[.24,660]]){
        const osc=audio.createOscillator(),gain=audio.createGain();
        osc.type="triangle";osc.frequency.value=pitch;
        gain.gain.setValueAtTime(.0001,t+offset);
        gain.gain.exponentialRampToValueAtTime(.08,t+offset+.015);
        gain.gain.exponentialRampToValueAtTime(.0001,t+offset+.23);
        osc.connect(gain);gain.connect(audio.destination);
        osc.start(t+offset);osc.stop(t+offset+.24);
      }
      setTimeout(()=>audio.close(),850);
    }catch(e){console.warn("Gate sound unavailable",e);}
  }
  function playForceFieldSfx(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      const audio=new AC(),now=audio.currentTime;
      const oscillator=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();
      oscillator.type="sine";filter.type="lowpass";filter.frequency.value=1800;
      oscillator.frequency.setValueAtTime(780,now);
      oscillator.frequency.exponentialRampToValueAtTime(145,now+.8);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.13,now+.035);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.9);
      oscillator.connect(filter);filter.connect(gain);gain.connect(audio.destination);
      oscillator.start(now);oscillator.stop(now+.92);
      oscillator.onended=()=>audio.close();
    }catch(e){console.warn("Magic sound unavailable",e);}
  }
  function interact(target){
    const type=target.type;
    if(type!=="VILLAGE_ART"&&!descriptions[type])return;
    dialogOpen=true;keys.clear();modal.classList.add("open");
    const [title,description]=type==="VILLAGE_ART"?[target.title,target.description]:descriptions[type];
    modal.querySelector("#interaction-title").textContent=title;
    const actions=modal.querySelector("#interaction-actions"),p=modal.querySelector("#interaction-description");
    p.hidden=true;p.textContent=description;actions.replaceChildren();
    const look=button("EXAMINE",()=>{p.hidden=false;actions.replaceChildren(button("OK",closeInteraction));});
    const options=[look];
    if(panel===1&&type==="VILLAGE_ART"&&target.title==="Cat's Home"&&!hasGateKey){
      options.push(button("GET GATE KEY",()=>{
        hasGateKey=true;
        p.textContent="You picked up the Gate Key!";
        p.hidden=false;
        updateHud();
        actions.replaceChildren(button("OK",closeInteraction));
      }));
    }
    if(panel===6&&type==="VILLAGE_ART"&&target.title==="Village Gate"&&!villageGateOpen){
      if(hasGateKey)options.push(button("USE GATE KEY",()=>{
        villageGateOpen=true;hasGateKey=false;
        gateVfxStart=performance.now();playGateUnlockSfx();
        p.textContent="The Gate Key unlocks the village gate! The way ahead is open.";
        p.hidden=false;updateHud();actions.replaceChildren(button("OK",closeInteraction));
      }));
    }
    if(panel===16&&type==="VILLAGE_ART"&&target.title==="Wooden Gate"&&!doorOpen){
      options.push(button("USE GOLDEN KEY",()=>{
        if(hasKey){doorOpen=true;hasKey=false;doorVfxStart=performance.now();playGateUnlockSfx();
          p.textContent="The Golden Key unlocks the wooden gate! The way ahead is open.";updateHud();}
        else p.textContent="The gate is locked. You need a Golden Key.";
        p.hidden=false;actions.replaceChildren(button("OK",closeInteraction));
      }));
    }
    if(panel===21&&type==="VILLAGE_ART"&&target.title==="Alchemist\'s Cottage"&&!hasPotion&&!forceFieldRemoved)options.push(button("GET POTION",()=>{
      hasPotion=true;
      p.textContent="You found a Magic Potion! It has been added to your inventory.";
      p.hidden=false;updateHud();actions.replaceChildren(button("OK",closeInteraction));
    }));
    if(type==="FORCE"&&hasPotion&&!forceFieldRemoved)options.push(button("USE POTION",()=>{
      hasPotion=false;forceFieldRemoved=true;
      forceVfxStart=performance.now();playForceFieldSfx();
      p.textContent="The Magic Potion dissolves the force field. The path is clear!";
      p.hidden=false;updateHud();actions.replaceChildren(button("OK",closeInteraction));
    }));
    if(panel===12&&type==="VILLAGE_ART"&&target.title==="Fishing Cottage"){
      if(!hasRod)options.push(button("GET FISHING ROD",()=>{
        hasRod=true;p.textContent="You picked up a Fishing Rod!";p.hidden=false;updateHud();
        actions.replaceChildren(button("OK",closeInteraction));
      }));
      if(fish>0&&!hasKey)options.push(button("GIVE FISH",()=>{
        fish=0;hasKey=true;
        p.textContent="You traded your fish for a Golden Key!";
        p.hidden=false;updateHud();actions.replaceChildren(button("OK",closeInteraction));
      }));
    }
    if(((panel===12&&type==="VILLAGE_ART"&&target.title==="Fishing Dock")||type==="DOCK")&&hasRod&&!fish&&!hasKey)options.push(button("CATCH FISH",()=>{
      fish=1;p.textContent="You caught a fish!";p.hidden=false;updateHud();
      actions.replaceChildren(button("OK",closeInteraction));
    }));
    if(type==="NPC")options.push(button("TALK",()=>{
      p.textContent="The lake is peaceful today.";p.hidden=false;
      actions.replaceChildren(button("OK",closeInteraction));
    }));
    if(type==="DOOR")options.push(button("OPEN",()=>{
      if(hasKey){doorOpen=true;p.textContent="The Golden Key unlocks the wooden door!";updateHud();}
      else p.textContent="The door is locked. You need a Golden Key.";
      p.hidden=false;actions.replaceChildren(button("OK",closeInteraction));
    }));
    options.push(button("CLOSE",closeInteraction));actions.append(...options);
  }
  // Dismiss an open interaction when the player taps anywhere outside its card.
  // pointerdown runs before the canvas click, so the tap only closes the popup.
  document.addEventListener("pointerdown",e=>{
    if(dialogOpen && !modal.querySelector(".interaction-card").contains(e.target)){
      closeInteraction();
    }
  });
  // Art-matched, nonblocking interactions for the four illustrated village panels.
  // Each rectangle is normalized to the full illustrated screen.
  const villageHotspots={
    1:[
      ["Cat's Home","A welcoming cottage with a blue door and a golden paw print. This is where your adventure begins.",.525,.419,.350,.470],
      ["Village Cottage","A cozy cottage with a sunny yellow roof and flower-filled window box.",.835,.225,.205,.31],
      ["Blue-Roof Cottage","A little cottage with a bright blue roof and a wooden crate outside.",.865,.715,.245,.315],
      ["Old Oak Tree","An enormous tree spreads its branches over the village lawn.",.177,.33,.30,.50],
      ["Berry Bush","A leafy bush covered in ripe red berries.",.218,.845,.17,.20],
      ["Paw Sign","A wooden sign marked with a paw print stands beside your home.",.64,.675,.06,.13],
      ["Flower Garden","Colorful flowers brighten the grass beside the cottages.",.665,.895,.095,.11]
    ],
    2:[
      ["Blue-Roof Cottage","A cheerful blue-roofed home with a barrel and a neat stack of logs.",.28,.43,.28,.43],
      ["Golden-Roof Cottage","A sunny cottage with a wooden door, flowers, and a crate outside.",.79,.47,.26,.46],
      ["Old Oak Tree","A towering tree provides shade between the village houses.",.54,.25,.27,.48],
      ["Flower Bush","A flowering shrub full of bright pink blossoms.",.28,.82,.13,.14],
      ["Garden Bush","A thick green bush grows near the center of the lawn.",.51,.67,.16,.20],
      ["Village Flowers","Little white and pink flowers sway in the grass.",.84,.86,.15,.13]
    ],
    6:[
      ["Purple-Roof Cottage","A lovely home with a purple tiled roof and warm glowing windows.",.29,.39,.32,.43],
      ["Blue-Roof Cottage","A small blue-roofed cottage sits beside the path.",.85,.42,.25,.35],
      ["Old Oak Tree","A broad green tree shades the village crossroads.",.59,.26,.28,.46],
      ["Village Gate","A sturdy locked wooden gate. The village continues beyond it, but the gate is shut.",.505,.742,.23,.205],
      ["Gate Lantern","A lantern glows warmly beside the village gate.",.618,.675,.067,.14],
      ["Flower Bed","Pink flowers grow beside the fence.",.92,.69,.10,.12]
    ],
    7:[
      ["Golden-Roof Cottage","A cottage with a golden roof, climbing vines, and a wooden barrel.",.27,.36,.28,.45],
      ["Blue-Roof Cottage","A cozy blue-roofed home with a bright window box.",.78,.50,.26,.42],
      ["Apple Tree","A healthy tree is loaded with shiny red apples.",.60,.26,.26,.49],
      ["Garden Bush","A leafy green bush grows beside the blue-roofed cottage.",.64,.62,.14,.16],
      ["Flower Patch","A cheerful patch of flowers adds color to the village lawn.",.48,.69,.13,.12]
    ]
  };
    // Panel 11 uses the illustrated scenery rather than the old vector map.
    // Hotspots use center x/y and bounding width/height, normalized 0–1.
    // The force field has its own precise right-edge interaction bounds.
  const panel11Hotspots=[
    ["Forest Tree","A towering tree shades the western forest path.",.165,.29,.28,.45],
    ["Ancient Tree","An enormous tree rises above the eastern clearing.",.724,.205,.20,.32],
    ["Forest Stump","An old tree stump sits among stones and wildflowers.",.231,.744,.09,.11],
    ["Rock Cluster","Large stones rest beside the western tree.",.103,.474,.075,.105],
    ["Wildflowers","Bright pink flowers bloom beside the forest tree.",.274,.458,.10,.105],
    ["Forest Shrub","A leafy shrub grows beside the eastern path.",.727,.73,.17,.19],
    ["Forest Boulders","A rocky outcrop lies beneath the eastern shrub.",.628,.79,.065,.11],
    ["Magic Pillar","An ancient stone pillar glows with mysterious blue light.",.935,.258,.058,.165]
  ];
  const panel16Hotspots=[
    ["Forest Tree","An enormous old tree shades the western trail.",.17,.29,.28,.45],
    ["Ancient Tree","A broad tree stands above the eastern path.",.72,.21,.19,.30],
    ["Forest Stump","A weathered tree stump surrounded by stones.",.23,.75,.09,.12],
    ["Rock Cluster","Rocks rest among the roots of the western tree.",.10,.47,.08,.11],
    ["Wildflowers","Bright pink flowers bloom beside the forest tree.",.27,.46,.10,.11],
    ["Forest Shrub","A leafy shrub grows beside the lower path.",.73,.73,.16,.18],
    ["Forest Boulders","A cluster of stones rests below the shrub.",.63,.78,.07,.11],
    ["Wooden Gate","A sturdy wooden gate with a heavy lock blocks the eastbound trail.",.908,.322,.17,.30]
  ];
  // Panel 21: magical forest clearing and the alchemist's cottage.
  // Coordinates follow the approved 1632x960 artwork.
  const panel21Hotspots=[
    ["Alchemist's Cottage","A mysterious cottage filled with colorful potions and magical supplies.",.767,.355,.36,.465],
    ["Enchanted Stone","Glowing runes shimmer across an ancient stone surrounded by crystals.",.235,.555,.128,.17],
    ["Potion Shelf","Bottles of blue, pink, and green potions sparkle on the alchemist's shelf.",.679,.47,.088,.14],
    ["Magic Mushrooms","Bright blue mushrooms grow beside the enchanted stone.",.121,.611,.055,.095],
    ["Forest Tree","An enormous tree shades the western clearing.",.158,.32,.275,.44],
    ["Ancient Tree","A tall tree guards the forest path near the cottage.",.691,.17,.15,.25],
    ["Glowing Lantern","A lantern glows on an old tree stump.",.217,.764,.075,.15],
    ["Forest Stump","An old stump supports a lantern among the flowers.",.22,.798,.09,.14],
    ["Forest Shrub","A thick green shrub grows among the stones and flowers.",.715,.814,.13,.17],
    ["Forest Boulders","Mossy rocks rest near the edge of the clearing.",.581,.844,.085,.10],
    ["Wildflowers","Colorful flowers bloom all around the enchanted forest.",.299,.828,.098,.11]
  ];
  const panel12Hotspots=[
    ["Fishing Cottage","A cozy fisher's cottage with fishing supplies by the door.",.859,.598,.266,.365],
    ["Fishing Dock","A wooden dock reaches out over the sparkling lake.",.689,.319,.245,.176],
    ["Crystal Lake","Fish swim beneath the sparkling water and lily pads.",.396,.270,.53,.34],
    ["Waterfall","A little waterfall splashes into the lake.",.413,.063,.093,.126],
    ["Fishing Gear","Fishing rods and nets lean beside the cottage.",.664,.697,.099,.161],
    ["Fish Sign","A wooden sign with a blue fish hangs outside the cottage.",.692,.602,.077,.092],
    ["Lantern Stump","A glowing lantern rests on a stump by the lake.",.170,.511,.071,.128],
    ["Forest Tree","A broad leafy tree grows along the lakeshore.",.053,.321,.101,.43],
    ["Lily Pads","Pink flowers bloom among the lily pads.",.233,.200,.089,.079],
    ["Lakeside Flowers","Bright flowers grow among the stones by the water.",.287,.475,.082,.085]
  ];
  // Panel 17: the forest crossroads, dog warning and trail marker.
  const panel17Hotspots=[
    ["Dog Warning Sign","A wooden sign warns travelers that dogs patrol the trail ahead.",.260,.335,.125,.272],
    ["Trail Map","A hanging map marked with a paw print shows the winding route ahead.",.737,.315,.154,.233],
    ["Forest Lantern","A warm lantern hangs beside the dog warning sign.",.335,.297,.045,.09],
    ["Forest Tree","A broad tree stands behind the warning sign.",.105,.222,.17,.30],
    ["Old Oak","An old oak shades the trail near the map.",.559,.177,.12,.24],
    ["Rocky Outcrop","Large stones sit beneath the forest canopy.",.425,.246,.091,.12],
    ["Wooden Fence","A short fence borders the southern side of the trail.",.246,.731,.276,.175],
    ["Supply Crates","Two wooden crates sit beside a barrel and coiled rope.",.903,.685,.132,.197],
    ["Barrel","A sturdy wooden barrel rests near the supply crates.",.733,.737,.052,.106],
    ["Stump Lantern","A lantern glows on a tree stump beside the trail.",.811,.721,.068,.172],
    ["Forest Shrub","A leafy shrub grows south of the crossroads.",.478,.689,.092,.143],
    ["Wildflowers","Colorful flowers bloom beside the forest path.",.666,.799,.096,.09]
  ];
  function villageTargets(){
    const art=panel===11?panel11Hotspots:panel===16?panel16Hotspots:panel===21?panel21Hotspots:panel===12?panel12Hotspots:panel===17?panel17Hotspots:(villageHotspots[panel]||[]);
    if(panel===16&&doorOpen)return art.filter(entry=>entry[0]!=="Wooden Gate").map(([title,description,x,y,w,h],i)=>({type:"VILLAGE_ART",title,description,x,y,w,h,id:i}));
    if(panel===6&&villageGateOpen)return art.filter(entry=>entry[0]!=="Village Gate").map(([title,description,x,y,w,h],i)=>({type:"VILLAGE_ART",title,description,x,y,w,h,id:i}));
    return art.map(([title,description,x,y,w,h],i)=>({
      type:"VILLAGE_ART",title,description,x,y,w,h,id:i
    }));
  }
  function targets(){
    if(illustratedPanels.has(panel)){
      const list=villageTargets();
      if(panel===11&&!forceFieldRemoved)list.push({type:"FORCE",x:.925,y:.475,id:101});
      return list;
    }
    const list=(objects[panel]||[]).map(([type,x,y],i)=>({type,x,y,id:i}));
    // Panel 12 dock uses its illustrated-art hotspot.
    if(panel===11&&!forceFieldRemoved)list.push({type:"FORCE",x:.975,y:.76,id:101});
    if(panel===16&&!doorOpen)list.push({type:"DOOR",x:.965,y:.50,id:103});
    return list;
  }
  function nearestTarget(){
    let found=null,dist=Infinity;
    for(const target of targets()){
      // Interactions use an approachable point, not the center of tall artwork.
      // At the doorstep the home must win; the sign requires a close approach.
      const dock=panel===12&&target.title==="Fishing Dock";
      const cottage=panel===12&&target.title==="Fishing Cottage";
      const home=panel===1&&target.title==="Cat's Home";
      const sign=panel===1&&target.title==="Paw Sign";
      const tx=home?.50:dock?.715:cottage?.81:target.x,ty=home?.615:dock?.405:cottage?.785:target.y;
      const d=Math.hypot((hero.x-tx)*width,(hero.y-ty)*height);
      const reach=dock?Math.min(width,height)*.15:
        cottage?Math.min(width,height)*.15:
        home?Math.min(width,height)*.135:
        sign?Math.min(width,height)*.075:
        target.type==="VILLAGE_ART"?Math.min(width,height)*.27:
        target.type==="LAKE"?Math.min(width,height)*.32:
        ["FORCE","DOOR","NPC","DOCK"].includes(target.type)?Math.min(width,height)*.23:
        Math.min(width,height)*.19;
      if(d<reach&&d<dist){found=target;dist=d;}
    }
    return found;
  }
  function highlight(){
    nearby=nearestTarget();
    if(!nearby)return;
    const t=nearby,unit=Math.min(width,height),x=t.x*width,y=t.y*height;
    const pulse=(Math.sin(performance.now()/230)+1)/2;
    ctx.save();
    ctx.strokeStyle="rgba(85,255,115,"+(.65+pulse*.32)+")";
    ctx.lineWidth=3+pulse*2;ctx.shadowColor="#5dff7e";ctx.shadowBlur=7+pulse*11;
    ctx.beginPath();
    if(t.type==="VILLAGE_ART"){
      ctx.roundRect((t.x-t.w/2)*width,(t.y-t.h/2)*height,t.w*width,t.h*height,9);
    }else if(t.type==="H"||t.type==="HOME"){
      const w=unit*(t.type==="HOME"?.29:.255),h=unit*(t.type==="HOME"?.23:.205);
      // Trace the cottage's actual roof and walls, not a circle.
      ctx.moveTo(x-w*.52,y-h*.47);
      ctx.lineTo(x+w*.52,y-h*.47);
      ctx.lineTo(x+w*.52,y-h*.27);
      ctx.lineTo(x+w*.48,y-h*.27);
      ctx.lineTo(x+w*.48,y+h*.55);
      ctx.lineTo(x-w*.48,y+h*.55);
      ctx.lineTo(x-w*.48,y-h*.27);
      ctx.lineTo(x-w*.52,y-h*.27);
      ctx.closePath();
    }else if(t.type==="T"){
      // Match the tree's visible leafy crown.
      ctx.ellipse(x,y-unit*.038,unit*.093,unit*.108,0,0,Math.PI*2);
    }else if(t.type==="B"){
      // The smaller, lighter leaf cluster extends up and left of the main bush.
      ctx.ellipse(x,y,unit*.075,unit*.052,0,0,Math.PI*2);
      ctx.moveTo(x-unit*.027+unit*.048,y-unit*.023);
      ctx.ellipse(x-unit*.027,y-unit*.023,unit*.048,unit*.045,0,0,Math.PI*2);
    }else if(t.type==="FORCE"||t.type==="DOOR"){
      if(t.type==="FORCE")ctx.rect(width*.865,height*.285,width*.13,height*.405);
      else ctx.rect(width*.947,height*.39,width*.049,height*.22);
    }else if(t.type==="DOCK"){
      ctx.rect(width*.77,height*.23,width*.09,height*.12);
    }else if(t.type==="NPC"){
      ctx.ellipse(x,y-unit*.045,unit*.038,unit*.075,0,0,Math.PI*2);
    }else if(t.type==="LAKE"){
      ctx.ellipse(x,y,width*.38,height*.27,0,0,Math.PI*2);
    }
    ctx.stroke();ctx.restore();
  }
  function clickedTarget(target,x,y){
    const unit=Math.min(width,height);
    const dx=x-target.x*width,dy=y-target.y*height;
    switch(target.type){
      case "VILLAGE_ART": return Math.abs(x/width-target.x)<=target.w/2 && Math.abs(y/height-target.y)<=target.h/2;
      case "T": return (dx/(unit*.093))**2+((dy+unit*.038)/(unit*.108))**2<=1 ||
        (Math.abs(dx)<=unit*.023 && dy>=0 && dy<=unit*.11);
      case "B": return (dx/(unit*.075))**2+(dy/(unit*.052))**2<=1 || ((dx+unit*.027)/(unit*.048))**2+((dy+unit*.023)/(unit*.045))**2<=1;
      case "H": case "HOME":{
        const w=unit*(target.type==="HOME"?.29:.255),h=unit*(target.type==="HOME"?.23:.205);
        return Math.abs(dx)<=w*.52 && dy>=-h*.47 && dy<=h*.55;
      }
      case "LAKE": return (dx/(width*.38))**2+(dy/(height*.27))**2<=1;
      case "DOCK": return x>=width*.77 && x<=width*.86 && y>=height*.23 && y<=height*.35;
      case "NPC": return Math.abs(dx)<=unit*.038 && dy>=-unit*.12 && dy<=unit*.03;
      case "FORCE": return x>=width*.865 && x<=width*.995 && y>=height*.285 && y<=height*.69;
      case "DOOR": return x>=width*.947 && x<=width*.996 && y>=height*.39 && y<=height*.61;
      default: return false;
    }
  }
  canvas.addEventListener("click",e=>{
    if(caught||dialogOpen)return;
    if(panel===18){
      const bounds=canvas.getBoundingClientRect();
      const x=(e.clientX-bounds.left)/bounds.width,y=(e.clientY-bounds.top)/bounds.height;
      if(!carrying){
        const m=meat.find(m=>!m.used&&Math.hypot((m.x-x)*width,(m.y-y)*height)<Math.min(width,height)*.05&&Math.hypot((m.x-hero.x)*width,(m.y-hero.y)*height)<Math.min(width,height)*.10);
        if(m){m.used=true;carrying=true;}
      }else{
        // Drop at the cat's feet; only nearby clicks are accepted.
        if(Math.hypot((x-hero.x)*width,(y-hero.y)*height)<Math.min(width,height)*.14){
          const drop={x:hero.x,y:hero.y};carrying=false;
          meat.push({...drop,used:false,placed:true});
          // Dogs notice placed meat only when their cone actually turns toward it.
        }
      }
      return;
    }
    // Both conditions must hold: close enough to highlight, AND clicked on the object.
    const target=nearestTarget();
    if(!target)return;
    const bounds=canvas.getBoundingClientRect();
    const x=(e.clientX-bounds.left)*width/bounds.width;
    const y=(e.clientY-bounds.top)*height/bounds.height;
    if(clickedTarget(target,x,y))interact(target);
  });
  // Normalized maze hedge segments; same geometry drives drawing and collision.
  // Staggered garden hedges create one readable west-to-east route.
  // The bends and short branches add variety without closing the central passage.
  // Four alternating gates force a winding, continuous route through the maze.
  // Walls reach the screen edges, so the cat must go around each open end.
  // Geometry traced from the illustrated panel 18 (normalized 1632x960).
  // These segments replace the old vector maze and are collision-only.
  const mazeHedges=[
    [[.225,0],[.225,.565]],
    [[.385,.205],[.385,1]],
    [[.579,0],[.579,.565]],
    [[.743,.205],[.743,1]],
    [[.038,.135],[.145,.135]],[[.145,.135],[.145,.255]],
    [[.205,.775],[.205,1]],[[.205,.775],[.268,.775]],
    [[.443,.135],[.51,.135]],
    [[.557,.775],[.557,1]],[[.557,.775],[.625,.775]],
    [[.844,.135],[.925,.135]],[[.925,.135],[.925,.255]]
  ];
  // Dogs occupy the open corridors between the illustrated hedges.
  const dogSeeds=[
    {x:.155,y:.635,axis:"vertical",phase:0},
    {x:.315,y:.39,axis:"vertical",phase:4.2},
    {x:.495,y:.635,axis:"vertical",phase:7.8},
    {x:.665,y:.39,axis:"vertical",phase:2.5}
  ];
  let facing = "down", walking = false, walkTime = 0;
  let dogs=[], meat=[], carrying=false, caught=false, mazeClock=0, chaseTime=0;
  const catchModal=document.createElement("section");
  catchModal.id="caught-modal";
  catchModal.setAttribute("role","dialog");
  catchModal.setAttribute("aria-label","You got caught");
  catchModal.innerHTML='<div class="interaction-card"><h2>YOU GOT CAUGHT!</h2><div id="caught-actions"><button type="button" class="interaction-btn">TRY AGAIN</button></div></div>';
  document.querySelector("#game").appendChild(catchModal);
  catchModal.querySelector("button").addEventListener("click",resetMaze);
  function resetMaze(){
    dogs=dogSeeds.map((d,i)=>({...d,id:i,mode:"watch",timer:0,target:null,x:d.x,y:d.y}));
    // Each bait sits beyond a guarded sightline, requiring a timed crossing to collect it, then a return to bait the dog.
    meat=[{x:.075,y:.30,used:false},{x:.305,y:.09,used:false},{x:.475,y:.91,used:false},{x:.665,y:.91,used:false}];
    carrying=false;caught=false;chaseTime=0;mazeClock=0;
    hero.x=.065;hero.y=.50;facing="right";
    catchModal.classList.remove("open");keys.clear();
  }
  // Initialize dog state without moving the cat away from the village spawn.
  resetMaze();
  hero.x=.51;hero.y=.81;facing="down";
  function dogFacing(d){
    const alternate=Math.floor((mazeClock+d.phase)/3)%2===0;
    return d.axis==="horizontal"?(alternate?0:Math.PI):(alternate?Math.PI/2:-Math.PI/2);
  }
  function sight(d,px,py){
    const dx=(px-d.x)*width,dy=(py-d.y)*height;
    const distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    const delta=Math.atan2(Math.sin(angle-dogFacing(d)),Math.cos(angle-dogFacing(d)));
    // Match the exact visible red cone. Previously the drawn cone was larger
    // than detection and hidden hedge checks rejected visibly covered meat.
    return distance <= Math.min(width,height)*.37 && Math.abs(delta) <= Math.PI/5;
  }
  // Check the cat's visible body, not only its center point. A cat touching
  // any part of the rendered vision sector is spotted, including its outer edge.
  function catOverlapsVisionCone(d){
    const cx=hero.x*width,cy=hero.y*height;
    const dx=d.x*width,dy=d.y*height;
    const radius=Math.min(width,height)*.37;
    const angle=dogFacing(d);
    const halfAngle=Math.PI/5;
    const catRadius=Math.min(width,height)*.022;
    // Sample the cat's circular footprint, including its outer boundary.
    if(sight(d,hero.x,hero.y))return true;
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12;
      const px=cx+Math.cos(a)*catRadius;
      const py=cy+Math.sin(a)*catRadius;
      const vx=px-dx,vy=py-dy;
      const dist=Math.hypot(vx,vy);
      const diff=Math.atan2(Math.sin(Math.atan2(vy,vx)-angle),Math.cos(Math.atan2(vy,vx)-angle));
      if(dist<=radius && Math.abs(diff)<=halfAngle)return true;
    }
    return false;
  }
  function updateDogs(dt){
    if(panel!==18||caught||dialogOpen)return;
    mazeClock+=dt;
    for(const d of dogs){
      if(d.mode==="asleep")continue;
      if(d.mode==="investigate"){
        const dx=(d.target.x-d.x)*width,dy=(d.target.y-d.y)*height,dist=Math.hypot(dx,dy);
        if(dist<9){d.mode="eating";d.timer=0;continue;}
        const step=Math.min(dist,Math.min(width,height)*.18*dt);
        const nx=d.x+dx/dist*step/width,ny=d.y+dy/dist*step/height;
        // A distracted dog follows the bait it spotted, even across hedge geometry.
        // Keep this distinct from the cat's hedge collision.
        d.heading=Math.atan2(dy,dx);d.x=nx;d.y=ny;
        continue;
      }
      if(d.mode==="eating"){
        d.timer+=dt;
        if(d.timer>=3){
          if(d.bait)d.bait.used=true;
          d.bait=null;d.target=null;d.mode="asleep";d.timer=0;
        }
        continue;
      }
      // The cat is always caught when visible, even if meat is in the same cone.
      if(sight(d,hero.x,hero.y) || catOverlapsVisionCone(d)){
        d.mode="chase";chaseTime=0;
      }else if(d.mode==="watch"){
        const bait=meat.find(m=>m.placed&&!m.used&&!m.claimed&&sight(d,m.x,m.y));
        if(bait){bait.claimed=true;d.bait=bait;d.mode="investigate";d.target={x:bait.x,y:bait.y};}
      }
      if(d.mode==="chase"){
        const dx=(hero.x-d.x)*width,dy=(hero.y-d.y)*height,dist=Math.hypot(dx,dy);
        if(dist>1){d.heading=Math.atan2(dy,dx);const step=Math.min(dist,Math.min(width,height)*.62*dt);d.x+=dx/dist*step/width;d.y+=dy/dist*step/height;}
      }
    }
    if(dogs.some(d=>d.mode==="chase")){
      chaseTime+=dt;
      if(chaseTime>.45||dogs.some(d=>Math.hypot((hero.x-d.x)*width,(hero.y-d.y)*height)<30)){
        caught=true;keys.clear();catchModal.classList.add("open");
      }
    }
  }
  // Stylized little steak: red cut of meat, pale fat rim and a highlight.
  function drawMeat(x,y,scale=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.fillStyle="#f6d6b3";ctx.beginPath();
    ctx.moveTo(-13,-4);ctx.bezierCurveTo(-16,-13,-3,-16,5,-11);
    ctx.bezierCurveTo(18,-14,21,-2,13,7);ctx.bezierCurveTo(4,15,-12,10,-13,-4);ctx.fill();
    ctx.fillStyle="#b94e42";ctx.beginPath();
    ctx.moveTo(-10,-4);ctx.bezierCurveTo(-11,-10,-1,-12,5,-8);
    ctx.bezierCurveTo(15,-11,17,-1,10,5);ctx.bezierCurveTo(3,11,-10,7,-10,-4);ctx.fill();
    ellipse(2,-2,4,2.5,"#e58b7c");
    ctx.restore();
  }
  // The mouth is in a different place in each of the four cat views.
  // Coordinates are local to the cat sprite, before its 0.72 draw scale.
  function mouthPosition(){
    const offsets={
      right:[24,-17],left:[-24,-17],down:[0,-13],up:[0,-29]
    };
    const [mx,my]=offsets[facing];
    return {x:hero.x*width+mx*.72,y:hero.y*height+my*.72};
  }
  // Load the supplied ZIP directly: no manual extraction or added dependency.
  const dogFrames={up:[],down:[],left:[],right:[]};
  let dogSpritesReady=false;
  async function loadDogSprites(){
    try{
      const response=await fetch("assets/dogs/team1_dog_sprites_v1.zip");
      if(!response.ok)throw Error("Dog ZIP HTTP "+response.status);
      const bytes=new Uint8Array(await response.arrayBuffer());
      const view=new DataView(bytes.buffer);
      const u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
      const decoder=new TextDecoder();
      const loaded=[];
      // Read ZIP local headers (the supplied package contains regular deflated PNGs).
      for(let p=0;p+30<bytes.length;){
        if(u32(p)!==0x04034b50)break;
        const method=u16(p+8),size=u32(p+18),nameLength=u16(p+26),extraLength=u16(p+28);
        const name=decoder.decode(bytes.subarray(p+30,p+30+nameLength));
        const start=p+30+nameLength+extraLength;
        if(start+size>bytes.length)throw Error("Incomplete dog ZIP");
        const match=/^guard_dog_(up|down|left|right)_([012])\.png$/.exec(name);
        if(match){
          const compressed=bytes.slice(start,start+size);
          const stream=new Blob([compressed]).stream();
          const decoded=method===8?stream.pipeThrough(new DecompressionStream("deflate-raw")):stream;
          const png=await new Response(decoded).blob();
          const url=URL.createObjectURL(new Blob([png],{type:"image/png"}));
          const img=new Image();
          img.src=url;
          await img.decode();
          loaded.push({dir:match[1],index:Number(match[2]),img});
        }
        p=start+size;
      }
      if(loaded.length!==12)throw Error("Expected 12 dog frames, found "+loaded.length);
      for(const frame of loaded)dogFrames[frame.dir][frame.index]=frame.img;
      dogSpritesReady=true;
    }catch(err){console.warn("Guard dog sprite loading failed; using fallback artwork",err);}
  }
  loadDogSprites();
  function dogDirection(angle){
    const dx=Math.cos(angle),dy=Math.sin(angle);
    return Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up");
  }
  function drawGuardDogSprite(d,u){
    const angle=d.mode==="watch"?dogFacing(d):(d.heading??dogFacing(d));
    const dir=dogDirection(angle);
    const moving=d.mode==="chase"||d.mode==="investigate";
    const frame=moving?Math.floor(mazeClock*8)%3:
      d.mode==="eating"?Math.floor(d.timer*5)%3:Math.floor(mazeClock*1.5)%3;
    const img=dogFrames[dir][frame]||dogFrames[dir][0];
    if(!img)return false;
    const size=u*.078;
    const w=size*(img.naturalWidth/img.naturalHeight),h=size;
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="rgba(20,35,20,.24)";
    ctx.beginPath();ctx.ellipse(0,h*.38,w*.27,h*.09,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(img,-w/2,-h*.70,w,h);
    ctx.restore();
    return true;
  }
  function drawMazeActors(){
    if(panel!==18)return;
    const u=Math.min(width,height);
    for(const m of meat)if(!m.used){
      const x=m.x*width,y=m.y*height;
      drawMeat(x,y,Math.max(.7,u/850));
    }
    for(const d of dogs){
      const x=d.x*width,y=d.y*height;
      if(d.mode==="watch"){
        const a=dogFacing(d),radius=u*.37;
        ctx.fillStyle="rgba(225,45,45,.24)";ctx.beginPath();ctx.moveTo(x,y);
        ctx.arc(x,y,radius,a-Math.PI/5,a+Math.PI/5);ctx.closePath();ctx.fill();
      }
      ctx.save();ctx.translate(x,y);
      if(!dogSpritesReady||!drawGuardDogSprite(d,u)){
        // Fallback until ZIP frames finish loading.
        ctx.rotate(d.mode==="watch"?dogFacing(d):(d.heading??0));
        ellipse(0,0,u*.029,u*.023,"#9d7047");
        ellipse(u*.019,0,u*.022,u*.020,"#c59159");
        ellipse(u*.024,-u*.019,u*.010,u*.012,"#6b4631");
        ellipse(u*.024,u*.019,u*.010,u*.012,"#6b4631");
        ellipse(u*.036,-u*.007,u*.003,u*.003,"#2d302a");
        ellipse(u*.036,u*.007,u*.003,u*.003,"#2d302a");
      }
      ctx.restore();
      if(d.mode==="asleep"){
        // Gentle rising sleep letters above the dog, no permanent HUD text.
        ctx.save();ctx.fillStyle="#f9f4dd";ctx.strokeStyle="#315d48";ctx.lineWidth=2;ctx.font=`900 ${Math.max(15,u*.023)}px Nunito,system-ui,sans-serif`;ctx.textAlign="center";
        for(let j=0;j<3;j++){const rise=(mazeClock*.35+j/3)%1;const zx=x+u*(.018+j*.018),zy=y-u*(.045+rise*.075);ctx.strokeText("z",zx,zy);ctx.fillText("z",zx,zy);}
        ctx.restore();
      }
    }
    if(carrying && facing!=="up"){
      const mouth=mouthPosition();
      drawMeat(mouth.x,mouth.y,.65);
    }
  }

  // Team 1 pixel-art village: original low-resolution raster artwork.
  // Art-only layer: uses the existing normalized object positions and path layout.
  // Collisions, quests, click targets, transitions and controls remain unchanged.
  const pixelCanvas=document.createElement("canvas");
  const px=pixelCanvas.getContext("2d",{alpha:false});
  let pixelCacheKey="";
  function pixelVillage(){
    const scale=3, pw=Math.max(1,Math.ceil(width/scale)),ph=Math.max(1,Math.ceil(height/scale));
    const key=pw+"x"+ph;
    if(pixelCacheKey!==key){
      pixelCacheKey=key;pixelCanvas.width=pw;pixelCanvas.height=ph;
      let seed=41371;
      const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const rect=(x,y,w,h,c)=>{px.fillStyle=c;px.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
      const dot=(x,y,c,s=1)=>rect(x,y,s,s,c);
      const ox=x=>x*pw,oy=y=>y*ph,u=Math.min(pw,ph);
      // Dense hand-pixeled meadow: multiple ground shades, grass clusters and flowers.
      rect(0,0,pw,ph,"#7db647");
      for(let i=0;i<pw*ph/3;i++){
        const x=Math.floor(rand()*pw),y=Math.floor(rand()*ph);
        dot(x,y,["#6aa73c","#91c657","#9acc59","#5e9b37","#abd264"][Math.floor(rand()*5)],1+Math.floor(rand()*2));
      }
      for(let i=0;i<Math.round(pw*ph/850);i++){
        const x=rand()*pw,y=rand()*ph;
        rect(x,y,2,4,"#3f8a38");rect(x-2,y+2,2,2,"#4e9b39");rect(x+2,y+1,2,3,"#b1d66b");
      }
      // Crossroads retain the original 50% / 52% path alignments.
      const vLeft=ox(.5)-u*.06,vRight=ox(.5)+u*.06;
      const hTop=oy(.52)-u*.05,hBottom=oy(.52)+u*.05;
      rect(vLeft,0,vRight-vLeft,ph,"#ae713e");
      rect(0,hTop,pw,hBottom-hTop,"#ae713e");
      rect(vLeft+2,0,vRight-vLeft-4,ph,"#d99b59");
      rect(0,hTop+2,pw,hBottom-hTop-4,"#d99b59");
      for(let i=0;i<pw*ph/30;i++){
        const x=Math.floor(rand()*pw),y=Math.floor(rand()*ph);
        if((x>=vLeft&&x<=vRight)||(y>=hTop&&y<=hBottom)){
          dot(x,y,["#e9ad68","#bf8045","#f2bb77","#c88d52"][Math.floor(rand()*4)],1+Math.floor(rand()*2));
        }
      }
      // Short tufts and bright wildflowers, kept out of the main road.
      for(let i=0;i<65;i++){
        const x=Math.floor(rand()*pw),y=Math.floor(rand()*ph);
        if((x>vLeft-6&&x<vRight+6)||(y>hTop-6&&y<hBottom+6))continue;
        const c=["#fff4d0","#f8c9df","#f9dd77"][Math.floor(rand()*3)];
        dot(x-2,y,c,2);dot(x+2,y,c,2);dot(x,y-2,c,2);dot(x,y+2,c,2);dot(x,y,"#e99c37",2);
      }
      function cottage(nx,ny,type){
        const x=ox(nx),y=oy(ny),w=u*(type==="HOME"?.29:.255),h=u*(type==="HOME"?.23:.205);
        const left=Math.round(x-w*.50),top=Math.round(y-h*.48),ww=Math.round(w),hh=Math.round(h);
        const roof=type==="HOME"?"#c85632":nx>.5?"#326b9e":"#8651a0";
        const roofLight=type==="HOME"?"#ef8a43":nx>.5?"#529bc3":"#ae70bb";
        rect(left+3,top+hh*.32,ww-6,hh*.7,"#634936");
        rect(left+5,top+hh*.34,ww-10,hh*.66,"#e6bf83");
        for(let yy=top+hh*.35;yy<top+hh;yy+=6)rect(left+5,yy,ww-10,1,"#cb9e6c");
        rect(left-4,top+hh*.08,ww+8,hh*.3,"#533c36");
        rect(left-3,top+hh*.03,ww+6,hh*.27,roof);
        for(let yy=top+hh*.06;yy<top+hh*.29;yy+=5){
          for(let xx=left;xx<left+ww;xx+=10){
            rect(xx+(Math.floor(yy/5)%2)*4,yy,8,2,roofLight);
          }
        }
        rect(left+ww*.16,top+hh*.47,ww*.17,hh*.23,"#4b463b");
        rect(left+ww*.18,top+hh*.49,ww*.13,hh*.18,"#82c7d3");
        rect(left+ww*.67,top+hh*.47,ww*.17,hh*.23,"#4b463b");
        rect(left+ww*.69,top+hh*.49,ww*.13,hh*.18,"#82c7d3");
        rect(left+ww*.49,top+hh*.47,2,hh*.23,"#f3df9a");
        rect(left+ww*.16,top+hh*.58,ww*.17,2,"#f3df9a");
        rect(left+ww*.67,top+hh*.58,ww*.17,2,"#f3df9a");
        rect(left+ww*.40,top+hh*.64,ww*.20,hh*.36,"#5e4939");
        rect(left+ww*.42,top+hh*.66,ww*.16,hh*.34,"#347b9b");
        dot(left+ww*.55,top+hh*.83,"#f7cf67",2);
        rect(left+ww*.12,top+hh*.70,ww*.22,3,"#6a5239");
        rect(left+ww*.66,top+hh*.70,ww*.22,3,"#6a5239");
        for(let i=0;i<14;i++){
          const bx=left+ww*(i%7<3?.12:.66)+rand()*ww*.20;
          dot(bx,top+hh*.68-rand()*5,["#f4a7bf","#fff0b2","#d76d8e"][i%3],2);
        }
        if(type==="HOME"){
          // Paw marks identify the quest-relevant home.
          for(const q of [.24,.76]){
            const xx=left+ww*q,yy=top+hh*.83;
            dot(xx,yy,"#f7d88a",3);dot(xx-3,yy-4,"#f7d88a",2);dot(xx+1,yy-5,"#f7d88a",2);dot(xx+4,yy-3,"#f7d88a",2);
          }
        }
      }
      function tree(nx,ny){
        const x=ox(nx),y=oy(ny),r=u*.092;
        rect(x-r*.18,y+r*.20,r*.36,r*.85,"#75492e");
        for(let i=0;i<18;i++){
          const a=i*2.399,rr=r*(.35+.5*rand()),cx=x+Math.cos(a)*rr,cy=y-r*.30+Math.sin(a)*rr*.72;
          const cr=r*(.30+rand()*.20);
          rect(cx-cr,cy-cr,cr*2,cr*2,["#245b37","#347943","#47964b","#6eb64e","#a1d45a"][i%5]);
          for(let j=0;j<6;j++)dot(cx+(rand()-.5)*cr*2,cy+(rand()-.5)*cr*2,"#b6dd62",2);
        }
      }
      function bush(nx,ny){
        const x=ox(nx),y=oy(ny),r=u*.065;
        for(let i=0;i<14;i++){
          const a=i*2.4,cx=x+Math.cos(a)*r*.65,cy=y+Math.sin(a)*r*.40;
          rect(cx-r*.32,cy-r*.30,r*.64,r*.60,["#225d3c","#397c43","#4b9a4c","#83be53"][i%4]);
        }
        for(let i=0;i<11;i++)dot(x+(rand()-.5)*r*1.5,y+(rand()-.5)*r*.9,"#f6b14a",2);
      }
      // These coordinates come from the existing Panel 1 object array.
      tree(.16,.20);bush(.82,.78);
      cottage(.78,.19,"H");cottage(.18,.78,"H");cottage(.36,.24,"HOME");
    }
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(pixelCanvas,0,0,width,height);
    ctx.restore();
  }

  // Illustrated village screens. Load each independently, retaining vector
  // fallback if an image is unavailable.
  const illustratedPanels = new Set([1,2,6,7,11,12,16,17,18,21]);
  const panelArt = new Map();
  for(const id of illustratedPanels){
    const img=new Image();
    img.src="art/team1_panel_"+String(id).padStart(2,"0")+([6,11,16].includes(id)?"_locked":"")+".webp";
    panelArt.set(id,img);
  }
  const panel6Unlocked=new Image();
  panel6Unlocked.src="art/team1_panel_06_unlocked.webp";
  let gateVfxStart=0;
  const panel16Unlocked=new Image();
  panel16Unlocked.src="art/team1_panel_16_unlocked.webp";
  let doorVfxStart=0;
  const panel11Unlocked=new Image();
  panel11Unlocked.src="art/team1_panel_11_unlocked.webp";
  let forceVfxStart=0;
  function drawIllustratedPanel(){
    const fallback=panelArt.get(panel);
    const img=panel===16&&doorOpen&&panel16Unlocked.complete&&panel16Unlocked.naturalWidth?panel16Unlocked:
      panel===6&&villageGateOpen&&panel6Unlocked.complete&&panel6Unlocked.naturalWidth?panel6Unlocked:
      panel===11&&forceFieldRemoved&&panel11Unlocked.complete&&panel11Unlocked.naturalWidth?panel11Unlocked:fallback;
    if(!img||!img.complete||!img.naturalWidth)return false;
    ctx.save();
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(img,0,0,width,height);
    if(panel===16&&doorVfxStart){
      const elapsed=(performance.now()-doorVfxStart)/1000;
      if(elapsed<.9){
        ctx.save();ctx.globalAlpha=1-elapsed/.9;
        for(let i=0;i<16;i++){
          const angle=i*2.399+elapsed;
          const radius=Math.min(width,height)*(.025+elapsed*.13);
          ctx.fillStyle=i%2?"#fff6ac":"#f9d065";
          ctx.fillRect(width*.905+Math.cos(angle)*radius,height*.34+Math.sin(angle)*radius,5,5);
        }
        ctx.restore();
      }else doorVfxStart=0;
    }
    if(panel===6&&gateVfxStart){
      const elapsed=(performance.now()-gateVfxStart)/1000;
      if(elapsed<.9){
        const strength=1-elapsed/.9;
        ctx.save();ctx.globalAlpha=strength;
        const cx=width*.5,cy=height*.74;
        for(let i=0;i<14;i++){
          const angle=i*Math.PI*2/14+elapsed;
          const radius=Math.min(width,height)*(.045+elapsed*.12);
          const x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;
          ctx.fillStyle=i%2?"#fff5a3":"#ffd25a";
          ctx.fillRect(x-3,y-3,6,6);
        }
        ctx.restore();
      }else gateVfxStart=0;
    }
    if(panel===11&&forceVfxStart){
      const elapsed=(performance.now()-forceVfxStart)/1000;
      if(elapsed<1.15){
        const power=1-elapsed/1.15;
        const cx=width*.925,cy=height*.47;
        ctx.save();ctx.globalCompositeOperation="screen";
        const glow=ctx.createRadialGradient(cx,cy,5,cx,cy,width*.23);
        glow.addColorStop(0,"rgba(240,255,255,"+(.7*power)+")");
        glow.addColorStop(.4,"rgba(143,90,255,"+(.35*power)+")");
        glow.addColorStop(1,"rgba(120,80,255,0)");
        ctx.fillStyle=glow;ctx.fillRect(cx-width*.24,cy-width*.24,width*.48,width*.48);
        for(let i=0;i<24;i++){
          const angle=i*2.39996+elapsed*2;
          const distance=(.015+elapsed*.15+(i%5)*.008)*Math.min(width,height);
          const x=cx+Math.cos(angle)*distance,y=cy+Math.sin(angle)*distance;
          ctx.fillStyle=i%2?"#a8f8ff":"#e4b4ff";
          ctx.globalAlpha=power;ctx.fillRect(x,y,3+(i%3)*2,3+(i%3)*2);
        }
        ctx.restore();
      }else forceVfxStart=0;
    }
    ctx.restore();
    return true;
  }
  function scenery() {
    if(drawIllustratedPanel())return;
    // Soft grassy meadow, with tiny deterministic blades and flowers.
    shape(0,0,width,height,"#a4c68b");
    const unit=Math.min(width,height);
    for(let i=0;i<175;i++){
      const seed=i*79+panel*137;
      const x=((seed*37)%997)/997*width, y=((seed*83)%991)/991*height;
      ctx.strokeStyle=i%3===0?"#8eb87b":"#94bd81";
      ctx.lineWidth=Math.max(1,unit*.0025);ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(x-5,y-7);ctx.lineTo(x,y+5);ctx.lineTo(x+5,y-8);ctx.stroke();
    }
    for(let i=0;i<12;i++){
      const x=(((i*199+panel*61)%997)/997)*width;
      const y=(((i*307+panel*71)%991)/991)*height;
      ellipse(x,y,unit*.012,unit*.012,"#f5e8a7");
      ellipse(x,y,unit*.004,unit*.004,"#f4c965");
    }
    // Village clearings and the students' winding route through the lower panels.
    if ([1,2,7].includes(panel)) {
      path([[.50,0],[.50,.5],[.50,1]],Math.min(width,height)*.12,"#b89e79");
      path([[0,.52],[.50,.52],[1,.52]],Math.min(width,height)*.10,"#b89e79");
    }
    if (panel===6) {
      // One clear north-south path with a short branch toward Panel 7.
      path([[.50,0],[.50,.52],[.50,1]],Math.min(width,height)*.14,"#b89e79");
      path([[.50,.52],[1,.52]],Math.min(width,height)*.10,"#b89e79");
    }
    if ([11,16,21].includes(panel)) {
      path([[.50,0],[.50,.32],[.40,.65],[.50,1]],Math.min(width,height)*.17,"#b89e79");
    }
    if (panel===11) path([[.45,.38],[.63,.48],[1,.76]],Math.min(width,height)*.13,"#b89e79");
    if (panel===12) path([[0,.76],[.50,.78],[1,.82]],Math.min(width,height)*.13,"#b89e79");
    if (panel===16) path([[.50,.47],[.70,.47],[1,.50]],Math.min(width,height)*.14,"#b89e79");
    if (panel===17) path([[0,.50],[.48,.51],[1,.50]],Math.min(width,height)*.14,"#b89e79");


    // Second half of the students' level map: connected trails and landmarks.
    const newTrails={
      3:[[[0,.52],[.48,.52],[.48,1]]],
      4:[[[0,.52],[.50,.52],[.50,.12],[1,.52]]],
      5:[[[0,.52],[.65,.52],[.65,1]]],
      8:[[[.48,0],[.48,.52],[1,.52]]],
      9:[[[0,.52],[1,.52]]],
      10:[[[.65,0],[.65,1]],[[0,.52],[.65,.52]]],
      13:[[[0,.52],[1,.52]]],14:[[[0,.52],[1,.52]]],
      15:[[[.65,0],[.65,1]],[[0,.52],[.65,.52]]],
      18:[[[0,.50],[1,.50]]],
      19:[[[0,.50],[1,.50]],[[.52,.50],[.52,1]]],
      20:[[[0,.50],[1,.50]],[[.50,.50],[.50,1]]],
      23:[[[0,.55],[1,.55]]],
      24:[[[.52,0],[.52,.55],[0,.55],[1,.55]]],
      25:[[[0,.55],[.50,.55],[.50,0]]]
    };
    for(const points of newTrails[panel]||[])path(points,unit*.12,"#b89e79");

    if(panel===22)path([[1,.55],[.84,.55],[.84,.73]],unit*.12,"#b89e79");
    if(panel===18&&!illustratedPanels.has(panel)){
      // Garden-maze walls: leafy hedges with flowering corners and textured bases.
      for(const [a,b] of mazeHedges){
        const x1=a[0]*width,y1=a[1]*height,x2=b[0]*width,y2=b[1]*height;
        ctx.strokeStyle="#275e3c";ctx.lineWidth=unit*.080;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
        const len=Math.hypot(x2-x1,y2-y1);
        for(let d=0;d<=len;d+=unit*.034){
          const t=len?d/len:0,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;
          ellipse(x-unit*.012,y-unit*.012,unit*.034,unit*.030,"#3b8050");
          ellipse(x+unit*.013,y+unit*.009,unit*.029,unit*.026,"#4c945a");
          if(Math.floor(d/(unit*.034))%7===0){ellipse(x-unit*.004,y-unit*.023,unit*.008,unit*.008,"#f4d9a3");ellipse(x+unit*.002,y-unit*.024,unit*.004,unit*.004,"#fff8dd");}
        }
      }
    }
    if(panel===22){
      // Doghouse and pens; rescue gameplay is not yet implemented.
      shape(width*.58,height*.18,width*.27,height*.27,"#76573e");
      shape(width*.61,height*.24,width*.21,height*.20,"#b48b65");
      shape(width*.68,height*.31,width*.07,height*.13,"#493b32");
      for(let i=0;i<3;i++)shape(width*(.19+i*.14),height*.70,width*.10,height*.13,"#977954");
    }
    for (const [type,nx,ny] of objects[panel] || []) {
      const x=nx*width,y=ny*height,unit=Math.min(width,height);
      if(type==="T") {
        ellipse(x,y+unit*.05,unit*.095,unit*.034,"rgba(38,74,43,.3)");
        shape(x-unit*.023,y,unit*.046,unit*.11,"#806043");
        ellipse(x,y-unit*.038,unit*.093,unit*.108,"#286842");
        ellipse(x-unit*.033,y-unit*.072,unit*.055,unit*.057,"#4c9259");
      } else if(type==="B") {
        ellipse(x,y,unit*.075,unit*.052,"#286842");
        ellipse(x-unit*.027,y-unit*.023,unit*.048,unit*.045,"#4c9259");
      } else if(type==="LAKE") {
        ellipse(x,y,width*.38,height*.27,"#4c829b");
        ellipse(x,y,width*.35,height*.24,"#508ca4");
        shape(x+width*.29,y-height*.06,width*.09,height*.12,"#94734d"); // dock
      } else {
        const big=type==="HOME", w=unit*(big?.29:.255),h=unit*(big?.23:.205);
        ellipse(x,y+h*.54,w*.68,h*.22,"rgba(40,75,41,.27)");
        shape(x-w*.48,y-h*.32,w*.96,h*.87,"#8b6249");
        shape(x-w*.52,y-h*.47,w*1.04,h*.20,"#654632");
        // Roof shingles, two windows, and a properly sized front door.
        ctx.strokeStyle="#b79669";ctx.lineWidth=3;
        for(let k=-3;k<=3;k++){ctx.beginPath();ctx.moveTo(x+k*w*.13,y-h*.44);ctx.lineTo(x+(k+1)*w*.13,y-h*.31);ctx.stroke();}
        for(const side of [-1,1]){
          shape(x+side*w*.28-w*.10,y-h*.13,w*.20,h*.26,"#5c4735");
          shape(x+side*w*.28-w*.075,y-h*.105,w*.15,h*.20,"#87c8d2");
          shape(x+side*w*.28-w*.007,y-h*.105,w*.014,h*.20,"#f2d8a5");
          shape(x+side*w*.28-w*.075,y-h*.015,w*.15,h*.014,"#f2d8a5");
        }
        shape(x-w*.12,y+h*.06,w*.24,h*.49,"#e1bd82");
        shape(x-w*.065,y+h*.12,w*.13,h*.19,"#85bfcb");
        ellipse(x+w*.075,y+h*.39,unit*.005,unit*.005,"#74502e");
        if(big){
          // A pair of paw prints on the front wall marks the cat's special home.
          for(const px of [-.27,.27]){
            const pawX=x+px*w,pawY=y+h*.30;
            ellipse(pawX,pawY,unit*.010,unit*.008,"#f2d8a5");
            for(const [ox,oy] of [[-.012,-.013],[-.004,-.019],[.005,-.019],[.013,-.013]]){
              ellipse(pawX+unit*ox,pawY+unit*oy,unit*.004,unit*.005,"#f2d8a5");
            }
          }
        }
      }
    }
    if(panel===11 && !forceFieldRemoved) {
      // Magical barrier across the right-hand path exit, leading to Panel 12.
      const shimmer=(Math.sin(performance.now()/270)+1)/2;
      shape(width*.960,height*.66,width*.028,height*.20,"rgba(70,215,238,"+(.70+shimmer*.25)+")");
      shape(width*.953,height*.66,width*.042,height*.20,"rgba(95,224,240,.28)");
    }
    if(panel===16 && !doorOpen) {
      // Ordinary locked wooden door at the right-hand path exit.
      shape(width*.947,height*.39,width*.049,height*.22,"#59402d");
      shape(width*.954,height*.40,width*.035,height*.20,"#a77c51");
      ellipse(width*.979,height*.51,Math.min(width,height)*.006,Math.min(width,height)*.006,"#e5c66e");
    }
  }

  // Four cosmetic cats, read directly from the checked-in sprite archive.
  // Keep the ZIP intact: browser-native streaming decompression avoids a build step.
  const catKinds = [
    ["tuxedo","Tuxedo"],["gray_tabby","Gray Tabby"],
    ["calico","Calico"],["black","Black"]
  ];
  const catFrames = {};
  const catBounds = {};
  let selectedCat = null, catAssetsReady = false;
  const catScreen = document.createElement("section");
  catScreen.id = "choose-cat";
  catScreen.style.cssText = "position:absolute;inset:0;z-index:100;display:grid;place-items:center;background:linear-gradient(155deg,#1a4438,#32644a);padding:20px;overflow:auto";
  catScreen.innerHTML = '<div style="width:min(690px,100%);padding:26px;border:3px solid #e9d9aa;border-radius:24px;background:#fff9e8;box-shadow:0 20px 60px #102e2566;text-align:center"><h1 style="margin:0 0 20px;color:#286348;font-size:clamp(26px,4vw,38px)">Choose Your Cat</h1><div id="cat-choices" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px"></div><p id="cat-loading" role="status" style="min-height:24px;font-weight:800;color:#53705c">Loading cats…</p><button id="cat-play" type="button" disabled style="background:#2b9257;color:white;border:0;border-radius:14px;padding:14px 34px;font:900 18px Nunito,system-ui,sans-serif;cursor:pointer;opacity:.5">LET\'S PLAY!</button></div>';
  document.querySelector("#game").appendChild(catScreen);
  const catChoices = catScreen.querySelector("#cat-choices");
  const catPlay = catScreen.querySelector("#cat-play");
  const catStatus = catScreen.querySelector("#cat-loading");
  const catCards = new Map();
  function chooseCat(id) {
    selectedCat = id;
    for (const [key,card] of catCards) {
      const active = key === id;
      card.style.borderColor = active ? "#2b9257" : "#e7d7ad";
      card.style.background = active ? "#d8f3df" : "#fffdf6";
      card.setAttribute("aria-pressed",String(active));
    }
    catPlay.disabled = !catAssetsReady;
    catPlay.style.opacity = catAssetsReady ? "1" : ".5";
  }
  for (const [id,name] of catKinds) {
    const card = document.createElement("button");
    card.type = "button";
    card.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;padding:10px;border:3px solid #e7d7ad;border-radius:16px;background:#fffdf6;color:#254a37;font:900 16px Nunito,system-ui,sans-serif;cursor:pointer";
    const portrait = document.createElement("img");
    portrait.alt = ""; portrait.width = 80; portrait.height = 80;
    portrait.style.cssText = "width:80px;height:80px;object-fit:contain;image-rendering:pixelated";
    card.append(portrait,document.createTextNode(name));
    card.addEventListener("click",()=>chooseCat(id));
    catChoices.appendChild(card); catCards.set(id,card);
  }
  catPlay.addEventListener("click",()=>{
    if (!catAssetsReady || !selectedCat) return;
    try { localStorage.setItem("alpha-team1-cat",selectedCat); } catch (_) {}
    catScreen.remove(); keys.clear();
  });
  async function loadCatSprites() {
    const response = await fetch("assets/cats/team1_cat_sprites_v1.zip");
    if (!response.ok) throw Error("Sprite archive HTTP "+response.status);
    const data = new Uint8Array(await response.arrayBuffer());
    const view = new DataView(data.buffer);
    const decoder = new TextDecoder();
    const files = new Map();
    // Read the ZIP central directory, which supplies the authoritative sizes/offsets.
    for(let p=0;p+46<=data.length;p++){
      if(view.getUint32(p,true)!==0x02014b50)continue;
      const method=view.getUint16(p+10,true), compressed=view.getUint32(p+20,true);
      const nameLen=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true);
      const name=decoder.decode(data.subarray(p+46,p+46+nameLen));
      const local=view.getUint32(p+42,true);
      if(view.getUint32(local,true)!==0x04034b50)throw Error("Invalid ZIP entry");
      const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
      files.set(name,{start,compressed,method});
      p+=45+nameLen+extra+comment;
    }
    const expected=catKinds.length*4*4;
    if([...files.keys()].filter(n=>/_(up|down|left|right)_[0-3]\.png$/.test(n)).length!==expected)throw Error("Expected 64 directional cat frames");
    async function unpack(name){
      const f=files.get(name);
      if(!f)throw Error("Missing sprite: "+name);
      const bytes=data.slice(f.start,f.start+f.compressed);
      let raw;
      if(f.method===0)raw=bytes;
      else if(f.method===8){
        const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        raw=new Uint8Array(await new Response(stream).arrayBuffer());
      } else throw Error("Unsupported ZIP compression");
      if(raw.length<26||raw[0]!==137||raw[1]!==80||raw[2]!==78||raw[3]!==71)throw Error("Invalid PNG "+name);
      // PNG color type 6 is RGBA, 4 is grayscale+alpha, 3 can use tRNS.
      if(![3,4,6].includes(raw[25]))throw Error("Sprite missing transparency: "+name);
      const url=URL.createObjectURL(new Blob([raw],{type:"image/png"}));
      const img=new Image();
      try {img.src=url;await img.decode();return img;}
      finally {URL.revokeObjectURL(url);}
    }
    for(const [id] of catKinds){
      catFrames[id]={};
      for(const direction of ["up","down","left","right"]){
        catFrames[id][direction]=await Promise.all([0,1,2,3].map(i=>unpack(id+"_"+direction+"_"+i+".png")));
      }
      // Find one consistent visible bounding box for every frame of this cat.
      // Cropping transparent padding prevents the cat from hovering above its shadow.
      let minX=Infinity,minY=Infinity,maxX=0,maxY=0;
      for(const direction of ["up","down","left","right"]){
        for(const img of catFrames[id][direction]){
          const scan=document.createElement("canvas");
          scan.width=img.naturalWidth;scan.height=img.naturalHeight;
          const scanCtx=scan.getContext("2d",{willReadFrequently:true});
          scanCtx.drawImage(img,0,0);
          const pixels=scanCtx.getImageData(0,0,scan.width,scan.height).data;
          for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++){
            if(pixels[(y*scan.width+x)*4+3]>16){
              minX=Math.min(minX,x);minY=Math.min(minY,y);
              maxX=Math.max(maxX,x+1);maxY=Math.max(maxY,y+1);
            }
          }
        }
      }
      catBounds[id]=Number.isFinite(minX)?{x:minX,y:minY,w:maxX-minX,h:maxY-minY}:null;
      const portrait=catCards.get(id).querySelector("img");
      const img=await unpack(id+"_portrait.png");
      const portraitCanvas=document.createElement("canvas");
      portraitCanvas.width=img.naturalWidth;portraitCanvas.height=img.naturalHeight;
      portraitCanvas.getContext("2d").drawImage(img,0,0);
      portrait.src=portraitCanvas.toDataURL("image/png");
    }
    catAssetsReady=true;
    catStatus.textContent="";
    let saved=null;try{saved=localStorage.getItem("alpha-team1-cat");}catch(_){}
    // Always show character selection at launch. Remember the last choice
    // only as the highlighted default, never auto-start the adventure.
    chooseCat(catKinds.some(([id])=>id===saved) ? saved : "tuxedo");
  }
  loadCatSprites().catch(error=>{
    console.error("Cat sprite loading failed:",error);
    catStatus.textContent="Unable to load cat sprites. Refresh to try again.";
  });
  function drawPixelCat(){
    const sprites=catFrames[selectedCat];
    const frames=sprites && sprites[facing];
    if(!frames)return;
    // New sprite package supplies four complete directional walking frames.
    // Keep their shared source-canvas registration stable across frames.
    // Gentle idle breathing and an occasional small pose change.
    // Reuse the approved frames without disturbing the grounded feet.
    const idleSeconds=performance.now()/1000;
    const idleCycle=idleSeconds%5.5;
    const frame=walking ? Math.floor(walkTime*9)%4
      : (idleCycle>4.75&&idleCycle<5.05 ? 1 : 0);
    const img=frames[frame];
    const bounds=catBounds[selectedCat];
    const h=59;
    const scale=h/(bounds?.h||img.naturalHeight);
    const w=img.naturalWidth*scale;
    // Align the bottom of the full frame with the ground point; no frame-by-
    // frame cropping or simulated hopping that makes paws float.
    const bottom=(bounds?.y||0)+(bounds?.h||img.naturalHeight);
    ctx.save();ctx.imageSmoothingEnabled=false;
    ellipse(0,22,18,5,"rgba(35,55,36,.24)");
    if(!walking){
      // About one screen pixel of slow breathing; feet stay planted.
      const breathe=1+Math.sin(idleSeconds*2.2)*.012;
      const groundedY=22;
      ctx.translate(0,groundedY);
      ctx.scale(breathe,breathe);
      ctx.translate(0,-groundedY);
    }
    ctx.drawImage(img,-w/2,22-bottom*scale,w,img.naturalHeight*scale);
    ctx.restore();
  }

  // Four-direction animated ginger cat. Feet, tail and body move while walking.

  function drawHero() {
    const t = walking ? walkTime * 12 : 0;
    const step = walking ? Math.sin(t) : 0;
    const bob = walking ? Math.abs(Math.sin(t)) * 2.2 : 0;
    const side = facing === "left" || facing === "right";
    const back = facing === "up";
    ctx.save();
    ctx.translate(0, -bob);
    if (facing === "left") ctx.scale(-1, 1);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const fur="#e9a457", light="#ffe4b6", dark="#b86b37", outline="#70452d";
    // Ground shadow stays attached to the cat.
    ellipse(0, 23+bob, 21, 6, "rgba(35,55,36,.25)");
    // Tail swishes behind the body.
    ctx.strokeStyle=dark;ctx.lineWidth=9;
    ctx.beginPath();
    const swish=Math.sin(walkTime*5)*5;
    if(side) {ctx.moveTo(-13,8);ctx.bezierCurveTo(-27,9,-29,-10+swish,-22,-14+swish);}
    else {ctx.moveTo(15,7);ctx.bezierCurveTo(31,7,32,-12+swish,23,-17+swish);}
    ctx.stroke();
    ctx.strokeStyle=fur;ctx.lineWidth=5;
    ctx.beginPath();
    if(side){ctx.moveTo(-22,-14+swish);ctx.lineTo(-24,-17+swish);}
    else{ctx.moveTo(23,-17+swish);ctx.lineTo(24,-20+swish);}
    ctx.stroke();
    // Four little paws alternate as the cat walks.
    for (const [px,py,phase] of [[-11,13,1],[11,13,-1],[-11,19,-1],[11,19,1]]) {
      ellipse(px+(side?step*phase*4:0),py+step*phase*3,6,7,dark);
      ellipse(px+(side?step*phase*4:0),py+step*phase*3+2,4,4,light);
    }
    ellipse(0,4,side?17:18,19,fur);
    if(!back) ellipse(side?5:0,8,side?10:12,12,light);
    // Big ears and face, turned toward the movement direction.
    const hx=side?8:0;
    ctx.fillStyle=fur;ctx.strokeStyle=outline;ctx.lineWidth=1.8;
    for(const e of [-1,1]){
      ctx.beginPath();ctx.moveTo(hx+e*9,-22);ctx.lineTo(hx+e*16,-43);ctx.lineTo(hx+e*2,-35);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle="#d98983";ctx.beginPath();ctx.moveTo(hx+e*9,-27);ctx.lineTo(hx+e*13,-38);ctx.lineTo(hx+e*5,-33);ctx.closePath();ctx.fill();ctx.fillStyle=fur;
    }
    ellipse(hx,-23,side?18:20,18,fur);
    if(back){
      // Back view: orange head with three darker fur stripes.
      ctx.strokeStyle=dark;ctx.lineWidth=3;
      for(const x of [-7,0,7]){ctx.beginPath();ctx.moveTo(x,-37);ctx.lineTo(x*.65,-30);ctx.stroke();}
    } else {
      ellipse(hx+(side?6:0),-17,side?11:14,9,light);
      ctx.fillStyle="#273b32";
      if(side){
        ellipse(hx+10,-27,2.5,3.7,"#273b32");
        ellipse(hx+16,-19,2.7,2.1,"#b96e76");
      } else {
        ellipse(hx-8,-26,2.7,3.8,"#273b32");ellipse(hx+8,-26,2.7,3.8,"#273b32");
        ellipse(hx,-18,3.3,2.4,"#b96e76");
      }
      ctx.strokeStyle=outline;ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(hx+(side?14:0),-16);
      ctx.lineTo(hx+(side?14:0),-13);ctx.stroke();
      // Small whiskers.
      for(const sign of [-1,1]){
        if(side && sign<0) continue;
        ctx.beginPath();ctx.moveTo(hx+sign*9,-17);ctx.lineTo(hx+sign*22,-20);
        ctx.moveTo(hx+sign*9,-14);ctx.lineTo(hx+sign*22,-12);ctx.stroke();
      }
      ctx.strokeStyle=dark;ctx.lineWidth=2.5;
      for(const x of [-8,0,8]){ctx.beginPath();ctx.moveTo(hx+x,-39);ctx.lineTo(hx+x*.7,-34);ctx.stroke();}
    }
    ctx.restore();
  }

  function draw() {
    scenery();
    ctx.save();
    ctx.translate(hero.x*width,hero.y*height);
    // Keep the cat proportional to houses and maze dogs across all panels.
    ctx.scale(.72,.72);
    if(catAssetsReady && selectedCat) drawPixelCat();
    else drawHero();
    ctx.restore();
    drawMazeActors();
    highlight();
  }
  function blocked(x,y) {
    // Art-matched solid footprints, inset from the interaction outlines.
    // Trees collide at their trunks, cottages at their walls, and smaller
    // objects at their bases so the player can still navigate the lawn.
    if(panel===18){
      const px=x*width,py=y*height;
      // Keep the cat out of the hedge art, with a modest body-size margin.
      const thickness=Math.min(width,height)*.032;
      for(const [a,b] of mazeHedges){
        const ax=a[0]*width,ay=a[1]*height,bx=b[0]*width,by=b[1]*height;
        const vx=bx-ax,vy=by-ay;
        const t=Math.max(0,Math.min(1,((px-ax)*vx+(py-ay)*vy)/(vx*vx+vy*vy)));
        if(Math.hypot(px-(ax+t*vx),py-(ay+t*vy))<thickness)return true;
      }
      // Dense tree border on the top and bottom, away from the open maze.
      if(y<.055||y>.95)return true;
      return false;
    }
    if(panel===17){
      // Keep the winding east-west trail clear; solid scenery only.
      const radius=Math.min(width,height)*.012;
      const solid=[
        [.09,.22,.11,.23], [.29,.29,.09,.19], // tree, dog sign
        [.445,.14,.075,.16], [.56,.16,.085,.16], // tree trunks
        [.43,.25,.075,.07], [.73,.29,.13,.15], // rocks, trail map
        [.82,.12,.09,.14], [.94,.24,.07,.16], // eastern trees
        [.24,.735,.265,.09], // wooden fence
        [.48,.71,.065,.08], // shrub
        [.737,.74,.045,.085], [.815,.75,.055,.09], // barrel, stump
        [.905,.69,.12,.15] // crates
      ];
      for(const [cx,cy,w,h] of solid){
        if(Math.abs(x-cx)*width<w*width/2+radius&&
           Math.abs(y-cy)*height<h*height/2+radius)return true;
      }
      return false;
    }
    if(panel===12){
      // Lake is impassable except for the accessible wooden dock.
      const radius=Math.min(width,height)*.012;
      const inDock=x>.572&&x<.806&&y>.265&&y<.405;
      const lake=((x-.424)/.445)**2+((y-.238)/.285)**2<1;
      if(lake&&!inDock)return true;
      const solid=[
        [.858,.585,.225,.27], [.055,.32,.075,.29],
        [.170,.53,.06,.09], [.275,.88,.085,.085],
        [.59,.71,.055,.07], [.977,.80,.05,.22]
      ];
      for(const [cx,cy,w,h] of solid){
        if(Math.abs(x-cx)*width<w*width/2+radius&&
           Math.abs(y-cy)*height<h*height/2+radius)return true;
      }
      return false;
    }
    if(panel===21){
      const radius=Math.min(width,height)*.013;
      // Keep the winding path and cottage steps open; collide with the
      // building walls, tree trunks, magical stone, and large scenery.
      const solid=[
        [.17,.355,.105,.25], [.32,.11,.065,.12],
        [.695,.205,.09,.18], [.80,.365,.27,.30],
        [.23,.55,.13,.15], [.217,.76,.07,.105],
        [.36,.66,.055,.055], [.72,.82,.085,.105],
        [.585,.855,.075,.07], [.535,.375,.09,.085]
      ];
      for(const [cx,cy,w,h] of solid){
        if(Math.abs(x-cx)*width<w*width/2+radius&&
           Math.abs(y-cy)*height<h*height/2+radius)return true;
      }
      return false;
    }
    if(panel===16){
      const radius=Math.min(width,height)*.014;
      const solid=[
        [.13,.30,.19,.30],[.29,.15,.12,.16],[.73,.19,.105,.20],
        [.805,.135,.085,.14],[.24,.75,.055,.07],[.10,.48,.055,.065],
        [.37,.20,.06,.07],[.64,.78,.07,.08],[.72,.75,.10,.10],
        [.855,.285,.055,.24],[.97,.32,.055,.25]
      ];
      for(const [cx,cy,w,h] of solid){
        if(Math.abs(x-cx)*width<w*width/2+radius&&Math.abs(y-cy)*height<h*height/2+radius)return true;
      }
      if(!doorOpen&&x>.855&&y>.20&&y<.48)return true;
      return false;
    }
    if(panel===11){
      const radius=Math.min(width,height)*.014;
      const solid=[
        [.13,.30,.19,.30], [.29,.15,.12,.16], [.73,.19,.105,.20],
        [.805,.135,.085,.14], [.24,.75,.055,.07], [.10,.48,.055,.065],
        [.37,.20,.06,.07], [.64,.78,.07,.08], [.72,.75,.10,.10],
        [.94,.26,.055,.17], [.972,.61,.035,.14]
      ];
      for(const [cx,cy,w,h] of solid){
        if(Math.abs(x-cx)*width<(w*width/2+radius)&&Math.abs(y-cy)*height<(h*height/2+radius))return true;
      }
      if(!forceFieldRemoved && x>.865&&y>.30&&y<.69)return true;
      return false;
    }
    if(panel===6&&!villageGateOpen&&y>.68&&y<.88&&x>.40&&x<.61)return true;
    if(illustratedPanels.has(panel)){
      const radius=Math.min(width,height)*.016;
      for(const t of villageTargets()){
        const name=t.title.toLowerCase();
        let cx=t.x,cy=t.y,w=t.w,h=t.h;
        if(name.includes("cottage")||name==="cat's home"){
          cy+=h*.12;w*=.78;h*=.64;
        }else if(name.includes("tree")){
          cy+=h*.30;w*=.26;h*=.28;
        }else if(name.includes("gate")){
          cy+=h*.16;w*=.82;h*=.72;
        }else if(name.includes("sign")||name.includes("lantern")){
          cy+=h*.23;w*=.50;h*=.40;
        }else if(name.includes("flower")){
          w*=.72;h*=.55;
        }else{
          cy+=h*.10;w*=.70;h*=.70;
        }
        if(Math.abs((x-cx)*width)<w*width/2+radius &&
           Math.abs((y-cy)*height)<h*height/2+radius)return true;
      }
      return false;
    }
    const radius=Math.min(width,height)*.025;
    for(const [type,nx,ny] of objects[panel]||[]) {
      if(type==="LAKE") {
        const dx=(x-nx)/.38,dy=(y-ny)/.27;
        if(dx*dx+dy*dy<.87) return true;
      } else {
        const r=type==="T"?.08:type==="B"?.065:type==="HOME"?.13:.12;
        if(Math.abs((x-nx)*width)<r*Math.min(width,height)+radius &&
           Math.abs((y-ny)*height)<r*Math.min(width,height)+radius) return true;
      }
    }
    if(panel===18){
      const px=x*width,py=y*height,thickness=Math.min(width,height)*.061;
      for(const [a,b] of mazeHedges){
        const ax=a[0]*width,ay=a[1]*height,bx=b[0]*width,by=b[1]*height;
        const vx=bx-ax,vy=by-ay;
        const t=Math.max(0,Math.min(1,((px-ax)*vx+(py-ay)*vy)/(vx*vx+vy*vy)));
        if(Math.hypot(px-(ax+t*vx),py-(ay+t*vy))<thickness)return true;
      }
    }
    if(panel===11 && !forceFieldRemoved && x>.865 && y>.30 && y<.69) return true;
    if(panel===16 && !doorOpen && x>.935 && y>.37 && y<.63) return true;
    return false;
  }
  // Every screen connection must meet a visible path at BOTH edges.
  // Positions are normalized (0..1) so the entrances match on all screen sizes.
  const exits = {
  "1": {
    "right": [
      2,
      0.52
    ],
    "bottom": [
      6,
      0.5
    ]
  },
  "2": {
    "left": [
      1,
      0.52
    ],
    "right": [
      3,
      0.52
    ],
    "bottom": [
      7,
      0.5
    ]
  },
  "3": {
    "left": [
      2,
      0.52
    ],
    "right": [
      4,
      0.52
    ],
    "bottom": [
      8,
      0.48
    ]
  },
  "4": {
    "left": [
      3,
      0.52
    ],
    "right": [
      5,
      0.52
    ]
  },
  "5": {
    "left": [
      4,
      0.52
    ],
    "bottom": [
      10,
      0.65
    ]
  },
  "6": {
    "top": [
      1,
      0.5
    ],
    "right": [
      7,
      0.52
    ],
    "bottom": [
      11,
      0.5
    ]
  },
  "7": {
    "top": [
      2,
      0.5
    ],
    "left": [
      6,
      0.52
    ]
  },
  "8": {
    "top": [
      3,
      0.48
    ],
    "right": [
      9,
      0.52
    ]
  },
  "9": {
    "left": [
      8,
      0.52
    ],
    "right": [
      10,
      0.52
    ]
  },
  "10": {
    "top": [
      5,
      0.65
    ],
    "left": [
      9,
      0.52
    ],
    "bottom": [
      15,
      0.65
    ]
  },
  "11": {
    "top": [
      6,
      0.5
    ],
    "right": [
      12,
      0.47
    ],
    "bottom": [
      16,
      0.5
    ]
  },
  "12": {
    "left": [
      11,
      0.47
    ]
  },
  "13": {
    "right": [
      14,
      0.52
    ]
  },
  "14": {
    "left": [
      13,
      0.52
    ],
    "right": [
      15,
      0.52
    ]
  },
  "15": {
    "top": [
      10,
      0.65
    ],
    "left": [
      14,
      0.52
    ],
    "bottom": [
      20,
      0.65
    ]
  },
  "16": {
    "top": [
      11,
      0.5
    ],
    "right": [
      17,
      0.5
    ],
    "bottom": [
      21,
      0.5
    ]
  },
  "17": {
    "left": [
      16,
      0.5
    ],
    "right": [
      18,
      0.5
    ],
    
  },
  "18": {
    "left": [
      17,
      0.5
    ],
    "right": [
      19,
      0.5
    ]
  },
  "19": {
    "left": [
      18,
      0.5
    ],
    "right": [
      20,
      0.5
    ],
    "bottom": [
      24,
      0.52
    ]
  },
  "20": {
    "left": [
      19,
      0.5
    ],
    "bottom": [
      25,
      0.5
    ]
  },
  "21": {
    "top": [
      16,
      0.5
    ]
  },
  "22": {
    "right": [
      23,
      0.55
    ]
  },
  "23": {
    "left": [
      22,
      0.55
    ],
    "right": [
      24,
      0.55
    ]
  },
  "24": {
    "top": [
      19,
      0.52
    ],
    "left": [
      23,
      0.55
    ],
    "right": [
      25,
      0.55
    ]
  },
  "25": {
    "top": [
      20,
      0.5
    ],
    "left": [
      24,
      0.55
    ]
  }
};
  function move(dx,dy) {
    const nx=hero.x+dx/width, ny=hero.y+dy/height;
    const margin=22; // keep the cat's body on-screen at closed edges
    const edgeX=margin/width, edgeY=margin/height;
    let direction=null, coordinate=0;
    if(nx>1-edgeX){direction="right";coordinate=hero.y;}
    else if(nx<edgeX){direction="left";coordinate=hero.y;}
    else if(ny>1-edgeY){direction="bottom";coordinate=hero.x;}
    else if(ny<edgeY){direction="top";coordinate=hero.x;}
    if(direction){
      const exit=exits[panel]?.[direction];
      const villageLink=illustratedPanels.has(panel) && illustratedPanels.has(exits[panel]?.[direction]?.[0]);
      const tolerance=direction==="left"||direction==="right"
        ? Math.max(.045,Math.min(.085,48/height))
        : Math.max(.045,Math.min(.085,48/width));
      // Story gates cannot be bypassed through screen transitions.
      if(exit && !(panel===6&&direction==="bottom"&&!villageGateOpen) && !(panel===11&&direction==="right"&&!forceFieldRemoved) && !(panel===16&&direction==="right"&&!doorOpen) &&
          (villageLink || Math.abs(coordinate-exit[1])<=tolerance) &&
          panels.has(exit[0])){
        const previousPanel=panel;
        panel=exit[0];
        if(panel===18&&previousPanel!==18)resetMaze();
        if(direction==="right") hero.x=edgeX+.012;
        if(direction==="left") hero.x=1-edgeX-.012;
        if(direction==="bottom") hero.y=edgeY+.012;
        if(direction==="top") hero.y=1-edgeY-.012;
        // Align with the center of the connecting path on entry.
        if(!villageLink){
          if(direction==="right"||direction==="left") hero.y=exit[1];
          else hero.x=exit[1];
        }
      } else {
        hero.x=Math.max(edgeX,Math.min(1-edgeX,hero.x));
        hero.y=Math.max(edgeY,Math.min(1-edgeY,hero.y));
      }
      return;
    }
    if(!blocked(nx,hero.y)) hero.x=nx;
    if(!blocked(hero.x,ny)) hero.y=ny;
  }
  function update(now) {
    const dt=Math.min((now-lastTime)/1000,.04);lastTime=now;
    let dx=0,dy=0;
    if(keys.has("ArrowLeft")||keys.has("a")) dx--;
    if(keys.has("ArrowRight")||keys.has("d")) dx++;
    if(keys.has("ArrowUp")||keys.has("w")) dy--;
    if(keys.has("ArrowDown")||keys.has("s")) dy++;
    if(dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2;}
    walking = !dialogOpen && !caught && (dx !== 0 || dy !== 0);
    if (walking) {
      if (Math.abs(dx) > Math.abs(dy)) facing = dx > 0 ? "right" : "left";
      else facing = dy > 0 ? "down" : "up";
      walkTime += dt;
    }
    if(!dialogOpen&&!caught&&catAssetsReady&&!catScreen.isConnected)move(dx*hero.speed*dt,dy*hero.speed*dt);
    updateDogs(dt);
    try { draw(); } catch(error) { console.error("Rendering failed:",error); }
    requestAnimationFrame(update);
  }
  addEventListener("resize",resize);
  addEventListener("keydown",e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(k==="Escape"&&dialogOpen)closeInteraction();keys.add(k);if(k.startsWith("Arrow"))e.preventDefault();});
  addEventListener("keyup",e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  addEventListener("blur",()=>keys.clear());
  updateHud();
  try { resize(); } catch(error) { console.error("Initial rendering failed:",error); }
  requestAnimationFrame(update);
  // Debug controls are initialized after the game loop starts, so UI issues cannot prevent rendering.
  try {
  // Developer-only panel teleporter. It does not grant or require inventory items.
  const debugBox=document.createElement("div");
  debugBox.style.cssText="position:absolute;right:12px;bottom:12px;z-index:50;font:700 13px Nunito,system-ui,sans-serif;color:#263d36";
  debugBox.innerHTML='<button id="debug-toggle" type="button" style="border:2px solid #e7d7ad;border-radius:12px;background:#fff9e8;padding:10px;cursor:pointer;font-weight:800">DEBUG</button><div id="debug-panel" style="display:none;margin-top:6px;background:#fff9e8;border:2px solid #e7d7ad;border-radius:12px;padding:10px;box-shadow:0 5px 18px #0003"><label for="debug-destination">Teleport to panel</label><select id="debug-destination" style="display:block;margin:8px 0;padding:7px;width:100%"></select><button id="debug-go" type="button" style="background:#3d9b68;color:white;border:0;border-radius:8px;padding:8px 16px;cursor:pointer">GO</button></div>';
  document.querySelector("#game").appendChild(debugBox);
  const debugSelect=debugBox.querySelector("#debug-destination");
  for(let i=1;i<=25;i++){const option=document.createElement("option");option.value=i;option.textContent="Panel "+i;debugSelect.appendChild(option);}
  debugBox.querySelector("#debug-toggle").onclick=()=>{const menu=debugBox.querySelector("#debug-panel");menu.style.display=menu.style.display==="none"?"block":"none";debugSelect.value=panel;};
  debugBox.querySelector("#debug-go").onclick=()=>{
    panel=Number(debugSelect.value);hero.x=panel===18?.065:.5;hero.y=panel===18?.5:.65;
    if(panel===18)resetMaze();
    if(typeof closeInteraction==="function")closeInteraction();
    keys.clear();debugBox.querySelector("#debug-panel").style.display="none";
  };
  } catch (error) { console.error('Debug menu unavailable:',error); }
})();
