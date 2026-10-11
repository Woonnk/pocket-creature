const {openSettingsSection,openCreatureDetails}=require('./panel-helpers.cjs');
// Optional visual smoke suite: npm install --no-save playwright, then npx playwright install chromium.
// Start npm run demo first. CI may supply PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
async function run(){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({viewport:{width:1365,height:900}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto('http://127.0.0.1:4173');await page.waitForSelector('#pet-name');
    await page.locator('#wander-setting').evaluate(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join(__dirname,'../dist/Pocket-Creature-Preview.png')});
    await page.locator('[data-action="pet"]').click();assert.equal(await page.locator('#coins').textContent(),'1');
    await openCreatureDetails(page,'style');await page.locator('[data-color="lavender"]').click();assert.equal(await page.locator('[data-color="lavender"]').getAttribute('aria-pressed'),'true');
    await openCreatureDetails(page,'style');await page.locator('[data-hat="wizard"]').click();assert.match(await page.locator('#toast').textContent(),/few more coins/);
    const before=await page.locator('#pet').boundingBox();
    await page.mouse.move(before.x+100,before.y+110);await page.mouse.down();await page.mouse.move(before.x+180,before.y-50,{steps:10});await page.waitForTimeout(80);await page.mouse.up();await page.waitForTimeout(1200);
    await page.waitForFunction(()=>document.querySelector('#pet').getBoundingClientRect().y>400,{},{timeout:6000});
    await page.locator('[data-action="ball"]').click();await page.waitForFunction(()=>Number(document.querySelector('#coins').textContent)>=4,{},{timeout:10000});
    await page.locator('[data-action="sleep"]').click();await page.waitForFunction(()=>document.querySelector('#pet').classList.contains('sleeping'));await page.locator('[data-action="sleep"]').click();
    await page.locator('[data-tab="focus"]').click();await page.locator('#focus-minutes').fill('1');await page.locator('#focus-minutes').dispatchEvent('change');await page.locator('#focus-start').click();assert.equal(await page.locator('#focus-start').textContent(),'Pause session');
    await page.locator('#focus-start').click();assert.equal(await page.locator('#focus-start').textContent(),'Keep going');await page.locator('#focus-start').click();assert.equal(await page.locator('#focus-start').textContent(),'Pause session');
    await page.locator('#reminder-title').fill('<img src=x onerror=alert(1)>');await page.locator('#reminder-form button').click();assert.match(await page.locator('#reminders').textContent(),/<img/);assert.equal(await page.locator('#reminders img').count(),0);
    await page.locator('[data-tab="notes"]').click();await page.locator('#notes').fill('Tiny dragon, big plans.');
    await page.locator('[data-tab="settings"]').click();await openSettingsSection(page,'general');await page.locator('#name-input').fill('Noodle');
    await page.waitForTimeout(700);await page.reload();assert.equal(await page.locator('#pet-name').textContent(),'Noodle');assert.equal(await page.locator('#notes').inputValue(),'Tiny dragon, big plans.');assert.equal(await page.locator('[data-color="lavender"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#focus-badge').isVisible(),true);
    await page.locator('#close-panel').click();assert.equal(await page.locator('#panel').isVisible(),false);await page.locator('#launcher').click();assert.equal(await page.locator('#panel').isVisible(),true);
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await context.newPage();await mobile.goto('http://127.0.0.1:4173');await mobile.waitForTimeout(500);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.screenshot({path:path.join(__dirname,'../dist/Pocket-Creature-Mobile.png')});await context.close();
    const standalone=await browser.newPage();await standalone.goto('file://'+path.resolve(__dirname,'../dist/Pocket-Creature-Playground.html'));await standalone.waitForSelector('#pet');await standalone.waitForTimeout(500);await standalone.locator('[data-action="pet"]').click();assert.equal(await standalone.locator('#coins').textContent(),'1');await standalone.close();
    const nativePage=await browser.newPage({viewport:{width:1365,height:900}});
    nativePage.on('pageerror',e=>errors.push(e.message));
    await nativePage.addInitScript(()=>{
      window.nativeCalls={clicks:[],notifications:[],saves:[]};
      window.companion={loadState:async()=>({littleInteractions:false,name:'Native Ember',focus:{status:'running',end:Date.now()-1000,duration:60000,remaining:0},reminders:[{id:'r1',title:'Native reminder',at:Date.now()-1000}]}),saveState:async s=>window.nativeCalls.saves.push(JSON.parse(JSON.stringify(s))),setClickThrough:x=>window.nativeCalls.clicks.push(x),notify:(a,b)=>window.nativeCalls.notifications.push([a,b]),hide:()=>{},quit:()=>{},readyToQuit:()=>{},onOpenControls:fn=>window.openNativeControls=fn,onBeforeQuit:fn=>window.beforeNativeQuit=fn,onClock:fn=>{window.nativeClock=fn;setInterval(fn,1000);},onCursor:fn=>window.nativeCursor=fn};
    });
    await nativePage.goto('http://127.0.0.1:4173');await nativePage.waitForSelector('body.desktop');
    assert.equal(await nativePage.locator('#panel').isVisible(),false);assert.equal(await nativePage.locator('.scene-heading').isVisible(),false);
    await nativePage.waitForFunction(()=>Number(document.querySelector('#coins').textContent)===15);
    await nativePage.evaluate(()=>{window.nativeClock();window.nativeClock();});assert.equal(await nativePage.locator('#coins').textContent(),'15');
    assert.equal(await nativePage.evaluate(()=>window.nativeCalls.notifications.length),2);
    const nativePet=await nativePage.locator('#pet').boundingBox();await nativePage.evaluate(p=>window.nativeCursor(p),{x:nativePet.x+120,y:nativePet.y+100});
    await nativePage.waitForFunction(()=>window.nativeCalls.clicks.includes(false));
    await nativePage.evaluate(()=>window.nativeCursor({x:800,y:40}));await nativePage.waitForFunction(()=>window.nativeCalls.clicks.at(-1)===true);
    await nativePage.evaluate(()=>window.openNativeControls());assert.equal(await nativePage.locator('#panel').isVisible(),true);
    await nativePage.locator('[data-tab="notes"]').click();await nativePage.locator('#notes').fill('Desktop saves work.');await nativePage.waitForFunction(()=>window.nativeCalls.saves.some(s=>s.notes==='Desktop saves work.'));
    await nativePage.close();
    assert.deepEqual(errors,[]);console.log('PASS: rendering, petting, palette, affordability, drag physics, fetch, sleep, focus pause/resume, safe reminders, persistence, panel, mobile layout, standalone HTML, simulated native click-through, main-clock delivery, exactly-once rewards, and desktop save adapter.');
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
