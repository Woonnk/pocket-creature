const fs=require('node:fs/promises'),path=require('node:path');
const ALLOWED=new Set(['.py','.js','.mjs','.cjs','.jsx','.ts','.tsx','.json','.html','.css','.md','.txt','.cpp','.c','.h','.hpp','.cs','.rs','.go','.java','.lua','.luau','.toml','.yaml','.yml','.xml','.sql','.vue','.svelte','.sh','.ps1']);
const SKIP=new Set(['node_modules','.git','.venv','venv','__pycache__','dist','release','.ssh']);
function inside(root,file){const rel=path.relative(root,file);return rel===''||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);}
function basenameFromTitle(title){
  if(typeof title!=='string')return '';
  const head=title.replace(/^[*●\s]+/,'').split(/\s+[—–-]\s+/)[0].trim();
  const name=path.win32.basename(head).replace(/\s+\[.*\]$/,'');
  return name.length<=180&&ALLOWED.has(path.extname(name).toLowerCase())?name:'';
}
function createFileService({roots=[],inspect}={}){
  let approved=roots.slice(0,8),cache=new Map(),indexedAt=0,generation=0;
  return {
    async roots(){return approved.slice();},
    async addRoot(root){const real=await fs.realpath(root);if(!(await fs.stat(real)).isDirectory())throw Error('Choose a folder.');if(!approved.includes(real)){if(approved.length>=8)throw Error('Up to eight project folders can be connected.');approved.push(real);generation++;indexedAt=0;}return approved.slice();},
    removeRoot(root){approved=approved.filter(x=>x!==root);generation++;indexedAt=0;return approved.slice();},
    async inspectFile(file,{explicit=false}={}){
      const real=await fs.realpath(file),realRoots=await Promise.all(approved.map(x=>fs.realpath(x).catch(()=>null)));
      const root=realRoots.find(x=>x&&inside(x,real));
      if(!explicit&&!root)throw Error('This file is outside the project folders you connected.');
      if(!ALLOWED.has(path.extname(real).toLowerCase())||path.basename(real).startsWith('.env'))throw Error('Choose a supported text or source-code file.');
      const handle=await fs.open(real,'r');let content,partial=false;
      try{const stat=await handle.stat();if(!stat.isFile())throw Error('Choose a regular file.');if(stat.size>262144)throw Error('Choose a file smaller than 256 KB for this version.');
        partial=stat.size>32768;const buffer=Buffer.alloc(Math.min(stat.size,32769));const {bytesRead}=await handle.read(buffer,0,buffer.length,0);content=buffer.subarray(0,bytesRead).toString('utf8');
      }finally{await handle.close();}
      const result=inspect(path.basename(real),content);
      return {...result,partial:partial||result.partial,path:real,project:root?path.basename(root):path.basename(path.dirname(real)),projectId:root||path.dirname(real)};
    },
    async resolveTitle(title){
      const name=basenameFromTitle(title);if(!name||!approved.length)return null;
      if(!indexedAt||Date.now()-indexedAt>30000){
        const version=generation,newCache=new Map(),queue=approved.map(root=>({dir:root,root,depth:0}));let count=0,dirs=0;
        while(queue.length&&count<5000&&dirs++<500){const {dir,root,depth}=queue.shift();let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch{continue;}
          for(const entry of entries){if(++count>5000)break;if(entry.isSymbolicLink())continue;const full=path.join(dir,entry.name);
            if(entry.isDirectory()&&depth<5&&!SKIP.has(entry.name)&&!entry.name.startsWith('.'))queue.push({dir:full,root,depth:depth+1});
            else if(entry.isFile()&&ALLOWED.has(path.extname(entry.name).toLowerCase())){const key=entry.name.toLowerCase();if(!newCache.has(key))newCache.set(key,[]);if(!newCache.get(key).includes(full))newCache.get(key).push(full);}
          }
        }
        if(version!==generation)return null;cache=newCache;indexedAt=Date.now();
      }
      const matches=cache.get(name.toLowerCase())||[];
      // A title with the same basename in several folders cannot identify a unique file.
      if(!matches.length)return null;
      if(matches.length>1)return {ambiguous:true,name};
      const version=generation,result=await this.inspectFile(matches[0]);return version===generation?result:null;
    }
  };
}
module.exports={createFileService,basenameFromTitle,inside};
