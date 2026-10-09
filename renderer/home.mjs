export const HOME_ITEMS={
  'bed-wicker':{slot:'bed',value:'wicker',name:'Wicker basket',cost:0,icon:'▰',description:'The original comfy corner.'},
  'bed-cloud':{slot:'bed',value:'cloud',name:'Cloud cushion',cost:16,icon:'☁',description:'A soft landing for sleepy paws.'},
  'bed-leaf':{slot:'bed',value:'leaf',name:'Leaf nest',cost:28,icon:'❧',description:'A tiny woodland hideaway.'},
  'rug-none':{slot:'rug',value:'none',name:'Open floor',cost:0,icon:'◌',description:'A little space to stretch.'},
  'rug-moss':{slot:'rug',value:'moss',name:'Moss rug',cost:8,icon:'◍',description:'Soft green under his paws.'},
  'rug-sunset':{slot:'rug',value:'sunset',name:'Sunset rug',cost:12,icon:'◉',description:'A warm peach woven rug.'},
  'plant-none':{slot:'plant',value:'none',name:'No plant',cost:0,icon:'◌',description:'Leave this corner clear.'},
  'plant-fern':{slot:'plant',value:'fern',name:'Little fern',cost:10,icon:'❧',description:'Something leafy to investigate.'},
  'plant-flowers':{slot:'plant',value:'flowers',name:'Wildflowers',cost:18,icon:'✿',description:'A little color for the windowsill.'},
  'lamp-none':{slot:'lamp',value:'none',name:'Daylight',cost:0,icon:'☼',description:'Keep things simple.'},
  'lamp-mushroom':{slot:'lamp',value:'mushroom',name:'Mushroom lamp',cost:22,icon:'⌂',description:'A warm little reading light.'},
  'lamp-moon':{slot:'lamp',value:'moon',name:'Moon lamp',cost:30,icon:'☾',description:'A small moon of his own.'},
  'toy-ball':{slot:'toy',value:'ball',name:'Bouncy ball',cost:0,icon:'●',description:'The toy basket’s first treasure.'},
  'toy-star':{slot:'toy',value:'star',name:'Star plush',cost:18,icon:'✦',description:'A soft star to toss and catch.'}
};
const homeDefaults={bed:'wicker',rug:'none',plant:'none',lamp:'none',toy:'ball'};
const homeClamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const homeNumber=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)?homeClamp(v,0,1):fallback;
export function normalizeHome(input={}){
  const h=input&&typeof input==='object'?input:{};
  const owned=[...new Set([...Object.keys(HOME_ITEMS).filter(id=>HOME_ITEMS[id].cost===0),...(Array.isArray(h.owned)?h.owned.filter(id=>Object.hasOwn(HOME_ITEMS,id)):[])])];
  const slots={};for(const [slot,value] of Object.entries(homeDefaults)){const id=slot+'-'+h[slot];slots[slot]=owned.includes(id)?HOME_ITEMS[id].value:value;}
  return {enabled:typeof h.enabled==='boolean'?h.enabled:true,routines:typeof h.routines==='boolean'?h.routines:true,x:homeNumber(h.x,.79),y:homeNumber(h.y,1),owned,...slots};
}
export function purchaseHome(state,id){
  if(!Object.hasOwn(HOME_ITEMS,id))return false;
  const item=HOME_ITEMS[id];if(!state.home.owned.includes(id)){if(state.coins<item.cost)return false;state.coins-=item.cost;state.home.owned.push(id);}
  state.home[item.slot]=item.value;return true;
}
export function homeLimits(viewport){
  const width=Math.max(24,Number.isFinite(viewport.width)?viewport.width:24),height=Math.max(24,Number.isFinite(viewport.height)?viewport.height:24),size=Math.min(320,Math.max(24,width-24));
  const floor=homeClamp(Number.isFinite(viewport.floor)?viewport.floor:height-35,12,height-12),left=Math.min(size/2+12,width/2),right=Math.max(width-left,left),top=Math.min(235,floor);
  return {left,right,top,floor,scale:size/320,width:size};
}
export function homePosition(home,viewport,obstacles=[]){
  const limits=homeLimits(viewport);let x=limits.left+(limits.right-limits.left)*homeNumber(home.x,.79),y=limits.top+(limits.floor-limits.top)*homeNumber(home.y,1);
  for(const r of obstacles){if(r&&[r.left,r.top,r.right,r.bottom].every(Number.isFinite)&&x+limits.width/2>r.left&&x-limits.width/2<r.right&&y+20>r.top&&y-145*limits.scale<r.bottom)y=Math.max(limits.top,r.top-26);}
  const scale=limits.scale;
  return {x,y,scale,width:limits.width,bed:{x:x-62*scale,y:y-8*scale},toys:{x:x+86*scale,y:y-8*scale},focus:{x:x-15*scale,y:y-8*scale}};
}
export function homeFractions(point,viewport){const b=homeLimits(viewport);return {x:b.right===b.left ? .5 : homeClamp((point.x-b.left)/(b.right-b.left),0,1),y:b.floor===b.top?1:homeClamp((point.y-b.top)/(b.floor-b.top),0,1)};}
export function createHomeController({random=Math.random}={}){
  let routine=null,next=0,wakeUntil=0,pausedUntil=0;
  const empty=()=>({phase:'none',pose:'none',target:null});
  const route=(kind,target,c,pose)=>({phase:Math.hypot(c.x-target.x,c.y-target.y)>8?'going-'+kind:kind,pose:Math.hypot(c.x-target.x,c.y-target.y)>8?'walking':pose,target});
  return {
    wake(now=Date.now()){wakeUntil=now+15000;routine=null;pausedUntil=0;},
    pause(now=Date.now(),delay=45000){routine=null;wakeUntil=0;pausedUntil=now+delay;next=now+delay;},
    preview(kind,now=Date.now()){if(!['toys','stretch'].includes(kind))return false;routine={kind,until:kind==='stretch'?now+5000:0,manual:true};wakeUntil=0;pausedUntil=0;return true;},
    update(settings,c,g,now=Date.now()){
      if(!next)next=now+65000+random()*25000;
      if(!settings.home.enabled||c.gameMode||c.dragging||c.homeDragging||c.hidden||c.userBusy){routine=null;next=Math.max(next,now+30000);return empty();}
      if(c.sleeping){routine=null;wakeUntil=0;return route('bed',g.bed,c,'nap');}
      if(c.focus){routine=null;wakeUntil=0;return now<pausedUntil?empty():route('focus',g.focus,c,'settle');}
      if(c.manualPlaying){routine=null;return empty();}
      if(!settings.home.routines&&!routine?.manual){routine=null;wakeUntil=0;return empty();}
      if(wakeUntil){if(now<=wakeUntil&&!c.typing&&!c.reacting){routine={kind:'stretch',until:now+5000};wakeUntil=0;}else if(now>wakeUntil)wakeUntil=0;}
      if(c.typing||c.away||c.reacting||c.perched||now<pausedUntil){routine=null;next=Math.max(next,now+20000);return empty();}
      if(!routine&&now>=next&&settings.wander&&!c.speaking){routine={kind:'toys',until:0};next=now+90000+random()*90000;}
      if(!routine)return empty();
      if(routine.kind==='stretch'){if(now>=routine.until){routine=null;next=Math.max(next,now+65000);return empty();}return {phase:'stretch',pose:'stretch',target:null};}
      if(routine.kind==='toys'){
        const result=route('toys',g.toys,c,'inspect');
        if(result.phase==='going-toys')return result;
        if(!routine.until)routine.until=now+3000;
        if(now<routine.until)return result;
        routine={kind:'play',until:now+10000,manual:routine.manual};return {phase:'play',pose:'none',target:g.toys,throwToy:true};
      }
      if(now>=routine.until){routine=null;next=Math.max(next,now+90000);return empty();}
      return {phase:'play',pose:'none',target:c.toy?{x:c.toy.x,y:g.toys.y}:g.toys};
    }
  };
}
