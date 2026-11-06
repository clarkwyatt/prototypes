// Team 1 first playable: fixed-camera panels from the students' map.
// Terrain and scenery only; quests and interactions will be added later.
(() => {
  const canvas = document.querySelector("#world");
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const hero = { x: .5, y: .68, speed: 220 };
  const panels = new Set([1, 2, 6, 7, 11, 12, 16, 17, 21, 22]);
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
    22: [["H",.76,.40]]
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
  let fishQuest=false, fish=0, hasKey=false, doorOpen=false;\n  let hasPotion=false, forceFieldRemoved=false;
  const questEl=document.querySelector("#quest"),itemsEl=document.querySelector("#items");
  function updateHud(){questEl.textContent=fishQuest&&!hasKey?"• Catch five fish ("+fish+"/5)":hasKey&&!doorOpen?"• Unlock the door in Panel 16":doorOpen?"• Explore beyond the door":"• Explore the Village";itemsEl.textContent=[fish?fish+" Fish":"",hasKey?"Door Key":"",hasPotion?"Magic Potion":""].filter(Boolean).join(" · ")||"Empty";}
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
  function interact(target){\n    const type=target.type;
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
    if(type==="NPC")options.push(button("TALK",()=>{
      if(hasKey){p.textContent="Thank you for the fish! The key should open the door in Panel 16."; }
      else if(fish>=5){hasKey=true;fish=0;p.textContent="Five fish! Wonderful! Here is the iron key for the door in Panel 16.";updateHud();}
      else{fishQuest=true;p.textContent="Hello, brave kitty! Catch five fish at the dock and bring them back. I'll trade them for a key to the locked door.";updateHud();}
      p.hidden=false;actions.replaceChildren(button("OK",closeInteraction));
    }));
    if(type==="DOCK"&&fishQuest&&!hasKey)options.push(button("FISH",()=>{
      fish=Math.min(5,fish+1);p.textContent=fish===5?"You caught the fifth fish! Return to the Lake Keeper.":"You caught a shimmering lake fish! ("+fish+"/5)";updateHud();p.hidden=false;actions.replaceChildren(button("OK",closeInteraction));
    }));
    if(type==="DOOR")options.push(button("OPEN",()=>{
      if(hasKey){doorOpen=true;p.textContent="The iron key turns! The wooden door swings open.";updateHud();}
      else p.textContent="The door is locked. The Lake Keeper may know where to find a key.";
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
    if(panel===12){list.push({type:"DOCK",x:.81,y:.29,id:100});list.push({type:"NPC",x:.82,y:.68,id:102});}
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
      // Outline the crown and the exposed trunk.
      ctx.ellipse(x,y-unit*.038,unit*.093,unit*.108,0,0,Math.PI*2);
      ctx.moveTo(x-unit*.023,y+unit*.05);
      ctx.rect(x-unit*.023,y,unit*.046,unit*.11);
    }else if(t.type==="B"){
      ctx.ellipse(x,y,unit*.075,unit*.052,0,0,Math.PI*2);
    }else if(t.type==="FORCE"||t.type==="DOOR"){
      ctx.rect(x-unit*.023,y-unit*.12,unit*.046,unit*.24);
    }else if(t.type==="DOCK"){
      ctx.rect(x-unit*.09,y-unit*.035,unit*.18,unit*.07);
    }else if(t.type==="NPC"){
      ctx.ellipse(x,y-unit*.19/2,unit*.035,unit*.07,0,0,Math.PI*2);
    }else if(t.type==="LAKE"){
      ctx.ellipse(x,y,width*.38,height*.27,0,0,Math.PI*2);
    }
    ctx.stroke();ctx.restore();
  }
  function clickedTarget(target,x,y){
    const unit=Math.min(width,height);
    const dx=x-target.x*width,dy=y-target.y*height;
    switch(target.type){
      case "T": return (dx/(unit*.095))**2+((dy+unit*.038)/(unit*.108))**2<=1 ||
        (Math.abs(dx)<=unit*.023 && dy>=0 && dy<=unit*.11);
      case "B": return (dx/(unit*.075))**2+(dy/(unit*.052))**2<=1;
      case "H": case "HOME":{
        const w=unit*(target.type==="HOME"?.29:.255),h=unit*(target.type==="HOME"?.23:.205);
        return Math.abs(dx)<=w*.52 && dy>=-h*.47 && dy<=h*.55;
      }
      case "LAKE": return (dx/(width*.38))**2+(dy/(height*.27))**2<=1;
      case "DOCK": return Math.abs(dx)<=unit*.09 && Math.abs(dy)<=unit*.07;
      case "NPC": return Math.abs(dx)<=unit*.04 && dy>=-unit*.12 && dy<=unit*.05;
      case "FORCE": return Math.abs(dx)<=unit*.03 && Math.abs(dy)<=unit*.12;
      case "DOOR": return Math.abs(dx)<=unit*.03 && Math.abs(dy)<=unit*.12;
      default: return false;
    }
  }
  canvas.addEventListener("click",e=>{
    if(dialogOpen)return;
    // Both conditions must hold: close enough to highlight, AND clicked on the object.
    const target=nearestTarget();
    if(!target)return;
    const bounds=canvas.getBoundingClientRect();
    const x=(e.clientX-bounds.left)*width/bounds.width;
    const y=(e.clientY-bounds.top)*height/bounds.height;
    if(clickedTarget(target,x,y))interact(target);
  });
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
    if (panel===22) path([[.36,1],[.28,.72],[.45,.57],[.78,.52]],Math.min(width,height)*.13,"#b89e79");
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
    if(panel===11) {
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
  let facing = "down", walking = false, walkTime = 0;
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
    drawHero();
    ctx.restore();
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
    if(panel===11 && !forceFieldRemoved && x>.935 && y>.64 && y<.88) return true;
    if(panel===16 && !doorOpen && x>.935 && y>.37 && y<.63) return true;
    return false;
  }
  // Every screen connection must meet a visible path at BOTH edges.
  // Positions are normalized (0..1) so the entrances match on all screen sizes.
  const exits = {
    1: {right:[2,.52],bottom:[6,.50]},
    2: {left:[1,.52],bottom:[7,.50]},
    6: {top:[1,.50],right:[7,.52],bottom:[11,.50]},
    7: {top:[2,.50],left:[6,.52]},
    11:{top:[6,.50],right:[12,.76],bottom:[16,.50]},
    12:{left:[11,.76]},
    16:{top:[11,.50],right:[17,.50],bottom:[21,.50]},
    17:{left:[16,.50]},
    21:{top:[16,.50]},
    22:{}
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
      // The force field in Panel 16 cannot be crossed.
      if(exit && !(panel===11&&direction==="right"&&!forceFieldRemoved) && !(panel===16&&direction==="right"&&!doorOpen) &&
          Math.abs(coordinate-exit[1])<=tolerance &&
          panels.has(exit[0])){
        panel=exit[0];
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
    walking = !dialogOpen && (dx !== 0 || dy !== 0);
    if (walking) {
      if (Math.abs(dx) > Math.abs(dy)) facing = dx > 0 ? "right" : "left";
      else facing = dy > 0 ? "down" : "up";
      walkTime += dt;
    }
    if(!dialogOpen)move(dx*hero.speed*dt,dy*hero.speed*dt);
    draw();requestAnimationFrame(update);
  }
  addEventListener("resize",resize);
  addEventListener("keydown",e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(k==="Escape"&&dialogOpen)closeInteraction();keys.add(k);if(k.startsWith("Arrow"))e.preventDefault();});
  addEventListener("keyup",e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  addEventListener("blur",()=>keys.clear());
  updateHud();resize();requestAnimationFrame(update);
})();
