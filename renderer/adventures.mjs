// Routes use only the overlay's current viewport and usable foreground perch geometry.
export function createAdventureController({random=Math.random}={}){
  let active=null,next=0,blocked=false,pendingReturnUntil=0;
  const allowed=(s,c)=>s.screenAdventures!==false&&!s.reducedMotion&&!c.gameMode&&!c.sleeping&&!c.focus&&!c.dragging&&!c.typing&&!c.playing&&!c.away&&!c.hidden&&!c.userBusy&&!c.speaking&&!c.reacting&&!c.homeBusy&&!c.habitBusy&&!c.dailyBusy&&!c.trickBusy;
  const delay=s=>(60000+random()*60000)*({gentle:1.6,normal:1,lively:.8}[s.motionLevel]||1)*(s.personality==='cozy'?1.4:1);
  const empty=()=>({kind:'none',phase:'none',target:null,pose:'none'});
  function begin(kind,g,now){
    if(kind==='window-climb'&&!g.perch)return false;
    const side=g.perch?(g.pet.x-g.perch.left<g.perch.right-g.pet.x?'left':'right'):(g.pet.x-g.bounds.left<g.bounds.right-g.pet.x?'left':g.pet.x-g.bounds.left>g.bounds.right-g.pet.x?'right':random()<.5?'left':'right');
    active={kind,side,id:g.perch?.id||null,originX:g.pet.x,step:0,holdUntil:0,until:now+90000};return true;
  }
  function goal(g){
    const a=active,b=g.bounds,limitX=x=>Math.max(b.left,Math.min(b.right,x));
    if(a.kind==='window-climb'){
      const p=g.perch;if(!p||p.id!==a.id)return null;
      const x=Math.max(b.left,Math.min(b.right,a.side==='left'?p.left:p.right)),low=Math.min(b.floor,p.y+Math.min(120,p.rect.height*.5));
      const goals=[{x,y:p.y,phase:'explore'},{x,y:low,phase:'climb'},{x,y:p.y,phase:'climb'},{x:p.x,y:p.y,phase:'return'}];return goals[a.step]||null;
    }
    if(a.step>1)return null;
    const x=limitX(a.step===0?(a.side==='left'?b.left:b.right):a.originX);return {x,y:b.floor,phase:a.step===0?'explore':'return'};
  }
  return {
    update(s,c={},g,now=Date.now()){
      if(!next)next=now+delay(s);
      if(now>pendingReturnUntil||s.screenAdventures===false||s.reducedMotion||c.gameMode||c.focus||c.hidden)pendingReturnUntil=0;
      if(!g||!allowed(s,c)){if(active)next=now+delay(s);active=null;blocked=true;return empty();}
      if(blocked){next=Math.max(next,now+3000);blocked=false;}
      if(active&&(now>=active.until||active.kind==='window-climb'&&(!g.perch||g.perch.id!==active.id))){active=null;next=now+delay(s);}
      if(!active&&pendingReturnUntil){active={kind:'return-peek',holdUntil:now+3500,until:now+3500};pendingReturnUntil=0;}
      if(!active&&s.wander&&now>=next&&!c.walking){begin(g.perch?'window-climb':'edge-peek',g,now);}
      if(!active)return empty();
      if(active.kind==='return-peek'){if(now>=active.holdUntil){active=null;next=now+delay(s);return empty();}return {kind:'return-peek',phase:'peek',target:g.perch?{x:g.perch.x,y:g.perch.y}:null,pose:'peek'};}
      if(active.holdUntil){if(now<active.holdUntil)return {kind:active.kind,phase:'peek',target:active.kind==='window-climb'?goal(g):null,pose:'peek'};active.holdUntil=0;active.step++;}
      let target=goal(g);if(!target){active=null;next=now+delay(s);return empty();}
      if(Math.hypot(g.pet.x-target.x,g.pet.y-target.y)<5){
        const peekStep=active.kind==='window-climb'?2:0;
        if(active.step===peekStep){active.holdUntil=now+3000;return {kind:active.kind,phase:'peek',target:null,pose:'peek'};}
        active.step++;target=goal(g);
        if(!target){active=null;next=now+delay(s);return empty();}
      }
      return {kind:active.kind,phase:target.phase,target:{x:target.x,y:target.y},pose:target.phase==='climb'?'climb':'walking'};
    },
    preview(kind,s,c,g,now=Date.now()){
      if(!['edge-peek','window-climb'].includes(kind)||!g||!allowed(s,c))return false;
      active=null;blocked=false;if(!begin(kind,g,now))return false;next=now+delay(s);return true;
    },
    returned(s,c={},now=Date.now()){
      if(s.screenAdventures===false||s.reducedMotion||c.gameMode||c.focus||c.away||c.hidden)return false;
      pendingReturnUntil=now+15000;if(allowed(s,c)&&!active){active={kind:'return-peek',holdUntil:now+3500,until:now+3500};pendingReturnUntil=0;}next=now+delay(s);return true;
    },
    clear(now=Date.now()){active=null;pendingReturnUntil=0;next=now+60000;},
    get active(){return Boolean(active);}
  };
}
