// Transient geometry only. A perch never enters the companion save or AI context.
export function validWindowBounds(value){
  if(!value||typeof value!=='object'||!['x','y','width','height'].every(key=>Number.isFinite(value[key])))return null;
  if(Math.abs(value.x)>100000||Math.abs(value.y)>100000||value.width<240||value.height<100||value.width>20000||value.height>20000)return null;
  return Object.fromEntries(['x','y','width','height'].map(key=>[key,Math.round(value[key])]));
}
export function perchTarget(surface,viewport,fraction=.72){
  const rect=validWindowBounds(surface?.bounds);
  if(!rect||typeof surface.id!=='string'||!surface.id||surface.id.length>40||surface.maximized||surface.fullscreen||!Number.isFinite(viewport?.width)||!Number.isFinite(viewport?.height))return null;
  const left=Math.max(125,rect.x+115),right=Math.min(viewport.width-125,rect.x+rect.width-115);
  // Leave enough room for the whole dragon and its name; no perch on a clipped edge.
  if(left>right||rect.y<230||rect.y>viewport.height-50)return null;
  const x=Math.max(left,Math.min(right,rect.x+rect.width*Math.max(0,Math.min(1,fraction))));
  return {id:surface.id,x,y:rect.y,left,right,rect};
}
export function windowInOverlay(surface,overlay,toDip=rect=>rect){
  const physical=validWindowBounds(surface?.bounds);if(!physical||!overlay)return null;
  try{
    const rect=validWindowBounds(toDip(physical));if(!rect)return null;
    return {id:String(surface.id||'').slice(0,40),bounds:{...rect,x:rect.x-overlay.x,y:rect.y-overlay.y},maximized:surface.maximized===true,fullscreen:surface.fullscreen===true};
  }catch{return null;}
}
export function createPerchController(){
  let active=null,candidate='',since=0,pausedUntil=0,fraction=.72;
  const enabled=(settings,context)=>settings.windowPerching!==false&&settings.pcAwareness&&!context.gameMode;
  const busy=c=>c.dragging||c.playing||c.sleeping||c.focus||c.away||c.typing||c.userBusy||c.speaking||c.airborne;
  return {
    update(surface,viewport,settings,context={},now=Date.now()){
      const target=enabled(settings,context)?perchTarget(surface,viewport,fraction):null;
      if(!target||context.playing){active=null;candidate='';return null;}
      if(active?.id===target.id){active=target;return {...active};}
      if(active){active=null;candidate='';fraction=.72;}
      if(busy(context)||now<pausedUntil){candidate='';return null;}
      const key=JSON.stringify([target.id,target.rect]);
      if(candidate!==key){candidate=key;since=now;return null;}
      if(now-since<2000)return null;
      active=target;return {...active};
    },
    detach(now=Date.now()){active=null;candidate='';pausedUntil=now+45000;fraction=.72;},
    drop(point,surface,viewport,settings,context={},now=Date.now()){
      const target=enabled(settings,context)&&!context.playing?perchTarget(surface,viewport):null;
      if(!target||Math.abs(point.y-target.y)>30||point.x<target.left||point.x>target.right)return null;
      fraction=(point.x-target.rect.x)/target.rect.width;active=perchTarget(surface,viewport,fraction);candidate='';pausedUntil=now;return {...active};
    },
    get attached(){return Boolean(active);}
  };
}
