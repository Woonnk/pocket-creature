import test from 'node:test';
import assert from 'node:assert/strict';
import {multiplyPose,poseCompensation,settlePose} from '../renderer/transitions.mjs';
import {createActivityTiming,createFileNotice} from '../renderer/reactions.mjs';
import {createTaskReactions} from '../renderer/task-reactions.mjs';
import {normalize} from '../renderer/core.mjs';
const signal=(id,title='File '+id)=>({contextId:id,category:'coding',windowTitle:title});
const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8));
test('pose handoffs preserve the displayed pose then reach the new animation without rotation shrink',()=>{
 const before=[0,1,-1,0,8,3],after=[1.02,0,0,.98,2,5],delta=poseCompensation(before,after);
 near(multiplyPose(settlePose(delta,0),after),before);near(settlePose(delta,1),[1,0,0,1,0,0]);
 const mid=settlePose([0,1,-1,0,0,0],.5);assert.ok(Math.abs(Math.hypot(mid[0],mid[1])-1)<1e-8);
 near(settlePose(delta,-2),delta);near(settlePose(delta,10),[1,0,0,1,0,0]);
});
test('a rapid interrupted handoff continues from the currently displayed matrix',()=>{
 const old=[1,0,0,1,0,8],next=[1,0,0,1,0,-5],third=[1,0,0,1,3,0];
 const displayed=multiplyPose(settlePose(poseCompensation(old,next),.4),next);
 near(multiplyPose(poseCompensation(displayed,third),third),displayed);
 near(poseCompensation(old,[0,0,0,0,0,0]),[1,0,0,1,0,0]);near(poseCompensation(old,[NaN,0,0,1,0,0]),[1,0,0,1,0,0]);
});
test('activity settling coalesces rapid switches, waits after real typing, and requires fresh polls',()=>{
 const t=createActivityTiming();assert.equal(t.ready(0),false);assert.equal(t.observe(signal(1),0),true);assert.equal(t.ready(1999),false);
 assert.equal(t.observe(signal(2),1900),true);assert.equal(t.ready(2000),false);assert.equal(t.ready(3900),true);
 const revision=t.revision;assert.equal(t.observe(signal(2),4000),false);assert.equal(t.revision,revision);
 t.observe({...signal(2),typingCount:8},4100);assert.equal(t.ready(6599),false);assert.equal(t.ready(6600),true);assert.equal(t.ready(10101),false);
 t.observe(signal(2),10200);assert.equal(t.ready(10200),true);t.observe(signal(2,'New tab'),10300);assert.equal(t.ready(10301),false);
});
test('file notices combine loading updates and discard superseded, expired, or interrupted events',()=>{
 const q=createFileNotice(),a={name:'a.py',path:'a'},b={name:'b.py',path:'b'};
 q.offer('Filename only',a,1,0);q.offer('Read sample',a,1,300);assert.equal(q.take(a,1,{ready:true},1499),null);assert.equal(q.take(a,1,{ready:true},1500),'Read sample');assert.equal(q.take(a,1,{ready:true},1600),null);
 q.offer('Old file',a,1,2000);assert.equal(q.take(b,1,{ready:true},4000),null);
 q.offer('Old window',a,1,5000);assert.equal(q.take(a,2,{ready:true},7000),null);
 q.offer('Wait',a,2,8000);assert.equal(q.take(a,2,{busy:true},8001),null);assert.equal(q.take(a,2,{ready:true},10000),null);
 q.offer('Expired',a,2,11000);assert.equal(q.take(a,2,{ready:true},23001),null);
});
test('cooldowns never replay an old task gesture and disconnected sensing cannot keep a pose active',()=>{
 const r=createTaskReactions(),s=normalize();r.observe(signal(1),0);assert.equal(r.current(s,{category:'coding'},3000),'inspect');
 r.observe(signal(2),7000);for(let now=8000;now<=48000;now+=1000){r.observe(signal(2),now);assert.equal(r.current(s,{category:'coding'},now),'none');}
 r.observe(signal(3),49000);assert.equal(r.current(s,{category:'coding'},52000),'inspect');assert.equal(r.current(s,{category:'coding'},55001),'none');
});
