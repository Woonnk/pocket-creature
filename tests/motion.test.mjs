import test from 'node:test';
import assert from 'node:assert/strict';
import {createMotionController,MOTION_STYLES,neutralMotion} from '../renderer/motion.mjs';
const settings={sprite:'original',motionLevel:'normal',personality:'playful',littleHabits:false};
const context={x:500,y:700,dir:1,height:0};
test('walking follows actual distance at 30, 60, and 144 Hz with opposite paws',()=>{
 const results=[];
 for(const hz of [30,60,144]){const m=createMotionController({random:()=>.5});m.update(settings,context,0,0);let f;
  for(let i=1;i<=hz*2;i++)f=m.update(settings,{...context,x:500+85*i/hz},i*1000/hz,1/hz);
  assert.equal(f.mode,'walk');assert.ok(f.front.angle*f.back.angle<=0);assert.ok(f.front.y+f.body.y<=.0001&&f.back.y+f.body.y<=.0001);assert.ok(Math.abs(Math.max(f.front.y,f.back.y)+f.body.y)<.0001);results.push(f);
 }
 for(const f of results.slice(1)){assert.ok(Math.abs(f.front.x-results[0].front.x)<.01);assert.ok(Math.abs(f.body.y-results[0].body.y)<.01);}
});
test('each look has different idle motion and levels scale it without altering settings',()=>{
 const poses=[];for(const sprite of Object.keys(MOTION_STYLES)){const s={...settings,sprite},before=JSON.stringify(s),m=createMotionController({random:()=>.5});m.update(s,context,0,0);poses.push(m.update(s,context,1000,.05));assert.equal(JSON.stringify(s),before);}
 assert.equal(new Set(poses.map(p=>p.wing.toFixed(3))).size,4);assert.equal(new Set(poses.map(p=>p.tail.toFixed(3))).size,4);
 const sample=motionLevel=>{const m=createMotionController({random:()=>.5});m.update({...settings,motionLevel},context,0,0);return m.update({...settings,motionLevel},context,1000,.05);};assert.ok(Math.abs(sample('gentle').tail)<Math.abs(sample('lively').tail));
});
test('blink timing varies, double blinks reopen, and blocked poses reset every joint',()=>{
 const m=createMotionController({random:()=>0});m.update(settings,context,1,0);m.update(settings,context,2001,.05);assert.ok(m.update(settings,context,2076,.05).blink<.1);assert.equal(m.update(settings,context,2166,.05).blink,1);assert.ok(m.update(settings,context,2256,.05).blink<.1);assert.equal(m.update(settings,context,2340,.05).blink,1);
 for(const key of ['gameMode','hidden','sleeping','locked','typing','focus','voiceBusy']){assert.ok(m.preview('tail',settings,context,3000));const f=m.update(settings,{...context,[key]:true},3100,.05);assert.equal(m.active,false);assert.equal(f.blink,1);assert.deepEqual(f.body,neutralMotion().body);assert.deepEqual(f.front,neutralMotion().front);}
 const f=m.update({...settings,reducedMotion:true},context,4000,.05);assert.equal(f.mode,'still');assert.equal(m.preview('stroll',{...settings,reducedMotion:true},context,4000),false);
});
test('preview is bounded, makes no travel, expires, and cancels when real movement begins',()=>{
 const m=createMotionController({random:()=>.5});m.update(settings,context,0,0);assert.equal(m.preview('nope',settings,context,1),false);assert.equal(m.preview('stroll',settings,{...context,moving:true},1),false);assert.equal(m.preview('tail',settings,context,1),true);const f=m.update(settings,context,3000,.05);assert.equal(f.preview,'tail');assert.equal(context.x,500);assert.equal(context.y,700);assert.ok(Math.abs(f.tail)<=24);m.update(settings,context,6001,.05);assert.equal(m.active,false);
 assert.ok(m.preview('stroll',settings,context,7000));m.update(settings,{...context,x:501},7100,.05);assert.equal(m.active,false);assert.equal(m.preview('wings',settings,{...context,dragging:true},8000),false);
});
test('fall stretches, impact settles, teleports never trigger a fake landing, and turns ease',()=>{
 const m=createMotionController({random:()=>.5});m.update(settings,context,0,0);let f=m.update(settings,{...context,y:650,vy:600,airborne:true,height:50},50,.05);assert.equal(f.mode,'fall');assert.equal(f.body.sy,1);f=m.update(settings,{...context,y:650,vy:600,airborne:true,height:50},90,.04);assert.ok(f.body.sy>1);assert.ok(f.shadow.scale<1);m.update(settings,context,100,.01);f=m.update(settings,context,180,.05);assert.equal(f.mode,'landing');assert.ok(f.body.sy<1);f=m.update(settings,context,551,.05);assert.equal(f.mode,'idle');
 f=m.update(settings,{...context,dir:-1},600,.02);assert.ok(f.facing>-1&&f.facing<1);for(let i=1;i<=40;i++)f=m.update(settings,{...context,dir:-1},600+i*20,.02);assert.equal(f.facing,-1);
 m.update(settings,{...context,y:300,vy:900,airborne:true},1500,.05);f=m.update(settings,context,1550,.05);assert.notEqual(f.mode,'landing');
});
test('pause recovery and malformed frame signals always yield finite, bounded output',()=>{
 const m=createMotionController({random:()=>NaN});const walk=v=>{for(const x of Object.values(v))if(x&&typeof x==='object')walk(x);else if(typeof x==='number')assert.ok(Number.isFinite(x));};
 for(const s of [{},settings,{sprite:'unknown',motionLevel:'bad',personality:'bad'},{sprite:'toString',motionLevel:'constructor',personality:'__proto__'}]){const f=m.update(s,{x:NaN,y:Infinity,vy:Infinity,lookX:NaN,dir:-1},NaN,Infinity);walk(f);assert.ok(Math.abs(f.tail)<=24);}
 m.update(settings,context,1000,.05);m.update(settings,{...context,hidden:true},2000,.05);const f=m.update(settings,context,999999,.05);assert.equal(f.mode,'idle');assert.equal(f.preview,'none');assert.equal(f.blink,1);
});

test('moving joints hand off continuously to a busy pose, then settle within 220 ms',()=>{
 const m=createMotionController({random:()=>.5});m.update(settings,context,0,0);let f;
 for(let i=1;i<=30;i++)f=m.update(settings,{...context,x:500+i*1.4},i*16, .016);
 const paused={...context,x:542,locked:true},first=m.update(settings,paused,481,.001);assert.equal(first.mode,'pose');assert.deepEqual(first.body,f.body);assert.deepEqual(first.front,f.front);
 const middle=m.update(settings,paused,591,.05);assert.ok(Math.abs(middle.front.x)<Math.abs(first.front.x));const end=m.update(settings,paused,702,.05);assert.deepEqual(end.body,neutralMotion().body);assert.deepEqual(end.front,neutralMotion().front);
 const hard=m.update({...settings,reducedMotion:true},context,703,.001);assert.deepEqual(hard.body,neutralMotion().body);
});
