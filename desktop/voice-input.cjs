const {spawn}=require('node:child_process');
const path=require('node:path');
const INPUT_KEYS=Object.freeze({f8:119,f9:120,f10:121});
function createVoiceInputAdapter(onState,{platform=process.platform,spawnProcess=spawn,timeout=45000}={}){
  let child=null,epoch=0,buffer='',signature='',timer=null,currentId=0;
  let snapshot={state:'disabled',ready:false,message:'Enable push-to-talk to use your microphone.'};
  const emit=value=>{snapshot={...snapshot,...value,epoch};onState({...snapshot});};
  function send(command){if(!child)return false;try{child.stdin.write(JSON.stringify({...command,epoch})+'\n');return true;}catch{return false;}}
  function stop(){epoch++;clearTimeout(timer);timer=null;const old=child;child=null;old?.kill();buffer='';currentId=0;emit({state:'disabled',ready:false,id:0,text:'',message:'Push-to-talk is paused.'});}
  function cancel(){epoch++;clearTimeout(timer);timer=null;send({command:'cancel'});emit({state:snapshot.ready?'ready':'disabled',id:0,text:'',message:snapshot.ready?'Ready · hold your shortcut or the talk button.':'Push-to-talk is paused.'});}
  function configure(settings){
    const enabled=settings.voiceInputEnabled===true&&settings.quiet!==true,key=Object.hasOwn(INPUT_KEYS,settings.voiceInputKey)?settings.voiceInputKey:'f9';
    const next=JSON.stringify([enabled,key]);if(next===signature&&(!enabled||child))return;
    stop();signature=next;if(!enabled)return;
    if(platform!=='win32'){emit({state:'error',ready:false,message:'Push-to-talk requires the Windows desktop app.'});return;}
    const token=epoch;
    const script=path.join(__dirname,'voice-input.ps1').replace(`app.asar${path.sep}`,`app.asar.unpacked${path.sep}`);
    const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    emit({state:'starting',ready:false,message:'Preparing offline Windows dictation…'});
    try{child=spawnProcess(powershell,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-ParentPid',String(process.pid)],{windowsHide:true,stdio:['pipe','pipe','pipe']});}catch{fail(token);return;}
    const processChild=child;child.stdin.on('error',()=>{});send({command:'configure',key:INPUT_KEYS[key]});
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{
      if(child!==processChild)return;buffer+=chunk;if(buffer.length>16000){fail(epoch);return;}
      const lines=buffer.split(/\r?\n/);buffer=lines.pop();for(const line of lines){
        let data;try{data=JSON.parse(line);}catch{continue;}
        if(data.epoch!==epoch||!['ready','listening','transcribing','transcript','empty','error'].includes(data.state))continue;
        const id=Number.isSafeInteger(data.id)&&data.id>0?data.id:0;
        if(data.state==='listening'){if(id<=currentId)continue;currentId=id;clearTimeout(timer);timer=setTimeout(()=>{if(child===processChild){stop();emit({state:'error',ready:false,message:'Voice input timed out. Toggle push-to-talk to reconnect.'});}},Math.min(timeout,22000));timer.unref?.();}
        else if(id&&id!==currentId)continue;
        if(data.state==='transcribing'){clearTimeout(timer);timer=setTimeout(()=>{if(child===processChild){stop();emit({state:'error',ready:false,message:'Dictation timed out. Toggle push-to-talk to reconnect.'});}},timeout);timer.unref?.();}
        if(['ready','transcript','empty','error'].includes(data.state)){clearTimeout(timer);timer=null;}
        const text=typeof data.text==='string'?data.text.replace(/[\x00-\x1f]/g,' ').trim().slice(0,1200):'';
        const messages={ready:'Ready · hold your shortcut or the talk button.',listening:'Listening · release to send.',transcribing:'Microphone closed · recognizing your words…',transcript:'Your words are ready.',empty:'I didn’t catch that. Hold the key and try again.',error:'Windows dictation is unavailable. Check installed speech recognition and microphone permissions.'};
        emit({state:data.state,ready:data.state==='ready'||snapshot.ready,id,text,needsReview:data.needsReview===true,language:typeof data.language==='string'?data.language.slice(0,30):snapshot.language,message:messages[data.state]});
      }
    });
    child.stderr.on('data',()=>{});child.once('error',()=>fail(epoch,processChild));child.once('exit',()=>fail(epoch,processChild));
    timer=setTimeout(()=>fail(epoch,processChild),15000);timer.unref?.();
  }
  function fail(token,expected=child){if(token!==epoch||child!==expected)return;stop();emit({state:'error',ready:false,message:'Windows dictation could not start. Check speech recognition installation and Windows microphone privacy settings.'});}
  return {configure,stop,cancel,start(){if(!snapshot.ready||!child)return false;return send({command:'start'});},finish(){return send({command:'finish'});},status:()=>({...snapshot})};
}
module.exports={createVoiceInputAdapter,INPUT_KEYS};
