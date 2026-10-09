import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{rendererFiles}=require('../desktop/renderer-files.cjs'),{createStartupGuard}=require('../desktop/startup.cjs');
const root=path.resolve('renderer');
test('desktop asset inventory includes the entire renderer import graph and excludes private paths',()=>{
 const files=rendererFiles(root),seen=new Set();
 function visit(name){if(seen.has(name))return;seen.add(name);assert.ok(files.has(name),'Renderer route missing '+name);const text=fs.readFileSync(path.join(root,name),'utf8');for(const match of text.matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+)['"]/g))visit(match[1]);}
 visit('app.mjs');assert.ok(seen.has('voice-commands.mjs'));assert.ok(seen.has('home.mjs'));assert.ok(seen.has('home-view.mjs'));assert.ok(seen.has('task-reactions.mjs'));
 for(const name of ['../desktop/main.cjs','../companion.json','companion.json','package.json','/app.mjs','missing.mjs'])assert.equal(files.has(name),false);
});
function fixture(){let callback,shows=0,failures=[],cleared=0;const calls=[],win={isDestroyed:()=>false,setIgnoreMouseEvents:(...args)=>calls.push(['ignore',...args]),hide:()=>calls.push(['hide'])};const guard=createStartupGuard({getWindow:()=>win,onReady:()=>shows++,onFailure:message=>failures.push(message),setTimer:fn=>{callback=fn;return 1;},clearTimer:()=>cleared++});return {guard,calls,timeout:()=>callback(),get shows(){return shows;},get failures(){return failures;},get cleared(){return cleared;}};}
test('native startup stays click-through and waits for renderer readiness instead of DOM readiness',()=>{
 const f=fixture();f.guard.start();assert.equal(f.guard.canInteract(),false);assert.deepEqual(f.calls,[['ignore',true,{forward:true}]]);assert.equal(f.shows,0);assert.equal(f.guard.ready(),true);assert.equal(f.guard.canInteract(),true);assert.equal(f.shows,1);assert.equal(f.cleared,1);assert.equal(f.guard.ready(),false);assert.equal(f.shows,1);
});
test('startup timeout or later renderer failure releases desktop input and cannot reopen the overlay',()=>{
 const f=fixture();f.guard.start();f.timeout();assert.equal(f.guard.state,'failed');assert.equal(f.guard.canInteract(),false);assert.deepEqual(f.calls.slice(-2),[['ignore',true,{forward:true}],['hide']]);assert.equal(f.failures.length,1);assert.equal(f.guard.ready(),false);f.guard.fail('Another event');assert.equal(f.failures.length,1);
 const ready=fixture();ready.guard.start();ready.guard.ready();ready.guard.fail('Renderer unresponsive');assert.equal(ready.guard.canInteract(),false);assert.deepEqual(ready.calls.slice(-2),[['ignore',true,{forward:true}],['hide']]);assert.equal(ready.failures[0],'Renderer unresponsive');
});
