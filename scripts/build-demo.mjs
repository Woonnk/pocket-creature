import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
let html=await readFile(new URL('renderer/index.html',root),'utf8');
const css=await readFile(new URL('renderer/style.css',root),'utf8');
const core=(await readFile(new URL('renderer/core.mjs',root),'utf8')).replace(/export /g,'');
const personality=(await readFile(new URL('renderer/personality.mjs',root),'utf8')).replace(/export /g,'');
const companion=(await readFile(new URL('renderer/companion.mjs',root),'utf8')).replace(/^import .+\n/gm,'').replace(/export /g,'');
const conversation=(await readFile(new URL('renderer/conversation.mjs',root),'utf8')).replace(/export /g,'');
const habits=(await readFile(new URL('renderer/habits.mjs',root),'utf8')).replace(/export /g,'');
const autonomy=(await readFile(new URL('renderer/autonomy.mjs',root),'utf8')).replace(/^import .+\n/gm,'').replace(/export /g,'');
const reactions=(await readFile(new URL('renderer/reactions.mjs',root),'utf8')).replace(/export /g,'');
const perching=(await readFile(new URL('renderer/perching.mjs',root),'utf8')).replace(/export /g,'');
const personalMemory=(await readFile(new URL('renderer/personal-memory.mjs',root),'utf8')).replace(/^import .+\n/gm,'').replace(/export /g,'');
const app=(await readFile(new URL('renderer/app.mjs',root),'utf8')).replace(/^import .+\n/gm,'');
const js='\n'+core+'\n'+personality+'\n'+companion+'\n'+conversation+'\n'+habits+'\n'+autonomy+'\n'+reactions+'\n'+perching+'\n'+personalMemory+'\n'+app+'\n';
const hash=createHash('sha256').update(js).digest('base64');
html=html.replace('script-src \'self\'',`script-src 'sha256-${hash}'`)
  .replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`)
  .replace('<script type="module" src="app.mjs"></script>',`<script type="module">${js}</script>`);
await mkdir(new URL('dist/',root),{recursive:true});
const target=new URL('dist/Pocket-Creature-Playground.html',root);
await writeFile(target,html);console.log(fileURLToPath(target));
