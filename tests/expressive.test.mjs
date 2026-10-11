import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../renderer/core.mjs';
import {encodeBackup,decodeBackup} from '../renderer/backup.mjs';
import {createEmotionController,createMomentController} from '../renderer/expressive.mjs';
import {createConversationGuard,createCommentFilter,createAutoScheduler} from '../renderer/autonomy.mjs';
const geometry=()=>({pet:{x:500,y:700},bounds:{left:120,right:1080,top:210,floor:700},home:{toys:{x:850,y:650}}});
test('expressive preferences migrate without losing tricks, care, memory, or backups',()=>{
 const s=normalize({version:13,coins:42,friendship:7,tricks:{wave:{practice:3}},expressiveMoods:false,littleInteractions:false,personalMemory:{nickname:'Carter'}});assert.equal(s.version,15);assert.equal(s.coins,42);assert.equal(s.friendship,7);assert.equal(s.tricks.wave.practice,3);assert.equal(s.personalMemory.nickname,'Carter');assert.equal(s.expressiveMoods,false);assert.equal(s.littleInteractions,false);assert.equal(normalize().littleInteractions,true);assert.deepEqual(decodeBackup(encodeBackup(s)),s);
});
test('moods follow care and learning, expire without fake achievements, and protect priority poses',()=>{
 const s=normalize({personality:'cozy'}),e=createEmotionController();assert.equal(e.current(s,{},100000),'calm');e.notice('learned',100000);assert.equal(e.current(s,{},100001),'proud');assert.equal(e.notice('discovery',100002),false);assert.equal(e.current(s,{},118000),'calm');e.notice('care',120000);assert.equal(e.current(s,{},120001),'affectionate');assert.equal(e.current(s,{focus:true},120001),'focused');assert.equal(e.current(s,{sleeping:true},120001),'sleepy');assert.equal(e.current(s,{interaction:'toy'},120001),'playful');
 for(const flag of ['dragging','dizzy','voiceBusy','speaking','otherPose'])assert.equal(e.current(s,{[flag]:true},120001),'none');assert.equal(e.current({...s,expressiveMoods:false},{},120001),'none');assert.equal(e.notice('victory',120001),false);e.clear();assert.equal(e.current(s,{},120001),'calm');
});
test('quiet moments complete exactly once without care/coin rewards and can start autonomously',()=>{
 const s=normalize(),before=JSON.stringify(s),g=geometry(),m=createMomentController({random:()=>0});assert.ok(m.start('scratch',s,{},g,100000));assert.equal(m.start('paw',s,{},g,100001),false);assert.equal(m.update(s,{},g,103999).kind,'scratch');assert.equal(m.update(s,{},g,104000).completed,'scratch');assert.equal(m.update(s,{},g,104001).completed,undefined);assert.equal(JSON.stringify(s),before);
 const auto=createMomentController({random:()=>0});assert.equal(auto.update(s,{},g,100000).kind,'none');assert.equal(auto.update(s,{},g,170000).kind,'paw');assert.equal(auto.update(s,{},g,174000).completed,'paw');assert.equal(auto.update(s,{},g,284001).kind,'settle');
});
test('all deliberate work interrupts moments; disabled features and perches reject toy routes',()=>{
 const s=normalize(),g=geometry();for(const flag of ['gameMode','sleeping','focus','dragging','typing','playing','away','hidden','userBusy','speaking','otherBusy','airborne']){const m=createMomentController();assert.ok(m.start('paw',s,{},g,100000));assert.equal(m.update(s,{[flag]:true},g,100001).kind,'none');assert.equal(m.start('scratch',s,{[flag]:true},g,100002),false);assert.equal(m.update(s,{},g,100003).kind,'none');}
 const m=createMomentController();assert.equal(m.start('toy',s,{perched:true},g,100000),false);assert.equal(m.start('toy',{...s,home:{...s.home,enabled:false}},{},g,100000),false);assert.equal(m.start('paw',{...s,littleInteractions:false},{},g,100000),false);assert.equal(m.start('unknown',s,{},g,100000),false);
});
test('toy collection follows live basket geometry, returns to a bounded origin, and cancels missing homes',()=>{
 const s=normalize(),g=geometry(),m=createMomentController();assert.ok(m.start('toy',s,{},g,100000));let f=m.update(s,{},g,100001);assert.equal(f.phase,'fetch');assert.equal(f.carrying,false);g.home.toys.x=900;assert.equal(m.update(s,{},g,100002).target.x,900);g.pet={x:900,y:650};assert.equal(m.update(s,{},g,100003).phase,'collect');f=m.update(s,{},g,101504);assert.equal(f.phase,'return');assert.equal(f.carrying,true);assert.equal(f.target.x,500);g.bounds.left=600;assert.equal(m.update(s,{},g,101505).target.x,600);g.pet={x:600,y:700};assert.equal(m.update(s,{},g,101506).phase,'hold');assert.equal(m.update(s,{},g,105007).completed,'toy');
 assert.ok(m.start('toy',s,{},g,110000));assert.equal(m.update(s,{}, {...g,home:null},110001).kind,'none');
});
test('reduced motion shows a still toy and automatic still moments remain available with wandering off',()=>{
 const s=normalize({reducedMotion:true,wander:false}),g=geometry(),m=createMomentController({random:()=>0});assert.ok(m.start('toy',s,{},g,100000));const f=m.update(s,{},g,100001);assert.equal(f.target,null);assert.equal(f.carrying,true);m.clear(101000);assert.equal(m.update(s,{},g,190999).kind,'none');assert.equal(m.update(s,{},g,191000).kind,'paw');
});
test('automatic requests cannot begin while typing, focused, hidden, or speaking',()=>{
 const s=normalize();for(const flag of ['typing','focus','hidden','speaking']){const a=createAutoScheduler();assert.equal(a.begin(s,{ready:true,[flag]:true},100000),null);assert.notEqual(a.begin(s,{ready:true},100001),null);}
});
test('questions get five minutes of breathing room and ten minutes of follow-up context across apps',()=>{
 const g=createConversationGuard();g.observe('What are you building?',1,100000);assert.equal(g.blocked(399999),true);assert.equal(g.blocked(400000),false);assert.deepEqual(g.replyTo(2,600000,'A forest adventure'),{text:'What are you building?',contextId:'2'});assert.equal(g.replyTo(2,700000,'A forest adventure'),null);assert.equal(g.replyTo(1,110000,'New topic: lunch'),null);assert.equal(g.replyTo(2,110000,'What is on my screen?'),null);g.clear();assert.equal(g.blocked(110000),false);g.hold(110000);assert.equal(g.blocked(199999),true);assert.equal(g.blocked(200000),false);assert.equal(g.replyTo(1,110000,'A forest adventure'),null);
});
test('repeat suppression handles paraphrased filler, preserves new details, expires and only records delivered comments',()=>{
 const f=createCommentFilter();assert.equal(f.canAccept('I noticed a little red car.',100000),true);assert.equal(f.canAccept('I noticed a little red car.',100001),true);f.record('I noticed a little red car.',100002);assert.equal(f.accept('I spotted that tiny red car!',100003),false);assert.equal(f.accept('I noticed a blue car.',100004),true);assert.equal(f.accept('RED CAR',100005),false);assert.equal(f.accept('SILENCE',100006),false);assert.equal(f.accept('I noticed a little red car.',700002),true);
});
