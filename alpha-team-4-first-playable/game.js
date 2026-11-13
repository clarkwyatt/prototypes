// Team 4 foundation. Add panel exits and game objects only after receiving the team's map.
(() => {
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d'),game=document.querySelector('#game');
const questEl=document.querySelector('#quest-text'),itemsEl=document.querySelector('#items');
const layer=document.querySelector('#popup-layer'),titleEl=document.querySelector('#popup-title'),copyEl=document.querySelector('#popup-copy'),actionsEl=document.querySelector('#popup-actions');
const W=1120,H=720,keys=new Set(),hero={x:W/2,y:H/2,speed:215};
let last=performance.now(),panel=13,elapsed=0;
const inventory=new Set(),flags=new Set();
const panels=Array.from({length:25},(_,i)=>({id:i+1,exits:{},objects:[]}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resize(){const rect=game.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0)}
new ResizeObserver(resize).observe(game);resize();
function setQuest(value=''){questEl.textContent=value}
function updateInventory(){itemsEl.textContent=[...inventory].join(' · ')||'Empty'}
function addItem(name){inventory.add(name);updateInventory()}
function removeItem(name){inventory.delete(name);updateInventory()}
function closePopup(){layer.classList.remove('open');actionsEl.replaceChildren();keys.clear()}
document.querySelector('#popup-close').addEventListener('click',closePopup);
layer.addEventListener('pointerdown',e=>{if(e.target===layer)closePopup()});
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
function nearby(o){return Math.hypot(hero.x-o.x,hero.y-o.y)<(o.reach||85)}
function drawGrass(){
 ctx.fillStyle='#9ecb87';ctx.fillRect(0,0,W,H);
 // Deterministic grass and flowers: same locations on every redraw and resize.
 let seed=(panel*1973+17)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<760;i++){const x=random()*W,y=random()*H;ctx.strokeStyle=random()>.5?'#7eb46f':'#b5d99b';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x-2,y-2);ctx.moveTo(x,y+3);ctx.lineTo(x+2,y-3);ctx.stroke()}
 for(let i=0;i<24;i++){const x=18+random()*(W-36),y=18+random()*(H-36);ctx.fillStyle=random()>.5?'#fff4d2':'#f9e4f1';for(let p=0;p<5;p++){const a=p*Math.PI*2/5;ctx.beginPath();ctx.arc(x+Math.cos(a)*3,y+Math.sin(a)*3,2.2,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#e8bb58';ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill()}
}
function drawHero(){
 ctx.save();ctx.translate(hero.x,hero.y);ctx.lineCap='round';ctx.lineJoin='round';
 ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(0,25,18,6,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#334155';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-6,7);ctx.lineTo(-8,19);ctx.moveTo(6,7);ctx.lineTo(8,19);ctx.stroke();
 ctx.strokeStyle='#252525';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-9,20);ctx.lineTo(-3,20);ctx.moveTo(5,20);ctx.lineTo(11,20);ctx.stroke();
 ctx.fillStyle='#386a9b';ctx.beginPath();ctx.roundRect(-11,2,22,11,4);ctx.fill();
 ctx.strokeStyle='#efbd91';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-10,-10);ctx.lineTo(-15,2);ctx.moveTo(10,-10);ctx.lineTo(15,2);ctx.stroke();
 ctx.fillStyle='#5b9a68';ctx.beginPath();ctx.roundRect(-12,-16,24,22,6);ctx.fill();
 ctx.fillStyle='#efbd91';ctx.fillRect(-4,-20,8,7);ctx.beginPath();ctx.arc(0,-27,11,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#49372e';ctx.beginPath();ctx.arc(0,-30,11,Math.PI,Math.PI*2);ctx.lineTo(10,-27);ctx.quadraticCurveTo(0,-34,-10,-27);ctx.fill();
 ctx.fillStyle='#27342f';for(const x of [-4,4]){ctx.beginPath();ctx.arc(x,-27,1.1,0,Math.PI*2);ctx.fill()}
 ctx.strokeStyle='#9b5947';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,-24,3.5,.2,Math.PI-.2);ctx.stroke();ctx.restore();
}
function draw(){
 drawGrass();
 for(const o of visibleObjects()){o.draw?.(ctx);if(nearby(o)){ctx.save();shapePath(o);ctx.strokeStyle='rgba(48,196,94,'+(0.65+0.3*Math.sin(elapsed*5))+')';ctx.lineWidth=4;ctx.shadowColor='#6af08c';ctx.shadowBlur=15;ctx.stroke();ctx.restore()}}
 drawHero();
}
function blocked(x,y){for(const o of visibleObjects()){if(!o.solid)continue;ctx.save();shapePath(o);const hit=ctx.isPointInPath(x,y);ctx.restore();if(hit)return true}return false}
function tryExit(x,y){
 const exits=panels[panel-1].exits;
 const side=x<22?'west':x>W-22?'east':y<42?'north':y>H-22?'south':null;
 if(!side)return false;
 const exit=exits[side];if(!exit||exit.to<1||exit.to>25)return false;
 const axis=(side==='west'||side==='east')?y:x;
 if(Math.abs(axis-exit.at)>(exit.halfWidth||48))return false;
 panel=exit.to;
 hero.x=side==='west'?W-28:side==='east'?28:clamp(x,22,W-22);
 hero.y=side==='north'?H-28:side==='south'?48:clamp(y,42,H-22);
 return true;
}
function tick(now){
 const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;
 if(!layer.classList.contains('open')){
 let dx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
 let dy=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
 if(dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2}
 const x=hero.x+dx*hero.speed*dt,y=hero.y+dy*hero.speed*dt;
 if(!tryExit(x,hero.y)&&!blocked(clamp(x,22,W-22),hero.y))hero.x=clamp(x,22,W-22);
 if(!tryExit(hero.x,y)&&!blocked(hero.x,clamp(y,42,H-22)))hero.y=clamp(y,42,H-22);
 }
 draw();requestAnimationFrame(tick);
}
window.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(key.startsWith('Arrow'))e.preventDefault();if(key==='Escape')closePopup();else keys.add(key)});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('pointerdown',e=>{
 if(layer.classList.contains('open'))return;
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
 // Click must hit the actual object shape AND the player must be nearby.
 for(const o of visibleObjects().slice().reverse()){if(!nearby(o))continue;shapePath(o);if(ctx.isPointInPath(x,y)){openPopup(o);break}}
});
setQuest('');updateInventory();requestAnimationFrame(tick);
// Internal foundation API for later student-designed content.
window.team4={panels,hero,inventory,flags,setQuest,addItem,removeItem,openPopup,closePopup,get panel(){return panel}};
})();