const {chromium}=require('playwright'),assert=require('node:assert/strict');
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1365,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.calls=[];window.companion={loadState:async()=>({coins:42,wander:false,littleHabits:false,dailyRoutines:false,littleInteractions:false,screenAdventures:false,contextReactions:false,home:{enabled:false,routines:false},typingReaction:false}),saveState:async()=>{},setClickThrough(){},rendererReady(){},onOpenControls:fn=>window.controls=fn,onBeforeQuit(){},onCursor(){},onActivity:fn=>window.activity=fn,onClock:fn=>window.clock=fn,onFileContext:fn=>window.file=fn,getRoots:async()=>[],aiStatus:async()=>({ready:true,model:'local',models:['local'],message:'AI connected'}),chat:p=>{calls.push(p);return new Promise(resolve=>window.resolveReply=resolve);}};
  });
  const time=new Date('2026-10-10T12:00:00Z');await page.clock.install({time});await page.goto('http://127.0.0.1:4173');await page.waitForSelector('#pet[data-motion-ready="true"]');await page.clock.pauseAt(new Date(time.getTime()+1000));
  const activity=async(id,title='Page '+id,typingCount=0)=>page.evaluate(s=>activity(s),{contextId:id,category:'browsing',windowTitle:title,typingCount,idleSeconds:0,appAvailable:true});
  const clock=()=>page.evaluate(()=>clock());const count=()=>page.evaluate(()=>calls.length);
  await activity(1);await page.clock.runFor(1500);await clock();assert.equal(await count(),0);
  await activity(2);await page.clock.runFor(1500);await clock();assert.equal(await count(),0);
  await page.clock.runFor(600);await clock();assert.equal(await count(),1);assert.equal(await page.evaluate(()=>calls[0].contextId),'2');
  await activity(3);await page.evaluate(()=>resolveReply({reply:'OLD PAGE MUST NOT APPEAR',reaction:'curious',contextKey:'2'}));await page.clock.runFor(50);assert.equal(await page.locator('#bubble').isVisible(),false);
  await page.clock.runFor(8100);await activity(3,'Page 3',6);await clock();assert.equal(await count(),1);
  await page.clock.runFor(2400);await activity(3);await clock();assert.equal(await count(),1);assert.equal(await page.locator('#pet').evaluate(e=>e.classList.contains('mimicking')),false);
  await page.clock.runFor(200);await clock();assert.equal(await count(),2);await page.evaluate(()=>resolveReply({reply:'The new page has a blue car.',reaction:'curious',contextKey:'3'}));await page.clock.runFor(100);assert.equal(await page.locator('#bubble').textContent(),'The new page has a blue car.');
  await page.clock.runFor(20000);await clock();assert.equal(await count(),2); // stale sensing must not request another observation
  // A file's unread -> read handoff produces one notice after settling.
  await activity(4,'a.py - Code');await page.evaluate(()=>file({name:'a.py',path:'a',unread:true}));await page.clock.runFor(300);await page.evaluate(()=>file({name:'a.py',path:'a',unread:false,summary:'Text sample',excerpt:'print(1)'}));assert.equal(await page.locator('#bubble').isVisible(),false);
  await page.clock.runFor(1800);await clock();assert.match(await page.locator('#bubble').textContent(),/a.py/);assert.equal(await page.locator('#bubble').isVisible(),true);assert.equal(await count(),2);
  // Switching on immediately drops that old notice; a pending file never interrupts a conversation.
  await activity(5,'b.py - Code');await page.evaluate(()=>file({name:'b.py',path:'b',unread:true}));await page.locator('#pet').dispatchEvent('keydown',{key:'Enter'});await page.clock.runFor(2200);await clock();assert.equal(await page.locator('#quick-talk').isVisible(),true);assert.equal(await page.locator('#bubble').isVisible(),false);
  await page.locator('#close-talk').evaluate(e=>e.click());
  // Interrupt a live arm pose and inspect its compensated matrix before settling.
  await page.evaluate(()=>{controls();document.querySelector('#trick-school').open=true;document.querySelector('#trick-choice').value='wave';document.querySelector('#practice-trick').click();});await page.clock.runFor(850);
  // Playwright's JS clock does not control compositor CSS animations. Freeze
  // them at a known mid-wave phase before measuring interruption continuity.
  await page.evaluate(()=>{for(const a of document.querySelector('#dragon').getAnimations({subtree:true}))a.pause();const wave=document.querySelector('#dragon .arm').getAnimations()[0];wave.currentTime=350;});
  const pose=()=>page.locator('#dragon .arm').evaluate(e=>{const m=e.getCTM();return [m.a,m.b,m.c,m.d,m.e,m.f];});const before=await pose();if(process.env.POCKET_CAPTURE_TRANSITIONS)await page.screenshot({path:'/workspace/scratch/eac5d189dfe6/recovery/transition-before.png'});const position=await page.locator('#pet').evaluate(e=>e.style.transform);
  await page.locator('#pet').dispatchEvent('keydown',{key:'Enter'});await page.clock.runFor(16);assert.equal(await page.locator('#dragon').getAttribute('data-pose-transition'),'true');const after=await pose();assert.ok(Math.hypot(after[4]-before[4],after[5]-before[5])<8,'interrupted arm position must remain continuous: '+JSON.stringify({before,after}));
  if(process.env.POCKET_CAPTURE_TRANSITIONS)await page.screenshot({path:'/workspace/scratch/eac5d189dfe6/recovery/transition-handoff.png'});await page.clock.runFor(260);if(process.env.POCKET_CAPTURE_TRANSITIONS)await page.screenshot({path:'/workspace/scratch/eac5d189dfe6/recovery/transition-settled.png'});assert.equal(await page.locator('#dragon').getAttribute('data-pose-transition'),'false');assert.equal(await page.locator('#dragon [data-pose-blend][transform]').count(),0);assert.equal(await page.locator('#pet').evaluate(e=>e.style.transform),position);
  // A 3D spin keeps its own animation and never leaves a stale 2D offset.
  await page.locator('#close-talk').evaluate(e=>e.click());await page.clock.runFor(12000);await page.evaluate(()=>{document.querySelector('#trick-choice').value='spin';document.querySelector('#practice-trick').click();});await page.clock.runFor(100);
  await page.evaluate(()=>{const a=document.querySelector('#habit-art').getAnimations()[0];a.pause();a.currentTime=1000;});assert.equal(await page.locator('#habit-art').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).is2D),false);
  await page.locator('#pet').dispatchEvent('keydown',{key:'Enter'});await page.clock.runFor(16);assert.equal(await page.locator('#dragon [data-pose-blend="habit-art"]').getAttribute('transform'),null);await page.clock.runFor(260);assert.equal(await page.locator('#dragon [data-pose-blend][transform]').count(),0);
  await page.evaluate(()=>activity({contextId:6,category:'gaming',idleSeconds:0}));await page.clock.runFor(50);assert.equal(await page.locator('#dragon [data-pose-blend][transform]').count(),0);assert.equal(await page.locator('#pet').getAttribute('data-motion-mode'),'still');const pinned=await page.locator('#pet').evaluate(e=>e.style.transform);await page.clock.runFor(500);assert.equal(await page.locator('#pet').evaluate(e=>e.style.transform),pinned);
  assert.equal(await page.locator('#coins').textContent(),'42');assert.deepEqual(errors,[]);console.log('PASS: stable foreground timing, rapid-switch coalescing, typing pause independent of mimic setting, stale AI result/sensing rejection, merged delayed file notice, conversation priority, interrupted pose continuity, completed blends, unchanged position/rewards, and pinned games.');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
