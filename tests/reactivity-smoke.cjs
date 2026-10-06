const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
async function run(){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1365,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      window.nativeCalls={saves:[],clicks:[]};
      window.companion={loadState:async()=>({wander:false,idleAfter:60}),saveState:async s=>window.nativeCalls.saves.push(JSON.parse(JSON.stringify(s))),setClickThrough:x=>window.nativeCalls.clicks.push(x),notify:()=>{},hide:()=>{},quit:()=>{},readyToQuit:()=>{},onOpenControls:fn=>window.openControls=fn,onBeforeQuit:()=>{},onClock:fn=>window.clock=fn,onCursor:fn=>window.cursor=fn,onActivity:fn=>window.activity=fn};
    });
    await page.goto('http://127.0.0.1:4173');await page.waitForSelector('#pet');
    await page.evaluate(()=>window.activity({category:'coding',idleSeconds:0,typingCount:4,appAvailable:true,typingAvailable:true}));
    await page.waitForFunction(()=>document.querySelector('#pet').classList.contains('mimicking'));
    assert.match(await page.locator('#pet').getAttribute('class'),/outfit-coding/);
    await page.waitForFunction(()=>!document.querySelector('#pet').classList.contains('mimicking'),{},{timeout:4000});
    for(const category of ['music','gaming']){await page.evaluate(c=>window.activity({category:c,idleSeconds:0,typingCount:0,appAvailable:true}),category);await page.waitForFunction(c=>document.querySelector('#pet').classList.contains('outfit-'+c),category);}
    await page.evaluate(()=>window.activity({category:'none',idleSeconds:90,typingCount:0}));await page.waitForFunction(()=>document.querySelector('#pet').classList.contains('sleeping'));
    await page.evaluate(()=>window.activity({category:'coding',idleSeconds:0,typingCount:0}));await page.waitForFunction(()=>!document.querySelector('#pet').classList.contains('sleeping'));assert.doesNotMatch(await page.locator('#bubble').textContent(),/You’re back/);
    await page.evaluate(()=>window.openControls());await page.locator('[data-action="sleep"]').click();await page.waitForFunction(()=>document.querySelector('#pet').classList.contains('sleeping'));
    await page.evaluate(()=>{window.activity({idleSeconds:90});window.activity({idleSeconds:0});});assert.equal(await page.locator('#pet').evaluate(e=>e.classList.contains('sleeping')),true);await page.locator('[data-action="sleep"]').click();
    await page.locator('[data-tab="settings"]').click();await page.locator('#awareness-setting').uncheck();
    await page.evaluate(()=>window.activity({category:'gaming',idleSeconds:0,typingCount:25,appAvailable:true,typingAvailable:true}));await page.waitForFunction(()=>document.querySelector('#pet').classList.contains('outfit-none'));assert.equal(await page.locator('#pet').evaluate(e=>e.classList.contains('mimicking')),false);
    await page.waitForFunction(()=>window.nativeCalls.saves.some(s=>s.pcAwareness===false));await page.locator('#awareness-setting').check();
    await page.evaluate(()=>window.activity({idleSeconds:0,category:'none',typingCount:0}));
    const p=await page.locator('#pet').boundingBox();await page.evaluate(p=>window.cursor({x:p.x+110,y:p.y+110}),p);await page.waitForTimeout(40);await page.evaluate(p=>window.cursor({x:p.x+200,y:p.y+20}),p);
    await page.waitForFunction(()=>document.querySelector('#pet').classList.contains('dizzy'));assert.notEqual(await page.locator('#pet').evaluate(e=>e.style.getPropertyValue('--gaze-x')),'0.00px');
    const sample=async()=>page.evaluate(()=>new Promise(resolve=>{let count=0;const begin=performance.now();function frame(now){count++;if(now-begin>=2400){const match=document.querySelector('#frame-rate').textContent.match(/(\d+) frames/);resolve({displayCallbacks:Math.round(count*1000/(now-begin)),rendererFrames:Number(match?.[1]||0),mode:document.querySelector('#frame-mode').value});}else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
    await page.locator('#frame-mode').selectOption('smooth');const smooth=await sample();assert.ok(smooth.rendererFrames>=smooth.displayCallbacks*.78,JSON.stringify(smooth));
    await page.locator('#frame-mode').selectOption('economy');await page.waitForTimeout(2200);const economy=await sample();assert.ok(economy.rendererFrames<=35,JSON.stringify(economy));
    const performanceReport={host:'Headless Chromium on Linux; this is not a measurement of the user’s Windows PC',smooth,economy};
    fs.writeFileSync(path.join(__dirname,'../dist/performance.json'),JSON.stringify(performanceReport,null,2));
    await page.close();
    const demo=await browser.newPage({viewport:{width:1365,height:900}});demo.on('pageerror',e=>errors.push(e.message));await demo.goto('http://127.0.0.1:4173');await demo.waitForSelector('#pet');
    await demo.locator('#activity-preview').selectOption('coding');await demo.waitForFunction(()=>document.querySelector('#pet').classList.contains('outfit-coding'));await demo.locator('#panel').evaluate(e=>e.scrollTop=0);await demo.waitForTimeout(600);
    await demo.screenshot({path:path.join(__dirname,'../dist/Pocket-Creature-Preview.png')});
    await demo.locator('[data-tab="notes"]').click();await demo.locator('#notes').pressSequentially('A little typing company.',{delay:20});await demo.waitForFunction(()=>document.querySelector('#pet').classList.contains('mimicking'));
    await demo.close();assert.deepEqual(errors,[]);console.log('PASS: app outfits, typing expiry, idle nap, silent return, manual nap priority, disabling reactions, cursor curiosity, browser typing, smooth/economy pacing.');console.log(JSON.stringify(performanceReport));
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
