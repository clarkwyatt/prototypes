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
    1: [["T",.16,.20],["H",.78,.19],["H",.18,.78],["B",.82,.78],["HOME",.50,.43]],
    2: [["T",.17,.24],["H",.70,.20],["B",.35,.46],["H",.18,.77],["H",.68,.69]],
    6: [["T",.14,.19],["T",.87,.19],["H",.78,.30],["B",.15,.77],["H",.83,.79]],
    7: [["T",.26,.23],["H",.75,.22],["H",.25,.72],["B",.69,.66]],
    11: [["B",.14,.22],["B",.48,.73]],
    12: [["LAKE",.48,.29],["H",.88,.80]],
    16: [["B",.52,.86]],
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
      path([[.45,0],[.45,.52],[.45,1]],Math.min(width,height)*.14,"#b89e79");
      path([[.45,.52],[1,.52]],Math.min(width,height)*.10,"#b89e79");
    }
    if ([11,16,21].includes(panel)) {
      path([[.45,0],[.47,.32],[.40,.65],[.46,1]],Math.min(width,height)*.17,"#b89e79");
    }
    if (panel===11) path([[.45,.38],[.63,.48],[1,.76]],Math.min(width,height)*.13,"#b89e79");
    if (panel===12) path([[0,.76],[.50,.78],[1,.82]],Math.min(width,height)*.13,"#b89e79");
    if (panel===16) path([[.44,.46],[.70,.47],[1,.50]],Math.min(width,height)*.14,"#b89e79");
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
      }
    }
    if(panel===11) {
      // Force field on the eastward route, not yet unlockable.
      shape(width*.77,height*.61,width*.025,height*.30,"#69c9d9");
      shape(width*.76,height*.61,width*.045,height*.30,"rgba(95,224,240,.25)");
    }
  }
  function drawHero() {
    // Simple friendly placeholder hero, drawn directly in the game file.
    ctx.save();
    ctx.translate(hero.x, hero.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.ellipse(0, 25, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs and shoes
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-6, 7); ctx.lineTo(-8, 19);
    ctx.moveTo(6, 7); ctx.lineTo(8, 19);
    ctx.stroke();
    ctx.strokeStyle = "#252525";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-9, 20); ctx.lineTo(-3, 20);
    ctx.moveTo(5, 20); ctx.lineTo(11, 20);
    ctx.stroke();

    // Shorts
    ctx.fillStyle = "#386a9b";
    ctx.beginPath();
    ctx.roundRect(-11, 2, 22, 11, 4);
    ctx.fill();

    // Arms
    ctx.strokeStyle = "#efbd91";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(-15, 2);
    ctx.moveTo(10, -10); ctx.lineTo(15, 2);
    ctx.stroke();

    // T-shirt
    ctx.fillStyle = "#5b9a68";
    ctx.beginPath();
    ctx.roundRect(-12, -16, 24, 22, 6);
    ctx.fill();

    // Neck and head
    ctx.fillStyle = "#efbd91";
    ctx.fillRect(-4, -20, 8, 7);
    ctx.beginPath();
    ctx.arc(0, -27, 11, 0, Math.PI * 2);
    ctx.fill();

    // Hair and face
    ctx.fillStyle = "#49372e";
    ctx.beginPath();
    ctx.arc(0, -30, 11, Math.PI, Math.PI * 2);
    ctx.lineTo(10, -27); ctx.quadraticCurveTo(0, -34, -10, -27);
    ctx.fill();
    ctx.fillStyle = "#27342f";
    ctx.beginPath();
    ctx.arc(-4, -27, 1.1, 0, Math.PI * 2);
    ctx.arc(4, -27, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9b5947";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -24, 3.5, .2, Math.PI - .2);
    ctx.stroke();

    ctx.restore();
  }

  function draw() {
    scenery();
    ctx.save();
    // The original hero art is authored in pixels.
    const x=hero.x*width,y=hero.y*height;
    ctx.translate(x,y);
    const savedX=hero.x,savedY=hero.y;
    hero.x=0;hero.y=0;
    drawHero();
    hero.x=savedX;hero.y=savedY;
    ctx.restore();
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
    if(panel===11 && x>.75 && y>.60 && y<.93) return true;
    return false;
  }
  function move(dx,dy) {
    const nx=hero.x+dx/width,ny=hero.y+dy/height;
    let next=panel;
    if(nx<0) next=panel-1;
    else if(nx>1) next=panel+1;
    else if(ny<0) next=panel-5;
    else if(ny>1) next=panel+5;
    if(next!==panel) {
      if(panels.has(next) && (Math.abs(next-panel)===5 || Math.floor((next-1)/5)===Math.floor((panel-1)/5))) {
        panel=next;
        hero.x=nx<0?.97:nx>1?.03:nx;
        hero.y=ny<0?.95:ny>1?.05:ny;
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
    move(dx*hero.speed*dt,dy*hero.speed*dt);
    draw();requestAnimationFrame(update);
  }
  addEventListener("resize",resize);
  addEventListener("keydown",e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys.add(k);if(k.startsWith("Arrow"))e.preventDefault();});
  addEventListener("keyup",e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  addEventListener("blur",()=>keys.clear());
  resize();requestAnimationFrame(update);
})();
