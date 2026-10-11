import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {normalize} from '../renderer/core.mjs';
import {decodeObservation,createReactionController} from '../renderer/reactions.mjs';
const require=createRequire(import.meta.url),{chatWithLocalModel}=require('../desktop/chat.cjs');
test('old saves acquire physical reactions without losing preferences and rewards',()=>{
 const old=normalize({version:5,name:'Lil Wonks',coins:42,theme:'forest',gameMode:'on'});assert.equal(old.version,15);assert.equal(old.physicalReactions,true);assert.equal(old.coins,42);assert.equal(old.theme,'forest');assert.equal(normalize({physicalReactions:false}).physicalReactions,false);assert.equal(normalize({physicalReactions:'yes'}).physicalReactions,true);
});
test('model reactions require concrete evidence and image-backed errors/victories',()=>{
 const event=(event,evidence)=>({reply:'A little observation.',event,evidence});assert.equal(decodeObservation(event('discovery','enemy.py'),{fileName:'enemy.py'}).reaction,'curious');assert.equal(decodeObservation(event('discovery','unrelated.txt'),{fileName:'enemy.py'}).reaction,'none');
 assert.equal(decodeObservation(event('error','Error: file not found'),{hasImage:true}).reaction,'surprised');assert.equal(decodeObservation(event('error','throw Error in code'),{hasImage:true}).reaction,'none');assert.equal(decodeObservation(event('error','No errors found'),{hasImage:true}).reaction,'none');
 for(const evidence of ['Victory','You won','Level complete']){assert.equal(decodeObservation(event('victory',evidence),{hasImage:true}).reaction,'celebrate');assert.equal(decodeObservation(event('victory',evidence)).reaction,'none');}
 for(const evidence of ['Maybe a victory','Lots of points','Victory tutorial','Did not win'])assert.equal(decodeObservation(event('victory',evidence),{hasImage:true}).reaction,'none');
 assert.equal(decodeObservation({...event('victory','Victory'),reply:'SILENCE'},{hasImage:true}).reaction,'none');assert.equal(decodeObservation({...event('victory','Victory'),reply:'You lost this round.'},{hasImage:true}).reaction,'none');assert.equal(decodeObservation('I noticed a new page.').reaction,'none');assert.equal(decodeObservation('{bad json').reply,'SILENCE');
});
test('physical reactions expire, respect priorities, and keep normal/game cooldowns',()=>{
 const settings=normalize(),r=createReactionController();assert.equal(r.start('surprised',settings,{},0),true);assert.equal(r.current(settings,{},1000),'surprised');assert.equal(r.start('celebrate',settings,{},1000),false);assert.equal(r.current(settings,{},4200),'none');assert.equal(r.start('curious',settings,{},11999),false);assert.equal(r.start('curious',settings,{},12000),true);assert.equal(r.current(settings,{userBusy:true},12001),'none');
 const game=createReactionController();assert.equal(game.start('celebrate',settings,{gameMode:true},0),true);assert.equal(game.current(settings,{gameMode:true},3000),'none');assert.equal(game.start('curious',settings,{gameMode:true},59000),false);assert.equal(game.start('curious',settings,{gameMode:true},60000),true);
 for(const key of ['sleeping','dragging','playing','typing','focus','userBusy','away','dizzy','airborne'])assert.equal(createReactionController().start('curious',settings,{[key]:true},0),false,key);
 assert.equal(createReactionController().start('curious',{...settings,quiet:true},{},0),false);assert.equal(createReactionController().start('curious',{...settings,physicalReactions:false},{},0,true),false);assert.equal(createReactionController().start('invalid',settings,{},0),false);
});
test('structured automatic observations keep metadata out of speech and preserve manual plain replies',async()=>{
 let body;const fetchImpl=async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:JSON.stringify({reply:'Hi! That visible error caught my eye. More details.',event:'error',evidence:'Error: missing file'})}})};};
 assert.deepEqual(await chatWithLocalModel({model:'local',message:'Observe',automatic:true,withReaction:true,image:'current'},{fetchImpl}),{reply:'That visible error caught my eye.',reaction:'surprised'});assert.equal(body.format.type,'object');assert.match(body.messages[0].content,/explicit CURRENT result text/);assert.equal(body.messages.at(-1).images.length,1);
 let manualBody;assert.equal(await chatWithLocalModel({model:'local',message:'Hi',withReaction:true},{fetchImpl:async(_url,options)=>{manualBody=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:'Hello there.'}})};}}),'Hello there.');assert.equal(manualBody.format,undefined);
});
test('older Ollama format rejection falls back once without another capture or emotion guess',async()=>{
 const bodies=[];const answer=await chatWithLocalModel({model:'local',message:'Observe',automatic:true,withReaction:true,image:'current'},{fetchImpl:async(_url,options)=>{bodies.push(JSON.parse(options.body));return bodies.length===1?{ok:false,status:400}:{ok:true,json:async()=>({message:{content:'I noticed a new dialog.'}})};}});assert.deepEqual(answer,{reply:'I noticed a new dialog.',reaction:'none'});assert.equal(bodies.length,2);assert.ok(bodies[0].format);assert.equal(bodies[1].format,undefined);assert.deepEqual(bodies[0].messages.at(-1).images,bodies[1].messages.at(-1).images);
});
