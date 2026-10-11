// Export the actual selectable artwork; no external image service or asset download.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs/promises'),path=require('node:path');
async function run(){
 const directory=path.resolve(process.argv[2]||'dist/sprites');await fs.mkdir(directory,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1365,height:900}});await page.goto('file://'+path.join(__dirname,'../dist/Pocket-Creature-Playground.html'));await page.waitForSelector('#sprite-gallery button',{state:'attached'});await page.locator('#creature-style summary').click();
  const sprites=await page.locator('#sprite-gallery button').evaluateAll(buttons=>buttons.map(button=>{
   const svg=button.querySelector('svg'),clone=svg.cloneNode(true),source=[svg,...svg.querySelectorAll('*')],target=[clone,...clone.querySelectorAll('*')];
   source.forEach((node,index)=>{const style=getComputedStyle(node);for(const key of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity','display','visibility'])target[index].setAttribute(key,style.getPropertyValue(key));});
   clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','480');clone.setAttribute('height','440');clone.removeAttribute('aria-hidden');clone.querySelector('.shadow')?.remove();
   const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=button.querySelector('strong').textContent;clone.prepend(title);
   return {id:button.dataset.sprite,name:title.textContent,description:button.querySelector('small').textContent,svg:new XMLSerializer().serializeToString(clone)};
  }));
  const art=await browser.newPage({viewport:{width:480,height:440},deviceScaleFactor:1});
  for(const sprite of sprites){await fs.writeFile(path.join(directory,sprite.id+'.svg'),sprite.svg);await art.setContent('<style>html,body{margin:0;background:transparent}svg{display:block}</style>'+sprite.svg);await art.screenshot({path:path.join(directory,sprite.id+'.png'),omitBackground:true});}
  await art.setViewportSize({width:1024,height:1080});
  await art.setContent('<style>*{box-sizing:border-box}body{margin:0;padding:38px;background:#172528;color:#f3eedf;font-family:Arial,sans-serif}h1{font-size:31px;margin:0 0 8px;letter-spacing:-.7px}header p{font-size:15px;color:#b7c7c5;margin:0 0 26px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{background:#23373a;border:1px solid #3e5355;border-radius:24px;text-align:center;padding:12px 18px 24px}.card svg{width:100%;height:305px}.card h2{font-size:23px;margin:0 0 9px}.card p{color:#bfd1ca;font-size:14px;margin:0;line-height:1.5}footer{font-size:14px;color:#b7c7c5;margin-top:24px}</style><header><h1>Four little dragons. One companion.</h1><p>Pocket Creature · selectable looks · same expressions, tricks, and progress</p></header><div class="grid">'+sprites.map(s=>'<div class="card">'+s.svg+'<h2>'+s.name+'</h2><p>'+s.description+'</p></div>').join('')+'</div><footer>Choose under Creature → Style your dragon. All looks support Mint, Lavender, and Peach.</footer>');
  await art.screenshot({path:path.join(directory,'Pocket-Creature-Dragon-Looks.png'),fullPage:true});
  await fs.writeFile(path.join(directory,'README.txt'),'Pocket Creature 0.19 dragon looks\n\nFour neutral standing poses exported from the actual selectable SVG artwork.\n480 x 440 transparent PNGs and resolution-independent SVGs; mint palette.\nIn-app looks retain all existing animations, expressions, outfits and color choices.\nThese PNGs are still poses, not animation sprite sheets.\nArtwork and source: MIT license (included).\n');
  await fs.copyFile(path.join(__dirname,'../LICENSE'),path.join(directory,'LICENSE'));
  console.log('Exported '+sprites.length+' actual dragon looks, transparent PNG/SVG assets, and preview.');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
