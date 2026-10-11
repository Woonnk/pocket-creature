import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../renderer/core.mjs';
import {normalizeTricks,parseTrickRequest,createTrickController} from '../renderer/tricks.mjs';
import {createAdventureController} from '../renderer/adventures.mjs';
import {describeAttention} from '../renderer/attention.mjs';
import {decodeBackup,encodeBackup} from '../renderer/backup.mjs';
const adventureSettings=()=>normalize({wander:true});
const adventureGeometryFixture=()=>({pet:{x:500,y:700},bounds:{left:120,right:1080,floor:700},perch:null});
test('schema 13 preserves old progress, all previous preferences, and bounded trick learning',()=>{
 const s=normalize({version:12,coins:42,notes:'keep',motionLevel:'gentle',dailyRoutines:false,tricks:{wave:{practice:99,lastPracticeAt:Infinity},bow:{practice:-2},spin:{practice:2.9},unknown:{practice:3}},attentionIndicator:false,screenAdventures:false});assert.equal(s.version,15);assert.equal(s.coins,42);assert.equal(s.motionLevel,'gentle');assert.equal(s.dailyRoutines,false);assert.equal(s.tricks.wave.practice,3);assert.equal(s.tricks.wave.lastPracticeAt,0);assert.equal(s.tricks.bow.practice,0);assert.equal(s.tricks.spin.practice,2);assert.equal(s.tricks.unknown,undefined);assert.equal(s.attentionIndicator,false);assert.equal(s.screenAdventures,false);assert.equal(normalize().screenAdventures,true);assert.equal(normalizeTricks(null).wave.practice,0);
});
test('tricks require three completed practices, honor cooldown, survive backup, and reward only once without coins',()=>{
 const s=normalize({coins:42}),c=createTrickController();assert.equal(c.start('wave',false,s,{},100000).ok,false);
 for(let i=0;i<3;i++){const at=100000+i*14000;assert.equal(c.start('wave',true,s,{},at).ok,true);assert.equal(c.update(s,{},at+2999).kind,'wave');assert.equal(s.tricks.wave.practice,i);const done=c.update(s,{},at+3000);assert.equal(done.completed,'wave');assert.equal(done.learned,i===2);assert.equal(s.tricks.wave.practice,i+1);assert.equal(c.update(s,{},at+4000).kind,'none');assert.equal(s.tricks.wave.practice,i+1);assert.equal(c.start('wave',true,s,{},at+4000).ok,false);}
 assert.equal(s.coins,42);assert.equal(c.start('wave',false,s,{},150000).ok,true);c.update(s,{},154000);assert.equal(s.tricks.wave.practice,3);const restored=decodeBackup(encodeBackup(s),normalize());assert.equal(restored.tricks.wave.practice,3);assert.equal(restored.tricks.wave.lastPracticeAt,s.tricks.wave.lastPracticeAt);
});
test('tricks abort before awarding when interrupted, remain local whole-message commands, and allow still reduced-motion practice',()=>{
 for(const flag of ['gameMode','sleeping','focus','dragging','typing','playing','away','hidden','userBusy','speaking','homeBusy','airborne']){const c=createTrickController(),s=normalize();assert.equal(c.start('bow',true,s,{},100000).ok,true);assert.equal(c.update(s,{[flag]:true},104000).interrupted,true);assert.equal(s.tricks.bow.practice,0);assert.equal(c.start('bow',true,s,{[flag]:true},110000).ok,false);}
 assert.deepEqual(parseTrickRequest('Could you do a wave please?'),{kind:'wave',practice:false});assert.deepEqual(parseTrickRequest('Wonks, practice spin','Wonks'),{kind:'spin',practice:true});for(const text of ['What does practice wave do?','do not do a wave','"do a wave"','do a wave and bow','teach me to wave'])assert.equal(parseTrickRequest(text),null);
 const c=createTrickController(),s=normalize({reducedMotion:true});assert.equal(c.start('hop',true,s,{},100000).ok,true);c.update(s,{},103000);assert.equal(s.tricks.hop.practice,1);
});
test('edge adventure travels, peeks, returns, and keeps route within resized viewport',()=>{
 const c=createAdventureController({random:()=>0}),s=adventureSettings(),g=adventureGeometryFixture();assert.equal(c.preview('edge-peek',s,{},g,100000),true);let f=c.update(s,{},g,100001);assert.deepEqual(f.target,{x:120,y:700});g.pet={...f.target};f=c.update(s,{},g,100002);assert.equal(f.phase,'peek');f=c.update(s,{},g,103003);assert.equal(f.phase,'return');assert.equal(f.target.x,500);g.bounds.right=400;f=c.update(s,{},g,103004);assert.equal(f.target.x,400);g.pet={...f.target};assert.equal(c.update(s,{},g,103005).kind,'none');
});
test('window adventures follow fresh geometry, climb within bounds, and cancel on lost/replaced surfaces',()=>{
 const c=createAdventureController({random:()=>0}),s=adventureSettings(),g=adventureGeometryFixture();g.perch={id:'window-a',left:300,right:650,x:500,y:300,rect:{height:400}};g.pet={x:500,y:300};assert.equal(c.preview('window-climb',s,{},g,100000),true);let f=c.update(s,{},g,100001);g.pet={...f.target};f=c.update(s,{},g,100002);assert.equal(f.phase,'climb');assert.equal(f.target.y,420);g.perch.y=340;f=c.update(s,{},g,100003);assert.equal(f.target.y,460);g.perch.id='window-b';assert.equal(c.update(s,{},g,100004).kind,'none');assert.equal(c.preview('window-climb',s,{}, {...g,perch:null},110000),false);
});
test('adventures start autonomously, respect wandering and every busy state, and return peek stays silent',()=>{
 const s=adventureSettings(),g=adventureGeometryFixture(),c=createAdventureController({random:()=>0});assert.equal(c.update(s,{},g,100000).kind,'none');assert.equal(c.update(s,{},g,160001).kind,'edge-peek');
 for(const flag of ['gameMode','sleeping','focus','dragging','typing','playing','away','hidden','userBusy','speaking','reacting','homeBusy','habitBusy','dailyBusy','trickBusy']){const a=createAdventureController({random:()=>0});assert.equal(a.preview('edge-peek',s,{},g,100000),true);assert.equal(a.update(s,{[flag]:true},g,100100).kind,'none');assert.equal(a.preview('edge-peek',s,{[flag]:true},g,100101),false);}
 const a=createAdventureController({random:()=>0});a.update({...s,wander:false},{},g,100000);assert.equal(a.update({...s,wander:false},{},g,200000).kind,'none');assert.equal(a.preview('edge-peek',{...s,reducedMotion:true},{},g,200001),false);assert.equal(a.returned(s,{},210000),true);assert.equal(a.update(s,{},g,210001).kind,'return-peek');assert.equal(a.update(s,{},g,213501).kind,'none');
});
test('attention distinguishes observed titles, filename-only files, read samples, stale signals and higher priorities',()=>{
 const s=normalize(),base={desktop:true,seenAt:100000,windowTitle:'main.py - Code',appAvailable:true};assert.equal(describeAttention(s,base,100001).kind,'window');assert.match(describeAttention(s,base,100001).detail,/title only/);assert.equal(describeAttention(s,base,106001).kind,'waiting');assert.equal(describeAttention({...s,pcAwareness:false},base,100001).kind,'off');assert.equal(describeAttention(s,{...base,fileCurrent:false,file:{name:'old.py'}},100001).label,'main.py - Code');assert.equal(describeAttention(s,{...base,fileCurrent:true,file:{name:'main.py',unread:true}},100001).kind,'filename');assert.match(describeAttention(s,{...base,fileCurrent:true,file:{name:'main.py',partial:true}},100001).detail,/first 32 KB/);assert.equal(describeAttention(s,{...base,focus:true},100001).kind,'focus');assert.equal(describeAttention(s,{...base,chatBusy:true},100001).kind,'conversation');assert.match(describeAttention(s,{...base,voicePhase:'transcribing'},100001).detail,/Microphone closed/);assert.doesNotMatch(describeAttention(s,{...base,windowTitle:'hello\n'+ 'x'.repeat(300)},100001).label,/\n/);assert.ok(describeAttention(s,{...base,windowTitle:'x'.repeat(300)},100001).label.length<=120);
});

