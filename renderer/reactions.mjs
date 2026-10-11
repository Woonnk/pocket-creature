export const OBSERVATION_SCHEMA={type:'object',properties:{reply:{type:'string'},event:{type:'string',enum:['none','discovery','error','victory']},evidence:{type:'string'}},required:['reply','event','evidence'],additionalProperties:false};
// A model label alone is insufficient for a factual error/win reaction.
export function decodeObservation(value,{hasImage=false,fileName=''}={}){
  let data=value;
  if(typeof data==='string'){
    const raw=data.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    if(raw.startsWith('{')||raw.startsWith('[')){try{data=JSON.parse(raw);}catch{return {reply:'SILENCE',reaction:'none'};}}
    else return {reply:raw,reaction:'none'};
  }
  if(!data||typeof data!=='object'||typeof data.reply!=='string')return {reply:'SILENCE',reaction:'none'};
  const reply=data.reply.slice(0,1000),evidence=typeof data.evidence==='string'?data.evidence.slice(0,160):'';
  const uncertain=/\b(?:maybe|might|guess|if|example|tutorial|no errors?|not an error|not a win|not a victory|did not win|no victory)\b|\?/i.test(evidence);
  let reaction='none';
  if(reply&&!/^SILENCE[.!]?$/i.test(reply.trim())&&evidence&&!uncertain){
    if(data.event==='discovery'&&(hasImage||fileName&&evidence.toLowerCase().includes(fileName.toLowerCase())))reaction='curious';
    if(data.event==='error'&&hasImage&&/\b(?:error|failed|failure|exception|traceback|crashed)\b|not found/i.test(evidence)&&!/\b(?:throw|raise|assert|test code)\b/i.test(evidence))reaction='surprised';
    if(data.event==='victory'&&hasImage&&/\b(?:victory|you won|you win|winner|match won|mission complete|level complete|stage clear(?:ed)?)\b/i.test(evidence)&&!/\b(?:lost|lose|defeat|failure)\b/i.test(reply))reaction='celebrate';
  }
  return {reply,reaction};
}
export const REACTION_MOODS={curious:'inquisitive',surprised:'surprised',celebrate:'delighted'};
// Foreground identity stays current immediately; comments wait for a stable, fresh signal.
export function createActivityTiming(){
  let key=null,changedAt=0,seenAt=-Infinity,inputAt=-Infinity,revision=0;
  return {
    observe(signal,now=Date.now()){
      const next=JSON.stringify([String(signal.contextId??0),signal.category||'none',signal.windowTitle||'']);
      const changed=next!==key;if(changed){key=next;changedAt=now;revision++;}
      seenAt=now;if(signal.typingCount>0)inputAt=now;return changed;
    },
    ready(now=Date.now()){return key!==null&&now-changedAt>=2000&&now-inputAt>=2500&&now-seenAt<=6000;},
    get revision(){return revision;},
  };
}
export function createFileNotice(){
  let pending=null;
  return {
    offer(line,file,revision,now=Date.now()){pending={line,path:file.path,name:file.name,revision,at:now};},
    take(file,revision,{ready=false,busy=false}={},now=Date.now()){
      if(!pending)return null;
      if(!file||pending.path!==file.path||pending.name!==file.name||pending.revision!==revision||busy||now-pending.at>12000){pending=null;return null;}
      if(!ready||now-pending.at<1200)return null;
      const line=pending.line;pending=null;return line;
    },
    clear(){pending=null;},
  };
}
export function createReactionController(){
  let active=null,last=-Infinity;
  const allowed=(settings,context,manual=false)=>settings.physicalReactions!==false&&(manual||settings.pcAwareness&&!settings.quiet)&&!context.sleeping&&!context.dragging&&!context.playing&&!context.typing&&!context.focus&&!context.userBusy&&!context.away&&!context.dizzy&&!context.airborne;
  return {
    start(kind,settings,context={},now=Date.now(),manual=false){
      if(!Object.hasOwn(REACTION_MOODS,kind)||!allowed(settings,context,manual)||!manual&&(active&&now<active.until||now-last<(context.gameMode?60000:12000)))return false;
      active={kind,until:now+(context.gameMode?3000:4200),manual};last=now;return true;
    },
    current(settings,context={},now=Date.now()){
      if(active&&(now>=active.until||!allowed(settings,context,active.manual)))active=null;
      return active?.kind||'none';
    },
    clear(){active=null;}
  };
}
