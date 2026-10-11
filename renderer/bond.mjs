export const BOND_SNACKS={berries:'Berry bites',honey:'Honey crisps',cookies:'Moon cookies'};
export const BOND_INTERACTIONS={pet:'Give love',fetch:'Play fetch',scratch:'Head scratch',paw:'Offer a paw',toy:'Bring a toy',settle:'Settle nearby'};
export const BOND_MILESTONES=[
  {points:10,name:'Warm welcome',gesture:'nuzzle',label:'Tiny nuzzle'},
  {points:25,name:'Buddies',gesture:'promise',label:'Paw promise'},
  {points:50,name:'Trusted sidekick',gesture:'hug',label:'Wing hug'},
  {points:100,name:'Best friends',gesture:'flourish',label:'Happy flourish'}
];
const bondNumber=(v,max=999)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export const bondLevel=points=>BOND_MILESTONES.filter(m=>points>=m.points).length;
export function normalizeBond(input,friendship=0){
  const b=input&&typeof input==='object'?input:{};
  const evidence=(key,choices)=>Object.fromEntries(Object.keys(choices).map(id=>[id,{count:bondNumber(b[key]?.[id]?.count),lastAt:bondNumber(b[key]?.[id]?.lastAt,9000000000000000)}]));
  const pin=(value,choices)=>['auto','none',...Object.keys(choices)].includes(value)?value:'auto';
  return {learning:b.learning!==false,snackChoice:Object.hasOwn(BOND_SNACKS,b.snackChoice)?b.snackChoice:'berries',
    snacks:evidence('snacks',BOND_SNACKS),interactions:evidence('interactions',BOND_INTERACTIONS),
    snackPin:pin(b.snackPin,BOND_SNACKS),interactionPin:pin(b.interactionPin,BOND_INTERACTIONS),
    // Existing friendship unlocks quietly. New points can announce each tier once.
    announced:input==null?bondLevel(friendship):bondNumber(b.announced,4)};
}
export function recordBond(b,category,id,now=Date.now()){
  if(!b.learning||!['snacks','interactions'].includes(category)||!Object.hasOwn(b[category],id)||!Number.isFinite(now)||now<0)return false;
  const item=b[category][id];
  // Repeated clicks within a minute are one visit, including after a reload.
  if(item.count&&now-item.lastAt<60000||item.count>=999)return false;
  item.count++;item.lastAt=Math.floor(now);return true;
}
export function bondFavorite(b,category){
  const choices=category==='snacks'?BOND_SNACKS:category==='interactions'?BOND_INTERACTIONS:null;
  if(!choices)return null;
  const pin=b[category==='snacks'?'snackPin':'interactionPin'];
  if(pin==='none')return null;
  if(Object.hasOwn(choices,pin))return {id:pin,label:choices[pin],source:'Chosen by you',count:0};
  const ranked=Object.keys(choices).filter(id=>b[category][id].count>=3).sort((a,c)=>b[category][c].count-b[category][a].count||b[category][c].lastAt-b[category][a].lastAt);
  const id=ranked[0];return id?{id,label:choices[id],source:`Learned from ${b[category][id].count} visits`,count:b[category][id].count}:null;
}
export function forgetBond(b){
  const fresh=normalizeBond({announced:b.announced,snackChoice:b.snackChoice,learning:false});
  Object.assign(b,fresh);return b;
}
export function claimBondMilestone(b,friendship){
  const level=bondLevel(friendship);
  if(level<=b.announced)return null;
  b.announced=level;return BOND_MILESTONES[level-1];
}
export function bondProgress(friendship){
  const level=bondLevel(friendship),next=BOND_MILESTONES[level];
  return {level,name:level?BOND_MILESTONES[level-1].name:'Getting acquainted',next,
    progress:next?Math.max(0,friendship-(BOND_MILESTONES[level-1]?.points||0)):1,
    max:next?next.points-(BOND_MILESTONES[level-1]?.points||0):1};
}
export function createBondGesture(){
  let active=null;
  const allowed=c=>!['gameMode','reducedMotion','hidden','sleeping','dragging','typing','focus','voiceBusy','busy','moving','airborne'].some(k=>c[k]);
  return {
    start(id,friendship,c={},now=performance.now()){
      const milestone=BOND_MILESTONES.find(m=>m.gesture===id);
      if(active||!milestone||friendship<milestone.points||!allowed(c))return false;
      active={id,until:now+3200};return true;
    },
    update(c={},now=performance.now()){
      if(active&&(now>=active.until||!allowed(c)))active=null;
      return active?.id||'none';
    },
    clear(){active=null;},get active(){return Boolean(active);}
  };
}
