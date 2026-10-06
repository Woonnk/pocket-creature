export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const numeric = (n, fallback, min, max) => typeof n === 'number' && Number.isFinite(n) ? clamp(n, min, max) : fallback;
const text = (s, fallback, max) => typeof s === 'string' ? s.slice(0, max) : fallback;
const choice = (s, list, fallback) => list.includes(s) ? s : fallback;
export function normalizePersonalMemory(input={}){
  const p=input&&typeof input==='object'?input:{};
  return {nickname:text(p.nickname,'',40).trim(),favoriteGames:text(p.favoriteGames,'',240).trim(),interests:text(p.interests,'',240).trim(),likes:text(p.likes,'',240).trim(),dislikes:text(p.dislikes,'',240).trim()};
}
export function normalize(input = {}) {
  const s = input && typeof input === 'object' ? input : {};
  const f = s.focus && typeof s.focus === 'object' ? s.focus : {};
  return {
    version: 8, name: text(s.name, 'Ember', 24).trim() || 'Ember',
    color: choice(s.color, ['mint', 'lavender', 'peach'], 'mint'),
    hat: choice(s.hat, ['none', 'sprout', 'crown', 'wizard'], 'none'),
    coins: Math.floor(numeric(s.coins, 0, 0, 1000000)),
    friendship: numeric(s.friendship, 0, 0, 1000000),
    energy: numeric(s.energy, 85, 0, 100), happiness: numeric(s.happiness, 90, 0, 100),
    quiet: typeof s.quiet === 'boolean' ? s.quiet : false,
    wander: typeof s.wander === 'boolean' ? s.wander : true,
    reducedMotion: typeof s.reducedMotion === 'boolean' ? s.reducedMotion : false,
    frameMode: choice(s.frameMode, ['smooth','economy'], 'smooth'),
    personality:choice(s.personality,['playful','curious','cozy','cheeky'],'playful'),
    gameMode:choice(s.gameMode,['auto','on','off'],'auto'),
    gameCorner:choice(s.gameCorner,['bottom-right','bottom-left','top-right','top-left'],'bottom-right'),
    gameClickThrough:typeof s.gameClickThrough==='boolean'?s.gameClickThrough:true,
    gameFollowMonitor:typeof s.gameFollowMonitor==='boolean'?s.gameFollowMonitor:true,
    pcAwareness: typeof s.pcAwareness === 'boolean' ? s.pcAwareness : true,
    physicalReactions:typeof s.physicalReactions==='boolean'?s.physicalReactions:true,
    littleHabits:typeof s.littleHabits==='boolean'?s.littleHabits:true,
    windowPerching:typeof s.windowPerching==='boolean'?s.windowPerching:true,
    personalMemoryEnabled:typeof s.personalMemoryEnabled==='boolean'?s.personalMemoryEnabled:true,
    personalMemory:normalizePersonalMemory(s.personalMemory),
    cursorReactions: typeof s.cursorReactions === 'boolean' ? s.cursorReactions : true,
    typingReaction: typeof s.typingReaction === 'boolean' ? s.typingReaction : true,
    appOutfits: typeof s.appOutfits === 'boolean' ? s.appOutfits : true,
    idleNaps: typeof s.idleNaps === 'boolean' ? s.idleNaps : true,
    idleAfter: numeric(s.idleAfter,120,30,1800),
    talkativeness:choice(s.talkativeness,['chatty','balanced','minimal'],'chatty'),
    theme:choice(s.theme,['dark','light','midnight','forest','system'],'dark'),
    autoConversations:typeof s.autoConversations==='boolean'?s.autoConversations:true,
    autoMemory:typeof s.autoMemory==='boolean'?s.autoMemory:true,
    screenAwareness:typeof s.screenAwareness==='boolean'?s.screenAwareness:false,
    forgottenProjects:Array.isArray(s.forgottenProjects)?s.forgottenProjects.filter(x=>typeof x==='string').slice(-30).map(x=>x.slice(0,500)):[],
    chatMode:choice(s.chatMode,['builtin','local'],'local'),
    localModel:text(s.localModel,'',100).replace(/[^a-zA-Z0-9._:/-]/g,''),
    projectMemories:Array.isArray(s.projectMemories)?s.projectMemories.slice(0,30).filter(m=>m&&typeof m.id==='string'&&typeof m.description==='string').map(m=>({id:m.id.slice(0,500),name:text(m.name,'Project',80),description:m.description.slice(0,500),automatic:m.automatic===true,files:Array.isArray(m.files)?m.files.filter(x=>typeof x==='string').slice(0,8).map(x=>x.slice(0,180)):[],lastSeen:numeric(m.lastSeen,0,0,9000000000000000)})):[],
    chatHistory:Array.isArray(s.chatHistory)?s.chatHistory.slice(-20).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,1500),at:numeric(m.at,0,0,9000000000000000)})):[],
    notes: text(s.notes, '', 6000),
    owned: [...new Set(['none', ...(Array.isArray(s.owned) ? s.owned.filter(x => ['sprout', 'crown', 'wizard'].includes(x)) : [])])],
    sessions: Math.floor(numeric(s.sessions, 0, 0, 1000000)),
    focus: {
      status: choice(f.status, ['idle', 'running', 'paused'], 'idle'),
      end: numeric(f.end, 0, 0, 9000000000000000),
      remaining: numeric(f.remaining, 25 * 60000, 0, 180 * 60000),
      duration: numeric(f.duration, 25 * 60000, 60000, 180 * 60000)
    },
    reminders: Array.isArray(s.reminders) ? s.reminders.slice(0, 20).filter(r => r && typeof r.id === 'string' && typeof r.title === 'string' && Number.isFinite(r.at)).map(r => ({id:r.id.slice(0, 80), title:r.title.slice(0, 100), at:clamp(r.at, 0, 9000000000000000)})) : []
  };
}
export function normalizeActivity(signal={}) {
  const a=signal&&typeof signal==='object'?signal:{};
  return {category:choice(a.category,['coding','gaming','music','browsing','none'],'none'),
    idleSeconds:numeric(a.idleSeconds,0,0,86400), typingCount:Math.floor(numeric(a.typingCount,0,0,500)),
    appAvailable:a.appAvailable===true, typingAvailable:a.typingAvailable===true,fullscreen:a.fullscreen===true};
}
export function gameActive(settings,signal={}){
  if(settings.gameMode==='off')return false;
  if(settings.gameMode==='on')return true;
  return settings.pcAwareness&&signal.appAvailable!==false&&(signal.category==='gaming'||signal.fullscreen===true&&signal.category==='none');
}
export function gameAnchor(corner,width,height){
  const right=!corner.endsWith('left'),top=corner.startsWith('top');
  return {x:clamp(right?width-105:105,Math.min(105,width/2),Math.max(width-105,width/2)),y:top?Math.min(245,height-35):Math.max(205,height-35)};
}
export function activityTransition(previous,signal,settings,now=Date.now()) {
  const a=normalizeActivity(signal),old=previous||{away:false,typingUntil:0};
  const away=settings.pcAwareness&&settings.idleNaps&&a.idleSeconds>=settings.idleAfter;
  const returned=Boolean(old.away&&!away&&settings.pcAwareness&&settings.idleNaps);
  const typingUntil=!settings.pcAwareness||!settings.typingReaction||away?0:a.typingCount>0?now+1800:old.typingUntil||0;
  return {...a,away,returned,typingUntil,typing:settings.pcAwareness&&settings.typingReaction&&!away&&typingUntil>now,
    outfit:settings.pcAwareness&&settings.appOutfits?a.category:'none'};
}
export function startFocus(s, minutes, now = Date.now()) {
  const duration = clamp(Number(minutes) || 25, 1, 180) * 60000;
  s.focus = {status:'running', duration, remaining:duration, end:now + duration};
}
export function focusRemaining(s, now = Date.now()) {
  return s.focus.status === 'running' ? Math.max(0, s.focus.end - now) : s.focus.remaining;
}
export function pauseFocus(s, now = Date.now()) {
  if (s.focus.status !== 'running') return;
  s.focus.remaining = focusRemaining(s, now); s.focus.status = 'paused'; s.focus.end = 0;
}
export function resumeFocus(s, now = Date.now()) {
  if (s.focus.status !== 'paused') return;
  s.focus.end = now + s.focus.remaining; s.focus.status = 'running';
}
export function finishFocus(s, now = Date.now()) {
  if (s.focus.status !== 'running' || s.focus.end > now) return false;
  s.focus = {status:'idle', end:0, duration:s.focus.duration, remaining:s.focus.duration};
  s.sessions++; s.coins += 15; s.friendship += 5;
  return true;
}
export function purchase(s, hat) {
  const costs = {sprout:10, crown:30, wizard:50};
  if (hat === 'none' || s.owned.includes(hat)) {s.hat = hat; return true;}
  if (!Object.hasOwn(costs, hat) || s.coins < costs[hat]) return false;
  s.coins -= costs[hat]; s.owned.push(hat); s.hat = hat; return true;
}
export function stepBody(b, dt, bounds, bounce = 0.45) {
  const elapsed = clamp(dt, 0, 0.05);
  b.vy += 1100 * elapsed; b.x += b.vx * elapsed; b.y += b.vy * elapsed;
  if (b.x < bounds.left) {b.x = bounds.left; b.vx = Math.abs(b.vx) * bounce;}
  if (b.x > bounds.right) {b.x = bounds.right; b.vx = -Math.abs(b.vx) * bounce;}
  if (b.y < bounds.top) {b.y = bounds.top; b.vy = Math.abs(b.vy) * bounce;}
  if (b.y >= bounds.floor) {
    b.y = bounds.floor;
    b.vy = Math.abs(b.vy) < 80 ? 0 : -Math.abs(b.vy) * bounce;
    b.vx *= Math.pow(0.1, elapsed);
  }
  return b;
}
