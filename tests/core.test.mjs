import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,startFocus,pauseFocus,resumeFocus,finishFocus,focusRemaining,purchase,stepBody} from '../renderer/core.mjs';
test('untrusted and old saved data is bounded and normalized',()=>{
  const s=normalize({name:'a'.repeat(50),energy:Infinity,happiness:-5,coins:-9,owned:['wizard','wizard','bad'],notes:'x'.repeat(7000),reminders:[null,{id:'a',title:'Hi',at:NaN}],focus:{status:'oops'}});
  assert.equal(s.name.length,24);assert.equal(s.energy,85);assert.equal(s.happiness,0);assert.equal(s.coins,0);assert.equal(s.notes.length,6000);assert.deepEqual(s.owned,['none','wizard']);assert.deepEqual(s.reminders,[]);assert.equal(s.focus.status,'idle');assert.equal(normalize(null).name,'Ember');
});
test('focus uses deadlines across pause, reload, and resume',()=>{
  let s=normalize();startFocus(s,25,1000);assert.equal(focusRemaining(s,11000),1490000);
  pauseFocus(s,11000);assert.equal(focusRemaining(s,500000),1490000);
  s=normalize(JSON.parse(JSON.stringify(s)));resumeFocus(s,600000);assert.equal(s.focus.end,2090000);
  assert.equal(finishFocus(s,2089999),false);assert.equal(finishFocus(s,2090000),true);assert.equal(s.coins,15);assert.equal(s.sessions,1);assert.equal(finishFocus(s,3000000),false);assert.equal(s.coins,15);
});
test('an elapsed saved session rewards once on next open',()=>{const s=normalize();startFocus(s,1,100);const reloaded=normalize(JSON.parse(JSON.stringify(s)));assert.equal(finishFocus(reloaded,100000),true);assert.equal(finishFocus(reloaded,100001),false);assert.equal(reloaded.sessions,1);});
test('wardrobe purchases never overdraft or charge again',()=>{const s=normalize();assert.equal(purchase(s,'wizard'),false);s.coins=30;assert.equal(purchase(s,'crown'),true);assert.equal(s.coins,0);assert.equal(purchase(s,'crown'),true);assert.equal(s.coins,0);assert.equal(purchase(s,'unknown'),false);assert.equal(purchase(s,'none'),true);});
test('physics clamps long frames and keeps thrown objects in the playground',()=>{const b={x:10,y:10,vx:-900,vy:10000};const box={left:0,right:100,top:0,floor:100};stepBody(b,5,box,.5);assert.ok(b.x>=0&&b.x<=100);assert.ok(b.y>=0&&b.y<=100);assert.ok(b.vx>=0);assert.ok(b.vy<0);for(let i=0;i<1000;i++)stepBody(b,1/60,box);assert.ok(Number.isFinite(b.y));assert.ok(b.x>=0&&b.x<=100);assert.ok(b.y>=0&&b.y<=100);});
