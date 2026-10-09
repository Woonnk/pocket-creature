const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function verifyPE(file){
 const fd=fs.openSync(file,'r');try{const header=Buffer.alloc(64);assert.equal(fs.readSync(fd,header,0,64,0),64,'Executable header is truncated.');assert.equal(header.subarray(0,2).toString(),'MZ','Missing DOS signature.');const offset=header.readUInt32LE(60);assert.ok(offset>=64&&offset<fs.fstatSync(fd).size-4,'Invalid PE header offset.');const pe=Buffer.alloc(4);fs.readSync(fd,pe,0,4,offset);assert.ok(pe.equals(Buffer.from([80,69,0,0])),'Missing PE signature.');}finally{fs.closeSync(fd);}
}
function verifyRelease(root=path.join(__dirname,'..')){
 const asar=require('@electron/asar'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const archive=path.join(root,'release/win-unpacked/resources/app.asar'),exe=path.join(root,'release',`Pocket-Creature-${pkg.version}-Windows.exe`);
 assert.equal(fs.readdirSync(path.join(root,'release/win-unpacked')).filter(name=>/^\..+\.exe\./i.test(name)).length,0,'Packaging contains leftover temporary executable files; rebuild from a clean output directory.');
 verifyPE(exe);assert.equal(JSON.parse(asar.extractFile(archive,'package.json')).version,pkg.version,'Packaged version differs from source.');
 let count=0;for(const dir of ['desktop','renderer'])for(const file of fs.readdirSync(path.join(root,dir))){const relative=dir+'/'+file,source=path.join(root,relative);if(!fs.statSync(source).isFile())continue;const bytes=file.endsWith('.ps1')?fs.readFileSync(archive+'.unpacked/'+relative):asar.extractFile(archive,relative);assert.ok(bytes.equals(fs.readFileSync(source)),`Packaged file differs: ${relative}`);count++;}
 for(const name of ['LICENSE.electron.txt','LICENSES.chromium.html'])assert.ok(fs.statSync(path.join(root,'release/win-unpacked',name)).size>0,`Missing runtime notice: ${name}`);
 return {version:pkg.version,runtimeFiles:count,exe};
}
module.exports={verifyPE,verifyRelease};
if(require.main===module){try{const result=verifyRelease();console.log(`PASS: Windows PE headers, version ${result.version}, ${result.runtimeFiles} matching runtime files, unpacked helper, and runtime notices.`);}catch(error){console.error(error.message);process.exitCode=1;}}
