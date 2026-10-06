const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {verifyRelease}=require('./check-release.cjs');
async function run(){
 const root=path.join(__dirname,'..'),verified=verifyRelease(root),target=path.join(root,'release/assets');fs.mkdirSync(target,{recursive:true});
 const files=[verified.exe,path.join(root,'dist/Pocket-Creature-Playground.html'),path.join(root,'LICENSE'),path.join(root,'THIRD_PARTY_NOTICES.md')];
 const names=files.map(file=>path.basename(file));names.push('SHA256SUMS.txt');
 for(const name of fs.readdirSync(target))if(!names.includes(name))throw Error('Unexpected old release asset: '+name+'. Use a clean build directory.');
 const sums=[];for(const file of files){const name=path.basename(file);fs.copyFileSync(file,path.join(target,name));const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);sums.push(hash.digest('hex')+'  '+name);}
 fs.writeFileSync(path.join(target,'SHA256SUMS.txt'),sums.join('\n')+'\n');console.log('Prepared '+names.length+' release assets with SHA-256 checksums.');
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
