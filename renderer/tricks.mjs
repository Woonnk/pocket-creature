export const TRICKS={wave:{label:'Wave',description:'A little hello with one paw.'},bow:{label:'Bow',description:'A very polite dragon bow.'},spin:{label:'Spin',description:'A small twirl, just for you.'},hop:{label:'Hop',description:'A happy hop on tiny feet.'}};
export function normalizeTricks(input={}){
  const entries={};for(const kind of Object.keys(TRICKS)){const t=input?.[kind]||{};entries[kind]={practice:Number.isFinite(t.practice)?Math.max(0,Math.min(3,Math.floor(t.practice))):0,lastPracticeAt:Number.isFinite(t.lastPracticeAt)?Math.max(0,Math.min(9000000000000000,t.lastPracticeAt)):0};}return entries;
}
export function parseTrickRequest(message,name=''){
  let text=String(message||'').trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
  const prefix=String(name).toLowerCase().trim();for(const greeting of prefix?[`hey ${prefix}, `,`hey ${prefix} `,`${prefix}, `]:[]){if(text.startsWith(greeting)){text=text.slice(greeting.length);break;}}
  text=text.replace(/^(?:please |(?:can|could|would) you (?:please )?)/,'').replace(/(?:,? please)$/,'');
  const match=text.match(/^(practice|learn to|do|do a|show me your) (wave|bow|spin|hop)$/);
  return match?{kind:match[2],practice:['practice','learn to'].includes(match[1])}:null;
}
export function createTrickController(){
  let active=null;
  const allowed=c=>!c.gameMode&&!c.sleeping&&!c.focus&&!c.dragging&&!c.typing&&!c.playing&&!c.away&&!c.hidden&&!c.userBusy&&!c.speaking&&!c.homeBusy&&!c.airborne;
  return {
    start(kind,practice,s,c={},now=Date.now()){
      if(!Object.hasOwn(TRICKS,kind))return {ok:false,message:'Choose a trick first.'};
      if(active||!allowed(c))return {ok:false,message:'Let me finish my current activity first.'};
      const progress=s.tricks?.[kind]||{practice:0,lastPracticeAt:0};
      if(!practice&&progress.practice<3)return {ok:false,message:'Teach this trick with three complete practices first.'};
      if(practice&&progress.practice>=3)return {ok:false,message:'This trick is learned. Choose Perform.'};
      if(practice&&now>=progress.lastPracticeAt&&now-progress.lastPracticeAt<10000&&progress.lastPracticeAt>0)return {ok:false,message:'A tiny breather first. Try another practice in a few seconds.'};
      active={kind,practice,until:now+(kind==='spin'?4000:3000)};return {ok:true};
    },
    update(s,c={},now=Date.now()){
      if(!active)return {kind:'none'};
      if(!allowed(c)){active=null;return {kind:'none',interrupted:true};}
      if(now>=active.until){const finished=active;active=null;if(finished.practice){s.tricks=normalizeTricks(s.tricks);const progress=s.tricks[finished.kind];progress.practice=Math.min(3,progress.practice+1);progress.lastPracticeAt=now;return {kind:'none',completed:finished.kind,learned:progress.practice===3};}return {kind:'none'};}
      return {kind:active.kind,practice:active.practice};
    },
    clear(){active=null;},
    get active(){return Boolean(active);}
  };
}
