// Presentation only: this controller never changes position, progress, or conversation.
const limit=(v,min,max)=>Math.max(min,Math.min(max,v));
const number=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const tau=Math.PI*2;
export const MOTION_PREVIEWS=Object.freeze({stroll:'Little stroll',wings:'Wing stretch',tail:'Tail wiggle',bounce:'Soft bounce'});
export const MOTION_STYLES=Object.freeze({
  original:{wing:4.5,tail:6,breath:.010,tempo:1},
  cloud:{wing:3,tail:4.8,breath:.014,tempo:.82},
  night:{wing:6,tail:5.5,breath:.007,tempo:1.16},
  river:{wing:3.8,tail:9,breath:.009,tempo:.90},
});
export function neutralMotion(dir=1,mode='still'){
  return {mode,preview:'none',facing:dir<0?-1:1,blink:1,body:{y:0,lean:0,sx:1,sy:1},head:0,wing:0,tail:0,arm:0,front:{x:0,y:0,angle:0},back:{x:0,y:0,angle:0},shadow:{scale:1,opacity:.16}};
}
function voiceOverlay(frame,c){
  const voice=c.voiceFrame;if(!voice)return frame;
  frame.head+=voice.head;frame.arm+=voice.arm;frame.body.lean+=voice.lean;frame.body.y+=voice.y;return frame;
}
export function createMotionController({random=Math.random}={}){
  const roll=()=>limit(number(random(),.5),0,.999999);
  let previous=null,speed=0,gait=0,facing=1,lean=0,clock=0,blinkAt=0,blinkDouble=false,nextBlink=0,nextIdle=0,idle=null,lastIdle='',preview=null,landing=null;
  let displayed=null,handoff=null;
  function finish(frame,now,hard=false){
    if(hard||!displayed){handoff=null;displayed=structuredClone(frame);return frame;}
    if(displayed.mode!==frame.mode){
      const delta={};for(const key of ['head','wing','tail','arm'])delta[key]=displayed[key]-frame[key];
      for(const key of ['body','front','back','shadow']){delta[key]={};for(const field of Object.keys(frame[key]))delta[key][field]=displayed[key][field]-frame[key][field];}
      handoff={at:now,delta};
    }
    if(handoff){
      const p=limit((now-handoff.at)/220,0,1),w=1-p*p*(3-2*p);
      for(const key of ['head','wing','tail','arm'])frame[key]+=handoff.delta[key]*w;
      for(const key of ['body','front','back','shadow'])for(const field of Object.keys(frame[key]))frame[key][field]+=handoff.delta[key][field]*w;
      if(p===1)handoff=null;
    }
    displayed=structuredClone(frame);return frame;
  }
  const blocked=c=>Boolean(c.hidden||c.gameMode||c.reducedMotion||c.sleeping||c.locked||c.typing||c.focus||c.voiceBusy);
  function cancel(now){preview=null;idle=null;landing=null;nextIdle=now+10000;}
  return {
    preview(kind,s,c={},now=0){
      if(!Object.hasOwn(MOTION_PREVIEWS,kind)||blocked({...c,reducedMotion:s.reducedMotion})||c.dragging||c.airborne||c.moving)return false;
      preview={kind,at:now,until:now+6000};idle=null;landing=null;return true;
    },
    clear(now=0){cancel(number(now));},
    update(s={},c={},now=0,dt=1/60){
      now=number(now);dt=limit(number(dt,1/60),0,.05);
      const dir=c.dir<0?-1:1,x=number(c.x),y=number(c.y),vx=number(c.vx),vy=number(c.vy),style=Object.hasOwn(MOTION_STYLES,s.sprite)?MOTION_STYLES[s.sprite]:MOTION_STYLES.original;
      const levels={gentle:.55,normal:1,lively:1.35},personalities={cozy:.75,playful:1.05,curious:1,cheeky:1.12};
      const scale=(Object.hasOwn(levels,s.motionLevel)?levels[s.motionLevel]:1)*(Object.hasOwn(personalities,s.personality)?personalities[s.personality]:1);
      const frozen=blocked({...c,reducedMotion:s.reducedMotion});
      if(!previous){facing=dir;previous={x,y,vy,airborne:Boolean(c.airborne)};nextBlink=now+2000+roll()*3500;nextIdle=now+9000+roll()*9000;}
      const dx=x-previous.x,dy=y-previous.y,teleport=Math.hypot(dx,dy)>80;
      const distance=!teleport&&!c.dragging&&!c.airborne?Math.abs(dx):0;
      const measured=dt>0?limit(distance/dt,0,250):0;
      const eased=1-Math.exp(-18*dt);
      if(frozen){
        cancel(now);speed=0;lean=0;facing+=(dir-facing)*(1-Math.exp(-24*dt));blinkAt=0;nextBlink=now+1800+roll()*2500;
        const hard=Boolean(c.gameMode||s.reducedMotion||c.hidden);if(hard)facing=dir;
        const frame=neutralMotion(dir,hard?'still':'pose');frame.facing=facing;
        previous={x,y,vy,airborne:false};return finish(voiceOverlay(frame,c),now,hard);
      }
      clock+=dt;facing+=(dir-facing)*(1-Math.exp(-24*dt));if(Math.abs(facing-dir)<.001)facing=dir;
      speed+=(measured-speed)*eased;
      if(teleport){speed=0;cancel(now);}
      if(c.dragging||c.airborne||distance>.05)idle=null;
      if(preview&&(now>=preview.until||c.dragging||c.airborne||distance>.05))preview=null;
      if(previous.airborne&&!c.airborne&&!c.dragging&&!teleport&&previous.vy>90)landing={at:now,strength:limit(previous.vy/650,.3,1)};
      if(landing&&(now-landing.at>=450||c.dragging||c.airborne))landing=null;
      previous={x,y,vy,airborne:Boolean(c.airborne)};
      const frame=neutralMotion(dir,'idle');frame.facing=facing;
      if(!blinkAt&&now>=nextBlink){blinkAt=now||.001;blinkDouble=roll()<.22;}
      if(blinkAt){
        const elapsed=now-blinkAt,duration=blinkDouble?330:150;
        if(elapsed>=duration){blinkAt=0;nextBlink=now+2700+roll()*4500;}
        else {const local=elapsed>180?elapsed-180:elapsed;frame.blink=local<=150?1-.92*Math.sin(Math.PI*limit(local/150,0,1))**2:1;}
      }
      if(s.littleHabits===false)idle=null;
      if(!preview&&!idle&&speed<3&&!c.dragging&&!c.airborne&&!landing&&s.littleHabits!==false&&!c.perched&&!c.speaking&&now>=nextIdle){
        const choices=['glance','sniff','wing-check','tail-flick'].filter(k=>k!==lastIdle),kind=choices[Math.floor(roll()*choices.length)];
        idle={kind,at:now};lastIdle=kind;nextIdle=now+16000+roll()*12000;
      }
      if(idle&&now-idle.at>=3600)idle=null;
      const t=clock*style.tempo,breathe=Math.sin(t*tau/3.8)*style.breath*scale;
      frame.body.sx=1+breathe*.55;frame.body.sy=1-breathe;
      frame.head=limit(number(c.lookY)*.9+number(c.lookX)*.35,-3,3);
      frame.wing=Math.sin(t*tau/4.9)*style.wing*scale;
      frame.tail=(Math.sin(t*tau/3.7)+.2*Math.sin(t*tau/1.85))*style.tail*scale;
      if(c.dragging){
        frame.mode='drag';lean+=(limit(vx/140,-4,4)-lean)*(1-Math.exp(-12*dt));frame.body.lean=lean;
        frame.body.sx=1-.015*scale;frame.body.sy=1+.035*scale;frame.wing-=6*scale;frame.tail-=limit(vx/110,-5,5);idle=null;
      }else if(c.airborne){
        frame.mode='fall';frame.body.sx=1-.025*scale;frame.body.sy=1+.045*scale;frame.body.lean=limit(vx/180,-3,3);
        frame.wing=-10*scale;frame.tail=-6*scale;frame.front.y=-2;frame.back.y=-2;
        frame.shadow={scale:limit(1-number(c.height)/480,.58,1),opacity:limit(.16-number(c.height)/3000,.07,.16)};
      }else if(preview?.kind==='stroll'||speed>3){
        frame.mode=preview?'preview':'walk';const walkingSpeed=preview?85:speed;
        gait+=preview?dt*85*tau/66:distance*tau/66;
        const strength=limit(walkingSpeed/85,0,1.4)*scale,swing=Math.sin(gait),back=-swing;
        frame.body.y=-Math.abs(Math.sin(gait))*2.6*strength;frame.body.lean=swing*.65*strength;
        // Compensate for the body bob so the planted paw remains at ground level.
        frame.front={x:swing*3.2*strength,y:-frame.body.y-Math.max(0,swing)*5.2*strength,angle:swing*7*strength};
        frame.back={x:back*3.2*strength,y:-frame.body.y-Math.max(0,back)*5.2*strength,angle:back*7*strength};
        frame.head+=Math.sin(gait+.45)*1.1*strength;frame.tail+=Math.sin(gait-1)*2.7*strength;
        frame.wing-=2.5*strength;if(!c.carrying)frame.arm=-swing*4*strength;
      }
      if(landing){
        frame.mode='landing';const p=limit((now-landing.at)/450,0,1),squash=Math.sin(p*Math.PI)*Math.exp(-3*p)*3*landing.strength*scale;
        frame.body.sx=1+squash*.08;frame.body.sy=1-squash*.12;frame.body.y=-Math.sin(p*tau)*.8*landing.strength;
        frame.tail+=squash*3;frame.front={x:0,y:0,angle:0};frame.back={x:0,y:0,angle:0};frame.shadow.scale=1+squash*.09;
      }
      const gesture=preview?.kind==='stroll'?null:preview?.kind||idle?.kind;
      if(gesture){
        const elapsed=now-(preview?.at??idle.at),length=preview?6000:3600,envelope=Math.sin(Math.PI*limit(elapsed/length,0,1))**2;
        frame.preview=preview?.kind||'none';if(preview)frame.mode='preview';
        if(gesture==='glance')frame.head+=Math.sin(elapsed/600)*7*envelope*scale;
        if(gesture==='sniff'){frame.head-=5*envelope*scale;frame.body.y-=Math.sin(elapsed/150)*.65*envelope*scale;}
        if(gesture==='wings'||gesture==='wing-check')frame.wing-=22*envelope*scale;
        if(gesture==='tail'||gesture==='tail-flick')frame.tail+=Math.sin(elapsed/160)*12*envelope*scale;
        if(gesture==='bounce'){
          const phase=elapsed%1500/1500,jump=Math.sin(Math.PI*limit((phase-.20)/.55,0,1));
          frame.body.y-=jump*12*scale;frame.body.sx=1+(phase<.2?Math.sin(phase/.2*Math.PI)*.055:0)*scale;frame.body.sy=1-(phase<.2?Math.sin(phase/.2*Math.PI)*.09:0)*scale;frame.shadow.scale=1-jump*.16;
        }
      }
      if(preview)frame.preview=preview.kind;
      frame.head=limit(frame.head,-12,12);frame.wing=limit(frame.wing,-32,15);frame.tail=limit(frame.tail,-24,24);
      return finish(voiceOverlay(frame,c),now,teleport);
    },
    get active(){return Boolean(preview);},
  };
}
