const {spawn}=require('node:child_process');
const path=require('node:path');
function createSpeechAdapter(onState,{platform=process.platform,spawnProcess=spawn,timeout=45000}={}){
  let current=null,probe=null,closed=false;
  function launch(payload){
    const script=path.join(__dirname,'speech.ps1').replace(`app.asar${path.sep}`,`app.asar.unpacked${path.sep}`);
    const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    // User text travels as JSON on stdin, never as PowerShell code or command arguments.
    const child=spawnProcess(powershell,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-ParentPid',String(process.pid)],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(payload));return child;
  }
  function stop(){const old=current;current=null;if(old){clearTimeout(old.timer);old.child.kill();onState({id:old.id,state:'stopped'});}}
  function speak(payload){
    stop();if(closed||platform!=='win32')return false;
    if(!payload||!Number.isSafeInteger(payload.id)||payload.id<1||typeof payload.text!=='string'||!payload.text.trim()||payload.text.length>280)return false;
    const command={command:'speak',text:payload.text.replace(/[\x00-\x1f]/g,' '),voice:typeof payload.voice==='string'?payload.voice.slice(0,120):'',volume:Math.round(Math.max(0,Math.min(1,Number(payload.volume)||0))*100),rate:Math.max(-5,Math.min(5,Math.round(Math.log(Math.max(.7,Math.min(1.4,Number(payload.rate)||1)))*10)))};
    let child;try{child=launch(command);}catch{return false;}
    const job={child,id:payload.id,automatic:payload.automatic===true,buffer:'',timer:null};current=job;
    function finish(state,message){if(current!==job)return;current=null;clearTimeout(job.timer);child.kill();onState({id:job.id,state,message});}
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{
      if(current!==job)return;job.buffer+=chunk;if(job.buffer.length>65536){finish('error','Voice helper returned too much data.');return;}
      const lines=job.buffer.split(/\r?\n/);job.buffer=lines.pop();for(const line of lines)try{
        if(current!==job)break;const data=JSON.parse(line);
        if(data.state==='speaking')onState({id:job.id,state:'speaking'});
        else if(data.state==='timing'&&data.kind==='viseme'&&Number.isInteger(data.value)&&data.value>=0&&data.value<=21&&Number.isFinite(data.duration)&&data.duration>=0&&data.duration<=1000)onState({id:job.id,state:'timing',kind:'viseme',value:data.value,duration:data.duration});
        else if(data.state==='timing'&&data.kind==='word'&&Number.isInteger(data.index)&&data.index>=0&&data.index<command.text.length&&Number.isInteger(data.length)&&data.length>0&&data.length<=command.text.length)onState({id:job.id,state:'timing',kind:'word',index:data.index,length:data.length});
        else if(data.state==='ended')finish('ended');else if(data.state==='error')finish('error','Windows voice could not play. Try another installed voice.');
      }catch{}
    });
    child.stderr.on('data',()=>{});child.once('error',()=>finish('error','Windows speech could not start.'));child.once('exit',()=>finish('error','Windows speech stopped unexpectedly.'));
    job.timer=setTimeout(()=>finish('error','Voice playback timed out.'),timeout);job.timer.unref?.();return true;
  }
  function status(){
    if(closed||platform!=='win32')return Promise.resolve({ready:false,voices:[],message:'Native voice is available in the Windows app.'});
    if(probe)return probe.promise;
    let child;try{child=launch({command:'voices'});}catch{return Promise.resolve({ready:false,voices:[],message:'Windows voices could not be checked.'});}
    const job={child,promise:null,finish:null};probe=job;
    job.promise=new Promise(resolve=>{
      let output='',done=false;const timer=setTimeout(()=>finish(null),15000);timer.unref?.();
      function finish(data){if(done)return;done=true;clearTimeout(timer);child.kill();if(probe===job)probe=null;
        const voices=Array.isArray(data?.voices)?data.voices.filter(v=>typeof v?.name==='string'&&typeof v?.lang==='string').slice(0,100).map(v=>({name:v.name.slice(0,120),lang:v.lang.slice(0,40)})):[];
        resolve({ready:voices.length>0,voices,message:voices.length?'Installed Windows voices ready.':'No usable Windows voices. Install a speech voice in Windows Settings.'});}
      job.finish=()=>finish(null);child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;if(output.length>65536)finish(null);});child.stderr.on('data',()=>{});child.once('error',()=>finish(null));child.once('exit',()=>{try{finish(JSON.parse(output.trim()));}catch{finish(null);}});
    });return job.promise;
  }
  return {speak,status,stop,stopAutomatic(){if(current?.automatic)stop();},close(){closed=true;stop();probe?.finish();}};
}
module.exports={createSpeechAdapter};
