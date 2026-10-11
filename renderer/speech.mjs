import {wavEnvelope} from './voice-motion.mjs';
// Speech output reads existing dialogue. Microphone input lives in voice-input.mjs.
export function speechAllowed(settings,context={},automatic=false,preview=false){
  if((!settings.speechEnabled&&!preview)||settings.quiet||context.hidden||context.listening||settings.speechVolume<=0)return false;
  if(context.inGame&&!settings.speechInGames)return false;
  if(automatic&&(settings.speechChatter==='replies'||context.away||context.busy||context.focused))return false;
  return true;
}
export function speechDelivery(settings,mood='curious'){
  let pace=1,pitch=1;
  if(settings.speechExpression){
    if(['sleepy','tired'].includes(mood)||settings.personality==='cozy')pace=.9;
    else if(['loved','playful','celebrate','surprised'].includes(mood)){pace=1.08;pitch=1.06;}
    else if(settings.personality==='cheeky')pace=1.04;
  }
  return {rate:Math.max(.7,Math.min(1.4,settings.speechRate*pace)),pitch};
}
export function createSpeaker({bridge,getSettings,getContext,onState=()=>{},prepare=()=>{},now=Date.now}){
  let sequence=0,current=null,lastAutomatic=-Infinity,lastText='',lastAt=-Infinity;
  function update(event){
    if(event.state==='cancelled'){sequence++;current=null;onState({state:'stopped'});return;}
    if(!current||event.id!==current.id)return;
    if(['ended','error','stopped'].includes(event.state))current=null;
    onState({...event,automatic:current?.automatic===true});
  }
  bridge?.onSpeechState?.(update);
  function stop(automaticOnly=false){
    if(automaticOnly&&!current?.automatic)return;
    sequence++;current=null;bridge?.stopSpeech?.();onState({state:'stopped'});
  }
  function speak(text,{automatic=false,preview=false,mood='curious'}={}){
    const settings=getSettings(),context=getContext();
    if(!bridge?.speak||!speechAllowed(settings,context,automatic,preview))return false;
    text=String(text).replace(/[\x00-\x1f]/g,' ').trim().slice(0,280);
    if(!text||text==='SILENCE')return false;
    const at=now(),interval=context.inGame?60000:settings.speechChatter==='chatty'?15000:45000;
    if(automatic&&(at-lastAutomatic<interval||text===lastText&&at-lastAt<120000))return false;
    stop();
    const id=++sequence;current={id,automatic};onState({id,state:'pending',automatic,text});
    const payload={id,text,automatic,preview,voice:settings.speechVoice,volume:settings.speechVolume,...speechDelivery(settings,mood)};
    Promise.resolve().then(prepare).then(()=>current?.id===id?bridge.speak(payload):true).then(ok=>{
      if(!ok)update({id,state:'error',message:'Voice unavailable. Check the voice settings.'});
    }).catch(()=>update({id,state:'error',message:'Voice unavailable. Try another installed voice.'}));
    if(automatic)lastAutomatic=at;
    lastText=text;lastAt=at;
    return true;
  }
  return {speak,stop,active:()=>Boolean(current)};
}
export function createBrowserSpeechBridge(host=globalThis){
  const synth=host.speechSynthesis;let listener=()=>{},utterance=null;
  const voices=()=>synth?.getVoices().filter(v=>v.localService===true)||[];
  return {
    speechStatus:async()=>({ready:voices().length>0,voices:voices().map(v=>({name:v.name,lang:v.lang})),message:voices().length?'Local browser voices ready.':'No local browser voices. Try the Windows app.'}),
    onSpeechState:fn=>{listener=fn;},
    stopSpeech(){utterance=null;synth?.cancel();},
    speak(payload){
      const list=voices(),selected=list.find(v=>v.name===payload.voice)||list.find(v=>v.default)||list[0];
      if(!synth||!host.SpeechSynthesisUtterance||!selected)return false;
      this.stopSpeech();const item=new host.SpeechSynthesisUtterance(payload.text);utterance=item;
      item.voice=selected;item.lang=selected.lang;item.volume=payload.volume;item.rate=payload.rate;item.pitch=payload.pitch;
      item.onstart=()=>{if(utterance===item)listener({id:payload.id,state:'speaking'});};
      item.onboundary=event=>{if(utterance===item)listener({id:payload.id,state:'timing',kind:'word',index:event.charIndex,length:event.charLength||4});};
      item.onend=()=>{if(utterance===item){utterance=null;listener({id:payload.id,state:'ended'});}};
      item.onerror=()=>{if(utterance===item){utterance=null;listener({id:payload.id,state:'error',message:'Browser voice could not play. Try Test voice again.'});}};
      synth.speak(item);return true;
    }
  };
}
export function createDesktopSpeechBridge(native,{getSettings,host=globalThis}){
  let listener=()=>{},audio=null,url=null,generation=0,playbackTimer=null,timingTimer=null;
  function stopAudio(){generation++;clearTimeout(playbackTimer);clearInterval(timingTimer);timingTimer=null;playbackTimer=null;if(audio){audio.pause();audio.src='';audio=null;}if(url){host.URL.revokeObjectURL(url);url=null;}}
  native.onSpeechState?.(event=>{if(event.state==='cancelled')stopAudio();listener(event);});
  return {
    speechStatus:()=>native.speechStatus?.(),
    onSpeechState:fn=>{listener=fn;},
    stopSpeech(){stopAudio();native.stopSpeech?.();},
    async speak(payload){
      if(getSettings().speechEngine!=='kokoro')return native.speak?.(payload)||false;
      stopAudio();const token=generation;
      const result=await native.synthesize?.(payload);if(token!==generation)return true;
      if(!result?.audio||result.id!==payload.id)return false;
      const bytes=new Uint8Array(result.audio);url=host.URL.createObjectURL(new host.Blob([bytes],{type:'audio/wav'}));
      const item=new host.Audio(url);audio=item;item.volume=payload.volume;let buffering=false;
      const envelope=wavEnvelope(bytes);
      function finish(state,message){if(token!==generation)return;stopAudio();listener({id:payload.id,state,message});}
      item.onplaying=()=>{if(token!==generation)return;buffering=false;listener({id:payload.id,state:'speaking'});
        if(envelope&&!timingTimer){timingTimer=setInterval(()=>{if(token!==generation)return;
          const value=buffering||item.paused||item.seeking?0:envelope.values[Math.floor(item.currentTime/envelope.step)]||0;
          listener({id:payload.id,state:'timing',kind:'amplitude',value});
        },20);timingTimer.unref?.();}
      };
      item.onpause=item.onwaiting=item.onseeking=()=>{buffering=true;if(token===generation)listener({id:payload.id,state:'timing',kind:'amplitude',value:0});};
      item.onended=()=>finish('ended');item.onerror=()=>finish('error','Natural voice audio could not play.');
      playbackTimer=setTimeout(()=>finish('error','Voice playback timed out.'),60000);
      try{await item.play();return true;}catch{finish('error','Audio playback was blocked. Try Test voice.');return false;}
    }
  };
}
