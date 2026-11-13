// Team 4 foundation. Add panel exits and game objects only after receiving the team's map.
(() => {
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d'),game=document.querySelector('#game');
const questEl=document.querySelector('#quest-text'),itemsEl=document.querySelector('#items');
const layer=document.querySelector('#popup-layer'),titleEl=document.querySelector('#popup-title'),copyEl=document.querySelector('#popup-copy'),actionsEl=document.querySelector('#popup-actions');
const W=1120,H=720,keys=new Set(),hero={x:W/2,y:H/2,speed:215};
let last=performance.now(),panel=1,elapsed=0;
let treehouseIntro=true;const roomHero={x:50,y:57};
const inventory=new Set(),flags=new Set();
const panels=Array.from({length:25},(_,i)=>({id:i+1,exits:{},objects:[]}));
const quest={started:false,emeralds:0,gateKey:false,gateOpen:false};
const passage=(a,side,b,at=360)=>{panels[a-1].exits[side]={to:b,at,halfWidth:90}};
passage(1,'east',2);passage(2,'west',1);passage(2,'east',3);passage(3,'west',2);
// Only the first village route is enabled until the remaining map is built.
const housePositions=[[210,230],[410,230],[610,230],[310,520],[570,520]];
const house=(x,y,index)=>({
 id:'house'+index,name:'Village House',x,y,w:112,h:113,shape:'polygon',points:[[-56,-25],[0,-75],[56,-25],[47,-25],[47,43],[-47,43],[-47,-25]],solid:true,reach:125,
 description:'A little village house with a wooden door.',
 draw(ctx){drawHouse(ctx,x,y)},
 actions:[{label:'OPEN',primary:true,run:()=>{
  if(!quest.started){copyEl.textContent='A cozy room with shelves and a small chest.';actionsEl.replaceChildren();return}
  if(flags.has('emerald'+index)){copyEl.textContent='You already searched this house.';actionsEl.replaceChildren();return}
  flags.add('emerald'+index);quest.emeralds++;for(const name of [...inventory])if(name.endsWith(' / 5 Emeralds'))removeItem(name);addItem(quest.emeralds+' / 5 Emeralds');
  copyEl.textContent='You search the house and find an emerald!';actionsEl.replaceChildren();
  setQuest(quest.emeralds<5?'Find 5 Emeralds ('+quest.emeralds+'/5)':'Bring 5 Emeralds to the Villager');
 }}]
});
panels[1].objects.push(...housePositions.map(([x,y],i)=>house(x,y,i+1)));
panels[1].objects.push({
 id:'villager',name:'Villager',kind:'npc',x:855,y:470,w:38,h:68,shape:'polygon',points:[[-13,-29],[13,-29],[17,25],[10,36],[-10,36],[-17,25]],reach:100,
 description:'A villager waiting near the houses.',
 dialogue:'Can you search the houses and bring me five emeralds? I will give you the gate key.',
 draw(ctx){drawVillager(ctx,this.x,this.y)},
 actions:[{label:'TALK',primary:true,run:()=>{
  if(quest.gateKey){copyEl.textContent='Good luck on your adventure!';return}
  if(!quest.started){quest.started=true;setQuest('Find 5 Emeralds (0/5)');copyEl.textContent='Please find five emeralds hidden in the village houses.';return}
  if(quest.emeralds<5){copyEl.textContent='You have '+quest.emeralds+' of the five emeralds.';return}
  quest.gateKey=true;for(const name of [...inventory])if(name.endsWith(' / 5 Emeralds'))removeItem(name);addItem('Gate Key');setQuest('Unlock the Village Gate');copyEl.textContent='Thank you! Here is the key to the gate.';
 }}]
});
panels[1].objects.push({
 id:'gate',name:'Village Gate',x:1085,y:360,w:40,h:125,solid:true,reach:115,
 description:'A locked wooden gate blocks the way east.',
 visible:true,draw(ctx){if(!quest.gateOpen)drawGate(ctx,this.x,this.y)},
 actions:[{label:'OPEN',primary:true,run:()=>{
 if(!quest.gateKey){copyEl.textContent='The gate is locked. A villager might have the key.';return}
 quest.gateOpen=true;this.solid=false;this.removed=true;removeItem('Gate Key');setQuest('Explore Beyond the Village');closePopup();
 }}]
});
function drawTreehouse(){
 const x=340,y=230;
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#72503a';ctx.beginPath();ctx.ellipse(0,92,65,20,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#825331';ctx.fillRect(-19,-4,38,108);
 ctx.fillStyle='#4b8a51';for(const [dx,dy,r] of [[-70,-52,66],[0,-100,84],[75,-55,65]]){ctx.beginPath();ctx.arc(dx,dy,r,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#c2935c';ctx.fillRect(-55,-36,110,85);
 ctx.fillStyle='#8a5437';ctx.beginPath();ctx.moveTo(-67,-37);ctx.lineTo(0,-91);ctx.lineTo(67,-37);ctx.closePath();ctx.fill();
 ctx.fillStyle='#6c452c';ctx.fillRect(-13,5,26,44);ctx.fillStyle='#b6dfdf';ctx.fillRect(20,-19,22,24);
 ctx.strokeStyle='#8b603d';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-18,45);ctx.lineTo(-18,116);ctx.moveTo(18,45);ctx.lineTo(18,116);for(let yy=60;yy<116;yy+=17){ctx.moveTo(-18,yy);ctx.lineTo(18,yy)}ctx.stroke();ctx.restore();
}
function drawHouse(ctx,x,y){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#9b744d';ctx.fillRect(-43,-23,86,67);
 ctx.fillStyle='#f4d9a4';ctx.fillRect(-38,-18,76,58);
 ctx.fillStyle='#8e4936';ctx.beginPath();ctx.moveTo(-53,-24);ctx.lineTo(0,-65);ctx.lineTo(53,-24);ctx.closePath();ctx.fill();
 ctx.fillStyle='#79543c';ctx.fillRect(-11,8,22,32);ctx.fillStyle='#e4b967';ctx.fillRect(6,23,4,4);
 ctx.fillStyle='#7cbdcf';ctx.fillRect(-30,-5,15,17);ctx.fillRect(15,-5,15,17);ctx.restore();
}
function drawVillager(ctx,x,y){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#2e5c8c';ctx.fillRect(-13,-4,26,29);
 ctx.fillStyle='#e9b788';ctx.beginPath();ctx.arc(0,-16,13,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#6a4932';ctx.fillRect(-12,-29,24,8);ctx.fillStyle='#4b392b';ctx.fillRect(-9,24,7,13);ctx.fillRect(3,24,7,13);ctx.restore();
}
function drawGate(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#6c4931';ctx.fillRect(-19,-68,10,136);ctx.fillRect(9,-68,10,136);for(let j=-55;j<55;j+=21){ctx.fillStyle='#a8774a';ctx.fillRect(-17,j,34,13)}ctx.restore()}
function drawPath(){
 // Only draw the confirmed village route; do not draw through map dead ends.
 if(panel>3)return;
 ctx.fillStyle='#668657';ctx.fillRect(0,325,W,70);
 ctx.strokeStyle='#7e9c66';ctx.lineWidth=2;for(let x=12;x<W;x+=53){ctx.beginPath();ctx.moveTo(x,343);ctx.lineTo(x+12,347);ctx.stroke()}
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resize(){const rect=game.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0)}
new ResizeObserver(resize).observe(game);resize();
function setQuest(value=''){questEl.textContent=value}
function updateInventory(){itemsEl.textContent=[...inventory].join(' · ')||'Empty'}
function addItem(name){inventory.add(name);updateInventory()}
function removeItem(name){inventory.delete(name);updateInventory()}
function closePopup(){layer.classList.remove('open');actionsEl.replaceChildren();keys.clear()}
document.querySelector('#popup-close').addEventListener('click',()=>{if(!treehouseIntro)closePopup()});
layer.addEventListener('pointerdown',e=>{if(e.target===layer&&!treehouseIntro)closePopup()});
function openPopup(object){
 if(!object||object.removed||object.visible===false)return;
 titleEl.textContent=object.name||'';
 copyEl.textContent='';
 actionsEl.replaceChildren();
 const options=[{label:'EXAMINE',primary:false,run:()=>{copyEl.textContent=object.description||''}}];
 if(object.kind==='npc'&&object.dialogue)options.push({label:'TALK',primary:true,run:()=>{copyEl.textContent=object.dialogue}});
 for(const action of object.actions||[])if(!action.available||action.available({inventory,flags,panel}))options.push(action);
 for(const option of options){const b=document.createElement('button');b.textContent=option.label;b.className=option.primary?'primary':'';b.addEventListener('click',()=>{option.run?.({inventory,flags,addItem,removeItem,setQuest,closePopup});updateInventory()});actionsEl.appendChild(b)}
 layer.classList.add('open');keys.clear();
}
// Objects are registered per panel later. Each object's shape defines its visible silhouette,
// proximity glow, hit testing, and optional collision. No invisible objects are interactive.
function visibleObjects(){return panels[panel-1].objects.filter(o=>o.visible!==false&&!o.removed)}
function shapePath(o){const x=o.x,y=o.y,w=o.w||48,h=o.h||48;ctx.beginPath();if(o.shape==='ellipse')ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2);else if(o.shape==='polygon'&&o.points?.length){o.points.forEach(([px,py],i)=>i?ctx.lineTo(x+px,y+py):ctx.moveTo(x+px,y+py));ctx.closePath()}else ctx.roundRect(x-w/2,y-h/2,w,h,o.radius||4)}
function nearby(o){const dx=Math.max(0,Math.abs(hero.x-o.x)-(o.w||0)/2),dy=Math.max(0,Math.abs(hero.y-o.y)-(o.h||0)/2);return Math.hypot(dx,dy)<(o.reach||85)}
function drawGrass(){
 ctx.fillStyle='#9ecb87';ctx.fillRect(0,0,W,H);
 // Deterministic grass and flowers: same locations on every redraw and resize.
 let seed=(panel*1973+17)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<760;i++){const x=random()*W,y=random()*H;ctx.strokeStyle=random()>.5?'#7eb46f':'#b5d99b';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x-2,y-2);ctx.moveTo(x,y+3);ctx.lineTo(x+2,y-3);ctx.stroke()}
 for(let i=0;i<24;i++){const x=18+random()*(W-36),y=18+random()*(H-36);ctx.fillStyle=random()>.5?'#fff4d2':'#f9e4f1';for(let p=0;p<5;p++){const a=p*Math.PI*2/5;ctx.beginPath();ctx.arc(x+Math.cos(a)*3,y+Math.sin(a)*3,2.2,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#e8bb58';ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill()}
}
function drawHero(c=ctx,x=hero.x,y=hero.y){
 c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';
 c.fillStyle='#0003';c.beginPath();c.ellipse(0,25,18,6,0,0,Math.PI*2);c.fill();
 c.strokeStyle='#334155';c.lineWidth=7;c.beginPath();c.moveTo(-6,7);c.lineTo(-8,19);c.moveTo(6,7);c.lineTo(8,19);c.stroke();
 c.strokeStyle='#252525';c.lineWidth=5;c.beginPath();c.moveTo(-9,20);c.lineTo(-3,20);c.moveTo(5,20);c.lineTo(11,20);c.stroke();
 c.fillStyle='#386a9b';c.beginPath();c.roundRect(-11,2,22,11,4);c.fill();
 c.strokeStyle='#efbd91';c.lineWidth=6;c.beginPath();c.moveTo(-10,-10);c.lineTo(-15,2);c.moveTo(10,-10);c.lineTo(15,2);c.stroke();
 c.fillStyle='#5b9a68';c.beginPath();c.roundRect(-12,-16,24,22,6);c.fill();
 c.fillStyle='#efbd91';c.fillRect(-4,-20,8,7);c.beginPath();c.arc(0,-27,11,0,Math.PI*2);c.fill();
 c.fillStyle='#49372e';c.beginPath();c.arc(0,-30,11,Math.PI,Math.PI*2);c.lineTo(10,-27);c.quadraticCurveTo(0,-34,-10,-27);c.fill();
 c.fillStyle='#27342f';for(const x of [-4,4]){c.beginPath();c.arc(x,-27,1.1,0,Math.PI*2);c.fill()}
 c.strokeStyle='#9b5947';c.lineWidth=1.4;c.beginPath();c.arc(0,-24,3.5,.2,Math.PI-.2);c.stroke();c.restore();
}
function draw(){
 drawGrass();drawPath();
 if(panel===1)drawTreehouse();
 for(const o of visibleObjects()){o.draw?.(ctx);if(nearby(o)){ctx.save();shapePath(o);ctx.strokeStyle='rgba(48,196,94,'+(0.65+0.3*Math.sin(elapsed*5))+')';ctx.lineWidth=4;ctx.shadowColor='#6af08c';ctx.shadowBlur=15;ctx.stroke();ctx.restore()}}
 drawHero();
}
function blocked(x,y){for(const o of visibleObjects()){if(!o.solid)continue;ctx.save();shapePath(o);const hit=[[0,0],[-12,-12],[12,-12],[-12,12],[12,12]].some(([dx,dy])=>ctx.isPointInPath(x+dx,y+dy));ctx.restore();if(hit)return true}return false}
function tryExit(x,y){
 const exits=panels[panel-1].exits;
 const side=x<22?'west':x>W-22?'east':y<42?'north':y>H-22?'south':null;
 if(!side)return false;
 const exit=exits[side];if(!exit||exit.to<1||exit.to>25)return false;
 if(panel===2&&side==='east'&&!quest.gateOpen)return false;
 const axis=(side==='west'||side==='east')?y:x;
 if(Math.abs(axis-exit.at)>(exit.halfWidth||48))return false;
 panel=exit.to;
 hero.x=side==='west'?W-28:side==='east'?28:clamp(x,22,W-22);
 hero.y=side==='north'?H-28:side==='south'?48:clamp(y,42,H-22);
 return true;
}
function tick(now){
 const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;
 if(treehouseIntro){
 const rx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
 const ry=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
 roomHero.x=clamp(roomHero.x+rx*dt*25,33,76);roomHero.y=clamp(roomHero.y+ry*dt*30,32,76);
 const el=document.querySelector('#room-hero');el.style.left=roomHero.x+'%';el.style.top=roomHero.y+'%';
 }else if(!layer.classList.contains('open')){
 let dx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
 let dy=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
 if(dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2}
 const x=hero.x+dx*hero.speed*dt,y=hero.y+dy*hero.speed*dt;
 if(tryExit(x,hero.y)){}else if(!blocked(clamp(x,22,W-22),hero.y))hero.x=clamp(x,22,W-22);
 if(tryExit(hero.x,y)){}else if(!blocked(hero.x,clamp(y,42,H-22)))hero.y=clamp(y,42,H-22);
 }
 draw();requestAnimationFrame(tick);
}
window.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(key.startsWith('Arrow'))e.preventDefault();if(key==='Escape'&&!treehouseIntro)closePopup();else keys.add(key)});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('pointerdown',e=>{
 if(layer.classList.contains('open')||treehouseIntro)return;
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
 // Click must hit the actual object shape AND the player must be nearby.
 for(const o of visibleObjects().slice().reverse()){if(!nearby(o))continue;shapePath(o);if(ctx.isPointInPath(x,y)){openPopup(o);break}}
});
setQuest('Explore Village');updateInventory();requestAnimationFrame(tick);
function showTreehouse(){
 treehouseIntro=true;
 const scene=document.querySelector('#treehouse-scene');
 scene.hidden=false;
 const hc=document.querySelector('#room-hero'),hctx=hc.getContext('2d');hctx.clearRect(0,0,100,130);hctx.setTransform(1.6,0,0,1.6,50,83);drawHero(hctx,0,0);
 document.querySelector('#treehouse-door').addEventListener('click',()=>{
  treehouseIntro=false;scene.hidden=true;hero.x=340;hero.y=390;keys.clear();
 },{once:true});
}
showTreehouse();
// Internal foundation API for later student-designed content.
window.team4={panels,hero,inventory,flags,setQuest,addItem,removeItem,openPopup,closePopup,get panel(){return panel}};
})();