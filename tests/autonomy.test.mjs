import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {observeProject,rememberConversation,createAutoScheduler,createConversationGuard,briefReply,createCommentFilter} from '../renderer/autonomy.mjs';
import {normalize} from '../renderer/core.mjs';
import {fileGreeting,localReply} from '../renderer/companion.mjs';
const require=createRequire(import.meta.url);
const {chatWithLocalModel,checkLocalAI}=require('../desktop/chat.cjs');
const {captureSelectedScreen}=require('../desktop/screen.cjs');
test('Ollama short-budget regression disables thinking, retries once, and uses custom name',async()=>{
 const bodies=[];const fetchImpl=async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');bodies.push(JSON.parse(options.body));return {ok:true,json:async()=>bodies.length===1?{message:{thinking:'reasoning only',content:''},done_reason:'length'}:{message:{content:'Hello from Lil Wonks.'}}};};
 assert.equal(await chatWithLocalModel({model:'qwen3.5:4b',message:'Hi',name:'Lil Wonks'},{fetchImpl}),'Hello from Lil Wonks.');assert.equal(bodies.length,2);assert.equal(bodies[0].think,false);assert.equal(bodies[0].options.num_predict,1024);assert.equal(bodies[1].options.num_predict,2048);assert.match(bodies[0].messages[0].content,/Lil Wonks/);
 let calls=0;await assert.rejects(chatWithLocalModel({model:'qwen3.5:4b',message:'Hi'},{fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({message:{content:''}})};}}),/after one retry/);assert.equal(calls,2);
});
test('model discovery selects installed local model and honors thinking and vision metadata',async()=>{
 const fetchImpl=async url=>({ok:true,json:async()=>url.endsWith('/tags')?{models:[{name:'huge:cloud'},{name:'qwen3.5:4b'}]}:{capabilities:['completion','vision'],thinking:{values:[true,false],default:true}}});
 const status=await checkLocalAI('',{fetchImpl});assert.equal(status.ready,true);assert.equal(status.model,'qwen3.5:4b');assert.equal(status.vision,true);assert.equal(status.think,false);assert.deepEqual(status.models,['qwen3.5:4b']);
 assert.equal((await checkLocalAI('missing',{fetchImpl})).ready,false);assert.equal((await checkLocalAI('',{fetchImpl:async()=>{throw Error('offline');}})).ready,false);
});
test('vision payload and unread filename observations remain grounded',async()=>{
 const file={name:'enemy.py',unread:true},memory={description:'a horror game',files:['main.py']};assert.match(fileGreeting(file),/noticed/);assert.match(localReply('what functions?',file),/haven’t read/);
 let body;await chatWithLocalModel({model:'vision',message:'React',file,memory,image:'aW1hZ2U=',automatic:true,activity:{category:'gaming'}},{fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:'SILENCE'}})};}});assert.deepEqual(body.messages.at(-1).images,['aW1hZ2U=']);assert.match(body.messages[1].content,/NOT read/);assert.match(body.messages[0].content,/Do not invent/);
});
test('screen capture uses only selected display with bounded thumbnails',async()=>{
 let options;const thumbnail={isEmpty:()=>false,toJPEG:quality=>{assert.equal(quality,65);return Buffer.from('image');}};const getSources=async value=>{options=value;return [{display_id:'2',thumbnail}];};assert.equal(await captureSelectedScreen({displayId:2,getSources}),Buffer.from('image').toString('base64'));assert.deepEqual(options.types,['screen']);assert.equal(options.thumbnailSize.width,1280);await assert.rejects(captureSelectedScreen({displayId:1,getSources}),/unavailable/);
});
test('automatic memory records facts without saving file contents or replacing explicit descriptions',()=>{
 const file={projectId:'p',project:'Spooky',name:'enemy.py',extension:'py',excerpt:'secret code'};let memory=observeProject(file,null,100);assert.equal(memory.automatic,true);assert.equal(memory.lastSeen,100);assert.equal(JSON.stringify(memory).includes('secret code'),false);memory=rememberConversation("I'm building a horror game.",file,memory);assert.match(memory.description,/horror game/);assert.equal(rememberConversation('What is this?',file,memory),memory);const explicit={...memory,automatic:false,description:'Custom project note'};assert.equal(observeProject({...file,name:'main.py'},explicit).description,'Custom project note');assert.equal(observeProject({name:'unread.py',unread:true},null),null);
 const migrated=normalize({name:'Lil Wonks',coins:25,projectMemories:[memory]});assert.equal(migrated.theme,'dark');assert.equal(migrated.autoConversations,true);assert.equal(migrated.screenAwareness,false);assert.equal(migrated.coins,25);assert.deepEqual(migrated.projectMemories[0].files,['enemy.py']);
});
test('automatic scheduler gates quiet, sleep, concurrent work, and stale replies',()=>{
 const settings=normalize(),scheduler=createAutoScheduler(),context={ready:true,category:'coding'};const token=scheduler.begin(settings,context,0);assert.equal(token,0);assert.equal(scheduler.begin(settings,context,100),null);scheduler.invalidate();assert.equal(scheduler.finish(token),false);assert.equal(scheduler.begin(settings,context,17000),null);const next=scheduler.begin(settings,context,18000);assert.notEqual(next,null);assert.equal(scheduler.finish(next),true);assert.equal(scheduler.begin({...settings,quiet:true},context,50000),null);assert.equal(scheduler.begin(settings,{...context,sleeping:true},50000),null);assert.equal(scheduler.begin(settings,{...context,userBusy:true},50000),null);assert.equal(scheduler.begin(settings,{...context,ready:false},50000),null);assert.equal(scheduler.begin(settings,{...context,category:'gaming'},50000),null);
});