test('return peeks wait briefly for a wake-up home stretch, expire, and cancel on a deliberate interruption',()=>{
 const s=adventureSettings(),g=adventureGeometryFixture(),c=createAdventureController({random:()=>0});assert.equal(c.returned(s,{homeBusy:true},100000),true);assert.equal(c.update(s,{homeBusy:true},g,103000).kind,'none');assert.equal(c.update(s,{},g,106000).kind,'return-peek');c.clear(106100);assert.equal(c.update(s,{},g,106101).kind,'none');c.returned(s,{userBusy:true},110000);assert.equal(c.update(s,{},g,126000).kind,'none');
});

test('large-screen adventures choose the nearer edge and allow a gentle round trip without an early timeout',()=>{
 const s=normalize({motionLevel:'gentle',personality:'cozy'}),g={pet:{x:2880,y:2100},bounds:{left:120,right:3720,floor:2100},perch:null},c=createAdventureController();assert.equal(c.preview('edge-peek',s,{},g,100000),true);assert.equal(c.update(s,{},g,100001).target.x,3720);g.pet={x:3720,y:2100};assert.equal(c.update(s,{},g,130000).phase,'peek');assert.equal(c.update(s,{},g,134000).phase,'return');g.pet={x:2880,y:2100};assert.equal(c.update(s,{},g,160000).kind,'none');
});
