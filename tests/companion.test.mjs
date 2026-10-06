import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inspectText,fileGreeting,localReply,createCommentator} from '../renderer/companion.mjs';
import {normalize} from '../renderer/core.mjs';
const require=createRequire(import.meta.url);
const {createFileService,basenameFromTitle}=require('../desktop/files.cjs');
const {chatWithLocalModel}=require('../desktop/chat.cjs');
test('file observations describe actual sampled structure without executing it',()=>{
 const f=inspectText('enemy.py','import random\nfrom math import sqrt\ndef chase(player):\n    return player\n');assert.deepEqual(f.functions,['chase']);assert.deepEqual(f.imports,['random','math']);assert.match(localReply('what functions?',f),/chase/);assert.match(fileGreeting(f),/enemy.py/);assert.match(fileGreeting(f,{description:'horror game'}),/horror game/);
 assert.match(inspectText('settings.json','{"speed":2}').summary,/speed/);assert.equal(inspectText('big.txt','a'.repeat(40000)).partial,true);assert.throws(()=>inspectText('bad.exe','text'));assert.throws(()=>inspectText('bad.txt','a\0b'));
});
test('commentary respects quiet, event settling, cooldown, and distinct activity categories',()=>{
 const c=createCommentator(),s=normalize(),ctx={category:'none'};c.hold(0);assert.equal(c.next(ctx,s,6000),null);assert.match(c.next({...ctx,category:'gaming'},s,7000),/Game time/);assert.equal(c.next({...ctx,category:'coding'},s,8000),null);assert.match(c.next({...ctx,category:'coding'},s,14000),/Coding time/);assert.equal(c.next(ctx,{...s,quiet:true},60000),null);assert.equal(c.next({...ctx,sleeping:true},s,60000),null);assert.equal(c.next(ctx,{...s,pcAwareness:false},60000),null);
});
test('project memory and chat migration are bounded; raw file content is omitted',()=>{const s=normalize({chatHistory:[{role:'system',content:'bad'},{role:'user',content:'x'.repeat(2000)}],projectMemories:[{id:'p',description:'x'.repeat(900)}],file:{excerpt:'secret'}});assert.equal(s.chatHistory.length,1);assert.equal(s.chatHistory[0].content.length,1500);assert.equal(s.projectMemories[0].description.length,500);assert.equal(s.file,undefined);assert.equal(s.talkativeness,'chatty');});
test('editor title lookup stays in connected folders and refuses ambiguous names',async()=>{
 const temp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pocket-files-')));try{
 const root=path.join(temp,'project');await fs.mkdir(root);await fs.writeFile(path.join(root,'main.py'),'def hello():\n    pass');await fs.writeFile(path.join(temp,'outside.py'),'private');const service=createFileService({inspect:inspectText});await service.addRoot(root);
 assert.equal(basenameFromTitle('*main.py - Project - Visual Studio Code'),'main.py');assert.equal(basenameFromTitle('Secret document - Browser'),'');assert.equal((await service.resolveTitle('main.py - Visual Studio Code')).functions[0],'hello');await assert.rejects(service.inspectFile(path.join(temp,'outside.py')),/outside/);
 await fs.symlink(path.join(temp,'outside.py'),path.join(root,'link.py'));await assert.rejects(service.inspectFile(path.join(root,'link.py')),/outside/);
 await fs.writeFile(path.join(root,'large.txt'),'x'.repeat(262145));await assert.rejects(service.inspectFile(path.join(root,'large.txt')),/256 KB/);
 const second=path.join(temp,'second');await fs.mkdir(second);await fs.writeFile(path.join(second,'main.py'),'# different');await service.addRoot(second);assert.equal((await service.resolveTitle('main.py - Code')).ambiguous,true);service.removeRoot(second);assert.equal((await service.resolveTitle('main.py - Code')).name,'main.py');service.removeRoot(root);assert.equal(await service.resolveTitle('main.py - Code'),null);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('local AI uses fixed localhost endpoint, sampled context, and explicit errors',async()=>{
 let request;const fetchImpl=async(url,opts)=>{request={url,...JSON.parse(opts.body)};return {ok:true,json:async()=>({message:{content:'Look at chase first.'}})};};const answer=await chatWithLocalModel({model:'my-local-model',message:'help',file:inspectText('enemy.py','def chase(): pass'),memory:{description:'a game'},history:[{role:'user',content:'help'}]},{fetchImpl});assert.equal(answer,'Look at chase first.');assert.equal(request.url,'http://127.0.0.1:11434/api/chat');assert.equal(request.stream,false);assert.equal(request.messages.filter(m=>m.role==='user').length,1);assert.match(request.messages[1].content,/untrusted data/);assert.match(request.messages[1].content,/a game/);
 await assert.rejects(chatWithLocalModel({model:'model:cloud',message:'hi'},{fetchImpl}),/installed local model/);await assert.rejects(chatWithLocalModel({model:'local',message:'hi'},{fetchImpl:async()=>{throw Error('offline');}}),/Could not reach/);await assert.rejects(chatWithLocalModel({model:'local',message:'hi'},{fetchImpl:async()=>({ok:false})}),/could not answer/);
});
