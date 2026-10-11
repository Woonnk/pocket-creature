const {openSettingsSection}=require('./panel-helpers.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1365,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{
   window.speechCalls=[];window.stopCalls=0;window.saved=[];
   window.companion={loadState:async()=>({littleInteractions:false,chatMode:'builtin',wander:false}),saveState:async s=>window.saved.push(JSON.parse(JSON.stringify(s))),setClickThrough(){},setControlsOpen(){},notify(){},onOpenControls:fn=>window.controls=fn,onBeforeQuit(){},onClock(){},onCursor:fn=>window.cursor=fn,onActivity:fn=>window.activity=fn,
    speechStatus:async()=>({ready:true,voices:[{name:'Local dragon',lang:'en-US'}],message:'Installed Windows voices ready.'}),onSpeechState:fn=>window.voiceEvent=fn,stopSpeech:()=>window.stopCalls++,speak:async payload=>{window.speechCalls.push(payload);window.voiceEvent({id:payload.id,state:'speaking'});return true;}};
  });
  await page.goto('http://127.0.0.1:4173');await page.waitForSelector('body.desktop');await page.evaluate(()=>window.controls());
  await page.locator('[data-action="pet"]').click();assert.equal(await page.evaluate(()=>speechCalls.length),0);
  await page.locator('[data-tab="settings"]').click();await openSettingsSection(page,'voice');await openSettingsSection(page,'voice');await page.locator('#refresh-voices').click();await page.waitForFunction(()=>document.querySelector('#speech-voice').options.length===2);
  await openSettingsSection(page,'voice');await page.locator('#speech-voice').selectOption('Local dragon');await openSettingsSection(page,'voice');await page.locator('#test-voice').click();await page.waitForFunction(()=>speechCalls.length===1);
  assert.equal(await page.locator('#voice-stop').isVisible(),true);assert.equal(await page.locator('#pet').getAttribute('data-speaking'),'true');
  await page.locator('#voice-stop').click();assert.equal(await page.locator('#voice-stop').isVisible(),false);
  await openSettingsSection(page,'voice');await page.locator('#speech-enabled').check();await page.waitForFunction(()=>saved.at(-1).speechEnabled===true);
  await page.locator('#speech-volume').evaluate(e=>{e.value='.4';e.dispatchEvent(new Event('input',{bubbles:true}));});await openSettingsSection(page,'voice',{advanced:true});await page.locator('#speech-chatter').selectOption('replies');
  await openSettingsSection(page,'general');await page.locator('#personality-preview').click();await page.waitForFunction(()=>speechCalls.length===2);
  assert.equal(await page.evaluate(()=>speechCalls.at(-1).voice),'Local dragon');assert.equal(await page.evaluate(()=>speechCalls.at(-1).volume),.4);assert.equal(await page.evaluate(()=>saved.at(-1).speechVolume),.4);
  // A new response interrupts the old one; its late completion cannot close the new stop control.
  await openSettingsSection(page,'general');await page.locator('#personality-preview').click();await page.waitForFunction(()=>speechCalls.length===3);await page.evaluate(()=>voiceEvent({id:speechCalls[1].id,state:'ended'}));assert.equal(await page.locator('#voice-stop').isVisible(),true);
  await page.locator('#quiet-setting').check();assert.equal(await page.locator('#voice-stop').isVisible(),false);await openSettingsSection(page,'general');await page.locator('#personality-preview').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>speechCalls.length),3);
  await page.locator('#quiet-setting').uncheck();await openSettingsSection(page,'games');await openSettingsSection(page,'games');await page.locator('#game-mode').selectOption('on');await openSettingsSection(page,'general');await page.locator('#personality-preview').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>speechCalls.length),3);assert.match(await page.locator('#speech-status').textContent(),/muted during games/);
  await openSettingsSection(page,'voice',{advanced:true});await page.locator('#speech-games').check();await openSettingsSection(page,'general');await page.locator('#personality-preview').click();await page.waitForFunction(()=>speechCalls.length===4);assert.equal(await page.locator('#voice-stop').isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#voice-stop').isVisible(),false);
  await page.evaluate(()=>window.controls());await page.locator('[data-tab="settings"]').click();await openSettingsSection(page,'voice');await page.locator('#voice-settings').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(__dirname,'../dist/Pocket-Creature-Voice-Preview.png')});
  assert.deepEqual(errors,[]);console.log('PASS: voice defaults, installed voices, explicit test, saved controls, native payload, stop button, stale events, quiet/game mute, game opt-in, mouth state, and Escape interruption.');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
