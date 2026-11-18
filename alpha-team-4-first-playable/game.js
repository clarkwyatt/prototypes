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
let facing='south',swingUntil=0,lastSwing=-1,heroHP=100,lastHeroHit=-1,knockedOut=false;
let activeHouse=0,houseExitPosition=null,interiorHouse=0;
let treehouseIntro=true;const roomHero={x:50,y:48};
// Interior art coordinates use percentages of the full room image.
const treehouseDoorShape='polygon(8% 100%,8% 30%,12% 20%,19% 10%,29% 3%,50% 0%,71% 3%,81% 10%,88% 20%,92% 30%,92% 100%)';
const treehouseDoorBounds={left:39, right:61, top:65, bottom:100};
function treehouseDoorNearby(){return Math.abs(roomHero.x-50)<17&&roomHero.y>=49&&roomHero.y<=67;}
function treehouseFloorBlocked(x,y){
 // Room movement is expressed in percentages of the INNER .treehouse-room
 // (the same coordinate space as the painted image and the room hero).
 // These are the boy's floor-contact coordinates, not screen/canvas pixels.
 if(interiorHouse===5){
  // House 5 cartographer's study. All positions are percentages of the
  // displayed inner room image; fy is the boy's floor-contact position.
  const fy=y+4;
  if(x<5||x>95||fy<16||fy>91)return true;
  if(fy<29)return true; // rear wall and mounted bookcases
  // Left bookcase, map drawers, ladder and scroll storage.
  if(x<25&&fy<62)return true;
  if(x<24&&fy>57&&fy<83)return true; // chests and stacked crates
  // Desk beneath the window, stool and writing supplies.
  if(x>39&&x<72&&fy>34&&fy<55)return true;
  if(x>49&&x<60&&fy>47&&fy<59)return true; // stool
  // Tall locked wardrobe and right-hand scroll shelves.
  if(x>72&&fy<59)return true;
  // Map table, books, globe and lower-right crates.
  if(x>76&&fy>54&&fy<83)return true;
  if(x>39&&x<61&&fy>72)return true; // painted foreground door
  return false;
 }
 if(interiorHouse===4){
  // House 4 carpenter's workshop: percentages of the inner room artwork.
  // Collision follows floor-contact (feet), not the sprite center.
  const fy=y+4;
  if(x<5||x>95||fy<16||fy>91)return true;
  if(fy<29)return true; // back wall, window and mounted tools
  // Workbench, timber barrel, tools and stool along the left.
  if(x<44&&fy>31&&fy<65)return true;
  if(x<16&&fy>62&&fy<82)return true; // lower-left wooden crate
  // Chopping stump, axe and upright boards beneath the window.
  if(x>45&&x<60&&fy>38&&fy<60)return true;
  // Drawers and locked storage cupboard along the right wall.
  if(x>63&&fy>30&&fy<62)return true;
  // Two stacked crates along the right edge.
  if(x>82&&fy>53&&fy<83)return true;
  // Keep the foreground doorway solid while leaving both rugs walkable.
  if(x>39&&x<61&&fy>72)return true;
  return false;
 }
 if(interiorHouse===3){
  // House 3 apothecary: coordinates are percentages of the displayed room,
  // and fy tracks the character's feet rather than the sprite center.
  const fy=y+4;
  if(x<5||x>95||fy<17||fy>91)return true;
  if(fy<28)return true; // rear wall, shelves and window
  if(x<28&&fy<62)return true; // left potion shelves and drawers
  if(x<24&&fy>58&&fy<83)return true; // left chest, crate and sack
  if(x>28&&x<72&&fy>33&&fy<52)return true; // apothecary workbench
  if(x>72&&fy<62)return true; // right-hand drawer cabinet and barrel
  if(x>76&&fy>59&&fy<85)return true; // herb crate and mushroom box
  if(x>39&&x<61&&fy>72)return true; // foreground exit door
  return false;
 }
 if(interiorHouse===2){
  // House 2 study: room-relative percentages, using the boy's feet.
  const fy=y+4;
  if(x<5||x>95||fy<16||fy>91)return true;
  if(fy<29)return true;
  if(x<17&&fy<69)return true; // globe, drawers, plants and bookcase
  if(x>17&&x<39&&fy>35&&fy<65)return true; // desk, chair and lamp
  if(x>39&&x<64&&fy<48)return true; // window cabinet
  if(x>64&&x<80&&fy<55)return true; // tall cabinet and drawers
  if(x>80&&fy<58)return true; // right-hand cabinets
  if(x>79&&fy>55&&fy<78)return true; // emerald chest and scroll crate
  if(x>91&&fy>77)return true; // lower-right books and planter
  if(x<13&&fy>79)return true; // lower-left planter
  if(x>39&&x<61&&fy>72)return true; // painted exit door
  return false;
 }
 if(interiorHouse===1){
  const fy=y+4; // the sprite is centered at y; its feet extend below that
  if(x<5||x>95||fy<13||fy>91)return true;
  // Top wall and mounted shelving, with open floor beneath.
  if(fy<24)return true;
  // Locker and hanging rope at left; stay out of the painted cabinet.
  if(x<24&&fy<55)return true;
  // Table, stools and fruit bowl: close fitting footprint.
  if(x>21&&x<47&&fy>39&&fy<59)return true;
  // Main chest, baskets, barrel and bed on the right.
  if(x>49&&x<62&&fy>36&&fy<51)return true;
  if(x>63&&x<77&&fy>34&&fy<49)return true;
  if(x>75&&fy>39&&fy<72)return true;
  // Lower left storage chest and coil of rope.
  if(x<22&&fy>63&&fy<84)return true;
  // Lower right basket and crate.
  if(x>76&&fy>67&&fy<86)return true;
  // Solid painted exit door, while allowing approach from the rug.
  if(x>39&&x<61&&fy>72)return true;
  return false;
 }
 // Preserve the other rooms until their art is mapped individually.
 if(x<29||x>79||y<31||y>76)return true;
 if(interiorHouse){
  if(x>39&&x<61&&y>64)return true;
  return false;
 }
 if(x>treehouseDoorBounds.left&&x<treehouseDoorBounds.right&&y>65)return true;
 if(x<43&&y>35&&y<64)return true;
 if(x>69&&y>31&&y<69)return true;
 return false;
}
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
// Global path tolerance: generous transition openings for art-width variations.
const PATH_EXIT_HALF_WIDTH=90;
connect(1,'east',H/2,PATH_EXIT_HALF_WIDTH);
connect(2,'east',H/2,PATH_EXIT_HALF_WIDTH,()=>quest.gateOpen);
// Exact student-approved routes. Register each seam once; connect() makes it reciprocal.
// Unlisted panels have no paths.
const mapLinks=[
 [3,'south'],  // 3 ↔ 8
 [8,'east'],   // 8 ↔ 9
 [8,'south'],  // 8 ↔ 13
 [9,'south'],  // 9 ↔ 14
 [13,'east'],  // 13 ↔ 14
 [13,'south'], // 13 ↔ 18
 [14,'east'],  // 14 ↔ 15
 [15,'south'], // 15 ↔ 20
 [16,'east'],  // 16 ↔ 17
 [16,'south'], // 16 ↔ 21
 [17,'east'],  // 17 ↔ 18
 [21,'east'],  // 21 ↔ 22
 [22,'east'],  // 22 ↔ 23
 [23,'east'],  // 23 ↔ 24
 [24,'east']   // 24 ↔ 25
];
for(const [id,side] of mapLinks)connect(id,side,side==='north'||side==='south'?W/2:H/2,PATH_EXIT_HALF_WIDTH);

