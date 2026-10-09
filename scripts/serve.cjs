const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','renderer');
const {rendererFiles}=require('../desktop/renderer-files.cjs'),publicFiles=rendererFiles(root);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!publicFiles.has(name)){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(path.join(root,name),(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-store'});res.end(data);});
});
server.listen(Number(process.env.POCKET_PORT)||4173,'127.0.0.1',()=>console.log('Pocket Creature playground: http://127.0.0.1:'+server.address().port));
