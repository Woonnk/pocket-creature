import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {normalize} from '../renderer/core.mjs';
import {wavEnvelope,visemeOpening,createVoiceMotion} from '../renderer/voice-motion.mjs';
import {dragonSoundAllowed,createDragonSounds} from '../renderer/dragon-sounds.mjs';
import {createDesktopSpeechBridge} from '../renderer/speech.mjs';
const require=createRequire(import.meta.url),wav=require('./voice-wav.cjs');
test('WAV mouth envelope follows actual samples and silence without reading outside chunks',()=>{
 const envelope=wavEnvelope(wav());assert.equal(envelope.duration,1);assert.equal(envelope.values[0],0);assert.ok(envelope.values[10]>.5);assert.equal(envelope.values[22],0);assert.ok(envelope.values[35]>.5);assert.equal(envelope.values[49],0);
 const truncated=wav().subarray(0,100);assert.equal(wavEnvelope(truncated),null);const bad=wav();bad.writeUInt16LE(100,32);assert.equal(wavEnvelope(bad),null);bad.writeUInt16LE(2,32);bad.writeUInt16LE(7,20);assert.equal(wavEnvelope(bad),null);
 assert.equal(wavEnvelope(new Uint8Array(44)),null);
});
test('PCM 8/24/32 and float WAV formats produce finite bounded envelopes',()=>{
 for(const [code,bits] of [[1,8],[1,24],[1,32],[3,32]]){
  const base=wav(),width=bits/8,frames=16000,b=Buffer.alloc(44+frames*width);base.copy(b,0,0,44);b.writeUInt32LE(b.length-8,4);b.writeUInt16LE(code,20);b.writeUInt32LE(frames*width,28);b.writeUInt16LE(width,32);b.writeUInt16LE(bits,34);b.writeUInt32LE(frames*width,40);
  for(let i=0;i<frames;i++){const sample=base.readInt16LE(44+i*2)/32768,p=44+i*width;if(code===3)b.writeFloatLE(sample,p);else if(bits===8)b.writeUInt8(Math.round(sample*127+128),p);else if(bits===24)b.writeIntLE(Math.round(sample*8388607),p,3);else b.writeInt32LE(Math.round(sample*2147483647),p);}
  const envelope=wavEnvelope(b);assert.ok(envelope.values[10]>.5);assert.equal(envelope.values[22],0);assert.ok(envelope.values.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 }
});
test('mouth follows silence, native visemes and word boundaries; stopped and old events stay closed',()=>{
 const v=createVoiceMotion(),s=normalize();v.receive({id:1,state:'pending',text:'Hello. Look here.'},0);v.receive({id:1,state:'speaking'},0);
 v.receive({id:1,state:'timing',kind:'amplitude',value:.8},10);assert.ok(v.update(s,{},20,.05).mouth>.6);
 v.receive({id:1,state:'timing',kind:'amplitude',value:0},40);for(let n=40;n<200;n+=20)v.update(s,{},n,.02);assert.ok(v.update(s,{},200,.02).mouth<.03);
 v.receive({id:1,state:'timing',kind:'viseme',value:2,duration:100},220);assert.ok(v.update(s,{},240,.05).mouth>.7);
 v.receive({id:1,state:'timing',kind:'viseme',value:21,duration:50},250);assert.equal(visemeOpening(21),0);
 v.receive({state:'stopped'},260);v.receive({id:1,state:'timing',kind:'amplitude',value:1},270);assert.equal(v.update(s,{},300,.05).mouth,0);
 v.receive({id:2,state:'pending',text:'Another word'},300);v.receive({id:2,state:'speaking'},300);v.receive({id:1,state:'ended'},310);v.receive({id:2,state:'timing',kind:'word',index:0,length:7},320);assert.ok(v.update(s,{},340,.05).mouth>.3);
});
test('voice mouth closes when timing stops and gestures follow phrases without moving world position',()=>{
 const v=createVoiceMotion(),s=normalize();v.receive({id:1,state:'pending',text:'Hello. Look.'},0);v.receive({id:1,state:'speaking'},0);v.receive({id:1,state:'timing',kind:'word',index:0,length:5},10);
 assert.ok(v.update(s,{},250,.05).arm<0);for(let n=400;n<900;n+=50)v.update(s,{},n,.05);assert.ok(v.update(s,{},900,.05).mouth<.01);
 v.receive({id:1,state:'timing',kind:'word',index:7,length:4},1000);assert.ok(v.update(s,{},1250,.05).arm<-2);
 for(const context of [{gameMode:true},{hidden:true},{sleeping:true},{typing:true},{voiceBusy:true},{dragging:true},{locked:true},{moving:true},{carrying:true}]){const f=v.update(s,context,1300,.05);assert.equal(f.arm,0);assert.equal(f.head,0);}
 assert.equal(v.update({...s,reducedMotion:true},{},1300,.05).mouth,0);
 const off=v.update({...s,speechGestures:false},{},1300,.05);assert.equal(off.head,0);assert.equal(off.arm,0);
});
test('cozy, curious, cheeky and playful have different bounded body language; posture changes ease',()=>{
 const frames=['cozy','curious','cheeky','playful'].map(personality=>{const v=createVoiceMotion();let frame;for(let i=0;i<20;i++)frame=v.update(normalize({personality}),{},i*50,.05);return frame;});
 assert.ok(frames[0].y>0);assert.ok(frames[1].lean<0);assert.ok(frames[2].gazeX>0);assert.equal(frames[3].gazeX,0);
 const v=createVoiceMotion();v.update(normalize({personality:'cozy'}),{},0,.05);const a=v.update(normalize({personality:'cozy'}),{},50,.05),b=v.update(normalize({personality:'cheeky'}),{},51,1/60);assert.ok(Math.abs(b.head-a.head)<1);
});
test('new preferences preserve progress, default sounds off and bound sound volume',()=>{
 const s=normalize({coins:55,dragonSoundVolume:Infinity});assert.equal(s.coins,55);assert.equal(s.speechGestures,true);assert.equal(s.dragonSounds,false);assert.equal(s.dragonSoundVolume,.25);assert.equal(normalize({dragonSoundVolume:5}).dragonSoundVolume,.75);
});
test('dragon sounds obey quiet, focus, games, hidden, microphone, speech and zero volume',()=>{
 const s=normalize({dragonSounds:true});assert.equal(dragonSoundAllowed(s),true);
 for(const c of [{hidden:true},{gameMode:true},{listening:true},{speaking:true},{focused:true}])assert.equal(dragonSoundAllowed(s,c),false);
 assert.equal(dragonSoundAllowed({...s,quiet:true}),false);assert.equal(dragonSoundAllowed({...s,dragonSoundVolume:0}),false);
});
test('sound generation bounds volume, cancels oscillators and avoids repeats or late resume playback',async()=>{
 let at=5000,context={},release,starts=0,stops=0,levels=[];
 const parameter={setValueAtTime:v=>levels.push(v),linearRampToValueAtTime:v=>levels.push(v),exponentialRampToValueAtTime(){}};
 class AudioContext{constructor(){this.state='running';this.currentTime=0;}createOscillator(){return {type:'',frequency:parameter,connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}createGain(){return {gain:parameter,connect(){},disconnect(){}};}}
 const sounds=createDragonSounds({getSettings:()=>normalize({dragonSounds:true}),getContext:()=>context,host:{AudioContext},now:()=>at});
 assert.equal(await sounds.play('happy'),true);assert.equal(starts,2);assert.equal(await sounds.play(),false);sounds.stop();assert.ok(stops>=4);at+=2000;context={gameMode:true};assert.equal(await sounds.play(),false);assert.ok(levels.includes(.25*.09));
 class Suspended extends AudioContext{constructor(){super();this.state='suspended';}resume(){return new Promise(r=>release=r);}}
 const waiting=createDragonSounds({getSettings:()=>normalize({dragonSounds:true}),getContext:()=>({}),host:{AudioContext:Suspended},now:()=>at});const pending=waiting.play();waiting.stop();release();assert.equal(await pending,false);assert.equal(starts,2);
});
test('Kokoro timing samples playback currentTime, mutes buffering, and cancels its timer with audio',async()=>{
 let item;const events=[];class Audio{constructor(){item=this;this.currentTime=.2;this.paused=false;}pause(){this.paused=true;}async play(){this.onplaying();}}
 const bridge=createDesktopSpeechBridge({synthesize:async p=>({id:p.id,audio:wav()}),stopSpeech(){}},{getSettings:()=>({speechEngine:'kokoro'}),host:{Audio,Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}}}});bridge.onSpeechState(e=>events.push(e));
 await bridge.speak({id:1,volume:.5});await new Promise(r=>setTimeout(r,45));assert.ok(events.at(-1).value>.5);item.onwaiting();await new Promise(r=>setTimeout(r,30));assert.equal(events.at(-1).value,0);item.onplaying();item.currentTime=.45;await new Promise(r=>setTimeout(r,30));assert.equal(events.at(-1).value,0);bridge.stopSpeech();const count=events.length;await new Promise(r=>setTimeout(r,30));assert.equal(events.length,count);
});