// Panel 1 art: the treehouse doorway is part of the painted background.
// Keep its interactive outline separate from the image and never repaint it.
const DOOR_REACH=48;
const treehouseDoorOutline=new Path2D('M -54 70 L -54 -15 Q -54 -64 0 -64 Q 54 -64 54 -15 L 54 70 Z');
panels[0].objects.push({
 id:'treehouseDoor',name:'Treehouse Door',x:270,y:181,
 outline:treehouseDoorOutline,reach:DOOR_REACH,solid:false,
 description:'The doorway back into the treehouse.',
 draw(){},
 actions:[{label:'ENTER',primary:true,run:()=>{closePopup();showTreehouse()}}]
});
// Collision polygons trace the permanent treehouse, roots, rocks and forest edges.
// Doorway remains a clickable hotspot; solid scenery never draws over the artwork.
// Panel 1: only the elevated treehouse structure is solid. The complete
// winding dirt path and every stepping stone remain walkable.
// Obstacles traced from the approved 1632x960 Panel 1 artwork, scaled to W/H.
// Keep the central winding trail, stepping stones and treehouse steps walkable.
function insideEllipse(x,y,cx,cy,rx,ry){return ((x-cx)/rx)**2+((y-cy)/ry)**2<1}
function panelOneBlocked(x,y){
 const edge=26;
 if(x<edge||y<edge||y>H-edge)return true;
 if(x>W-edge&&Math.abs(y-H/2)>PATH_EXIT_HALF_WIDTH-14)return true;
 // Treehouse walls, supporting trunk and roots, excluding the steps.
 if(x<205&&y<360)return true;
 if(insideEllipse(x,y,110,365,105,62))return true;
 if(insideEllipse(x,y,465,305,115,92))return true; // broad right-hand roots
 // Fallen log and large rune stones in the forest.
 if(insideEllipse(x,y,697,275,88,36))return true;
 if(insideEllipse(x,y,566,208,54,58))return true;
 if(insideEllipse(x,y,855,225,52,80))return true;
 if(insideEllipse(x,y,922,490,55,86))return true;
 // Dense shrubs and rock clusters along the lower edge.
 if(insideEllipse(x,y,247,575,65,48))return true;
 if(insideEllipse(x,y,470,604,38,37))return true;
 if(insideEllipse(x,y,845,680,75,43))return true;
 return false;
}
const housePositions=[[210,230],[410,230],[610,230],[310,520],[570,520]];
// Measured from approved Panel 2 art, converted from 1632x960 to 1120x720 canvas.
const houseDoorPositions=[[190,221],[438,221],[665,221],[229,547],[600,547]];
// These local outlines are shared by the art, green glow, clicks, and collision.
const houseOutline=new Path2D('M -53 -24 L 0 -65 L 53 -24 H 43 V 44 H -43 V -24 Z');
const villagerOutline=new Path2D('M -12 -29 H 12 V -21 C 17 -11 8 -4 6 -4 H 13 V 25 H 10 V 37 H 3 V 25 H -2 V 37 H -9 V 25 H -13 V -4 H -6 C -8 -4 -17 -11 -12 -21 Z');
// The gate is painted at the northeast bend of the approved Panel 2 art.
// Its silhouette includes the two posts and arched double doors.
const gateOutline=new Path2D('M -91 68 L -91 -59 L -79 -75 L -63 -75 L -54 -60 Q 0 -112 54 -60 L 63 -75 L 79 -75 L 91 -59 L 91 68 Z');
const house=(x,y,index)=>({
 id:'house'+index,name:'Village House',x:houseDoorPositions[index-1][0],y:houseDoorPositions[index-1][1],
 outline:new Path2D('M -19 29 L -19 -17 Q -19 -38 0 -38 Q 19 -38 19 -17 L 19 29 Z'),solid:false,reach:DOOR_REACH,
 description:'A village house. Inside is a chest that may contain an emerald.',
 draw(ctx){if(!panelTwoArtReady())drawHouse(ctx,x,y)},
 actions:[{label:'OPEN',primary:true,run:()=>enterHouse(index)}],
 emeraldAction:[{label:'SEARCH',primary:true,available:()=>!flags.has('emerald'+index),run:()=>{
  if(!quest.started){copyEl.textContent='A cozy room with shelves and a small chest.';actionsEl.replaceChildren();return}
  flags.add('emerald'+index);quest.emeralds++;for(const name of [...inventory])if(name.endsWith(' / 5 Emeralds'))removeItem(name);addItem(quest.emeralds+' / 5 Emeralds');
  copyEl.textContent='You search the house and find an emerald!';actionsEl.replaceChildren();
  setQuest(quest.emeralds<5?'Find 5 Emeralds ('+quest.emeralds+'/5)':'Bring 5 Emeralds to the Villager');
 }}]
});
panels[1].objects.push(...housePositions.map(([x,y],i)=>house(x,y,i+1)));
panels[1].objects.push({
 id:'villager',name:'Villager',kind:'npc',x:855,y:470,outline:villagerOutline,reach:100,
 description:'A villager who needs five emeralds from the houses.',
 dialogue:'Can you open the chest in each house and bring me five emeralds? I will give you the gate key.',
 draw(ctx){drawVillager(ctx,this.x,this.y)},
 actions:[{label:'TALK',primary:true,run:()=>{
  if(quest.gateKey||quest.gateOpen){copyEl.textContent='Good luck on your adventure!';return}
  if(!quest.started){quest.started=true;setQuest('Find 5 Emeralds (0/5)');copyEl.textContent='Please open the chest in each of the five houses to find an emerald.';return}
  if(quest.emeralds<5){copyEl.textContent='You have '+quest.emeralds+' of the five emeralds.';return}
  quest.gateKey=true;for(const name of [...inventory])if(name.endsWith(' / 5 Emeralds'))removeItem(name);addItem('Gate Key');setQuest('Unlock the Village Gate');copyEl.textContent='Thank you! Here is the key to the gate.';
 }}]
});
panels[1].objects.push({
 id:'gate',name:'Village Gate',x:982,y:266,outline:gateOutline,solid:true,reach:90,isVisible:()=>!quest.gateOpen,
 description:'A locked wooden gate blocks the way east.',
 draw(ctx){/* Gate is already painted into the locked/unlocked background. */},
 actions:[{label:'OPEN',primary:true,run:()=>{
 if(!quest.gateKey){copyEl.textContent='The gate is locked. A villager might have the key.';return}
 quest.gateOpen=true;quest.gateKey=false;removeItem('Gate Key');setQuest('Explore Beyond the Village');closePopup();
 }}]
});
// Step 3: simple interactive unicorn in Panel 3. Art polish comes later.
const unicornOutline=new Path2D('M -39 -13 L -30 -32 L -12 -38 L 4 -34 L 16 -46 L 26 -44 L 32 -32 L 43 -25 L 43 -10 L 25 -5 L 22 24 L 14 24 L 9 0 L -14 0 L -18 24 L -27 24 L -30 -2 Z');
function drawUnicorn(ctx,x,y){
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#fff8f4';ctx.fill(unicornOutline);
 ctx.fillStyle='#e4b5ed';ctx.beginPath();ctx.moveTo(15,-43);ctx.lineTo(25,-68);ctx.lineTo(28,-41);ctx.fill();
 ctx.fillStyle='#e6c04b';ctx.beginPath();ctx.moveTo(25,-45);ctx.lineTo(32,-69);ctx.lineTo(35,-43);ctx.fill();
 ctx.fillStyle='#c68bdb';ctx.beginPath();ctx.ellipse(-31,-16,16,9,-.5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#394454';ctx.beginPath();ctx.arc(31,-29,2.5,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
panels[2].objects.push({
 id:'unicorn',name:'Unicorn',kind:'npc',x:775,y:490,outline:unicornOutline,reach:100,
 description:'A beautiful unicorn stands beside the path.',
 dialogue:'Be careful, young traveler. Monsters roam beyond the village. You should not explore without a weapon. I have heard of a sword hidden deep in the forest.',
 draw(ctx){drawUnicorn(ctx,this.x,this.y)},
 actions:[{label:'TALK',primary:true,run:()=>{
  flags.add('unicornWarning');
  setQuest('Find the Sword');
  copyEl.textContent='Be careful, young traveler. Monsters roam beyond the village. You should not explore without a weapon. I have heard of a sword hidden deep in the forest.';
 }}]
});
// Step 4 foundation: find and equip the sword; combat will be added later.
const swordOutline=new Path2D('M -7 -51 L 0 -69 L 7 -51 L 7 5 L 22 5 L 22 14 L 5 14 L 5 31 L -5 31 L -5 14 L -22 14 L -22 5 L -7 5 Z');
function drawSword(ctx,x,y){
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#cbd9e0';ctx.fill(swordOutline);
 ctx.fillStyle='#89b7d0';ctx.fillRect(-3,-48,6,52);
 ctx.fillStyle='#8c663a';ctx.fillRect(-19,6,38,7);ctx.fillRect(-4,13,8,17);
 ctx.fillStyle='#e4c565';ctx.beginPath();ctx.arc(0,30,6,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
// The unicorn reappears at the sword once it has been equipped.
panels[14].objects.push({
 id:'returningUnicorn',name:'Unicorn',kind:'npc',x:390,y:480,
 outline:unicornOutline,reach:110,
 description:'The unicorn has appeared beside you.',
 isVisible:()=>flags.has('swordEquipped'),
 draw(ctx){drawUnicorn(ctx,this.x,this.y)},
 actions:[{label:'TALK',primary:true,run:()=>{
  flags.add('armorWarning');
  setQuest('Find Leather Armor');
  copyEl.textContent='Well done finding the sword! But beware: there is a goblin camp nearby. You had better look for some armor along the way before facing those goblins.';
 }}]
});
panels[14].objects.push({
 id:'forestSword',name:'Sword',x:790,y:450,outline:swordOutline,reach:95,
 description:'A sturdy sword rests on the ground. It looks ready for an adventurer.',
 isVisible:()=>!flags.has('swordEquipped'),
 draw(ctx){drawSword(ctx,this.x,this.y)},
 actions:[{label:'EQUIP',primary:true,run:()=>{
  if(flags.has('swordEquipped'))return;
  flags.add('swordEquipped');
  addItem('Sword (Equipped)');
  setQuest('Find Leather Armor');
  closePopup();
  // Show the returning unicorn immediately, without waiting for a panel transition.
  const visitor=panels[14].objects.find(o=>o.id==='returningUnicorn');
  if(visitor){
   activeObject=visitor;
   titleEl.textContent='Unicorn';
   showDialogueCard('Well done finding the sword! But beware: there is a goblin camp nearby. You had better look for some armor along the way before facing those goblins.');
   flags.add('armorWarning');
  }
 }}]
});
// Leather armor pickups appear after the sword is equipped.
// Keep these small and away from the center paths until the art pass.
const armorPieces=[
 {panel:14,name:'Breastplate',x:295,y:220},
 {panel:13,name:'Helm',x:825,y:220},
 {panel:18,name:'Gauntlets',x:820,y:215},
 {panel:17,name:'Greaves',x:815,y:215},
 {panel:16,name:'Boots',x:300,y:215}
];
const armorOutline=new Path2D('M -19 -17 H 19 V 17 H -19 Z');
function drawArmorPickup(ctx,x,y,name){
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#7b5434';ctx.strokeStyle='#d6a46c';ctx.lineWidth=3;
 if(name==='Helm'){
  ctx.beginPath();ctx.arc(0,0,18,Math.PI,Math.PI*2);ctx.lineTo(18,13);ctx.lineTo(7,13);ctx.lineTo(7,2);ctx.lineTo(-7,2);ctx.lineTo(-7,13);ctx.lineTo(-18,13);ctx.closePath();ctx.fill();ctx.stroke();
 }else if(name==='Breastplate'){
  ctx.beginPath();ctx.moveTo(-17,-18);ctx.lineTo(-8,-23);ctx.lineTo(8,-23);ctx.lineTo(17,-18);ctx.lineTo(22,-7);ctx.lineTo(12,-2);ctx.lineTo(11,22);ctx.lineTo(-11,22);ctx.lineTo(-12,-2);ctx.lineTo(-22,-7);ctx.closePath();ctx.fill();ctx.stroke();
 }else{
  const offset=name==='Gauntlets'?14:12;
  for(const side of [-1,1]){
   ctx.fillRect(side*offset-9,-18,18,35);ctx.strokeRect(side*offset-9,-18,18,35);
  }
 }
 ctx.restore();
}
for(const piece of armorPieces){
 panels[piece.panel-1].objects.push({
  id:'armor'+piece.name,name:'Leather '+piece.name,x:piece.x,y:piece.y,
  outline:armorOutline,reach:105,
  description:'A piece of leather armor left behind on the forest floor.',
  isVisible:()=>flags.has('swordEquipped')&&!flags.has('equipped'+piece.name),
  draw(ctx){drawArmorPickup(ctx,this.x,this.y,piece.name)},
  actions:[{label:'EQUIP',primary:true,run:()=>{
   if(flags.has('equipped'+piece.name))return;
   flags.add('equipped'+piece.name);
   updateEquipment();
   const count=armorPieces.filter(p=>flags.has('equipped'+p.name)).length;
   setQuest(count===armorPieces.length?'Explore the Goblin Camp':'Find Leather Armor ('+count+'/5)');
   closePopup();
  }}]
 });
}
// Step 5: lightweight combat prototype; goblins only live in the camp.
const goblins=[
 {x:300,y:235,hp:50,lastAttack:-1},{x:820,y:235,hp:50,lastAttack:-1},
 {x:790,y:560,hp:50,lastAttack:-1}
];
function drawGoblins(){
 if(panel!==21)return;
 for(const g of goblins){
  ctx.save();ctx.translate(g.x,g.y);
  if(g.hp<=0){ctx.fillStyle='#526744';ctx.beginPath();ctx.ellipse(0,8,24,10,0,0,Math.PI*2);ctx.fill();ctx.restore();continue}
  ctx.fillStyle='#658b42';ctx.beginPath();ctx.ellipse(0,0,18,24,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-12,-16);ctx.lineTo(-24,-30);ctx.lineTo(-5,-22);ctx.moveTo(12,-16);ctx.lineTo(24,-30);ctx.lineTo(5,-22);ctx.fill();
  ctx.fillStyle='#222';ctx.fillRect(-9,-8,4,4);ctx.fillRect(5,-8,4,4);
  ctx.fillStyle='#4a322c';ctx.fillRect(-22,-40,44,5);
  ctx.fillStyle='#b94e45';ctx.fillRect(-22,-40,44*(g.hp/50),5);
  ctx.restore();
 }
}
function drawCombatHUD(){
 if(panel!==21)return;
 ctx.save();ctx.fillStyle='#fff8e9';ctx.fillRect(18,100,155,33);
 ctx.fillStyle='#294a38';ctx.font='bold 14px sans-serif';ctx.fillText('HP '+heroHP+'/100',27,121);ctx.restore();
}
function drawSwing(){
 if(!flags.has('swordEquipped')||elapsed>swingUntil)return;
 const v={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]}[facing];
 ctx.save();ctx.strokeStyle='#e9f6ff';ctx.lineWidth=8;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(hero.x+v[0]*17,hero.y+v[1]*17);
 ctx.lineTo(hero.x+v[0]*65,hero.y+v[1]*65);ctx.stroke();ctx.restore();
}
function swingSword(){
 if(treehouseIntro||activeObject||knockedOut||!flags.has('swordEquipped')||elapsed-lastSwing<.35)return;
 lastSwing=elapsed;swingUntil=elapsed+.2;
 if(panel!==21)return;
 const v={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]}[facing];
 for(const g of goblins){
  if(g.hp<=0)continue;
  const dx=g.x-hero.x,dy=g.y-hero.y;
  const forward=dx*v[0]+dy*v[1],sideways=Math.abs(dx*v[1]-dy*v[0]);
  if(forward<0||forward>95||sideways>36)continue;
  g.hp=Math.max(0,g.hp-10);
  g.x=clamp(g.x+v[0]*25,35,W-35);
  g.y=clamp(g.y+v[1]*25,65,H-35);
 }
}
function knockout(){
 knockedOut=true;keys.clear();
 activeObject={id:'knockout'};
 titleEl.textContent='You Got Knocked Out!';
 copyEl.textContent='';
 actionsEl.replaceChildren();
 const retry=document.createElement('button');retry.type='button';retry.className='primary';retry.textContent='TRY AGAIN';
 retry.addEventListener('click',()=>{
  knockedOut=false;heroHP=100;panel=16;hero.x=W/2;hero.y=H/2;
  for(const g of goblins)g.lastAttack=-1;
  closePopup();
 });
 actionsEl.appendChild(retry);layer.hidden=false;retry.focus();
}
function updateGoblins(dt){
 if(panel!==21||knockedOut||activeObject)return;
 for(const g of goblins){
  if(g.hp<=0)continue;
  const dx=hero.x-g.x,dy=hero.y-g.y,d=Math.hypot(dx,dy);
  if(d>190)returnGoblinIdle(g);
  else if(d>43){
   const step=Math.min(75*dt,d-43);
   g.x=clamp(g.x+dx/d*step,25,W-25);
   g.y=clamp(g.y+dy/d*step,60,H-25);
  }else if(elapsed-g.lastAttack>=1.05&&elapsed-lastHeroHit>=.55){
   g.lastAttack=elapsed;lastHeroHit=elapsed;heroHP=Math.max(0,heroHP-10);
   if(heroHP===0){knockout();return}
  }
 }
}
function returnGoblinIdle(g){} // Goblins wait until the boy approaches.
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
 // Paths are terrain and must be drawn even when a gate temporarily locks travel.
 const open=Object.entries(exits);
 if(!open.length)return;
 ctx.save();ctx.fillStyle='#668657';ctx.strokeStyle='#7e9c66';ctx.lineWidth=2;
 const centerX=W/2,centerY=H/2,half=49;
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
function updateEquipment(){
 for(const part of ['Helm','Breastplate','Gauntlets','Greaves','Boots']){
  const shape=document.querySelector('[data-armor="'+part+'"]');
  if(!shape)continue;
  const equipped=flags.has('equipped'+part);
  shape.classList.toggle('equipped',equipped);
  shape.querySelector('title').textContent=part+': '+(equipped?'equipped':'not equipped');
 }
}
function updateInventory(){itemsEl.textContent=[...inventory].filter(item=>!/^Leather (Breastplate|Helm|Gauntlets|Greaves|Boots) \(Equipped\)$/.test(item)).join(' · ')||'Empty';updateEquipment()}
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
// Match A Village Tale: action choices are replaced by the dialogue card's close button.
function showDialogueCard(message){
 copyEl.textContent=message;
 actionsEl.replaceChildren();
 const done=document.createElement('button');
 done.type='button';done.className='primary';done.textContent='Got it!';
 done.addEventListener('click',closePopup);
 actionsEl.appendChild(done);
 layer.hidden=false;
 done.focus();
}
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
   const selected=activeObject;
   option.run?.(state);
   updateInventory();
   // Once an action displays dialogue, hide EXAMINE/TALK and show only Got it!
   if(activeObject===selected&&!layer.hidden&&copyEl.textContent.trim()){
    showDialogueCard(copyEl.textContent);
   }
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
// Global proximity rule: highlights and clicks require standing near the object.
const nearby=o=>hitsOutline(o,hero.x,hero.y,Math.min(o.reach??48,55));
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
const houseInteriorArt=Array.from({length:5},(_,i)=>{
 const image=new Image();image.src='./art/team4_house_0'+(i+1)+'_interior.webp';return image;
});
const interiorExit={x:W/2,y:H-108,width:70,height:75};
const interiorExitOutline=new Path2D('M -35 35 V -15 Q -35 -40 0 -40 Q 35 -40 35 -15 V 35 Z');
const interiorNear=(x,y)=>Math.hypot(hero.x-x,hero.y-y)<=85;
function enterHouse(index){
 houseExitPosition={x:houseDoorPositions[index-1][0],y:houseDoorPositions[index-1][1]+70};
 interiorHouse=index;roomHero.x=50;roomHero.y=46;keys.clear();
 showTreehouse();
}
function collectHouseEmerald(){
 if(!quest.started||!interiorHouse||flags.has('emerald'+interiorHouse))return;
 flags.add('emerald'+interiorHouse);quest.emeralds++;
 for(const name of [...inventory])if(name.endsWith(' / 5 Emeralds'))removeItem(name);
 addItem(quest.emeralds+' / 5 Emeralds');
 setQuest(quest.emeralds<5?'Find 5 Emeralds ('+quest.emeralds+'/5)':'Bring 5 Emeralds to the Villager');
}
function exitHouse(){
 const destination=houseExitPosition;
 interiorHouse=0;activeHouse=0;treehouseIntro=false;
 document.querySelector('#treehouse-scene').hidden=true;
 placeHeroSafely(destination.x,destination.y);keys.clear();canvas.focus({preventScroll:true});
}
function drawHouseInterior(){
 const image=houseInteriorArt[activeHouse-1];
 if(image.complete&&image.naturalWidth)ctx.drawImage(image,0,0,W,H);
 else{ctx.fillStyle='#d2ae7d';ctx.fillRect(0,0,W,H)}
 // Door highlight is attached to the interaction zone, not painted onto the art.
 if(Math.hypot(hero.x-interiorExit.x,hero.y-interiorExit.y)<95){
  ctx.save();ctx.strokeStyle='rgba(48,196,94,'+(0.65+0.3*Math.sin(elapsed*5))+')';
  ctx.lineWidth=4;ctx.shadowColor='#6af08c';ctx.shadowBlur=14;
  ctx.save();ctx.translate(interiorExit.x,interiorExit.y);ctx.stroke(interiorExitOutline);ctx.restore();
  ctx.restore();
 }
 // Temporary center-room search zone until individual interior objects are mapped.
 if(quest.started&&!flags.has('emerald'+activeHouse)&&Math.hypot(hero.x-W/2,hero.y-H/2)<95){
  ctx.save();ctx.strokeStyle='#40d777';ctx.lineWidth=4;ctx.strokeRect(W/2-50,H/2-45,100,90);ctx.restore();
 }
 drawHero();
}
function houseBlocked(x,y){
 // Keep the character in the room and out of the painted door at the bottom.
 if(x<65||x>W-65||y<105||y>H-150)return true;
 // Keep the player in front of the exit, never on top of its painted door.
 if(x>interiorExit.x-65&&x<interiorExit.x+65&&y>interiorExit.y-95)return true;
 return false;
}
const panelOneArt=new Image();
panelOneArt.src='./art/team4_panel_01.webp';
const panelTwoLockedArt=new Image(),panelTwoUnlockedArt=new Image();
panelTwoLockedArt.src='./art/team4_panel_02_locked.webp';
panelTwoUnlockedArt.src='./art/team4_panel_02_unlocked.webp';
const panelTwoArtReady=()=>{
 const art=quest.gateOpen?panelTwoUnlockedArt:panelTwoLockedArt;
 return art.complete&&art.naturalWidth>0;
};
function draw(){
 if(activeHouse){drawHouseInterior();return}
 if(panel===1&&panelOneArt.complete&&panelOneArt.naturalWidth){
  ctx.drawImage(panelOneArt,0,0,W,H);
 }else if(panel===2&&panelTwoArtReady()){
  ctx.drawImage(quest.gateOpen?panelTwoUnlockedArt:panelTwoLockedArt,0,0,W,H);
 }else{
  drawGrass();drawPath();
  if(panel===1)drawTreehouse();
 }
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
 drawGoblins();drawHero();drawSwing();drawCombatHUD();
}
function panelTwoBlocked(x,y){
 const margin=26,opening=Math.abs(y-H/2)<=PATH_EXIT_HALF_WIDTH-14;
 if(y<margin||y>H-margin)return true;
 if((x<margin||x>W-margin)&&!opening)return true;
 // Houses and scenery measured from the approved Panel 2 image.
 // House entrances remain approachable from the path and clearings.
 const buildings=[
  [178,179,96,94],[433,178,97,97],[665,179,96,94],
  [226,483,115,110],[606,484,113,110]
 ];
 for(const [cx,cy,rx,ry] of buildings){
  if(x>cx-rx&&x<cx+rx&&y>cy-ry&&y<cy+ry)return true;
 }
 // Fence segments, large boulders and substantial tree trunks.
 const ellipses=[
  [43,241,49,44],[804,229,48,44],[840,286,42,43],
  [1065,405,45,48],[410,673,43,34],
  [1074,540,54,110],[1006,680,115,65],
  [737,546,45,72],[366,438,40,55],[105,642,75,54]
 ];
 if(ellipses.some(([cx,cy,rx,ry])=>insideEllipse(x,y,cx,cy,rx,ry)))return true;
 // Wooden fence beside the top-right houses and between lower homes.
 if(x>744&&x<807&&y>231&&y<263)return true;
 if(x>325&&x<391&&y>504&&y<550)return true;
 if(x>686&&x<788&&y>506&&y<549)return true;
 // Locked gate's real painted position, not the old right-edge placeholder.
 if(!quest.gateOpen&&hitsOutline({x:982,y:266,outline:gateOutline},x,y,0))return true;
 return false;
}
function blocked(x,y){
 const radius=12;
 const sample=[[0,0],[-radius,0],[radius,0],[0,-radius],[0,radius]];
 return sample.some(([dx,dy])=>
  (panel===1&&panelOneBlocked(x+dx,y+dy))||
  (panel===2&&panelTwoBlocked(x+dx,y+dy))||
  visibleObjects().some(o=>o.solid&&hitsOutline(o,x+dx,y+dy,0))
 );
}
// Global spawn safety: no transition or doorway may place the hero inside
// collision. Search nearby walkable ground before accepting a spawn.
function safeSpawn(x,y){
 const valid=(px,py)=>px>=bounds.left+14&&px<=bounds.right-14&&py>=bounds.top+14&&py<=bounds.bottom-14&&!blocked(px,py);
 if(valid(x,y))return {x,y};
 for(let radius=16;radius<=260;radius+=16){
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12){
   const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius;
   if(valid(px,py))return {x:px,y:py};
  }
 }
 return {x:W/2,y:H/2};
}
function placeHeroSafely(x,y){const p=safeSpawn(x,y);hero.x=p.x;hero.y=p.y;}
function tryExit(side,axis){
 const exit=panels[panel-1].exits[side];
 if(!exit||Math.abs(axis-exit.at)>exit.halfWidth||!exit.canExit())return false;
 panel=exit.to;
 if(side==='west')hero.x=bounds.right-6;
 if(side==='east')hero.x=bounds.left+6;
 if(side==='north')hero.y=bounds.bottom-6;
 if(side==='south')hero.y=bounds.top+6;
 placeHeroSafely(hero.x,hero.y);
 return true;
}
function moveHero(dx,dy){
 if(activeHouse){
  if(!houseBlocked(hero.x+dx,hero.y))hero.x+=dx;
  if(!houseBlocked(hero.x,hero.y+dy))hero.y+=dy;
  return;
 }
 const x=hero.x+dx,y=hero.y+dy;
 if(dx&&(x<=bounds.left&&dx<0?tryExit('west',hero.y):x>=bounds.right&&dx>0&&tryExit('east',hero.y)))return;
 const nextX=clamp(x,bounds.left,bounds.right);
 if(!blocked(nextX,hero.y))hero.x=nextX;
 if(dy&&(y<=bounds.top&&dy<0?tryExit('north',hero.x):y>=bounds.bottom&&dy>0&&tryExit('south',hero.x)))return;
 const nextY=clamp(y,bounds.top,bounds.bottom);
 if(!blocked(hero.x,nextY))hero.y=nextY;
}
function tick(now){
 const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;
 if(treehouseIntro){
 const rx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
 const ry=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
 const nx=roomHero.x+(activeObject?0:rx)*dt*25,ny=roomHero.y+(activeObject?0:ry)*dt*30;
 if(!treehouseFloorBlocked(nx,roomHero.y))roomHero.x=nx;
 if(!treehouseFloorBlocked(roomHero.x,ny))roomHero.y=ny;
 window.updateTeam4RoomDoor?.();
 updateTreehouseFeatures(document.querySelector('.treehouse-room'));
 const el=document.querySelector('#room-hero');el.style.left=roomHero.x+'%';el.style.top=roomHero.y+'%';
 }else if(!activeObject){
 let dx=Number(keys.has('ArrowRight')||keys.has('d'))-Number(keys.has('ArrowLeft')||keys.has('a'));
 let dy=Number(keys.has('ArrowDown')||keys.has('s'))-Number(keys.has('ArrowUp')||keys.has('w'));
 if(dx&&dy){dx*=Math.SQRT1_2;dy*=Math.SQRT1_2}
 if(Math.abs(dx)>Math.abs(dy))facing=dx>0?'east':'west';
 else if(dy)facing=dy>0?'south':'north';
 moveHero(dx*hero.speed*dt,dy*hero.speed*dt);
 updateGoblins(dt);
 }
 draw();requestAnimationFrame(tick);
}
window.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(key.startsWith('Arrow'))e.preventDefault();if(key==='Escape'&&activeObject){e.preventDefault();closePopup()}else keys.add(key)});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(e.button===2){e.preventDefault();swingSword()}});
canvas.addEventListener('click',e=>{
 if(activeObject||treehouseIntro)return;
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
 // Click must hit the actual object shape AND the player must be nearby.
 if(activeHouse){
  if(Math.abs(x-W/2)<110&&Math.abs(y-H/2)<90&&Math.hypot(hero.x-x,hero.y-y)<95)collectHouseEmerald();
  if(Math.abs(x-interiorExit.x)<interiorExit.width/2&&Math.abs(y-interiorExit.y)<interiorExit.height/2&&Math.hypot(hero.x-x,hero.y-y)<95)exitHouse();
  return;
 }
 const object=visibleObjects().reverse().find(o=>hitsOutline(o,x,y));
 if(object?.id?.startsWith('house')&&nearby(object)){
  enterHouse(Number(object.id.slice(5)));return;
 }
 if(object?.id==='treehouseDoor'&&nearby(object)){
  showTreehouse();return;
 }
 if(object)openPopup(object);
});

