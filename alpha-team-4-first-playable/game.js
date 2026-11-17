// Team 4 foundation. Keep the existing route and wait for the team's map before adding more.
(() => {
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d'),game=document.querySelector('#game');
const questEl=document.querySelector('#quest-text'),itemsEl=document.querySelector('#items');
const layer=document.querySelector('#popup-layer'),closeButton=document.querySelector('#popup-close'),titleEl=document.querySelector('#popup-title'),copyEl=document.querySelector('#popup-copy'),actionsEl=document.querySelector('#popup-actions');
const W=1120,H=720,keys=new Set(),hero={x:W/2,y:H/2,speed:215};
const GRID_SIZE=5;
const sides={west:[-1,0,'east'],east:[1,0,'west'],north:[0,-1,'south'],south:[0,1,'north']};
const bounds={left:22,right:W-22,top:42,bottom:H-22};
let last=performance.now(),panel=1,elapsed=0;
let treehouseIntro=true;const roomHero={x:50,y:57};
const inventory=new Set(),flags=new Set();
const panels=Array.from({length:GRID_SIZE*GRID_SIZE},(_,i)=>({
 id:i+1,row:Math.floor(i/GRID_SIZE),col:i%GRID_SIZE,exits:{},objects:[]
}));
const quest={started:false,emeralds:0,gateKey:false,gateOpen:false};
// Register both ends together so the opening and path line up across the seam.
function connect(id,side,at,halfWidth,canExit=()=>true){
 const from=panels[id-1], [dx,dy,opposite]=sides[side];
 if(!from)return;
 const col=from.col+dx,row=from.row+dy;
 if(col<0||col>=GRID_SIZE||row<0||row>=GRID_SIZE)return;
 const to=panels[row*GRID_SIZE+col];
 from.exits[side]={to:to.id,at,halfWidth,canExit};
 to.exits[opposite]={to:from.id,at,halfWidth,canExit};
}
connect(1,'east',H/2,35);
connect(2,'east',H/2,35,()=>quest.gateOpen);
// Navigation from the students' 5x5 map. Every link is bidirectional.
// Thick strokes at panel boundaries are dead ends, never exits.
// The story route is 3→8→9→14→15→14→13→18→17→16→21.
// Keep the established Panel 1 and Panel 2 exits unchanged.
const mapLinks=[
 [3,'south'],[8,'east'],[9,'south'],[9,'east'],
 [14,'east'],[13,'east'],[13,'south'],[18,'west'],
 [17,'west'],[16,'south'],
 // Other unblocked map corridors, with no gameplay content added.
 [4,'east'],[5,'south'],[6,'south'],[7,'south'],
 [9,'north'],[10,'south'],[11,'east'],[12,'south'],
 [15,'south'],[17,'south'],[18,'south'],[20,'south'],
 [21,'east'],[22,'east'],[23,'east'],[24,'east']
];
for(const [id,side] of mapLinks)connect(id,side,side==='north'||side==='south'?W/2:H/2,35);

const housePositions=[[210,230],[410,230],[610,230],[310,520],[570,520]];
// These local outlines are shared by the art, green glow, clicks, and collision.
const houseOutline=new Path2D('M -53 -24 L 0 -65 L 53 -24 H 43 V 44 H -43 V -24 Z');
const villagerOutline=new Path2D('M -12 -29 H 12 V -21 C 17 -11 8 -4 6 -4 H 13 V 25 H 10 V 37 H 3 V 25 H -2 V 37 H -9 V 25 H -13 V -4 H -6 C -8 -4 -17 -11 -12 -21 Z');
const gateOutline=new Path2D('M -19 -68 H -9 V -55 H 9 V -68 H 19 V 68 H 9 V 63 H -9 V 68 H -19 Z');
for(let y=-42;y<50;y+=21){
 gateOutline.moveTo(-9,y);gateOutline.lineTo(-9,y+8);gateOutline.lineTo(9,y+8);gateOutline.lineTo(9,y);gateOutline.closePath();
}
const house=(x,y,index)=>({
 id:'house'+index,name:'Village House',x,y,outline:houseOutline,solid:true,reach:125,
 description:'A little village house with a wooden door.',
 draw(ctx){drawHouse(ctx,x,y)},
 actions:[{label:'OPEN',primary:true,available:()=>!flags.has('emerald'+index),run:()=>{
  if(!quest.started){copyEl.textContent='A cozy room with shelves and a small chest.';actionsEl.replaceChildren();return}
  flags.add('emerald'+index);quest.emeralds++;for(const name of [...inventory])if(name.endsWith(' / 5 Emeralds'))removeItem(name);addItem(quest.emeralds+' / 5 Emeralds');
  copyEl.textContent='You search the house and find an emerald!';actionsEl.replaceChildren();
  setQuest(quest.emeralds<5?'Find 5 Emeralds ('+quest.emeralds+'/5)':'Bring 5 Emeralds to the Villager');
 }}]
});
panels[1].objects.push(...housePositions.map(([x,y],i)=>house(x,y,i+1)));
panels[1].objects.push({
 id:'villager',name:'Villager',kind:'npc',x:855,y:470,outline:villagerOutline,reach:100,
 description:'A villager waiting near the houses.',
 dialogue:'Can you search the houses and bring me five emeralds? I will give you the gate key.',
 draw(ctx){drawVillager(ctx,this.x,this.y)},
 actions:[{label:'TALK',primary:true,run:()=>{
  if(quest.gateKey||quest.gateOpen){copyEl.textContent='Good luck on your adventure!';return}
  if(!quest.started){quest.started=true;setQuest('Find 5 Emeralds (0/5)');copyEl.textContent='Please find five emeralds hidden in the village houses.';return}
  if(quest.emeralds<5){copyEl.textContent='You have '+quest.emeralds+' of the five emeralds.';return}
  quest.gateKey=true;for(const name of [...inventory])if(name.endsWith(' / 5 Emeralds'))removeItem(name);addItem('Gate Key');setQuest('Unlock the Village Gate');copyEl.textContent='Thank you! Here is the key to the gate.';
 }}]
});
panels[1].objects.push({
 id:'gate',name:'Village Gate',x:1085,y:360,outline:gateOutline,solid:true,reach:115,isVisible:()=>!quest.gateOpen,
 description:'A locked wooden gate blocks the way east.',
 draw(ctx){drawGate(ctx,this.x,this.y)},
 actions:[{label:'OPEN',primary:true,run:()=>{
 if(!quest.gateKey){copyEl.textContent='The gate is locked. A villager might have the key.';return}
 quest.gateOpen=true;quest.gateKey=false;removeItem('Gate Key');setQuest('Explore Beyond the Village');closePopup();
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
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#9b744d';ctx.fill(houseOutline);
 ctx.fillStyle='#f4d9a4';ctx.fillRect(-38,-18,76,58);
 ctx.fillStyle='#8e4936';ctx.beginPath();ctx.moveTo(-53,-24);ctx.lineTo(0,-65);ctx.lineTo(53,-24);ctx.closePath();ctx.fill();
 ctx.fillStyle='#79543c';ctx.fillRect(-11,8,22,32);ctx.fillStyle='#e4b967';ctx.fillRect(6,23,4,4);
 ctx.fillStyle='#7cbdcf';ctx.fillRect(-30,-5,15,17);ctx.fillRect(15,-5,15,17);ctx.restore();
}
function drawVillager(ctx,x,y){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#2e5c8c';ctx.fill(villagerOutline);ctx.clip(villagerOutline);
 ctx.fillStyle='#e9b788';ctx.beginPath();ctx.arc(0,-16,13,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#6a4932';ctx.fillRect(-12,-29,24,8);ctx.fillStyle='#4b392b';ctx.fillRect(-9,24,7,13);ctx.fillRect(3,24,7,13);ctx.restore();
}
function drawGate(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#6c4931';ctx.fill(gateOutline);for(let j=-55;j<55;j+=21){ctx.fillStyle='#a8774a';ctx.fillRect(-17,j,34,13)}ctx.restore()}
function drawPath(){
 const exits=panels[panel-1].exits;
 const open=Object.entries(exits).filter(([,e])=>e.canExit());
 // Show the locked gate approach even before its passage unlocks.
 if(panel===2&&exits.east&&!open.some(([side])=>side==='east'))open.push(['east',exits.east]);
 if(!open.length)return;
 ctx.save();ctx.fillStyle='#668657';ctx.strokeStyle='#7e9c66';ctx.lineWidth=2;
 const centerX=W/2,centerY=H/2,half=35;
 // The center junction connects only the directions actually open on this panel.
 for(const [side,e] of open){
  if(side==='west'||side==='east'){
   const left=side==='west'?0:centerX,right=side==='west'?centerX:W;
   ctx.fillRect(left,centerY-half,right-left,half*2);
  }else{
   const top=side==='north'?0:centerY,bottom=side==='north'?centerY:H;
   ctx.fillRect(centerX-half,top,half*2,bottom-top);
  }
 }
 // Panel 3 intentionally has only a west entrance and a south exit.
 ctx.restore();
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resize(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
}
new ResizeObserver(resize).observe(game);resize();
function setQuest(value=''){questEl.textContent=value}
function updateInventory(){itemsEl.textContent=[...inventory].join(' · ')||'Empty'}
function addItem(name){inventory.add(name);updateInventory()}
function removeItem(name){inventory.delete(name);updateInventory()}
let activeObject=null;
function closePopup(){
 if(!activeObject)return;
 activeObject=null;
 layer.hidden=true;
 actionsEl.replaceChildren();
 canvas.focus({preventScroll:true});
}
closeButton.addEventListener('click',closePopup);
layer.addEventListener('click',e=>{if(e.target===layer)closePopup()});
layer.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const buttons=[closeButton,...actionsEl.querySelectorAll('button')];
 const edge=e.shiftKey?buttons[0]:buttons.at(-1);
 if(document.activeElement===edge){
  e.preventDefault();
  (e.shiftKey?buttons.at(-1):buttons[0]).focus();
 }
});
function openPopup(object){
 if(treehouseIntro||activeObject||!visibleObjects().includes(object)||!canInteract(object)||!nearby(object))return;
 activeObject=object;
 titleEl.textContent=object.name||'';
 copyEl.textContent='';
 actionsEl.replaceChildren();
 const state={inventory,flags,panel,addItem,removeItem,setQuest,closePopup};
 const available=(object.actions||[]).filter(action=>!action.available||action.available(state));
 const options=[{label:'EXAMINE',primary:false,run:()=>{copyEl.textContent=object.description||''}}];
 if(object.kind==='npc'&&object.dialogue&&!(object.actions||[]).some(action=>action.label==='TALK')){
  options.push({label:'TALK',primary:true,run:()=>{copyEl.textContent=object.dialogue}});
 }
 options.push(...available);
 for(const option of options){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=option.label;
  button.classList.toggle('primary',Boolean(option.primary));
  button.addEventListener('click',()=>{
   option.run?.(state);
   updateInventory();
   if(activeObject&&!actionsEl.contains(button))closeButton.focus();
  });
  actionsEl.appendChild(button);
 }
 layer.hidden=false;
 closeButton.focus();
}
function visibleObjects(){
 return panels[panel-1].objects.filter(o=>o.visible!==false&&!o.removed&&o.draw&&o.outline&&(!o.isVisible||o.isVisible()));
}
const canInteract=o=>o.interactive!==false;
function hitsOutline(o,x,y,margin=0){
 const localX=x-o.x,localY=y-o.y;
 ctx.save();
 ctx.resetTransform();
 const inside=ctx.isPointInPath(o.outline,localX,localY);
 if(margin){ctx.lineWidth=2*margin;ctx.lineJoin='round';}
 const hit=inside||(margin>0&&ctx.isPointInStroke(o.outline,localX,localY));
 ctx.restore();
 return hit;
}
const nearby=o=>hitsOutline(o,hero.x,hero.y,o.reach??85);
const grass=document.createElement('canvas'),ground=grass.getContext('2d');
grass.width=W;grass.height=H;
let grassPanel=0;
function drawGrass(){
 if(grassPanel!==panel){
  grassPanel=panel;
  ground.fillStyle='#b4d6a3';ground.fillRect(0,0,W,H);
  // Each panel has a stable texture that does not shift as the player moves.
  let seed=(panel*1973+17)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<680;i++){
   const x=random()*W,y=random()*H,lean=(random()-.5)*3;
   ground.strokeStyle=random()>.5?'#a3c794':'#c1deaf';ground.lineWidth=1;
   ground.beginPath();ground.moveTo(x-2,y-2);ground.lineTo(x,y+2);ground.lineTo(x+2+lean,y-3);ground.stroke();
  }
  for(let i=0;i<14;i++){
   const x=18+random()*(W-36),y=18+random()*(H-36);
   ground.fillStyle=random()>.5?'#fff2d2':'#f5e2ed';
   ground.beginPath();
   for(let p=0;p<5;p++){
    const a=p*Math.PI*2/5,px=x+Math.cos(a)*2,py=y+Math.sin(a)*2;
    ground.moveTo(px+1.5,py);ground.arc(px,py,1.5,0,Math.PI*2);
   }
   ground.fill();ground.fillStyle='#dfb451';ground.beginPath();ground.arc(x,y,1.3,0,Math.PI*2);ground.fill();
  }
 }
 ctx.drawImage(grass,0,0);
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
 for(const o of visibleObjects()){
  o.draw(ctx);
  if(!canInteract(o)||!nearby(o))continue;
  ctx.save();
  ctx.translate(o.x,o.y);
  ctx.strokeStyle='rgba(48,196,94,'+(0.65+0.3*Math.sin(elapsed*5))+')';
  ctx.lineWidth=4;
  ctx.shadowColor='#6af08c';
  ctx.shadowBlur=15;
  ctx.stroke(o.outline);
  ctx.restore();
 }
 drawHero();
}
function blocked(x,y){return visibleObjects().some(o=>o.solid&&hitsOutline(o,x,y,12))}
function tryExit(side,axis){
 const exit=panels[panel-1].exits[side];
 if(!exit||Math.abs(axis-exit.at)>exit.halfWidth||!exit.canExit())return false;
 panel=exit.to;
 if(side==='west')hero.x=bounds.right-6;
 if(side==='east')hero.x=bounds.left+6;
 if(side==='north')hero.y=bounds.bottom-6;
 if(side==='south')hero.y=bounds.top+6;
 return true;
}
function moveHero(dx,dy){
 const x=hero.x+dx,y=hero.y+dy;
 if(dx&&(x<bounds.left?tryExit('west',hero.y):x>bounds.right&&tryExit('east',hero.y)))return;
 const nextX=clamp(x,bounds.left,bounds.right);
 if(!blocked(nextX,hero.y))hero.x=nextX;
 if(dy&&(y<bounds.top?tryExit('north',hero.x):y>bounds.bottom&&tryExit('south',hero.x)))return;
 const nextY=clamp(y,bounds.top,bounds.bottom);
 if(!blocked(hero.x,nextY))hero.y=nextY;
}
function tick(now){
 const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;
 if(treehouseIntro){
 const rx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
 const ry=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
 roomHero.x=clamp(roomHero.x+rx*dt*25,33,76);roomHero.y=clamp(roomHero.y+ry*dt*30,32,76);
 const el=document.querySelector('#room-hero');el.style.left=roomHero.x+'%';el.style.top=roomHero.y+'%';
 }else if(!activeObject){
 let dx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
 let dy=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
 if(dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2}
 moveHero(dx*hero.speed*dt,dy*hero.speed*dt);
 }
 draw();requestAnimationFrame(tick);
}
window.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(key.startsWith('Arrow'))e.preventDefault();if(key==='Escape'&&activeObject){e.preventDefault();closePopup()}else keys.add(key)});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('click',e=>{
 if(activeObject||treehouseIntro)return;
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
 // Click must hit the actual object shape AND the player must be nearby.
 const object=visibleObjects().reverse().find(o=>hitsOutline(o,x,y));
 if(object)openPopup(object);
});
setQuest('Explore Village');updateInventory();requestAnimationFrame(tick);
function showTreehouse(){
 treehouseIntro=true;
 const scene=document.querySelector('#treehouse-scene');
 scene.hidden=false;
 const hc=document.querySelector('#room-hero'),hctx=hc.getContext('2d');hctx.clearRect(0,0,100,130);hctx.setTransform(1.6,0,0,1.6,50,83);drawHero(hctx,0,0);
 document.querySelector('#treehouse-door').addEventListener('click',()=>{
  treehouseIntro=false;scene.hidden=true;hero.x=340;hero.y=390;keys.clear();canvas.focus({preventScroll:true});
 },{once:true});
}
showTreehouse();
// Internal foundation API for later student-designed content.
window.team4={panels,hero,inventory,flags,setQuest,addItem,removeItem,openPopup,closePopup,get panel(){return panel}};
})();
