// Capture the real browser renderer with sample progress for the GitHub README.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path');
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('pocket-creature-v1',JSON.stringify({
   name:'Ember',friendship:34,coins:65,energy:88,happiness:94,wander:false,theme:'dark',chatMode:'builtin',autoConversations:false,
   home:{enabled:true,routines:false},personalMemory:{favoriteGames:'Stardew Valley'},
   bond:{announced:2,snackChoice:'honey',snacks:{honey:{count:3,lastAt:Date.now()}},interactions:{scratch:{count:3,lastAt:Date.now()}}}
  })));
  await page.goto('file://'+path.join(__dirname,'../dist/Pocket-Creature-Playground.html'));
  await page.waitForSelector('#pet[data-motion-ready="true"]');await page.waitForTimeout(500);
  await page.screenshot({path:path.join(__dirname,'../docs/screenshots/companion.png')});
  await page.setViewportSize({width:1280,height:1400});await page.locator('#creature-bond summary').first().click();
  await page.evaluate(()=>{
   // Expand only the frame to show the full disclosure in the documentation image.
   const panel=document.querySelector('#panel'),scroller=document.querySelector('#panel-body'),bond=document.querySelector('#creature-bond');
   const chrome=panel.offsetHeight-scroller.clientHeight;panel.style.maxHeight='none';panel.style.height=(chrome+bond.offsetHeight+24)+'px';
   scroller.scrollTop+=bond.getBoundingClientRect().top-scroller.getBoundingClientRect().top-12;
  });
  await page.waitForTimeout(300);await page.locator('#panel').screenshot({path:path.join(__dirname,'../docs/screenshots/bond.png')});
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Captured current Companion and Our bond with sample progress.');
 }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
