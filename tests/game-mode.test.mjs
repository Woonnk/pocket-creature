import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {normalize,gameActive,gameAnchor} from '../renderer/core.mjs';
import {personalityProfile,personalityLine,PERSONALITIES} from '../renderer/personality.mjs';
import {createCommentator} from '../renderer/companion.mjs';
import {briefReply,createAutoScheduler} from '../renderer/autonomy.mjs';
const require=createRequire(import.meta.url),{createOverlayController}=require('../desktop/overlay.cjs'),{chatWithLocalModel}=require('../desktop/chat.cjs'),{createActivityAdapter}=require('../desktop/activity.cjs');
import {EventEmitter} from 'node:events';
test('personality/game settings migrate without losing progress and reject unknown values',()=>{
 const s=normalize({version:4,name:'Lil Wonks',coins:32,notes:'Keep me',personality:'unknown',gameMode:'unknown',gameCorner:'bad'});assert.equal(s.version,8);assert.equal(s.personality,'playful');assert.equal(s.gameMode,'auto');assert.equal(s.gameClickThrough,true);assert.equal(s.gameFollowMonitor,true);assert.equal(s.coins,32);assert.equal(s.notes,'Keep me');
 assert.equal(gameActive(s,{category:'gaming',appAvailable:true}),true);assert.equal(gameActive(s,{category:'none',appAvailable:true,fullscreen:true}),true);assert.equal(gameActive(s,{category:'browsing',appAvailable:true,fullscreen:true}),false);assert.equal(gameActive({...s,pcAwareness:false},{category:'gaming'}),false);assert.equal(gameActive({...s,gameMode:'on',pcAwareness:false},{category:'none'}),true);assert.equal(gameActive({...s,gameMode:'off'},{category:'gaming'}),false);
 for(const corner of ['top-left','top-right','bottom-left','bottom-right']){const a=gameAnchor(corner,1920,1080);assert.equal(a.x,corner.endsWith('left')?105:1815);assert.equal(a.y,corner.startsWith('top')?245:1045);}
});
test('all personalities supply distinct brief reactions and contextual fallback comments',()=>{
 const intros=new Set();for(const key of Object.keys(PERSONALITIES)){intros.add(personalityLine(key,'intro'));for(const event of ['pet','feed','ball','catch','sleep','wake','return','coding','gaming','music','browsing','typing','focus','none']){const line=briefReply(personalityLine(key,event),true);assert.ok(line&&line.split(/\s+/).length<=24);}
 const c=createCommentator(),settings=normalize({personality:key});assert.equal(c.next({category:'gaming'},settings,0,true),personalityLine(key,'gaming'));}
 assert.equal(intros.size,4);assert.equal(personalityProfile('untrusted').label,'Playful');
});
test('local AI receives selected personality and quiet spectator behavior without loosening short-reply rules',async()=>{
 let body;await chatWithLocalModel({model:'qwen3.5:4b',message:'Observe',personality:'cheeky',gameMode:true,automatic:true},{fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:'My tiny helmet is ready.'}})};}});assert.match(body.messages[0].content,/mischievous/);assert.match(body.messages[0].content,/quiet spectator/);assert.match(body.messages[0].content,/24 words/);assert.match(body.messages[0].content,/Do not invent/);
});
test('game mode cooldown cannot be bypassed by urgent activity or file changes',()=>{
 const scheduler=createAutoScheduler(),s=normalize(),context={ready:true,category:'gaming',gameMode:true};const first=scheduler.begin(s,context,0,true);assert.notEqual(first,null);scheduler.finish(first);assert.equal(scheduler.begin(s,context,8000,true),null);assert.equal(scheduler.begin(s,context,59000,true),null);assert.notEqual(scheduler.begin(s,context,60000,true),null);
});
test('overlay follows game monitor, reasserts above game without focus, respects hide, and restores desktop bounds',()=>{
 let settings=normalize(),time=0,visible=true,baseIndex=0;const calls=[];
 const displays=[{id:1,bounds:{x:0,y:0,width:1920,height:1080},workArea:{x:0,y:0,width:1920,height:1040}},{id:2,bounds:{x:-1280,y:0,width:1280,height:720},workArea:{x:-1280,y:0,width:1280,height:680}}];
 const win={isDestroyed:()=>false,isVisible:()=>visible,setBounds:b=>calls.push(['bounds',b]),setAlwaysOnTop:(...a)=>calls.push(['top',...a]),moveTop:()=>calls.push(['raise']),showInactive:()=>{visible=true;calls.push(['showInactive']);},focus:()=>{throw Error('Game focus must not be stolen');}};
 const screen={getAllDisplays:()=>displays,screenToDipPoint:p=>({x:p.x/1.5,y:p.y/1.5}),getDisplayNearestPoint:p=>{assert.equal(p.x,-640);return displays[1];}};
 const controller=createOverlayController({getWindow:()=>win,getScreen:()=>screen,getSettings:()=>settings,getBaseDisplay:()=>displays[baseIndex],evaluateGame:gameActive,platform:'win32',now:()=>time});controller.update({category:'none',contextId:1});assert.deepEqual(calls.at(-2),['top',true,'floating']);
 const game={category:'gaming',appAvailable:true,fullscreen:true,monitorCenter:{x:-960,y:540},contextId:2};let status=controller.update(game);assert.equal(status.displayId,2);assert.equal(status.active,true);assert.ok(calls.some(c=>c[0]==='bounds'&&c[1]===displays[1].bounds));assert.deepEqual(calls.at(-2),['top',true,'screen-saver']);
 const n=calls.length;time=4000;controller.update(game);assert.equal(calls.length,n);time=5000;controller.update(game);assert.equal(calls.at(-1)[0],'raise');
 visible=false;time=10000;controller.update(game);assert.equal(visible,false);assert.equal(calls.filter(c=>c[0]==='showInactive').length,0);controller.update(game,{show:true,force:true});assert.equal(visible,true);assert.equal(calls.at(-1)[0],'raise');
 baseIndex=0;controller.update(game,{manualDisplay:true});assert.equal(controller.snapshot().displayId,1);controller.update(game);assert.equal(controller.snapshot().displayId,1);status=controller.update({category:'browsing',contextId:3});assert.equal(status.active,false);assert.equal(status.displayId,1);assert.ok(calls.some(c=>c[0]==='bounds'&&c[1]===displays[0].workArea));
 settings={...settings,gameFollowMonitor:false};controller.update(game);assert.equal(controller.snapshot().displayId,1);
});
test('Windows activity adapter validates geometry and retains game context while controls are focused',()=>{
 let child;const spawnProcess=()=>{child=new EventEmitter();child.stdout=new EventEmitter();child.stdout.setEncoding=()=>{};child.stderr=new EventEmitter();child.kill=()=>{};return child;};const a=createActivityAdapter(()=>{},{platform:'win32',spawnProcess});a.configure({pcAwareness:true,typingReaction:false});
 const emit=data=>child.stdout.emit('data',JSON.stringify({process:'Overwatch',typing:0,title:'Overwatch',...data})+'\n');emit({fullscreen:true,monitorCenter:{x:-960,y:540}});assert.equal(a.snapshot().fullscreen,true);assert.deepEqual(a.snapshot().monitorCenter,{x:-960,y:540});const id=a.snapshot().contextId;emit({process:'Pocket Creature',self:true,fullscreen:false,monitorCenter:null,windowSurface:null});assert.equal(a.snapshot().contextId,id);assert.equal(a.snapshot().fullscreen,true);emit({monitorCenter:{x:1e12,y:0},fullscreen:'yes'});assert.equal(a.snapshot().monitorCenter,null);assert.equal(a.snapshot().fullscreen,false);a.stop();assert.equal(a.snapshot().fullscreen,false);
});
