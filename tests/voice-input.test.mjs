import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {normalize} from '../renderer/core.mjs';
import {createVoiceInputSession} from '../renderer/voice-input.mjs';
const {createVoiceInputAdapter}=createRequire(import.meta.url)('../desktop/voice-input.cjs');
test('microphone upgrades stay opt-in, keep voice preferences, and bound the shortcut and engine',()=>{
 const s=normalize({version:9,coins:33,speechEnabled:true,speechVoice:'David',voiceInputEnabled:'yes',voiceInputKey:'password',speechEngine:'https://cloud',kokoroVoice:'../../secret'});
 assert.equal(s.version,11);assert.equal(s.coins,33);assert.equal(s.speechEnabled,true);assert.equal(s.speechVoice,'David');assert.equal(s.voiceInputEnabled,false);assert.equal(s.voiceInputReview,false);assert.equal(s.voiceInputKey,'f9');assert.equal(s.speechEngine,'windows');assert.equal(s.kokoroVoice,'secret');
});
test('voice input needs listening then release, submits once, and ignores stale/duplicate transcripts',()=>{
 const s=normalize({voiceInputEnabled:true}),submitted=[],reviewed=[],states=[];
 const session=createVoiceInputSession({getSettings:()=>s,submit:t=>submitted.push(t),review:t=>reviewed.push(t),onState:e=>states.push(e)});
 session.receive({state:'transcript',epoch:1,id:1,text:'too early'});assert.equal(submitted.length,0);
 session.receive({state:'listening',epoch:1,id:1});assert.equal(session.busy(),true);session.receive({state:'transcribing',epoch:1,id:1});session.receive({state:'transcript',epoch:1,id:1,text:'What is this file?'});
 assert.deepEqual(submitted,['What is this file?']);assert.equal(states.at(-1).state,'thinking');session.receive({state:'ready',epoch:1,id:0});assert.equal(session.busy(),true);assert.equal(states.at(-1).state,'thinking');session.receive({state:'transcript',epoch:1,id:1,text:'duplicate'});assert.equal(submitted.length,1);session.finish();assert.equal(session.busy(),false);
 session.receive({state:'listening',epoch:1,id:2});session.receive({state:'transcribing',epoch:1,id:2});session.receive({state:'transcript',epoch:1,id:1,text:'old phrase'});assert.equal(submitted.length,1);session.receive({state:'transcript',epoch:1,id:2,text:'uncertain',needsReview:true});assert.deepEqual(reviewed,['uncertain']);
});
test('cancel epochs reject pending listening/transcripts and permit a later take; review, quiet and disabled do not auto-send',()=>{
 const s=normalize({voiceInputEnabled:true,voiceInputReview:true}),submitted=[],reviewed=[];
 const session=createVoiceInputSession({getSettings:()=>s,submit:t=>submitted.push(t),review:t=>reviewed.push(t)});
 session.receive({state:'listening',epoch:3,id:8});session.reset();session.receive({state:'listening',epoch:3,id:9});session.receive({state:'transcribing',epoch:3,id:9});session.receive({state:'transcript',epoch:3,id:9,text:'cancelled'});assert.equal(reviewed.length,0);
 session.receive({state:'ready',epoch:4,id:0});session.receive({state:'listening',epoch:4,id:10});session.receive({state:'transcribing',epoch:4,id:10});session.receive({state:'transcript',epoch:4,id:10,text:'Review this'});assert.deepEqual(reviewed,['Review this']);
 s.quiet=true;session.receive({state:'listening',epoch:5,id:11});session.receive({state:'transcribing',epoch:5,id:11});session.receive({state:'transcript',epoch:5,id:11,text:'quiet'});assert.equal(reviewed.length,1);s.quiet=false;s.voiceInputEnabled=false;session.receive({state:'transcript',epoch:6,id:12,text:'disabled'});assert.equal(submitted.length,0);
});
function fakeInput(){const children=[];return {children,spawnProcess:(command,args,options)=>{const p=new EventEmitter();p.args=args;p.options=options;p.stdout=new EventEmitter();p.stdout.setEncoding=()=>{};p.stderr=new EventEmitter();p.stdin=new EventEmitter();p.commands=[];p.stdin.write=s=>p.commands.push(JSON.parse(s));p.kill=()=>p.killed=true;children.push(p);return p;}};}
test('native input starts only when enabled, frames events, and kills input when disabled or quiet',()=>{
 const fake=fakeInput(),events=[],input=createVoiceInputAdapter(e=>events.push(e),{platform:'win32',spawnProcess:fake.spawnProcess});
 input.configure({voiceInputEnabled:false});assert.equal(fake.children.length,0);assert.equal(input.start(),false);
 input.configure({voiceInputEnabled:true,voiceInputKey:'f8'});const p=fake.children[0],epoch=p.commands[0].epoch;assert.equal(p.commands[0].key,119);assert.equal(p.options.windowsHide,true);
 p.stdout.emit('data',JSON.stringify({state:'ready',epoch,language:'en-US'})+'\n');assert.equal(input.start(),true);assert.equal(p.commands.at(-1).command,'start');
 p.stdout.emit('data',JSON.stringify({state:'listening',id:1,epoch})+'\n');assert.equal(events.at(-1).state,'listening');input.finish();assert.equal(p.commands.at(-1).command,'finish');
 const line=JSON.stringify({state:'transcribing',id:1,epoch})+'\n';p.stdout.emit('data',line.slice(0,10));p.stdout.emit('data',line.slice(10));assert.equal(events.at(-1).state,'transcribing');p.stdout.emit('data',JSON.stringify({state:'transcript',id:1,epoch,text:'a\0b'.repeat(600)})+'\n');assert.equal(events.at(-1).text.length,1200);assert.equal(events.at(-1).text.includes('\0'),false);
 input.configure({voiceInputEnabled:true,quiet:true});assert.equal(p.killed,true);assert.equal(input.start(),false);input.stop();
});
test('native cancellation advances the epoch and drops late words; a restart accepts fresh IDs',()=>{
 const fake=fakeInput(),events=[],input=createVoiceInputAdapter(e=>events.push(e),{platform:'win32',spawnProcess:fake.spawnProcess});input.configure({voiceInputEnabled:true,voiceInputKey:'f9'});
 const p=fake.children[0],epoch=p.commands[0].epoch;p.stdout.emit('data',JSON.stringify({state:'ready',epoch})+'\n');p.stdout.emit('data',JSON.stringify({state:'listening',epoch,id:50})+'\n');input.cancel();const next=p.commands.at(-1).epoch;
 p.stdout.emit('data',JSON.stringify({state:'transcript',epoch,id:50,text:'stale'})+'\n');assert.equal(events.at(-1).text,'');assert.equal(next,epoch+1);
 p.stdout.emit('data',JSON.stringify({state:'listening',epoch:next,id:51})+'\n');assert.equal(events.at(-1).id,51);
 input.configure({voiceInputEnabled:true,voiceInputKey:'f10'});assert.equal(p.killed,true);const p2=fake.children[1],next2=p2.commands[0].epoch;p2.stdout.emit('data',JSON.stringify({state:'ready',epoch:next2})+'\n');p2.stdout.emit('data',JSON.stringify({state:'listening',epoch:next2,id:1})+'\n');assert.equal(events.at(-1).id,1);input.stop();
});
test('input watchdog closes a hung microphone session and reports an error',async()=>{
 const fake=fakeInput(),events=[],input=createVoiceInputAdapter(e=>events.push(e),{platform:'win32',spawnProcess:fake.spawnProcess,timeout:10});input.configure({voiceInputEnabled:true});const p=fake.children[0],epoch=p.commands[0].epoch;p.stdout.emit('data',JSON.stringify({state:'ready',epoch})+'\n');p.stdout.emit('data',JSON.stringify({state:'listening',epoch,id:1})+'\n');await new Promise(r=>setTimeout(r,30));assert.equal(p.killed,true);assert.equal(events.at(-1).state,'error');assert.equal(input.status().ready,false);input.stop();
});
