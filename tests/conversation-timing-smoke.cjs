const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1365,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const dateNow=Date.now,perfNow=performance.now.bind(performance),raf=requestAnimationFrame.bind(window);window.offset=0;Date.now=()=>dateNow()+window.offset;performance.now=()=>perfNow()+window.offset;requestAnimationFrame=fn=>raf(t=>fn(t+window.offset));
   window.calls=[];window.autoLine='Hi! What is that little red car?';window.companion={loadState:async()=>({wander:false}),saveState:async()=>{},setClickThrough:()=>{},onOpenControls:()=>{},onBeforeQuit:()=>{},onCursor:()=>{},onClock:fn=>window.clock=fn,onActivity:fn=>window.activity=fn,onFileContext:fn=>window.fileContext=fn,getRoots:async()=>[],aiStatus:async()=>({ready:true,model:'local',models:['local'],message:'AI connected · local'}),chat:async payload=>{window.calls.push(payload);return payload.automatic?{reply:window.autoLine,contextKey:payload.contextId}:new Promise(resolve=>window.finishManual=resolve);}};
  });
  await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>document.querySelector('#ai-status').textContent.includes('AI connected'));await page.waitForTimeout(800);assert.equal(await page.locator('#bubble').isVisible(),false);
  await page.evaluate(()=>{window.activity({category:'browsing',contextId:1,idleSeconds:0});window.offset+=3000;window.clock();});await page.waitForFunction(()=>document.querySelector('#bubble').textContent==='What is that little red car?');
  const count=await page.evaluate(()=>window.calls.length);await page.evaluate(()=>{window.offset+=60000;window.clock();});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.calls.length),count);
  await page.locator('#pet').click();await page.locator('#chat-input').fill('It is my favorite car.');await page.locator('#chat-send').click();await page.waitForFunction(()=>typeof window.finishManual==='function');
  assert.deepEqual(await page.evaluate(()=>window.calls.at(-1).conversationStarter),{text:'What is that little red car?',contextId:'1'});
  await page.evaluate(()=>{window.fileContext({name:'new.txt',path:'new.txt',unread:true});window.clock();});assert.equal(await page.locator('#quick-talk').isVisible(),true);assert.equal(await page.locator('#bubble').isVisible(),false);
  await page.evaluate(()=>window.finishManual('That little red car is a nice choice.'));await page.waitForFunction(()=>!document.querySelector('#chat-send').disabled);
  await page.evaluate(()=>{window.activity({category:'browsing',contextId:1,idleSeconds:150});window.activity({category:'browsing',contextId:1,idleSeconds:0});window.fileContext({name:'another.txt',path:'another.txt',unread:true});});assert.equal(await page.locator('#bubble').textContent(),'That little red car is a nice choice.');assert.equal(await page.locator('#bubble').isVisible(),true);
  const afterManual=await page.evaluate(()=>window.calls.length);await page.evaluate(()=>{window.offset+=80000;window.clock();});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.calls.length),afterManual);
  await page.evaluate(()=>{window.autoLine='Hello! A little blue car caught my eye.';window.offset+=15000;window.clock();});await page.waitForFunction(()=>document.querySelector('#bubble').textContent==='A little blue car caught my eye.');assert.ok(await page.evaluate(()=>window.calls.length>2));
  assert.deepEqual(errors,[]);console.log('PASS: silent startup/idle return, greeting removal preserves the topic, two-minute question pause, reply-to-starter context, no file interruption while typing/thinking, protected manual bubble, and automatic commentary resumes after the conversation pause.');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
