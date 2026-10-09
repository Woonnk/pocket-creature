import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createDesktopSpeechBridge} from '../renderer/speech.mjs';
const {createLocalVoiceAdapter,boundedVoiceBytes}=createRequire(import.meta.url)('../desktop/local-voice.cjs');
function wav(){const bytes=Buffer.alloc(44);bytes.write('RIFF');bytes.write('WAVE',8);return bytes;}
test('Kokoro discovers valid voices at fixed loopback and requests bounded plain speech without voice tags',async()=>{
 const calls=[],voice=createLocalVoiceAdapter({fetchImpl:async(url,options)=>{calls.push({url,options});return url.endsWith('/voices')?new Response(JSON.stringify({voices:['af_heart',{id:'am_puck'},'../../secret',{id:5}]})):new Response(wav());}});
 assert.deepEqual((await voice.status()).voices.map(v=>v.name),['af_heart','am_puck']);const result=await voice.synthesize({id:1,text:'<speak>Hello [voice:evil]</speak>',voice:'../../secret',rate:4});assert.equal(result.audio.length,44);
 assert.ok(calls.every(c=>c.url.startsWith('http://127.0.0.1:8880/v1/audio/')&&c.options.redirect==='error'));
 const payload=JSON.parse(calls.at(-1).options.body);assert.equal(payload.voice,'af_heart');assert.equal(payload.speed,1.4);assert.equal(payload.allow_voice_tags,false);assert.equal(payload.response_format,'wav');assert.equal(payload.model,'kokoro');voice.close();
});
test('local synthesis aborts old work and never returns cancelled audio or falls back to a cloud endpoint',async()=>{
 let release,signal;const voice=createLocalVoiceAdapter({fetchImpl:async(_url,options)=>{signal=options.signal;return new Promise(r=>release=()=>r(new Response(wav())));}});
 const pending=voice.synthesize({id:1,text:'Old line'});voice.stop();assert.equal(signal.aborted,true);release();assert.equal(await pending,null);voice.close();await assert.rejects(()=>voice.synthesize({id:2,text:'After close'}),/Invalid voice/);
});
test('malformed/oversized local responses fail and offline status gives setup guidance',async()=>{
 await assert.rejects(()=>boundedVoiceBytes(new Response('12345'),4),/too large/);
 const voice=createLocalVoiceAdapter({fetchImpl:async()=>new Response('not audio')});await assert.rejects(()=>voice.synthesize({id:1,text:'Hello'}),/invalid audio/);assert.equal((await voice.status()).ready,false);voice.close();
});
test('natural audio playback respects volume, cleans up URLs and ignores a stopped pending synthesis',async()=>{
 let callback,resolve,played=0;const audios=[],revoked=[],events=[];
 class Audio{constructor(url){this.src=url;audios.push(this);}pause(){this.paused=true;}async play(){played++;this.onplaying?.();}}
 const host={Audio,Blob,URL:{createObjectURL:()=>('blob:'+audios.length),revokeObjectURL:u=>revoked.push(u)}};
 const native={onSpeechState:fn=>callback=fn,stopSpeech(){},synthesize:()=>new Promise(r=>resolve=r)};
 const bridge=createDesktopSpeechBridge(native,{getSettings:()=>({speechEngine:'kokoro'}),host});bridge.onSpeechState(e=>events.push(e));
 const pending=bridge.speak({id:1,text:'Hello',volume:.4});bridge.stopSpeech();resolve({id:1,audio:new Uint8Array(wav())});await pending;assert.equal(played,0);
 const next=bridge.speak({id:2,text:'Next',volume:.4});resolve({id:2,audio:new Uint8Array(wav())});assert.equal(await next,true);assert.equal(audios[0].volume,.4);assert.equal(events.at(-1).state,'speaking');callback({state:'cancelled'});assert.equal(audios[0].paused,true);assert.equal(revoked.length,1);
 audios[0].onended();assert.equal(events.at(-1).state,'cancelled');bridge.stopSpeech();
});