// Development-only navigation: bypass quests without changing inventory or world progress.
const debugPanel=document.querySelector('#debug-panel');
for(let id=1;id<=panels.length;id++){
 const option=document.createElement('option');
 option.value=String(id);option.textContent='Panel '+id;
 debugPanel.appendChild(option);
}
debugPanel.value=String(panel);
document.querySelector('#debug-go').addEventListener('click',()=>{
 const target=Number(debugPanel.value);
 activeHouse=0;interiorHouse=0;
 if(!Number.isInteger(target)||target<1||target>panels.length)return;
 if(activeObject)closePopup();
 treehouseIntro=false;
 document.querySelector('#treehouse-scene').hidden=true;
 
 panel=target;
 // Start at a walkable location rather than inside scenery.
 const positions=[[W/2,H/2],[W/2,460],[W/2,300],[W/2,580],[W/2,180]];
 const safe=positions.find(([x,y])=>!blocked(x,y));
 if(safe){hero.x=safe[0];hero.y=safe[1]}else{hero.x=W/2;hero.y=H/2}
 keys.clear();
 canvas.focus({preventScroll:true});
});

setQuest('Explore Village');updateInventory();requestAnimationFrame(tick);
// Interior interactables use the same EXAMINE -> Got it! dialogue treatment.
const treehouseFeatures=[
 {name:'Old Oak Table',x:25,y:43,w:19,h:19,shape:'ellipse(48% 45% at 50% 50%)',text:'The old oak table bears the scratches of a hundred suppers and a thousand imagined adventures. Even the smallest crumbs seem to hold a story.'},
 {name:'Cozy Bed',x:70,y:34,w:19,h:29,shape:'polygon(14% 0%,84% 0%,100% 16%,100% 90%,84% 100%,4% 100%,0% 15%)',text:'A quilt as blue as the evening sky lies neatly tucked beneath a soft pillow. Many heroic quests have begun here, though most ended with five more minutes of sleep.'},
 {name:'Sunlit Window',x:43,y:12,w:17,h:19,shape:'inset(0 round 9%)',text:'Sunlight spills through the window, turning the leaves outside into flecks of gold. Somewhere beyond these branches, the wide world is waiting.'},
 {name:'Books and Potions',x:67,y:13,w:21,h:13,shape:'polygon(0 28%,100% 28%,100% 100%,0 100%)',text:'Dusty volumes sit beside bottles of shimmering blue. One book is titled The Curious Art of Finding Trouble. Its pages look suspiciously well-read.'},
 {name:'Travel Chest',x:8,y:65,w:14,h:18,shape:'polygon(8% 0%,92% 0%,100% 16%,100% 100%,0 100%,0 16%)',text:'An old wooden chest, its brass corners dulled by time. It once carried treasures from distant places; now it guards memories worth even more.'},
 {name:'Woven Rug',x:42,y:43,w:20,h:20,shape:'ellipse(49% 48% at 50% 50%)',text:'A handwoven rug patterned like a tiny woodland kingdom. As a child, you imagined its winding vines were roads to places no map could name.'}
];
// Per-house inspectable scenery. Positions are percentages of each interior image.
const houseFeatures={
 1:[
  {name:'Captain’s Locker',x:13,y:21,w:20,h:31,shape:'polygon(0 0,100% 0,100% 96%,8% 100%,0 94%)',text:'The blue locker smells faintly of salt and adventure. A faded mark inside reads: Every great voyage begins with a brave first step.'},
  {name:'Sailor’s Table',x:27,y:48,w:20,h:14,shape:'polygon(5% 10%,95% 10%,100% 80%,90% 100%,10% 100%,0 80%)',text:'A sturdy table laden with a lantern and a bowl of bright red fruit. Someone has been planning a voyage here—or perhaps just a very hearty breakfast.'},
  {name:'Treasure Chest',x:50,y:39,w:13,h:14,shape:'inset(0 round 13%)',text:'Iron bands hold this chest shut. Its worn lock has weathered more storms than most sailors, and it seems unwilling to surrender its secrets.'},
  {name:'Sea View Window',x:43,y:11,w:17,h:23,shape:'inset(0 round 7%)',text:'Beyond the glass, white sails and distant cliffs shimmer beneath a clear sky. The horizon seems to whisper that the world is much bigger than this room.'},
  {name:'Captain’s Bed',x:76,y:42,w:22,h:28,shape:'polygon(15% 0,100% 0,100% 100%,0 100%,0 30%)',text:'A neatly made bunk, its blue blanket embroidered with curling waves. A sailor could dream of faraway shores here without ever leaving the harbor.'},
  {name:'Anchor Rug',x:33,y:54,w:35,h:19,shape:'inset(0 round 12%)',text:'A proud golden anchor decorates this well-traveled rug. Even adventurers need something to keep their feet on the ground.'}
 ],
 2:[{name:'Village Keepsakes',x:12,y:24,w:19,h:25,shape:'inset(0 round 12%)',text:'Small treasures collected over many seasons. Each one carries a story that its owner has promised never to forget.'},{name:'Family Table',x:30,y:44,w:22,h:20,shape:'ellipse(48% 45% at 50% 50%)',text:'The polished tabletop bears the gentle marks of shared meals, laughter, and a few spectacularly spilled soups.'},{name:'Restful Bed',x:73,y:39,w:22,h:29,shape:'inset(0 round 15%)',text:'A welcoming bed tucked into the quiet corner. Its soft covers make even the bravest explorer consider an afternoon nap.'}],
 3:[{name:'Village Keepsakes',x:12,y:24,w:19,h:25,shape:'inset(0 round 12%)',text:'A curious assortment of little heirlooms, each waiting patiently for someone to ask where it came from.'},{name:'Family Table',x:30,y:44,w:22,h:20,shape:'ellipse(48% 45% at 50% 50%)',text:'There is something magical about a table where friends gather. The wood seems to remember every tale told across it.'},{name:'Restful Bed',x:73,y:39,w:22,h:29,shape:'inset(0 round 15%)',text:'A cozy place to rest after a long day. Perhaps tomorrow will bring the adventure its owner has been dreaming of.'}],
 4:[{name:'Village Keepsakes',x:12,y:24,w:19,h:25,shape:'inset(0 round 12%)',text:'Carefully arranged mementos from journeys near and far. One almost seems to hum with a forgotten melody.'},{name:'Family Table',x:30,y:44,w:22,h:20,shape:'ellipse(48% 45% at 50% 50%)',text:'An inviting place for supper and stories. The best tales always seem to grow a little grander by candlelight.'},{name:'Restful Bed',x:73,y:39,w:22,h:29,shape:'inset(0 round 15%)',text:'A peaceful corner, ready for dreams of secret passages and enchanted forests.'}],
 5:[{name:'Village Keepsakes',x:12,y:24,w:19,h:25,shape:'inset(0 round 12%)',text:'These well-loved possessions have traveled through generations, carrying more memories than any map could hold.'},{name:'Family Table',x:30,y:44,w:22,h:20,shape:'ellipse(48% 45% at 50% 50%)',text:'The table has seen birthdays, celebrations, and a hundred ordinary days made wonderful by good company.'},{name:'Restful Bed',x:73,y:39,w:22,h:29,shape:'inset(0 round 15%)',text:'A soft quilt promises a good night’s sleep—and perhaps a dream about tomorrow’s great adventure.'}]
};
// Each village house has one chest. These are separate clickable storage objects,
// with one emerald each; the collected state persists after leaving the house.
for(let i=2;i<=5;i++){
 houseFeatures[i].push({
  name:'Treasure Chest',x:i===2?82:54,y:i===2?55:32,w:13,h:i===2?21:13,
  shape:'inset(0 round 13%)',
  text:'A small wooden chest with a brass latch.'
 });
}
houseFeatures[1].find(f=>f.name==='Treasure Chest').text='A sturdy wooden chest with iron bands and a worn brass latch.';
function currentInteriorFeatures(){
 // Selective highlights: doors handled separately, quest storage first.
 const features=interiorHouse?(houseFeatures[interiorHouse]||[]):treehouseFeatures;
 if(!interiorHouse)return features.filter(f=>['Travel Chest','Books and Potions'].includes(f.name));
 if(interiorHouse===1)return features.filter(f=>['Treasure Chest','Captain’s Locker'].includes(f.name));
 return features.filter(f=>f.name==='Treasure Chest');
}
function isEmeraldStorage(feature){
 return interiorHouse>0&&feature.name==='Treasure Chest';
}
function showInteriorDescription(feature){
 if(activeObject)return;
 let description=feature.text;
 if(isEmeraldStorage(feature)&&quest.started){
  if(!flags.has('emerald'+interiorHouse)){
   collectHouseEmerald();
   description+=' Inside the chest, you find one sparkling emerald and add it to your inventory.';
  }else{
   description+=' The chest is empty. You already collected its emerald.';
  }
 }
 activeObject={name:feature.name};titleEl.textContent=feature.name;
 showDialogueCard(description);
}
function updateTreehouseFeatures(room){
 for(const feature of currentInteriorFeatures()){
  const el=room.querySelector('[data-room-feature="'+feature.name+'"]');if(!el)continue;
  const cx=feature.x+feature.w/2,cy=feature.y+feature.h/2;
  const close=Math.hypot((roomHero.x-cx)*1.25,roomHero.y-cy)<17;
  el.style.pointerEvents=close?'auto':'none';
  el.style.opacity=close?String(.78+.22*Math.sin(elapsed*5)):'0';
 }
}
function showTreehouse(){
 treehouseIntro=true;
 const scene=document.querySelector('#treehouse-scene');
 scene.hidden=false;
 // Build the art layer from fresh game.js so even a stale Google Sites HTML
 // embed cannot keep showing the old CSS-drawn room.
 const room=scene.querySelector('.treehouse-room');
 roomHero.x=50;roomHero.y=interiorHouse?56:48;
 room.style.background='#9d794f';
 room.style.setProperty('--unused-room-art','none');
 let art=room.querySelector('.treehouse-art');
 if(!art){art=document.createElement('img');art.className='treehouse-art';art.alt='';room.prepend(art)}
 Object.assign(art.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'fill',display:'block',pointerEvents:'none',zIndex:'1'});
 art.src=interiorHouse?'./art/team4_house_0'+interiorHouse+'_interior.webp':'./art/team4_treehouse_interior.webp?v='+Date.now();
 for(const selector of ['.room-window','.room-bed','.room-table','.room-rug']){
  const old=room.querySelector(selector);if(old)old.style.display='none';
 }
 for(const feature of [...treehouseFeatures,...Object.values(houseFeatures).flat()]){
  let el=room.querySelector('[data-room-feature="'+feature.name+'"]');
  if(!el){
   el=document.createElement('button');el.type='button';el.dataset.roomFeature=feature.name;
   el.setAttribute('aria-label','Examine '+feature.name);
   Object.assign(el.style,{position:'absolute',zIndex:'9',padding:'0',background:'transparent',border:'3px solid #40e477',boxShadow:'0 0 8px #40e477',cursor:'pointer',transition:'opacity .12s'});
   el.onclick=()=>{if(currentInteriorFeatures().includes(feature))showInteriorDescription(feature)};
   room.appendChild(el);
  }
  Object.assign(el.style,{left:feature.x+'%',top:feature.y+'%',width:feature.w+'%',height:feature.h+'%',clipPath:feature.shape,display:currentInteriorFeatures().includes(feature)?'block':'none'});
 }
 updateTreehouseFeatures(room);
 const door=room.querySelector('#treehouse-door');
 Object.assign(door.style,{background:'transparent',border:'0',boxShadow:'none',color:'transparent',zIndex:'3'});
 // The transparent hotspot follows the painted arched door, not a rectangular box.
 Object.assign(door.style,{left:'39%',top:'65%',bottom:'auto',width:'22%',height:'35%',transform:'none',borderRadius:'0',clipPath:'none',zIndex:'8',overflow:'visible'});
 function updateRoomDoor(){
  const close=treehouseDoorNearby();
  door.style.pointerEvents=close?'auto':'none';
  door.style.outline='none';
  door.style.boxShadow='none';
  door.style.background='transparent';
  door.style.border='0';
  door.style.filter='none';
  door.style.opacity='1';
  let outline=room.querySelector('.treehouse-door-outline');
  if(!outline){
   outline=document.createElementNS('http://www.w3.org/2000/svg','svg');
   outline.classList.add('treehouse-door-outline');
   Object.assign(outline.style,{position:'absolute',left:'39%',top:'65%',width:'22%',height:'35%',zIndex:'9',overflow:'visible',pointerEvents:'none'});
   outline.setAttribute('viewBox','0 0 100 100');
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d','M 5 100 L 5 33 C 5 -10 95 -10 95 33 L 95 100 Z');
   path.setAttribute('fill','none');path.setAttribute('stroke','#40e477');path.setAttribute('stroke-width','3');
   path.setAttribute('vector-effect','non-scaling-stroke');
   outline.appendChild(path);room.appendChild(outline);
  }
  outline.style.display=close?'block':'none';
  outline.style.opacity=String(.78+.22*Math.sin(elapsed*5));
  outline.style.filter='drop-shadow(0 0 5px #40e477)';
 }
 window.updateTeam4RoomDoor=updateRoomDoor;updateRoomDoor();
 const heroCanvas=room.querySelector('#room-hero');heroCanvas.style.zIndex='2';
 const hc=document.querySelector('#room-hero'),hctx=hc.getContext('2d');hctx.clearRect(0,0,100,130);hctx.setTransform(1.6,0,0,1.6,50,83);drawHero(hctx,0,0);
 document.querySelector('#treehouse-door').onclick=()=>{
  if(!treehouseDoorNearby())return;
  if(interiorHouse){exitHouse();return;}
  treehouseIntro=false;scene.hidden=true;placeHeroSafely(340,390);keys.clear();canvas.focus({preventScroll:true});
 };
}
showTreehouse();
// Internal foundation API for later student-designed content.
window.team4={panels,hero,inventory,flags,setQuest,addItem,removeItem,openPopup,closePopup,get panel(){return panel}};
})();
