import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {normalize} from '../renderer/core.mjs';
import {speechAllowed,speechDelivery,createSpeaker,createBrowserSpeechBridge} from '../renderer/speech.mjs';
const {createSpeechAdapter}=createRequire(import.meta.url)('../desktop/speech.cjs');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('voice migration preserves progress and starts muted with bounded settings',()=>{
  const s=normalize({version:8,coins:48,speechVolume:Infinity,speechRate:8,speechVoice:'x'.repeat(500),speechChatter:'unknown',speechEnabled:'yes'});
  assert.equal(s.version,11);assert.equal(s.coins,48);assert.equal(s.speechEnabled,false);assert.equal(s.speechInGames,false);assert.equal(s.speechVolume,.65);assert.equal(s.speechRate,1.4);assert.equal(s.speechVoice.length,120);assert.equal(s.speechChatter,'balanced');
});
test('speech policy gates quiet, hidden, game, zero volume, and automatic distractions; explicit preview works while disabled',()=>{
  const s=normalize({speechEnabled:true});assert.equal(speechAllowed(s),true);
  for(const context of [{hidden:true},{inGame:true},{listening:true}])assert.equal(speechAllowed(s,context),false);
  for(const context of [{away:true},{busy:true},{focused:true}]){assert.equal(speechAllowed(s,context,true),false);assert.equal(speechAllowed(s,context,false),true);}
  assert.equal(speechAllowed({...s,quiet:true},{},false,true),false);assert.equal(speechAllowed({...s,speechVolume:0}),false);
  assert.equal(speechAllowed({...s,speechEnabled:false},{},false,true),true);assert.equal(speechAllowed({...s,speechChatter:'replies'},{},true),false);
  assert.equal(speechAllowed({...s,speechInGames:true},{inGame:true}),true);
});
test('expressive delivery adjusts pace within limits and can be disabled',()=>{
  const s=normalize({speechEnabled:true});assert.ok(speechDelivery(s,'sleepy').rate<1);assert.ok(speechDelivery(s,'playful').rate>1);
  assert.deepEqual(speechDelivery({...s,speechExpression:false},'playful'),{rate:1,pitch:1});assert.equal(speechDelivery({...s,speechRate:1.4},'playful').rate,1.4);
});
test('speaker replaces lines, ignores stale playback events, and enforces automatic cooldown without blocking manual answers',async()=>{
  let at=1000,context={},listener;const calls=[],events=[],s=normalize({speechEnabled:true});
  const speaker=createSpeaker({bridge:{speak:p=>{calls.push(p);return true;},stopSpeech(){},onSpeechState:fn=>listener=fn},getSettings:()=>s,getContext:()=>context,onState:e=>events.push(e),now:()=>at});
  assert.equal(speaker.speak('Look at that file!',{automatic:true}),true);await flush();const first=calls[0].id;
  at+=1000;assert.equal(speaker.speak('Another file',{automatic:true}),false);assert.equal(speaker.speak('Here is your answer.'),true);await flush();const second=calls[1].id;
  listener({id:first,state:'ended'});assert.equal(speaker.active(),true);listener({id:second,state:'speaking'});assert.equal(events.at(-1).state,'speaking');
  speaker.stop(true);assert.equal(speaker.active(),true);speaker.stop();assert.equal(speaker.active(),false);listener({id:second,state:'speaking'});assert.equal(events.at(-1).state,'stopped');
  at+=60000;context={inGame:true};s.speechInGames=true;assert.equal(speaker.speak('New adventure',{automatic:true}),true);await flush();at+=45000;assert.equal(speaker.speak('Next adventure',{automatic:true}),false);speaker.stop();
});
test('stop during a pending settings save prevents late playback; playback failures clear the active state',async()=>{
  let release,played=0,listener;const s=normalize({speechEnabled:true});const gate=new Promise(resolve=>release=resolve);
  const speaker=createSpeaker({bridge:{speak:()=>{played++;return false;},stopSpeech(){},onSpeechState:fn=>listener=fn},getSettings:()=>s,getContext:()=>({}),prepare:()=>gate});
  speaker.speak('Waiting');await flush();listener({state:'cancelled'});assert.equal(speaker.active(),false);release();await flush();assert.equal(played,0);
  speaker.speak('Try again');await flush();assert.equal(played,1);assert.equal(speaker.active(),false);
});
test('browser voice preview excludes remote voices and never falls back to a cloud default',async()=>{
  const spoken=[];class Utterance{constructor(text){this.text=text;}}
  const synth={getVoices:()=>[{name:'Cloud',localService:false,default:true},{name:'Local',localService:true,lang:'en-US'}],cancel(){},speak:u=>spoken.push(u)};
  const bridge=createBrowserSpeechBridge({speechSynthesis:synth,SpeechSynthesisUtterance:Utterance});assert.deepEqual((await bridge.speechStatus()).voices,[{name:'Local',lang:'en-US'}]);
  assert.equal(bridge.speak({id:1,text:'Hello',voice:'Cloud',volume:.5,rate:1,pitch:1}),true);assert.equal(spoken[0].voice.name,'Local');
  synth.getVoices=()=>[{name:'Cloud',localService:false}];assert.equal(bridge.speak({text:'Do not send this'}),false);assert.equal(spoken.length,1);
});
function fakeProcesses(){
  const jobs=[];return {jobs,spawnProcess:(command,args,options)=>{const p=new EventEmitter();p.stdout=new EventEmitter();p.stdout.setEncoding=()=>{};p.stderr=new EventEmitter();p.stdin=new EventEmitter();p.stdin.end=content=>p.input=JSON.parse(content);p.kill=()=>p.killed=true;p.args=args;p.command=command;p.options=options;jobs.push(p);return p;}};
}
test('native speech keeps untrusted text out of command arguments, bounds delivery, cancels old processes, and ignores their events',()=>{
  const fake=fakeProcesses(),events=[],adapter=createSpeechAdapter(e=>events.push(e),{platform:'win32',spawnProcess:fake.spawnProcess});
  const text='$(Get-Secret) <speak>Hello</speak> “dragon”';assert.equal(adapter.speak({id:1,text,voice:'Installed',volume:2,rate:100,automatic:true}),true);
  const first=fake.jobs[0];assert.equal(first.input.text,text);assert.equal(first.args.some(arg=>arg.includes('Get-Secret')),false);assert.equal(first.input.volume,100);assert.ok(first.input.rate<=5);assert.equal(first.options.windowsHide,true);
  first.stdout.emit('data','{"state":"spe');first.stdout.emit('data','aking"}\n');assert.equal(events.at(-1).state,'speaking');
  adapter.speak({id:2,text:'Manual answer',volume:.5,rate:1});assert.equal(first.killed,true);first.stdout.emit('data','{"state":"ended"}\n');assert.equal(events.at(-1).id,1);
  adapter.stopAutomatic();assert.notEqual(fake.jobs[1].killed,true);adapter.stop();assert.equal(fake.jobs[1].killed,true);assert.equal(events.at(-1).id,2);adapter.close();assert.equal(adapter.speak({id:3,text:'After quit'}),false);
});
test('native voice discovery is deduplicated, bounded and shut down with the app; helper errors are surfaced',async()=>{
  const fake=fakeProcesses(),events=[],adapter=createSpeechAdapter(e=>events.push(e),{platform:'win32',spawnProcess:fake.spawnProcess});
  const probe=adapter.status();assert.equal(adapter.status(),probe);assert.equal(fake.jobs.length,1);
  fake.jobs[0].stdout.emit('data',JSON.stringify({voices:[{name:'David',lang:'en-US'},{name:5,lang:'en'}]}));fake.jobs[0].emit('exit',0);assert.deepEqual((await probe).voices,[{name:'David',lang:'en-US'}]);
  adapter.speak({id:4,text:'Fail'});fake.jobs[1].emit('error',Error('No voice'));assert.equal(events.at(-1).state,'error');
  const pending=adapter.status();adapter.close();assert.equal(fake.jobs[2].killed,true);assert.equal((await pending).ready,false);
});
