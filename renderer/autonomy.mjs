import {answersRecentQuestion} from './conversation.mjs';
export function observeProject(file,previous,now=Date.now()){
  if(!file?.projectId||file.unread)return previous||null;
  const files=[file.name,...(previous?.files||[]).filter(name=>name!==file.name)].slice(0,8);
  return {id:file.projectId,name:file.project||file.name,description:previous?.description||`Working with ${file.extension?.toUpperCase()||'text'} files in ${file.project||file.name}.`,automatic:previous?.automatic??true,files,lastSeen:now};
}
export function rememberConversation(message,file,previous){
  if(!file?.projectId||file.unread)return previous||null;
  const fact=String(message).match(/\b(?:i(?:['’]m| am)|we(?:['’]re| are))\s+(?:building|making|working on|developing)\s+([^\n.!?]{3,420})/i)?.[0];
  if(!fact)return previous||null;
  return {...observeProject(file,previous),description:fact.slice(0,500),automatic:true};
}
export function createAutoScheduler(){
  let last=-Infinity,busy=false,started=0,revision=0;
  return {
    invalidate(){revision++;},
    begin(settings,context,now=Date.now(),urgent=false){
      const baseGap={chatty:18000,balanced:45000,minimal:120000}[settings.talkativeness]||18000;
      const gap=context.gameMode||context.category==='gaming'?Math.max(60000,baseGap):baseGap;
      if(busy||!settings.autoConversations||!settings.pcAwareness||settings.quiet||context.sleeping||context.dragging||context.playing||context.away||context.userBusy||!context.ready||now-last<(urgent&&!context.gameMode?8000:gap))return null;
      busy=true;last=now;started=revision;return started;
    },
    finish(token){busy=false;return token===revision&&token===started;},
    get busy(){return busy;}
  };
}
// Transient conversation state: automatic observations never enter saved history.
export function createConversationGuard(){
  let holdUntil=0,starter=null;
  return {
    hold(now=Date.now()){holdUntil=Math.max(holdUntil,now+90000);},
    blocked(now=Date.now()){return now<holdUntil;},
    observe(text,contextId,now=Date.now()){
      starter={text,contextId:String(contextId),expires:now+180000};
      if(text.includes('?'))holdUntil=Math.max(holdUntil,now+120000);
    },
    replyTo(contextId,now=Date.now(),message=''){return starter&&now<starter.expires&&(starter.contextId===String(contextId)||starter.text.includes('?')&&answersRecentQuestion(message))?{text:starter.text,contextId:String(contextId)}:null;},
    clear(){starter=null;}
  };
}
// Speech bubbles stay readable even when a local model ignores the length request.
export function briefReply(value,automatic=false){
  let text=String(value||'').replace(/```[\s\S]*?```/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`#]/g,'').replace(/^(?:assistant|lil wonks|ember):\s*/i,'').replace(/\s+/g,' ').trim();
  if(automatic){
    // Remove greetings BEFORE sentence truncation, keeping the observation.
    text=text.replace(/^(?:(?:hi|hello|hey)(?:\s+(?:there|again|friend|human))?(?:\s*,?\s+[A-Z][a-z]{1,20})?\s*[,!.:—-]\s*|(?:welcome back|you['’]re back)\s*[!.]\s*)+/i,'').trim();
    if(!text||/^(?:hi|hello|hey)(?:\s+(?:there|again|friend|human))?[!.]?$/i.test(text)||/^(?:i['’]m|i am|my name is)\s+(?:your\s+)?(?:tiny\s+)?(?:desktop\s+)?(?:dragon|companion|lil wonks|ember)\b/i.test(text))return 'SILENCE';
  }
  if(/^SILENCE[.!]?$/i.test(text))return 'SILENCE';
  const sentences=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].map(s=>s.segment.trim());
  text=sentences.slice(0,automatic?1:2).join(' ');
  const limit=automatic?24:40,max=automatic?170:280;
  let words=text.split(/\s+/);const shortened=words.length>limit||text.length>max;
  words=words.slice(0,limit);while(words.join(' ').length>max-1)words.pop();
  return words.join(' ').replace(shortened?/[,:;\s]+$/:/$/,'')+(shortened?'…':'');
}
export function createCommentFilter(){
  const recent=[];
  const words=line=>new Set(line.toLowerCase().match(/[a-z0-9]+/g)||[]);
  return {accept(line){
    if(!line||line==='SILENCE')return false;
    const next=words(line);if(!next.size)return false;
    if(recent.some(previous=>{const matches=[...next].filter(w=>previous.has(w)).length;return matches/(next.size+previous.size-matches)>=.7;}))return false;
    recent.push(next);if(recent.length>4)recent.shift();return true;
  }};
}
