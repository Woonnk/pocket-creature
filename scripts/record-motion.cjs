// Capture the actual renderer in four small desktop views with a controlled clock.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process');
async function run(){
 const out=path.resolve(process.argv[2]||'dist/motion-frames');await fs.mkdir(out,{recursive:true});const port=4174;
 const server=spawn(process.execPath,[path.join(__dirname,'serve.cjs')],{env:{...process.env,POCKET_PORT:String(port)},stdio:['ignore','pipe','inherit']});let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.on('data',c=>{if(String(c).includes('playground:'))resolve();});});
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1024,height:874}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   if(!['original','cloud','night','river'].includes(window.name))return;
   window.companion={loadState:async()=>({sprite:window.name,wander:false,littleHabits:false,littleInteractions:false,dailyRoutines:false,contextReactions:false,physicalReactions:false,expressiveMoods:false,pcAwareness:false,home:{enabled:false,routines:false},autoConversations:false,chatMode:'builtin'}),saveState:async()=>{},rendererReady(){},setClickThrough(){},setControlsOpen(){},stopSpeech(){},notify(){},onClock(){},onCursor(){},onActivity(){},onOpenControls(){},onBeforeQuit(){}};
   addEventListener('DOMContentLoaded',()=>{const css=document.createElement('style');css.textContent='.pet{left:-120px!important}.pet-name,#launcher,#panel,#little-home,#home-handle,#attention-tag,#bubble,#toast,#voice-dock,#focus-badge{display:none!important}';document.head.append(css);});
  });
  const time=new Date('2026-10-09T19:00:00Z');await page.clock.install({time});
  const names=[['original','Original','Balanced, easygoing motion'],['cloud','Cloud Drake','Soft bobbing and gentle wings'],['night','Night Wyvern','Sharper, quicker wing movement'],['river','River Dragon','Flowing fins and a swishing tail']];
  await page.setContent('<style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#172528;color:#f3eedf;font-family:Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}h1{font-size:29px;margin:0 0 7px}header p{font-size:14px;color:#b9cbc7;margin:0}.clip{background:#c5dfbd;color:#244133;border-radius:20px;padding:11px 18px;font-weight:bold;font-size:14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{border:1px solid #3e5355;background:#23373a;border-radius:22px;text-align:center;overflow:hidden}iframe{display:block;border:0;width:100%;height:270px;pointer-events:none}h2{font-size:21px;margin:0 0 8px}.card p{font-size:13px;color:#bed1cb;margin:0 0 24px}footer{margin-top:20px;color:#b9cbc7;font-size:13px}</style><header><div><h1>Meet his new moves</h1><p>Pocket Creature · coordinated paws, body, head, wings, and tail</p></div><span class="clip" id="clip">Little stroll</span></header><div class="grid">'+names.map(([id,name,description])=>`<div class="card"><iframe name="${id}" src="http://127.0.0.1:${port}"></iframe><h2>${name}</h2><p>${description}</p></div>`).join('')+'</div><footer>Actual app animations · previews stay in place · motion yields to games, reduced motion, voice, and tricks</footer>');
  for(const [id] of names){const frame=page.frame({name:id});try{await frame.waitForSelector('#pet[data-motion-ready="true"]',{timeout:10000});}catch(error){console.log('Capture diagnostics',errors,await frame.evaluate(()=>({name:window.name,desktop:!!window.companion,body:document.body.className,pet:document.querySelector('#pet')?.outerHTML.slice(0,350)})));throw error;}}
  await page.clock.pauseAt(new Date(time.getTime()+1500));let count=0;
  for(const [kind,label,frames] of [['stroll','Little stroll',30],['wings','Wing stretch',48],['tail','Tail wiggle',36]]){
   await page.locator('#clip').evaluate((node,text)=>node.textContent=text,label);
   for(const [id] of names)await page.frame({name:id}).evaluate(kind=>{document.querySelector('#animation-stop').click();document.querySelector('#animation-choice').value=kind;document.querySelector('#animation-start').click();},kind);
   for(let i=0;i<frames;i++){await page.clock.runFor(83);await page.screenshot({path:path.join(out,'frame-'+String(count++).padStart(3,'0')+'.png')});}
  }
  if(errors.length)throw Error(errors.join('\n'));await fs.writeFile(path.join(out,'metadata.json'),JSON.stringify({fps:1000/83,frames:count,source:'Actual 0.20 renderer with four selected looks; preview controls and controlled clock'},null,2));console.log('Captured '+count+' actual animation frames.');
 }finally{await browser?.close();server.kill();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
