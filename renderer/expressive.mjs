import {bondFavorite} from './bond.mjs';
export const EMOTIONS={calm:'content',curious:'curious',playful:'playful',sleepy:'sleepy',proud:'proud',affectionate:'loved',focused:'focused',none:''};
export function createEmotionController(){
  let event=null;
  return {
    notice(kind,now=Date.now()){
      const mapped={care:['affectionate',12000],play:['playful',12000],learned:['proud',18000],focusDone:['proud',18000],discovery:['curious',6000]}[kind];
      if(!mapped)return false;
      // A passing app switch must not erase a recent affectionate/proud moment.
      if(kind==='discovery'&&event&&event.until>now&&event.kind!=='curious')return false;
      event={kind:mapped[0],until:now+mapped[1]};return true;
    },
    current(s,c={},now=Date.now()){
      if(event&&now>=event.until)event=null;
      if(s.expressiveMoods===false||c.dragging||c.dizzy||c.voiceBusy||c.speaking||c.otherPose)return 'none';
      if(c.sleeping||c.away||s.energy<25)return 'sleepy';
      if(c.focus||c.typing)return 'focused';
      if(c.interaction==='scratch'||c.interaction==='paw')return 'affectionate';
      if(c.interaction==='toy'||c.playing)return 'playful';
      if(c.interaction==='settle')return 'calm';
      if(event)return event.kind;
      return s.personality==='cozy'?'calm':s.personality==='curious'?'curious':s.happiness>=80&&s.personality==='playful'?'playful':'calm';
    },
    clear(){event=null;}
  };
}

export const MOMENTS={scratch:'Head scratch',paw:'Offer a paw',toy:'Bring a toy',settle:'Settle nearby'};
export function createMomentController({random=Math.random}={}){
  let active=null,next=0,previous='',wasBlocked=false;
  const empty=()=>({kind:'none',phase:'none',target:null,carrying:false});
  const delay=s=>(110000+random()*70000)*(s.personality==='cozy'?1.2:1);
  const allowed=(s,c)=>s.littleInteractions!==false&&!c.gameMode&&!c.sleeping&&!c.focus&&!c.dragging&&!c.typing&&!c.playing&&!c.away&&!c.hidden&&!c.userBusy&&!c.speaking&&!c.otherBusy&&!c.airborne;
  const toyAvailable=(s,g)=>Boolean(s.home?.enabled&&g?.home?.toys);
  function begin(kind,s,c,g,now){
    if(!Object.hasOwn(MOMENTS,kind)||!g||!allowed(s,c)||active)return false;
    if(kind==='toy'&&(!toyAvailable(s,g)||c.perched))return false;
    active={kind,phase:kind==='toy'&&!s.reducedMotion?'fetch':'hold',origin:{x:g.pet.x,y:g.pet.y},until:now+90000,holdUntil:kind==='toy'&&!s.reducedMotion?0:now+(kind==='settle'?6000:4000)};
    return true;
  }
  const bounded=(p,g)=>({x:Math.max(g.bounds.left,Math.min(g.bounds.right,p.x)),y:Math.max(Math.min(g.bounds.top,g.bounds.floor),Math.min(g.bounds.floor,p.y))});
  return {
    start(kind,s,c,g,now=Date.now()){const ok=begin(kind,s,c,g,now);if(ok){previous=kind;next=now+delay(s);}return ok;},
    update(s,c={},g,now=Date.now()){
      if(!next)next=now+70000+random()*40000;
      if(!g||!allowed(s,c)){active=null;wasBlocked=true;return empty();}
      if(wasBlocked){next=Math.max(next,now+8000);wasBlocked=false;}
      if(!active&&now>=next&&!c.walking&&!c.perched){
        let choices=s.personality==='cozy'?['settle','paw','settle']:['paw','settle','toy'];
        choices=choices.filter(k=>k!==previous&&(k!=='toy'||s.wander&&!s.reducedMotion&&toyAvailable(s,g)));
        const favorite=s.bond&&bondFavorite(s.bond,'interactions')?.id;if(choices.includes(favorite))choices.push(favorite,favorite);
        const kind=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))]||'settle';begin(kind,s,c,g,now);previous=kind;
      }
      if(!active)return empty();
      if(now>=active.until||active.kind==='toy'&&(!toyAvailable(s,g)||c.perched)){active=null;next=now+delay(s);return empty();}
      if(active.phase==='fetch'||active.phase==='return'){
        const target=bounded(active.phase==='fetch'?g.home.toys:active.origin,g);
        if(Math.hypot(g.pet.x-target.x,g.pet.y-target.y)>6)return {kind:active.kind,phase:active.phase,target,carrying:active.phase==='return'};
        active.phase=active.phase==='fetch'?'collect':'hold';active.holdUntil=now+(active.phase==='collect'?1500:3500);
      }
      if(now>=active.holdUntil){
        if(active.phase==='collect'){active.phase='return';return {kind:active.kind,phase:'return',target:bounded(active.origin,g),carrying:true};}
        const completed=active.kind;active=null;next=now+delay(s);return {...empty(),completed};
      }
      return {kind:active.kind,phase:active.phase,target:null,carrying:active.kind==='toy'&&active.phase==='hold'};
    },
    clear(now=Date.now()){active=null;next=now+90000;wasBlocked=false;},
    get active(){return Boolean(active);}
  };
}
