const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1365,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{
   window.calls={chats:[],speech:[],cancels:0};window.epoch=1;window.take=0;window.savedState=null;
   window.companion={loadState:async()=>savedState||({name:'Wonks',voiceInputEnabled:true,speechEnabled:true,chatMode:'local',wander:true,cursorReactions:true,autoConversations:false,energy:25,coins:53}),saveState:async s=>{savedState=structuredClone(s);},setClickThrough(){},setControlsOpen(){},notify(){},onCursor:fn=>window.cursor=fn,onActivity:fn=>window.activity=fn,onOpenControls:fn=>window.controls=fn,onClock(){},onBeforeQuit(){},
    aiStatus:async()=>({ready:true,model:'test',models:['test'],message:'Local AI ready'}),chat:async p=>{calls.chats.push(p);if(window.deferChat)return new Promise(r=>window.pendingChat=r);return 'A normal conversation reply.';},cancelChat(){window.pendingChat?.('Stale reply');},
    speechStatus:async()=>({ready:true,voices:[{name:'David',lang:'en-US'}],message:'Ready'}),onSpeechState:fn=>window.speechEvent=fn,speak:async p=>{calls.speech.push(p);return true;},stopSpeech(){},
    onVoiceInput:fn=>window.inputEvent=fn,voiceInputStatus:async()=>({state:'ready',epoch,id:0}),cancelVoiceInput:()=>{calls.cancels++;epoch++;const nextEpoch=epoch;setTimeout(()=>inputEvent({state:'ready',epoch:nextEpoch,id:0}),0);},
    startVoiceInput:async()=>true,finishVoiceInput(){}
   };
  });
  await page.goto('http://127.0.0.1:4173');await page.waitForSelector('#pet[data-voice-pose]');
  async function talk(text,{review=false}={}){
   await page.evaluate(()=>{take++;inputEvent({state:'listening',epoch,id:take});});
   await page.waitForSelector('#pet[data-voice-pose="listening"]');
   const before=await page.locator('#pet').evaluate(e=>e.style.transform);await page.evaluate(()=>{cursor({x:50,y:200});cursor({x:1000,y:200});});await page.waitForTimeout(150);assert.equal(await page.locator('#pet').evaluate(e=>e.style.transform),before);
   await page.evaluate(()=>inputEvent({state:'transcribing',epoch,id:take}));await page.waitForSelector('#pet[data-voice-pose="thinking"]');
   await page.evaluate(({text,review})=>inputEvent({state:'transcript',epoch,id:take,text,needsReview:review}),{text,review});
  }
  async function bubble(pattern){await page.waitForFunction(source=>new RegExp(source).test(document.querySelector('#bubble').textContent),pattern.source);}
  await talk('Take a nap');await page.waitForSelector('#pet.sleeping[data-voice-pose="confirmed"]');await page.waitForTimeout(1200);assert.equal(await page.locator('#pet').getAttribute('data-voice-pose'),'none');
  await talk('take a nap');await bubble(/Already tucked/);assert.equal(await page.locator('#pet.sleeping').count(),1);
  await talk('Wake up');await page.waitForSelector('#pet:not(.sleeping)[data-voice-pose="confirmed"]');
  await talk('Give him a snack');await page.waitForFunction(()=>savedState?.energy>=37);assert.equal(await page.evaluate(()=>savedState.coins),53);
  await talk('start a twenty five minute focus session');await page.waitForFunction(()=>savedState.focus.status==='running');assert.equal(await page.evaluate(()=>savedState.focus.duration),1500000);
  const end=await page.evaluate(()=>savedState.focus.end);await talk('start a 5 minute focus session');await bubble(/already running/);assert.equal(await page.evaluate(()=>savedState.focus.end),end);
  await talk('pause focus');await page.waitForFunction(()=>savedState.focus.status==='paused');const remaining=await page.evaluate(()=>savedState.focus.remaining);
  await talk('resume focus');await page.waitForFunction(()=>savedState.focus.status==='running');assert.equal(await page.evaluate(()=>savedState.focus.remaining),remaining);
  await talk('end focus');await page.waitForFunction(()=>savedState.focus.status==='idle');await talk('start a 181 minute focus session');await bubble(/1 to 180/);assert.equal(await page.evaluate(()=>savedState.focus.status),'idle');
  await talk('play fetch');assert.equal(await page.locator('#ball').isVisible(),true);await talk('start a 10 minute focus session');await bubble(/10-minute/);assert.equal(await page.locator('#ball').isVisible(),false);await talk('end focus');
  // Uncertain commands do nothing until the user reviews and sends them.
  await talk('take a nap',{review:true});await page.waitForSelector('#review-voice:visible');assert.equal(await page.locator('#pet.sleeping').count(),0);await page.locator('#review-voice').click();assert.equal(await page.locator('#chat-input').inputValue(),'take a nap');await page.locator('#chat-send').click();await page.waitForSelector('#pet.sleeping');
  await talk('wake up');await talk('repeat that');assert.equal(await page.evaluate(()=>calls.chats.length),0);assert.equal(await page.evaluate(()=>savedState.chatHistory.length),0);
  // Questions mentioning a command still go to conversation; repeat avoids another model call.
  await talk('Why do you tell me to take a nap?');await bubble(/normal conversation/);await page.waitForSelector('#pet[data-voice-pose="none"]');assert.equal(await page.evaluate(()=>calls.chats.length),1);const last=await page.locator('#bubble').textContent();await talk('repeat that');assert.equal(await page.locator('#bubble').textContent(),last);assert.equal(await page.evaluate(()=>calls.chats.length),1);
  await page.evaluate(()=>{deferChat=true;});await talk('What do you think?');await page.waitForFunction(()=>typeof pendingChat==='function');await page.waitForSelector('#pet[data-voice-pose="thinking"]');await page.locator('#cancel-voice').click();await page.waitForSelector('#pet[data-voice-pose="none"]');assert.doesNotMatch(await page.locator('#bubble').textContent(),/Stale/);await page.evaluate(()=>{deferChat=false;});
  // Reduced motion and games keep all voice animations still and preserve the corner.
  await page.evaluate(()=>controls());await page.locator('[data-tab="settings"]').click();await page.locator('#motion-setting').check();await page.waitForFunction(()=>savedState.reducedMotion);
  await page.evaluate(()=>{take++;inputEvent({state:'listening',epoch,id:take});});await page.waitForSelector('#pet[data-voice-pose="listening"]');assert.equal(await page.locator('#pet .head').evaluate(e=>getComputedStyle(e).animationName),'none');await page.locator('#cancel-voice').click();
  await page.locator('[data-settings-tab="games"]').click();await page.locator('#game-mode').selectOption('on');await page.waitForSelector('body.game-mode');await talk('play fetch');await bubble(/game corner/);assert.equal(await page.locator('#ball').isVisible(),false);
  await page.locator('[data-settings-tab="general"]').click();await page.locator('#motion-setting').uncheck();await page.waitForFunction(()=>!savedState.reducedMotion);
  await page.evaluate(()=>{take++;inputEvent({state:'listening',epoch,id:take});});await page.waitForSelector('#pet[data-voice-pose="listening"]');assert.equal(await page.locator('#pet .head').evaluate(e=>getComputedStyle(e).animationName),'none');await page.locator('#cancel-voice').click();
  await page.locator('[data-settings-tab="games"]').click();await page.locator('#game-mode').selectOption('off');await page.waitForSelector('body:not(.game-mode)');
  const speech=await page.evaluate(()=>calls.speech.length);await talk('be quiet');await page.waitForFunction(()=>savedState.quiet===true);assert.equal(await page.locator('#quiet-setting').isChecked(),true);assert.equal(await page.evaluate(()=>calls.speech.length),speech);assert.equal(await page.locator('#voice-dock [data-voice-hold]').isDisabled(),true);
  await page.evaluate(()=>{inputEvent({state:'listening',epoch:epoch-1,id:take+1});inputEvent({state:'transcribing',epoch:epoch-1,id:take+1});inputEvent({state:'transcript',epoch:epoch-1,id:take+1,text:'take a nap'});});await page.waitForTimeout(100);assert.equal(await page.locator('#pet.sleeping').count(),0);await page.locator('#quiet-setting').uncheck();await page.waitForFunction(()=>!savedState.quiet);
  await talk('start a 15 minute focus session');await bubble(/15-minute/);await page.screenshot({path:path.join(__dirname,'../dist/Pocket-Creature-Voice-Commands.png')});
  const demo=await browser.newPage({viewport:{width:1365,height:900}});demo.on('pageerror',e=>errors.push(e.message));
  await demo.goto('file://'+path.join(__dirname,'../dist/Pocket-Creature-Playground.html'));await demo.locator('#pet').focus();await demo.keyboard.press('Enter');await demo.locator('#chat-input').fill('start a 7-minute focus session');await demo.locator('#chat-send').click();await demo.waitForFunction(()=>JSON.parse(localStorage.getItem('pocket-creature-v1'))?.focus?.duration===420000);await demo.reload();await demo.waitForSelector('#focus-badge:visible');assert.equal(await demo.locator('#focus-minutes').inputValue(),'7');
  await demo.locator('#pet').focus();await demo.keyboard.press('Enter');await demo.locator('#chat-input').fill('be quiet');await demo.locator('#chat-send').click();await demo.waitForFunction(()=>JSON.parse(localStorage.getItem('pocket-creature-v1'))?.quiet===true);assert.equal(await demo.locator('#quiet-setting').isChecked(),true);await demo.close();
  assert.deepEqual(errors,[]);console.log('PASS: local care/focus commands without AI, idempotent sleep/timers, reviewed commands, conversation fallback, repeat, cancelled thinking, listening stillness, reduced-motion/game poses, fetch restrictions, quiet capture/playback suppression, stale commands, and standalone typed commands/reloaded timer.');
 }catch(error){console.error('Page errors:',errors);throw error;}finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
