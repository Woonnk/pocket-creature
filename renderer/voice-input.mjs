export function createVoiceInputSession({getSettings,onState=()=>{},submit=()=>{},review=()=>{}}){
  let phase='ready',lastId=0,heard='',enabled=false,activeEpoch=-1,minimumEpoch=0;
  function reset(){minimumEpoch=Math.max(minimumEpoch,activeEpoch+1);phase='ready';heard='';lastId=0;onState({state:phase,text:heard});}
  function receive(event){
    const epoch=Number.isSafeInteger(event.epoch)?event.epoch:0;if(epoch<minimumEpoch)return;const newEpoch=epoch!==activeEpoch;if(newEpoch){lastId=0;activeEpoch=epoch;}
    const settings=getSettings();enabled=settings.voiceInputEnabled===true;
    if(!enabled||settings.quiet){reset();return;}
    // A delayed status probe must not replace an active capture or reply.
    if(event.state==='ready'&&!newEpoch&&['listening','transcribing','thinking'].includes(phase))return;
    if(['disabled','starting'].includes(event.state)){lastId=0;heard='';}
    if(['disabled','starting','ready','error','empty'].includes(event.state)){phase=event.state;onState({...event,text:heard});return;}
    if(event.state==='listening'){if(event.id<=lastId)return;lastId=event.id;heard='';phase='listening';onState({...event,text:''});return;}
    if(event.id!==lastId)return;
    if(event.state==='transcribing'){phase='transcribing';onState({...event,text:''});return;}
    if(event.state==='transcript'&&phase==='transcribing'){
      heard=String(event.text||'').trim().slice(0,1200);phase='ready';if(!heard){onState({state:'empty',text:''});return;}
      onState({state:'heard',text:heard});
      if(settings.voiceInputReview||event.needsReview)review(heard);else{phase='thinking';onState({state:'thinking',text:heard});submit(heard);}
    }
  }
  return {receive,reset,finish(){phase='ready';onState({state:phase,text:heard});},busy:()=>['listening','transcribing','thinking'].includes(phase)};
}
