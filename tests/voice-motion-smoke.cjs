const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),wav=require('./voice-wav.cjs');
const {openSettingsSection}=require('./panel-helpers.cjs');
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1365,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(audio=>{
   window.audioBytes=audio;window.calls=[];window.saved=[];
   class Audio{constructor(){window.audio=this;this.currentTime=0;this.paused=true;}pause(){this.paused=true;}async play(){this.paused=false;this.onplaying();}}
   window.Audio=Audio;
   window.companion={loadState:async()=>({wander:false,pcAwareness:false,littleInteractions:false,dailyRoutines:false,autoConversations:false,chatMode:'builtin'}),saveState:async s=>saved.push(JSON.parse(JSON.stringify(s))),setClickThrough(){},setControlsOpen(){},notify(){},onOpenControls:fn=>window.controls=fn,onBeforeQuit(){},onClock(){},onCursor(){},onActivity(){},
    speechStatus:async()=>({ready:true,voices:[],message:'Ready'}),onSpeechState:fn=>window.voiceEvent=fn,stopSpeech(){},speak:async p=>{calls.push(p);voiceEvent({id:p.id,state:'speaking'});return true;},synthesize:async p=>{calls.push(p);return {id:p.id,audio:audioBytes};}};
  },Array.from(wav()));
  await page.goto('http://127.0.0.1:4173');await page.waitForSelector('body.desktop');await page.evaluate(()=>controls());
  await openSettingsSection(page,'voice');await page.locator('#test-voice').click();await page.waitForFunction(()=>calls.length===1);
  const id=await page.evaluate(()=>calls[0].id);
  await page.evaluate(id=>voiceEvent({id,state:'timing',kind:'word',index:0,length:4}),id);
  await page.waitForFunction(()=>document.querySelector('#dragon [data-motion-part="arm"]').getAttribute('transform').startsWith('rotate(-'));
  await page.evaluate(id=>voiceEvent({id,state:'timing',kind:'viseme',value:2,duration:400}),id);await page.waitForFunction(()=>+document.querySelector('#pet').dataset.voiceOpening>.7);
  assert.equal(await page.locator('#voice-stop').isVisible(),true);assert.match(await page.locator('#speech-status').textContent(),/Speaking/);
  assert.equal(await page.locator('#dragon .voice-mouth').evaluate(e=>getComputedStyle(e).display),'block');
  await page.screenshot({path:path.join(__dirname,'../dist/Voice-Motion-022.png')});
  await page.locator('#voice-stop').click();await page.waitForFunction(()=>document.querySelector('#pet').dataset.voiceMouth==='false');
  await page.evaluate(id=>voiceEvent({id,state:'timing',kind:'viseme',value:2,duration:400}),id);await page.waitForTimeout(70);assert.equal(await page.locator('#pet').getAttribute('data-voice-mouth'),'false');
  // Kokoro timing uses the playing audio position, including silence and buffering.
  await openSettingsSection(page,'voice');await page.locator('#speech-engine').selectOption('kokoro');await page.locator('#test-voice').click();await page.waitForFunction(()=>window.audio&&!audio.paused);
  await page.evaluate(()=>audio.currentTime=.2);await page.waitForFunction(()=>+document.querySelector('#pet').dataset.voiceOpening>.65);
  await page.evaluate(()=>{audio.onwaiting();});await page.waitForFunction(()=>+document.querySelector('#pet').dataset.voiceOpening<.03);
  await page.waitForTimeout(90);assert.ok(+await page.locator('#pet').getAttribute('data-voice-opening')<.03);
  await page.evaluate(()=>{audio.currentTime=.65;audio.onplaying();});await page.waitForFunction(()=>+document.querySelector('#pet').dataset.voiceOpening>.65);
  await page.evaluate(()=>audio.currentTime=.45);await page.waitForFunction(()=>+document.querySelector('#pet').dataset.voiceOpening<.03);
  await page.evaluate(()=>audio.currentTime=.65);await page.waitForFunction(()=>+document.querySelector('#pet').dataset.voiceOpening>.65);
  await openSettingsSection(page,'general');await page.locator('#motion-setting').check();await page.waitForFunction(()=>document.querySelector('#pet').dataset.voiceMouth==='false');assert.equal(await page.locator('#dragon .voice-mouth').evaluate(e=>getComputedStyle(e).display),'none');
  await page.locator('#motion-setting').uncheck();await page.waitForFunction(()=>+document.querySelector('#pet').dataset.voiceOpening>.6);
  await openSettingsSection(page,'voice',{advanced:true});await page.locator('#speech-games').check(); // changing a voice option stops this line
  await page.locator('#test-voice').click();await page.waitForFunction(()=>window.audio&&!audio.paused);await page.evaluate(()=>audio.currentTime=.65);await page.waitForFunction(()=>+document.querySelector('#pet').dataset.voiceOpening>.6);
  await openSettingsSection(page,'games');await page.locator('#game-mode').selectOption('on');await page.waitForFunction(()=>document.querySelector('#pet').dataset.voiceMouth==='false');assert.equal(await page.locator('#pet').getAttribute('data-speaking'),'true');
  await page.locator('#game-mode').selectOption('off');await page.locator('#voice-stop').click();
  await openSettingsSection(page,'voice');await page.locator('#dragon-expressions').evaluate(e=>e.open=true);assert.equal(await page.locator('#dragon-sounds').isChecked(),false);await page.locator('#dragon-sounds').check();await page.locator('#dragon-sound-volume').evaluate(e=>{e.value='0.4';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#speech-gestures').uncheck();await page.waitForFunction(()=>saved.at(-1).dragonSounds===true&&saved.at(-1).dragonSoundVolume===.4&&saved.at(-1).speechGestures===false);
  await page.locator('#test-dragon-sound').click();assert.deepEqual(errors,[]);
  console.log('PASS: native jaw timing, stale cancellation, audio/silence/buffering playback, reduced motion, stationary games, and saved expression/sound controls.');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
