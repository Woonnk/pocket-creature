export const HABIT_MOODS={stretch:'stretching',groom:'tidying up',settle:'getting comfy'};
const HABIT_PREFERENCES={playful:['stretch','groom','stretch','settle'],curious:['groom','stretch','groom','settle'],cozy:['settle','settle','stretch','groom'],cheeky:['groom','groom','stretch','settle']};
export function createHabitController({random=Math.random}={}){
  let active=null,next=null,previous='',personality=null;
  const delay=settings=>(settings.personality==='cozy'?75000:55000)+random()*35000;
  const allowed=(settings,c)=>settings.littleHabits!==false&&!c.sleeping&&!c.dragging&&!c.playing&&!c.typing&&!c.focus&&!c.userBusy&&!c.away&&!c.dizzy&&!c.airborne&&!c.reacting&&!c.hidden&&!c.speaking;
  return {
    current(settings,context={},now=Date.now()){
      if(personality!==settings.personality){personality=settings.personality;active=null;next=now+30000+random()*20000;}
      if(next===null)next=now+30000+random()*20000;
      if(!allowed(settings,context)){active=null;next=now+30000;return 'none';}
      if(active&&now>=active.until){active=null;next=now+delay(settings);}
      if(active)return active.kind;
      if(now<next||context.walking)return 'none';
      const options=(HABIT_PREFERENCES[settings.personality]||HABIT_PREFERENCES.playful).filter(kind=>kind!==previous);
      const kind=context.gameMode?'settle':options[Math.min(options.length-1,Math.floor(random()*options.length))];
      active={kind,until:now+(kind==='settle'?8000:6000)};previous=kind;return kind;
    },
    preview(kind,settings,context={},now=Date.now()){
      if(!Object.hasOwn(HABIT_MOODS,kind)||!allowed(settings,context))return false;
      personality=settings.personality;active={kind,until:now+(kind==='settle'?8000:6000)};previous=kind;next=now+delay(settings);return true;
    },
    clear(now=Date.now()){active=null;next=now+30000;}
  };
}
