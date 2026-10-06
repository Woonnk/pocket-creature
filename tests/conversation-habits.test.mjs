import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {normalize} from '../renderer/core.mjs';
import {recentConversation,CONVERSATION_WINDOW,startsNewTopic} from '../renderer/conversation.mjs';
import {createConversationGuard} from '../renderer/autonomy.mjs';
import {createHabitController} from '../renderer/habits.mjs';
const {chatWithLocalModel}=createRequire(import.meta.url)('../desktop/chat.cjs');
test('recent conversation retains detailed human turns, expires stale/unknown timestamps, and bounds context',()=>{
 const now=2000000;
 const history=[{role:'assistant',content:'old save without timestamp'},{role:'assistant',content:'expired',at:now-CONVERSATION_WINDOW},...Array.from({length:18},(_,i)=>({role:i%2?'assistant':'user',content:'turn '+i,at:now-1000+i})),{role:'user',content:'current',at:now}];
 const turns=recentConversation(history,'current',now);assert.equal(turns.length,10);assert.equal(turns.at(-1).content,'turn 17');assert.ok(turns.every(m=>!['expired','old save without timestamp','current'].includes(m.content)));
 assert.equal(recentConversation([{role:'user',content:'x'.repeat(1500),at:now}],'another',now)[0].content.length,1200);
 assert.deepEqual(recentConversation([{role:'user',content:'future',at:now+1}],'',now),[]);
});
test('explicit topic changes isolate later conversation and migration preserves user preferences',()=>{
 const history=[{role:'user',content:'old project',at:1},{role:'user',content:'New topic: dragons',at:2},{role:'assistant',content:'tiny wings',at:3}];
 assert.deepEqual(recentConversation(history,'new topic: snacks',4),[]);assert.equal(recentConversation(history,'yes',4)[0].content,'New topic: dragons');assert.ok(startsNewTopic('Never mind, let’s play.'));assert.equal(startsNewTopic('I love the new topic feature'),false);
 const s=normalize({version:6,name:'Lil Wonks',coins:42,littleHabits:false,chatHistory:[{role:'user',content:'legacy'},{role:'assistant',content:'fresh',at:100}]});assert.equal(s.version,8);assert.equal(s.littleHabits,false);assert.equal(s.coins,42);assert.equal(s.chatHistory[0].at,0);assert.equal(s.chatHistory[1].at,100);assert.equal(normalize().littleHabits,true);
});
test('short human answers can follow a recent question across app switches without reviving expired screen topics',()=>{
 const g=createConversationGuard();g.observe('What kind of game are you making?',1,0);
 assert.deepEqual(g.replyTo(2,1000,'A forest adventure'),{text:'What kind of game are you making?',contextId:'2'});
 assert.equal(g.replyTo(2,1000,'What is on my screen?'),null);assert.equal(g.replyTo(2,1000,'New topic: snacks'),null);assert.equal(g.replyTo(2,180000,'A forest adventure'),null);
 g.observe('I noticed a red car.',1,0);assert.equal(g.replyTo(2,1000,'yes'),null);
});
test('local manual prompts keep recent threads and natural follow-ups; automatic requests never use them',async()=>{
 let body;const fetchImpl=async(_url,opts)=>{body=JSON.parse(opts.body);return {ok:true,json:async()=>({message:{content:'A forest adventure sounds lovely.'}})};};
 const history=[{role:'user',content:'I’m making a forest adventure.',at:Date.now()-1000},{role:'assistant',content:'What will the dragon explore?',at:Date.now()-500}];
 await chatWithLocalModel({model:'local',message:'An enchanted cave.',history,activity:{windowTitle:'Music player'}},{fetchImpl});assert.ok(body.messages.some(m=>m.content==='I’m making a forest adventure.'));assert.match(body.messages[0].content,/Do not ask a question every turn/);assert.match(body.messages[0].content,/even if the foreground app changed/);
 await chatWithLocalModel({model:'local',message:'new topic: lunch',history,conversationStarter:'OLD QUESTION'},{fetchImpl});assert.ok(!body.messages.some(m=>m.content==='I’m making a forest adventure.'||m.content==='OLD QUESTION'));
 await chatWithLocalModel({model:'local',message:'Observe now',history,automatic:true},{fetchImpl});assert.ok(!body.messages.some(m=>m.content==='I’m making a forest adventure.'));
});
test('silent habits wait, vary with personality, expire, avoid consecutive repeats, and respect cooldowns',()=>{
 const s=normalize({personality:'playful'}),c=createHabitController({random:()=>0});assert.equal(c.current(s,{},0),'none');assert.equal(c.current(s,{},29999),'none');assert.equal(c.current(s,{},30000),'stretch');assert.equal(c.current(s,{},35999),'stretch');assert.equal(c.current(s,{},36000),'none');assert.equal(c.current(s,{},90999),'none');assert.equal(c.current(s,{},91000),'groom');
 const cozy=createHabitController({random:()=>0});assert.equal(cozy.current({...s,personality:'cozy'},{},0),'none');assert.equal(cozy.current({...s,personality:'cozy'},{},30000),'settle');
});
test('habits yield to interaction and reactions, resume gently, and stay still in games',()=>{
 const s=normalize();for(const key of ['sleeping','dragging','playing','typing','focus','userBusy','away','dizzy','airborne','reacting','hidden','speaking']){const c=createHabitController({random:()=>0});assert.ok(c.preview('groom',s,{},0));assert.equal(c.current(s,{[key]:true},1),'none');assert.equal(c.current(s,{},2),'none');assert.equal(c.preview('stretch',s,{[key]:true},3),false);}
 const c=createHabitController({random:()=>0});assert.equal(c.current(s,{gameMode:true},0),'none');assert.equal(c.current(s,{gameMode:true},30000),'settle');assert.equal(c.current({...s,littleHabits:false},{},30001),'none');assert.equal(c.preview('fake',s,{},30002),false);
 assert.equal(c.preview('stretch',{...s,quiet:true,pcAwareness:false,reducedMotion:true},{},30003),true);c.clear(30004);assert.equal(c.current(s,{},30005),'none');
});
