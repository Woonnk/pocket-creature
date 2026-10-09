const fs=require('node:fs');
// Only flat renderer assets are public. New renderer modules automatically join
// the desktop and demo routes, while desktop code and private saves stay out.
function rendererFiles(root){return new Set(fs.readdirSync(root,{withFileTypes:true}).filter(entry=>entry.isFile()&&(entry.name.endsWith('.mjs')||['index.html','style.css','icon.png'].includes(entry.name))).map(entry=>entry.name));}
module.exports={rendererFiles};
