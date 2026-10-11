import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {normalize} from '../renderer/core.mjs';
import {dayPeriod,livingProfile,createDailyController} from '../renderer/living.mjs';
import {parseReminderRequest,assistanceOffer} from '../renderer/assistance.mjs';
import {encodeBackup,decodeBackup} from '../renderer/backup.mjs';
import {createCommentator} from '../renderer/companion.mjs';
const {createLoginController}=createRequire(import.meta.url)('../desktop/login.cjs');
const livingTime=h=>new Date(2026,9,9,h,0,0).getTime();
test('old saves acquire independent living preferences without losing progress',()=>{
 const s=normalize({version:11,coins:42,notes:'keep me',dailyRoutines:false,motionLevel:'gentle',helpfulOffers:false});assert.equal(s.version,15);assert.equal(s.coins,42);assert.equal(s.notes,'keep me');assert.equal(s.dailyRoutines,false);assert.equal(s.motionLevel,'gentle');assert.equal(s.helpfulOffers,false);assert.equal(normalize({motionLevel:'bad'}).motionLevel,'normal');assert.equal(normalize().dailyRoutines,true);
});
test('local day periods have correct boundaries; movement differs independently from chatter',()=>{
 for(const [h,p] of [[0,'night'],[5,'night'],[6,'morning'],[10,'morning'],[11,'afternoon'],[16,'afternoon'],[17,'evening'],[21,'evening'],[22,'night']])assert.equal(dayPeriod(new Date(livingTime(h))),p);
 assert.ok(livingProfile({personality:'cozy'}).speed<livingProfile({personality:'cheeky'}).speed);assert.ok(livingProfile({motionLevel:'gentle'}).interval>livingProfile({motionLevel:'lively'}).interval);assert.equal(livingProfile({talkativeness:'minimal'}).speed,livingProfile({talkativeness:'chatty'}).speed);
});
test('daily routines start autonomously, rotate, expire, and retain a due routine across intermittent walking',()=>{
 const c=createDailyController({random:()=>0}),s=normalize({personality:'curious'}),at=livingTime(14);
 assert.equal(c.current(s,{},at),'none');assert.equal(c.current(s,{walking:true},at+60000),'none');assert.equal(c.current(s,{},at+61000),'none');assert.equal(c.current(s,{},at+64000),'peek');assert.equal(c.current(s,{},at+69000),'none');assert.equal(c.current(s,{},at+130000),'tilt');
});
test('daily routines respect every activity priority and games/reduced motion; night never forces sleep',()=>{
 const s=normalize();for(const flag of ['gameMode','sleeping','focus','dragging','playing','typing','away','hidden','userBusy','speaking','reacting','habitBusy','homeBusy','perched','walking','airborne']){const c=createDailyController({random:()=>0});assert.equal(c.preview(s,{},livingTime(14)),true);assert.equal(c.current(s,{[flag]:true},livingTime(14)+100),'none');assert.equal(c.preview(s,{[flag]:true},livingTime(14)+200),false);}
 const c=createDailyController({random:()=>0});assert.equal(c.preview({...s,reducedMotion:true}),false);assert.equal(c.preview({...s,dailyRoutines:false}),false);assert.equal(c.preview(s,{},livingTime(23)),true);assert.equal(c.pose,'snuggle');assert.equal(s.focus.status,'idle');
});
test('explicit reminders accept bounded durations and preserve conversation, quotations and negations',()=>{
 assert.deepEqual(parseReminderRequest('Remind me in 10 minutes to drink water.'),{minutes:10,title:'drink water'});assert.deepEqual(parseReminderRequest('remind me in 2 hours to check the oven'),{minutes:120,title:'check the oven'});assert.deepEqual(parseReminderRequest('remind me in 0 minutes to test'),{invalid:true});assert.deepEqual(parseReminderRequest('remind me in 25 hours to test'),{invalid:true});for(const message of ['do not remind me in 10 minutes to test','can you explain remind me in 10 minutes to test?','“remind me in 10 minutes to test”','I need a reminder'])assert.equal(parseReminderRequest(message),null);
 assert.equal(assistanceOffer('I have homework',normalize()).kind,'focus');assert.equal(assistanceOffer('don’t focus on my homework',normalize()),null);assert.equal(assistanceOffer('studying',normalize({helpfulOffers:false})),null);assert.equal(assistanceOffer('homework',normalize({focus:{status:'running'}})),null);
});
test('backup round-trip restores progress and all living preferences while retaining local permissions',()=>{
 const original=normalize({name:'Wonks',coins:72,notes:'Keep these notes',motionLevel:'lively',personalMemory:{nickname:'Carter'},voiceInputEnabled:true,screenAwareness:true,speechEnabled:true});const existing=normalize({pcAwareness:false,autoConversations:false});const restored=decodeBackup(encodeBackup(original),existing);assert.equal(restored.coins,72);assert.equal(restored.notes,'Keep these notes');assert.equal(restored.personalMemory.nickname,'Carter');assert.equal(restored.motionLevel,'lively');for(const key of ['pcAwareness','autoConversations','voiceInputEnabled','screenAwareness','speechEnabled'])assert.equal(restored[key],existing[key]);assert.equal(restored.connectedFolders,undefined);
 for(const text of ['x','{}','{"format":"pocket-creature","backupVersion":2,"state":{}}','{"format":"pocket-creature","backupVersion":1,"state":[]}', 'x'.repeat(120001)])assert.throws(()=>decodeBackup(text,existing));
});
test('same-window page changes settle and returning to a task gets a grounded brief acknowledgement',()=>{
 const c=createCommentator(),s=normalize(),a={category:'browsing',contextId:1,windowTitle:'Page A'},b={...a,windowTitle:'Page B'};
 c.hold(0);c.next(a,s,1000);assert.match(c.next(a,s,7000),/Page A/);assert.equal(c.next(b,s,8000),null);assert.match(c.next(b,s,14000),/Page B/);assert.equal(c.next(a,s,15000),null);assert.match(c.next(a,s,21000),/Back to “Page A”/);
});
test('Windows startup uses the persistent portable executable, validates inputs, and reports OS-disabled items',()=>{
 let set,disabled=false;const app={isPackaged:true,getLoginItemSettings:options=>{assert.equal(options.path,'C:\\Games\\Pocket Creature.exe');return {openAtLogin:!!set?.openAtLogin,executableWillLaunchAtLogin:!!set?.openAtLogin&&!disabled};},setLoginItemSettings:options=>set=options};const c=createLoginController(app,{platform:'win32',portable:'C:\\Games\\Pocket Creature.exe',executable:'C:\\Temp\\unpacked.exe'});assert.equal(c.status().enabled,false);assert.equal(c.set(true).enabled,true);assert.equal(set.path,'C:\\Games\\Pocket Creature.exe');assert.deepEqual(set.args,[]);disabled=true;assert.match(c.status().message,/disabled/);c.set(false);assert.equal(set.openAtLogin,false);assert.throws(()=>c.set('true'));assert.equal(createLoginController(app,{platform:'linux'}).status().supported,false);assert.equal(createLoginController(app,{platform:'win32',packaged:false}).status().supported,false);
});