test('automatic replies exclude old conversation and obey bubble length bounds',async()=>{
 let body;const result=await chatWithLocalModel({model:'qwen3.5:4b',message:'Observe now',automatic:true,activity:{category:'browsing',windowTitle:'A new video - YouTube'},history:[{role:'user',content:'OLD TOPIC horror game'},{role:'assistant',content:'OLD RESPONSE'}],recentComments:['I noticed the previous video.']},{fetchImpl:async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:'**I spotted a new video.** Here is a detailed recap of your old horror game. '+Array(100).fill('rambling').join(' ')}})};}});
 assert.equal(result,'I spotted a new video.');assert.equal(body.messages.some(m=>m.content.includes('OLD TOPIC')),false);assert.equal(body.messages.filter(m=>m.role==='assistant').length,0);assert.match(body.messages[1].content,/A new video/);assert.match(body.messages[0].content,/ONLY avoid repeating/);
 const long=Array(100).fill('word').join(' ');assert.ok(briefReply(long,true).split(/\s+/).length<=24);assert.ok(briefReply(long,true).length<=170);assert.ok(briefReply(long).split(/\s+/).length<=40);assert.equal(briefReply('SILENCE.'),'SILENCE');assert.equal(briefReply('**enemy.py** has chase(). It follows the player.',true),'enemy.py has chase().');assert.equal(briefReply('One. Two. Three.'),'One. Two.');
 const filter=createCommentFilter();assert.equal(filter.accept('I spotted a new video.'),true);assert.equal(filter.accept('I spotted a new video!'),false);assert.equal(filter.accept('That game has a snowy map.'),true);assert.equal(filter.accept('SILENCE'),false);
});


test('automatic greetings are removed before trimming the useful observation',()=>{
 for(const greeting of ['Hi!','Hello there!','Hey, Noodle!','Hi Noodle!','Welcome back!'])assert.equal(briefReply(greeting+' I noticed a tiny red car. More words.',true),'I noticed a tiny red car.');
 for(const greeting of ['Hi','Hello!','Hey there!','Hi! I’m Lil Wonks.'])assert.equal(briefReply(greeting,true),'SILENCE');
 assert.equal(briefReply('Hi! How are you?'),'Hi! How are you?');
});
test('conversation guard waits for answers, protects manual turns, and expires context',()=>{
 const guard=createConversationGuard();guard.observe('What is chase() doing?',7,0);assert.equal(guard.blocked(119999),true);assert.equal(guard.blocked(120000),false);assert.deepEqual(guard.replyTo(7,1000),{text:'What is chase() doing?',contextId:'7'});assert.equal(guard.replyTo(8,1000),null);assert.equal(guard.replyTo(7,180000),null);
 guard.hold(120000);assert.equal(guard.blocked(209999),true);assert.equal(guard.blocked(210000),false);guard.clear();assert.equal(guard.replyTo(7,130000),null);
});
test('manual replies continue the current automatic starter without polluting automatic context',async()=>{
 let body;const fetchImpl=async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:'That is a nice choice.'}})};};
 await chatWithLocalModel({model:'local',message:'A forest game',conversationStarter:'What kind of game are you making?'},{fetchImpl});assert.deepEqual(body.messages.at(-2),{role:'assistant',content:'What kind of game are you making?'});assert.match(body.messages[0].content,/Continue the current conversation/);
 await chatWithLocalModel({model:'local',message:'Observe',automatic:true,conversationStarter:'OLD STARTER'},{fetchImpl});assert.equal(body.messages.some(m=>m.content.includes('OLD STARTER')),false);assert.match(body.messages[0].content,/Never greet/);
});
