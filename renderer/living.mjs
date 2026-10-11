// These routines are silent. Conversation and deliberate activities always take priority.
export const LIVING_POSES={hop:'a tiny adventure',tilt:'looking around',peek:'being curious',snuggle:'getting cozy',yawn:'winding down'};
const LIVING_PROFILES={
  playful:{speed:1,interval:1,poses:['hop','tilt','hop','peek']},
  curious:{speed:.9,interval:1.15,poses:['peek','tilt','peek','hop']},
  cozy:{speed:.65,interval:1.8,poses:['snuggle','yawn','snuggle','tilt']},
  cheeky:{speed:1.12,interval:.85,poses:['tilt','hop','peek','hop']}
};
export function dayPeriod(now=new Date()){
  const hour=now.getHours();return hour>=6&&hour<11?'morning':hour>=11&&hour<17?'afternoon':hour>=17&&hour<22?'evening':'night';
}
export function livingProfile(settings={}){
  const p=LIVING_PROFILES[settings.personality]||LIVING_PROFILES.playful;
  const movement={gentle:.7,normal:1,lively:1.25}[settings.motionLevel]||1;
  return {...p,speed:p.speed*movement,interval:p.interval/movement};
}
export function createDailyController({random=Math.random}={}){
  let active=null,next=0,previous='',signature='',blocked=false;
  const allowed=(s,c)=>s.dailyRoutines!==false&&!s.reducedMotion&&!c.gameMode&&!c.sleeping&&!c.focus&&!c.dragging&&!c.playing&&!c.typing&&!c.away&&!c.hidden&&!c.userBusy&&!c.speaking&&!c.reacting&&!c.habitBusy&&!c.homeBusy&&!c.perched&&!c.walking&&!c.airborne;
  const postpone=(s,now)=>now+(45000+random()*45000)*livingProfile(s).interval;
  const start=(s,now,period)=>{
    let options=period==='night'?['snuggle','yawn']:period==='morning'?['tilt',...livingProfile(s).poses]:livingProfile(s).poses;
    options=options.filter(pose=>pose!==previous);
    const pose=options[Math.min(options.length-1,Math.floor(random()*options.length))];
    active={pose,until:now+(pose==='snuggle'?6500:4500)};previous=pose;return pose;
  };
  return {
    current(settings,context={},now=Date.now()){
      const period=dayPeriod(new Date(now)),key=settings.personality+':'+settings.motionLevel+':'+period;
      if(key!==signature){signature=key;active=null;next=postpone(settings,now);}
      if(!allowed(settings,context)){if(active)next=postpone(settings,now);active=null;blocked=true;return 'none';}
      if(blocked){next=Math.max(next,now+3000);blocked=false;}
      if(active&&now>=active.until){active=null;next=postpone(settings,now);}
      if(active)return active.pose;
      if(now<next)return 'none';
      return start(settings,now,period);
    },
    preview(settings,context={},now=Date.now()){
      if(!allowed(settings,context))return false;
      signature=settings.personality+':'+settings.motionLevel+':'+dayPeriod(new Date(now));
      start(settings,now,dayPeriod(new Date(now)));next=postpone(settings,now);return true;
    },
    clear(now=Date.now()){active=null;next=now+60000;},
    get pose(){return active?.pose||'none';}
  };
}
