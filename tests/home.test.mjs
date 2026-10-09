import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../renderer/core.mjs';
import {HOME_ITEMS,normalizeHome,purchaseHome,homePosition,homeFractions,createHomeController} from '../renderer/home.mjs';
import {createTaskReactions} from '../renderer/task-reactions.mjs';

test('home migration keeps existing progress and validates owned/equipped decorations and coordinates',()=>{
 const s=normalize({version:10,name:'Wonks',coins:41,speechEnabled:true,notes:'Keep this',home:{x:Infinity,y:-2,bed:'cloud',owned:['bed-cloud','bed-cloud','unknown','__proto__'],plant:'flowers'}});
 assert.equal(s.version,11);assert.equal(s.coins,41);assert.equal(s.notes,'Keep this');assert.equal(s.speechEnabled,true);assert.equal(s.home.x,.79);assert.equal(s.home.y,0);assert.equal(s.home.bed,'cloud');assert.equal(s.home.plant,'none');assert.equal(s.home.owned.filter(x=>x==='bed-cloud').length,1);assert.equal(s.home.owned.includes('unknown'),false);assert.equal(normalizeHome({enabled:false,routines:false}).enabled,false);assert.equal(normalize().contextReactions,true);
});
test('decorations charge once, never overdraft, and allow free removal and later re-equipping',()=>{
 const s=normalize({coins:15});assert.equal(purchaseHome(s,'bed-cloud'),false);assert.equal(s.coins,15);assert.equal(s.home.bed,'wicker');assert.equal(purchaseHome(s,'rug-moss'),true);assert.equal(s.coins,7);assert.equal(purchaseHome(s,'rug-none'),true);assert.equal(purchaseHome(s,'rug-moss'),true);assert.equal(s.coins,7);assert.equal(purchaseHome(s,'__proto__'),false);assert.equal(purchaseHome(s,'unknown'),false);assert.equal(normalize(s).home.rug,'moss');assert.equal(Object.keys(HOME_ITEMS).length,14);
});
test('home placement clamps to visible space, survives viewport changes, and avoids the voice dock',()=>{
 const s=normalize().home,v={width:1365,height:900,floor:840};const p=homePosition(s,v);assert.equal(p.y,840);const fractions=homeFractions({x:-999,y:99999},v);assert.deepEqual(fractions,{x:0,y:1});const roundtrip=homeFractions(homePosition({...s,x:.2,y:.3},v),v);assert.ok(Math.abs(roundtrip.x-.2)<1e-12);assert.ok(Math.abs(roundtrip.y-.3)<1e-12);
 const dock={left:900,top:720,right:1365,bottom:900};const avoided=homePosition(s,v,[dock]);assert.ok(avoided.y+20<dock.top);assert.equal(s.y,1);for(const width of [320,390,900,1920]){const g=homePosition(s,{width,height:700,floor:640});assert.ok(g.x-g.width/2>=0);assert.ok(g.x+g.width/2<=width);assert.ok(g.bed.x>=0);}
});
const idle={x:700,y:700,sleeping:false,focus:false,gameMode:false,dragging:false,homeDragging:false,hidden:false,userBusy:false,manualPlaying:false,typing:false,reacting:false,away:false,perched:false,speaking:false};
test('bed and focus travel before settling and yield immediately to games, voice and dragging',()=>{
 const s=normalize(),g=homePosition(s.home,{width:1365,height:818,floor:710}),controller=createHomeController({random:()=>0});
 assert.equal(controller.update(s,{...idle,sleeping:true},g,1000).phase,'going-bed');assert.equal(controller.update(s,{...idle,...g.bed,sleeping:true},g,2000).pose,'nap');assert.equal(controller.update(s,{...idle,focus:true},g,3000).phase,'going-focus');assert.equal(controller.update(s,{...idle,...g.focus,focus:true},g,4000).pose,'settle');
 for(const key of ['gameMode','dragging','homeDragging','hidden','userBusy'])assert.equal(controller.update(s,{...idle,sleeping:true,[key]:true},g,5000).phase,'none');s.home.enabled=false;assert.equal(controller.update(s,{...idle,sleeping:true},g,6000).phase,'none');
});
test('wake stretches once; toy visits inspect before one toss, expire, and pause after manual interaction',()=>{
 const s=normalize(),g=homePosition(s.home,{width:1365,height:818,floor:710}),controller=createHomeController({random:()=>0});controller.wake(1000);assert.equal(controller.update(s,idle,g,1000).pose,'stretch');assert.equal(controller.update(s,idle,g,6001).pose,'none');controller.preview('toys',10000);assert.equal(controller.update(s,idle,g,10000).phase,'going-toys');assert.equal(controller.update(s,{...idle,...g.toys},g,11000).pose,'inspect');assert.equal(controller.update(s,{...idle,...g.toys},g,14000).throwToy,true);assert.equal(controller.update(s,{...idle,...g.toys},g,14001).throwToy,undefined);assert.equal(controller.update(s,idle,g,24001).phase,'none');controller.pause(25000);assert.equal(controller.update(s,idle,g,30000).phase,'none');assert.equal(s.coins,0);assert.equal(s.friendship,0);
});
test('automatic toy routines require roaming and idle time; preview remains usable with autonomy off',()=>{
 const s=normalize(),g=homePosition(s.home,{width:1365,height:818,floor:710}),controller=createHomeController({random:()=>0});controller.update(s,idle,g,1000);assert.equal(controller.update(s,idle,g,65000).phase,'none');assert.equal(controller.update(s,idle,g,66001).phase,'going-toys');
 for(const key of ['typing','away','perched','manualPlaying']){controller.pause(100000,0);assert.equal(controller.update(s,{...idle,[key]:true},g,120000).phase,'none');}
 s.home.routines=false;controller.preview('toys',150000);assert.equal(controller.update(s,idle,g,150001).phase,'going-toys');controller.pause(160000,0);assert.equal(controller.update(s,idle,g,200000).phase,'none');s.home.routines=true;s.wander=false;assert.equal(controller.update(s,idle,g,300000).phase,'none');
});
test('task gestures settle current context, drop stale events, expire and respect interaction priorities',()=>{
 const s=normalize(),r=createTaskReactions(),c={category:'coding'};r.observe({contextId:1,category:'coding',typingCount:0},1000);assert.equal(r.current(s,c,3999),'none');assert.equal(r.current(s,c,4000),'inspect');assert.equal(r.current(s,c,10001),'none');r.observe({contextId:2,category:'music',typingCount:0},50000);r.observe({contextId:3,category:'browsing',typingCount:0},51000);assert.equal(r.current(s,{category:'browsing'},54000),'peek');assert.equal(r.current(s,{category:'browsing',userBusy:true},55000),'none');
 for(const setting of ['pcAwareness','physicalReactions','contextReactions']){const prefs={...s,[setting]:false};r.observe({contextId:4,category:'music'},100000);assert.equal(r.current(prefs,{category:'music'},104000),'none');}
});
test('a sustained aggregate typing burst produces one paw break after a real pause, never a win',()=>{
 const s=normalize(),r=createTaskReactions();r.observe({contextId:1,category:'coding',typingCount:12},1000);r.observe({contextId:1,category:'coding',typingCount:12},1500);assert.equal(r.current(s,{category:'coding',typing:true},2000),'none');assert.equal(r.current(s,{category:'coding'},3499),'none');assert.equal(r.current(s,{category:'coding'},3500),'paw-break');assert.equal(r.current(s,{category:'coding'},9000),'none');r.observe({contextId:2,category:'gaming',typingCount:100},70000);assert.equal(r.current(s,{category:'gaming',gameMode:true},73000),'watch');
});
