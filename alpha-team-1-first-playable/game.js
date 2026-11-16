// Team 1 first playable: fixed-camera panels from the students' map.
// Terrain and scenery only; quests and interactions will be added later.
(() => {
  const canvas = document.querySelector("#world");
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const hero = { x: .5, y: .68, speed: 220 };
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
  const questEl=document.querySelector("#quest"),itemsEl=document.querySelector("#items");
  function updateHud(){
    questEl.textContent=hasKey&&!doorOpen?"• Unlock the old wooden door":doorOpen?"• Explore beyond the door":"• Explore the Village";
    itemsEl.textContent=[hasRod?"Fishing Rod":"",fish?"Fish":"",hasKey?"Golden Key":"",hasPotion?"Magic Potion":""].filter(Boolean).join(" · ")||"Empty";
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
  function interact(target){
    const type=target.type;
    if(!descriptions[type])return;
    dialogOpen=true;keys.clear();modal.classList.add("open");
    const [title,description]=descriptions[type];
    modal.querySelector("#interaction-title").textContent=title;
    const actions=modal.querySelector("#interaction-actions"),p=modal.querySelector("#interaction-description");
    p.hidden=true;p.textContent=description;actions.replaceChildren();
    const look=button("EXAMINE",()=>{p.hidden=false;actions.replaceChildren(button("OK",closeInteraction));});
    const options=[look];
    if(panel===21&&type==="H"&&target.id===2&&!hasPotion)options.push(button("GET POTION",()=>{
      hasPotion=true;
      p.textContent="You found a Magic Potion! It has been added to your inventory.";
      p.hidden=false;updateHud();actions.replaceChildren(button("OK",closeInteraction));
    }));
    if(type==="FORCE"&&hasPotion&&!forceFieldRemoved)options.push(button("USE POTION",()=>{
      hasPotion=false;forceFieldRemoved=true;
      p.textContent="The Magic Potion dissolves the force field. The path is clear!";
      p.hidden=false;updateHud();actions.replaceChildren(button("OK",closeInteraction));
    }));
    if(panel===12&&type==="H"&&target.id===1){
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
    if(type==="DOCK"&&hasRod&&!fish&&!hasKey)options.push(button("CATCH FISH",()=>{
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
  function targets(){
    const list=(objects[panel]||[]).map(([type,x,y],i)=>({type,x,y,id:i}));
    if(panel===12){list.push({type:"DOCK",x:.81,y:.29,id:100});}
    if(panel===11&&!forceFieldRemoved)list.push({type:"FORCE",x:.975,y:.76,id:101});
    if(panel===16&&!doorOpen)list.push({type:"DOOR",x:.965,y:.50,id:103});
    return list;
  }
  function nearestTarget(){
    let found=null,dist=Infinity;
    for(const target of targets()){
      const d=Math.hypot((hero.x-target.x)*width,(hero.y-target.y)*height);
      const reach=target.type==="LAKE"?Math.min(width,height)*.32:
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
    if(t.type==="H"||t.type==="HOME"){
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
      if(t.type==="FORCE")ctx.rect(width*.953,height*.66,width*.042,height*.20);
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
      case "FORCE": return x>=width*.953 && x<=width*.995 && y>=height*.66 && y<=height*.86;
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
  const mazeHedges=[
    [[.22,0],[.22,.69]],
    [[.40,.31],[.40,1]],
    [[.58,0],[.58,.69]],
    [[.76,.31],[.76,1]],
    // Small cul-de-sacs off the main route (not blocking the intended route).
    [[.05,.17],[.13,.17]],[[.13,.17],[.13,.30]],
    [[.28,.83],[.33,.83]],
    [[.46,.15],[.52,.15]],
    [[.64,.83],[.69,.83]],
    [[.83,.17],[.91,.17]],[[.91,.17],[.91,.28]]
  ];
  // Each dog guards the next bend, with meat accessible on the approach.
  const dogSeeds=[
    {x:.17,y:.63,axis:"vertical",phase:0},
    {x:.35,y:.39,axis:"vertical",phase:4.2},
    {x:.53,y:.63,axis:"vertical",phase:7.8},
    {x:.71,y:.39,axis:"vertical",phase:2.5}
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
    meat=[{x:.10,y:.51,used:false},{x:.29,y:.79,used:false},{x:.47,y:.21,used:false},{x:.65,y:.79,used:false}];
    carrying=false;caught=false;chaseTime=0;mazeClock=0;
    hero.x=.065;hero.y=.50;facing="right";
    catchModal.classList.remove("open");keys.clear();
  }
  resetMaze();
  function dogFacing(d){
    const alternate=Math.floor((mazeClock+d.phase)/5)%2===0;
    return d.axis==="horizontal"?(alternate?0:Math.PI):(alternate?Math.PI/2:-Math.PI/2);
  }
  function sight(d,px,py){
    const dx=(px-d.x)*width,dy=(py-d.y)*height;
    const distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    const delta=Math.atan2(Math.sin(angle-dogFacing(d)),Math.cos(angle-dogFacing(d)));
    if(distance>=Math.min(width,height)*.28 || Math.abs(delta)>=Math.PI/5)return false;
    // Hedge walls block sight as well as movement.
    for(let i=1;i<16;i++){
      const t=i/16,sx=d.x+(px-d.x)*t,sy=d.y+(py-d.y)*t;
      for(const [a,b] of mazeHedges){
        const ax=a[0]*width,ay=a[1]*height,bx=b[0]*width,by=b[1]*height;
        const vx=bx-ax,vy=by-ay,qx=sx*width-ax,qy=sy*height-ay;
        const k=Math.max(0,Math.min(1,(qx*vx+qy*vy)/(vx*vx+vy*vy)));
        if(Math.hypot(qx-k*vx,qy-k*vy)<Math.min(width,height)*.038)return false;
      }
    }
    return true;
  }
  function updateDogs(dt){
    if(panel!==18||caught||dialogOpen)return;
    mazeClock+=dt;
    for(const d of dogs){
      if(d.mode==="asleep")continue;
      if(d.mode==="investigate"){
        const dx=(d.target.x-d.x)*width,dy=(d.target.y-d.y)*height,dist=Math.hypot(dx,dy);
        if(dist<9){d.mode="asleep";d.timer=0;d.target=null;continue;}
        const step=Math.min(dist,Math.min(width,height)*.18*dt);
        const nx=d.x+dx/dist*step/width,ny=d.y+dy/dist*step/height;
        if(!blocked(nx,ny)){d.x=nx;d.y=ny;}else{d.mode="watch";d.target=null;}
        continue;
      }
      // The cat is always caught when visible, even if meat is in the same cone.
      if(sight(d,hero.x,hero.y)){
        d.mode="chase";chaseTime=0;
      }else if(d.mode==="watch"){
        const bait=meat.find(m=>m.placed&&!m.used&&sight(d,m.x,m.y));
        if(bait){bait.used=true;d.mode="investigate";d.target={x:bait.x,y:bait.y};}
      }
      if(d.mode==="chase"){
        const dx=(hero.x-d.x)*width,dy=(hero.y-d.y)*height,dist=Math.hypot(dx,dy);
        if(dist>1){const step=Math.min(dist,Math.min(width,height)*.62*dt);d.x+=dx/dist*step/width;d.y+=dy/dist*step/height;}
      }
    }
    if(dogs.some(d=>d.mode==="chase")){
      chaseTime+=dt;
      if(chaseTime>.45||dogs.some(d=>Math.hypot((hero.x-d.x)*width,(hero.y-d.y)*height)<30)){
        caught=true;keys.clear();catchModal.classList.add("open");
      }
    }
  }
  function drawMazeActors(){
    if(panel!==18)return;
    const u=Math.min(width,height);
    for(const m of meat)if(!m.used){
      const x=m.x*width,y=m.y*height;
      ellipse(x,y,u*.017,u*.012,"#8b4b2b");
      ellipse(x-u*.012,y-u*.003,u*.008,u*.008,"#f5e7ce");
      ellipse(x+u*.012,y-u*.003,u*.008,u*.008,"#f5e7ce");
    }
    for(const d of dogs){
      const x=d.x*width,y=d.y*height;
      if(d.mode==="watch"){
        const a=dogFacing(d),radius=u*.37;
        ctx.fillStyle="rgba(225,45,45,.24)";ctx.beginPath();ctx.moveTo(x,y);
        ctx.arc(x,y,radius,a-Math.PI/5,a+Math.PI/5);ctx.closePath();ctx.fill();
      }
      ctx.save();ctx.translate(x,y);ctx.rotate(d.mode==="watch"?dogFacing(d):d.target?Math.atan2((d.target.y-d.y)*height,(d.target.x-d.x)*width):0);
      ellipse(0,0,u*.029,u*.023,"#9d7047");
      ellipse(u*.019,0,u*.022,u*.020,"#c59159");
      ellipse(u*.024,-u*.019,u*.010,u*.012,"#6b4631");
      ellipse(u*.024,u*.019,u*.010,u*.012,"#6b4631");
      ellipse(u*.036,-u*.007,u*.003,u*.003,"#2d302a");
      ellipse(u*.036,u*.007,u*.003,u*.003,"#2d302a");
      ctx.restore();
      if(d.mode==="asleep"){
        // Gentle rising sleep letters above the dog, no permanent HUD text.
        ctx.save();ctx.fillStyle="#f9f4dd";ctx.strokeStyle="#315d48";ctx.lineWidth=2;ctx.font=`900 ${Math.max(15,u*.023)}px Nunito,system-ui,sans-serif`;ctx.textAlign="center";
        for(let j=0;j<3;j++){const rise=(mazeClock*.35+j/3)%1;const zx=x+u*(.018+j*.018),zy=y-u*(.045+rise*.075);ctx.strokeText("z",zx,zy);ctx.fillText("z",zx,zy);}
        ctx.restore();
      }
    }
    if(carrying){ellipse(hero.x*width+u*.020,hero.y*height-u*.013,u*.014,u*.009,"#8b4b2b");}
  }
  function scenery() {
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
    if(panel===18){
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
    drawHero();
    ctx.restore();
    drawMazeActors();
    highlight();
  }
  function blocked(x,y) {
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
    if(panel===11 && !forceFieldRemoved && x>.935 && y>.64 && y<.88) return true;
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
      0.76
    ],
    "bottom": [
      16,
      0.5
    ]
  },
  "12": {
    "left": [
      11,
      0.76
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
      const tolerance=direction==="left"||direction==="right"
        ? Math.max(.045,Math.min(.085,48/height))
        : Math.max(.045,Math.min(.085,48/width));
      // Story gates cannot be bypassed through screen transitions.
      if(exit && !(panel===11&&direction==="right"&&!forceFieldRemoved) && !(panel===16&&direction==="right"&&!doorOpen) &&
          Math.abs(coordinate-exit[1])<=tolerance &&
          panels.has(exit[0])){
        const previousPanel=panel;
        panel=exit[0];
        if(panel===18&&previousPanel!==18)resetMaze();
        if(direction==="right") hero.x=edgeX+.012;
        if(direction==="left") hero.x=1-edgeX-.012;
        if(direction==="bottom") hero.y=edgeY+.012;
        if(direction==="top") hero.y=1-edgeY-.012;
        // Align with the center of the connecting path on entry.
        if(direction==="right"||direction==="left") hero.y=exit[1];
        else hero.x=exit[1];
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
    if(!dialogOpen&&!caught)move(dx*hero.speed*dt,dy*hero.speed*dt);
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
