import test from 'node:test';
import assert from 'node:assert/strict';
import {SPRITES,SPRITE_GEOMETRY,applySprite,normalizeSprite} from '../renderer/sprites.mjs';
import {normalize} from '../renderer/core.mjs';
import {encodeBackup,decodeBackup} from '../renderer/backup.mjs';
test('new looks migrate and back up without changing earned progress or preferences',()=>{
 const old=normalize({version:14,name:'Wonks',coins:42,friendship:8,color:'lavender',hat:'wizard',owned:['wizard'],tricks:{wave:{practice:3}},speechEngine:'kokoro',voiceInputEnabled:true,personalMemory:{nickname:'Carter'},home:{bed:'cloud'}});
 assert.equal(old.version,15);assert.equal(old.sprite,'original');
 for(const {id} of SPRITES){const s=normalize({...old,sprite:id});assert.deepEqual({...s,sprite:'original'},old);assert.deepEqual(decodeBackup(encodeBackup(s),s),s);}
 for(const input of [null,{},'<script>',42,'CLOUD'])assert.equal(normalizeSprite(input),'original');
});
test('each new look changes silhouettes and uses only fixed geometry attributes',()=>{
 assert.equal(new Set(SPRITES.map(s=>s.id)).size,4);
 for(const part of ['tail','wing','head','horn-left','ear'])assert.equal(new Set(Object.values(SPRITE_GEOMETRY).map(s=>s[part].d)).size,3);
 for(const look of Object.values(SPRITE_GEOMETRY))for(const attrs of Object.values(look))for(const [key,value] of Object.entries(attrs)){assert.ok(['d','cx','cy','rx','ry'].includes(key));assert.match(value,/^[MLQZHVCSAmlqzhvcsa0-9 .,-]+$/);}
});
test('switching repeatedly restores every original attribute and never touches the face or pose',()=>{
 const node=(part,attrs)=>({dataset:{spritePart:part},attrs:{...attrs},getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}});
 const head=node('head',{d:'M0 0Z'}),belly=node('belly',{rx:'28',ry:'34',transform:'rotate(-12 118 159)'}),nodes=[head,belly];const svg={dataset:{},querySelectorAll:()=>nodes};
 for(const id of ['night','river','cloud','night','original'])applySprite(svg,id);
 assert.deepEqual(head.attrs,{d:'M0 0Z'});assert.deepEqual(belly.attrs,{rx:'28',ry:'34',transform:'rotate(-12 118 159)'});assert.equal(svg.dataset.sprite,'original');applySprite(svg,'river');applySprite(svg,'bad');assert.deepEqual(head.attrs,{d:'M0 0Z'});
});
