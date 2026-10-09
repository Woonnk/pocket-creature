const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.join(__dirname,'..');
const suites=['desktop-startup','home','voice-commands','panel','voice-conversation','speech','perching-memory','conversation-habits','conversation-timing','physical-reactions','autonomy','reactivity','conversation','game-mode','browser'];
let server;
async function ready(){
 server=spawn(process.execPath,['scripts/serve.cjs'],{cwd:root,env:{...process.env,POCKET_PORT:'4173'},stdio:['ignore','pipe','inherit']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Demo server did not start.')),10000);server.once('error',e=>{clearTimeout(timer);reject(e);});server.once('exit',code=>{clearTimeout(timer);reject(Error('Demo server exited ('+code+'). Is port 4173 already in use?'));});server.stdout.on('data',chunk=>{if(String(chunk).includes('playground:')){clearTimeout(timer);resolve();}});});
}
async function runSuite(suite){
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tests/'+suite+'-smoke.cjs'],{cwd:root,env:process.env,stdio:'inherit'});const timer=setTimeout(()=>{child.kill();reject(Error(suite+' exceeded two minutes.'));},120000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error(suite+' failed ('+code+').'));});});
}
async function run(){try{await ready();for(const suite of suites)await runSuite(suite);console.log('PASS: all '+suites.length+' browser suites.');}finally{server?.kill();}}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
