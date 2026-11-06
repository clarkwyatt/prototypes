// Team 1 first playable: fixed-camera panels from the students' map.
// Terrain and scenery only; quests and interactions will be added later.
(() => {
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const hero = { x: .5, y: .68, speed: 220 };
  const panels = new Set([1, 2, 6, 7, 11, 12, 16, 17, 21, 22]);
  let panel = 1, width = 0, height = 0, lastTime = performance.now();
  const objects = {
    1: [["T",.19,.23],["H",.76,.14],["H",.18,.77],["B",.77,.73],["HOME",.50,.50]],
    2: [["T",.17,.24],["H",.70,.20],["B",.35,.46],["H",.18,.77],["H",.68,.69]],
    6: [["T",.16,.19],["T",.86,.20],["H",.72,.32],["B",.17,.75],["H",.83,.78]],
    7: [["T",.26,.23],["H",.75,.22],["H",.25,.72],["B",.69,.66]],
    11: [["B",.14,.22],["B",.48,.73]],
    12: [["LAKE",.48,.29],["H",.88,.80]],
    16: [["B",.52,.86]],
    17: [["T",.72,.20],["T",.29,.79],["B",.73,.81]],
    21: [["B",.22,.18],["B",.73,.53],["H",.72,.85]],
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
    shape(0,0,width,height,"#729b66");
    // Village clearings and the students' winding route through the lower panels.
    if ([1,2,7].includes(panel)) {
      path([[.50,0],[.50,.5],[.50,1]],Math.min(width,height)*.12,"#526a43");
      path([[0,.52],[.50,.52],[1,.52]],Math.min(width,height)*.10,"#526a43");
    }
    if (panel===6) {
      // One clear north-south path with a short branch toward Panel 7.
      path([[.45,0],[.45,.52],[.45,1]],Math.min(width,height)*.14,"#455b3b");
      path([[.45,.52],[1,.52]],Math.min(width,height)*.10,"#455b3b");
    }
    if ([11,16,21].includes(panel)) {
      path([[.45,0],[.47,.32],[.40,.65],[.46,1]],Math.min(width,height)*.17,"#455b3b");
    }
    if (panel===11) path([[.45,.38],[.63,.48],[1,.76]],Math.min(width,height)*.13,"#455b3b");
    if (panel===12) path([[0,.76],[.50,.78],[1,.82]],Math.min(width,height)*.13,"#455b3b");
    if (panel===16) path([[.44,.46],[.70,.47],[1,.50]],Math.min(width,height)*.14,"#455b3b");
    if (panel===17) path([[0,.50],[.48,.51],[1,.50]],Math.min(width,height)*.14,"#455b3b");
    if (panel===22) path([[.36,1],[.28,.72],[.45,.57],[.78,.52]],Math.min(width,height)*.13,"#455b3b");
    for (const [type,nx,ny] of objects[panel] || []) {
      const x=nx*width,y=ny*height,unit=Math.min(width,height);
      if(type==="T") {
        ellipse(x,y+unit*.024,unit*.066,unit*.027,"#3f6840");
        shape(x-unit*.013,y,unit*.026,unit*.07,"#77563b");
        ellipse(x,y-unit*.025,unit*.065,unit*.079,"#285333");
        ellipse(x-unit*.018,y-unit*.048,unit*.035,unit*.036,"#3c7145");
      } else if(type==="B") {
        ellipse(x,y,unit*.060,unit*.043,"#285333");
        ellipse(x-unit*.022,y-unit*.014,unit*.038,unit*.036,"#3a7041");
      } else if(type==="LAKE") {
        ellipse(x,y,width*.38,height*.27,"#4c829b");
        ellipse(x,y,width*.35,height*.24,"#508ca4");
        shape(x+width*.29,y-height*.06,width*.09,height*.12,"#94734d"); // dock
      } else {
        const big=type==="HOME", w=unit*(big?.16:.13),h=unit*(big?.14:.11);
        shape(x-w/2,y-h/2,w,h,"#b9a585");
        shape(x-w*.55,y-h*.62,w*1.1,h*.30,"#70543e");
        shape(x-w*.11,y+h*.20,w*.22,h*.30,"#554432");
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
        const r=type==="T"?.055:type==="B"?.048:type==="HOME"?.09:.075;
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
