import {normalize, normalizePersonalMemory, clamp, startFocus, pauseFocus, resumeFocus, finishFocus, focusRemaining, purchase, stepBody, activityTransition,gameActive,gameAnchor} from './core.mjs';

import {observeProject,rememberConversation,createAutoScheduler,createConversationGuard,briefReply,createCommentFilter} from './autonomy.mjs';
import {createReactionController,REACTION_MOODS} from './reactions.mjs';
import {startsNewTopic,recentConversation} from './conversation.mjs';
import {createHabitController,HABIT_MOODS} from './habits.mjs';
import {createPerchController} from './perching.mjs';
import {PERSONAL_FIELDS,rememberPersonalDetails,recallPersonalDetails} from './personal-memory.mjs';
import {personalityProfile,personalityLine} from './personality.mjs';
import {inspectText,fileGreeting,localReply,createCommentator} from './companion.mjs';

const nodeCache=new Map();
const $ = selector => {if(!nodeCache.has(selector))nodeCache.set(selector,document.querySelector(selector));return nodeCache.get(selector);};
const native = window.companion;
const desktop = Boolean(native);
document.body.classList.toggle('desktop', desktop);
const world = $('#world'), petEl = $('#pet'), panel = $('#panel'), dragonEl=$('#dragon');
const colorButtons=[...document.querySelectorAll('[data-color]')],hatButtons=[...document.querySelectorAll('[data-hat]')];
let state = normalize(), activeTab = 'pet', sleeping = false, ball = null;
let bubbleUntil = 0, happyUntil = 0, drag = null, fetchCooldown = 0, affectionCooldown = 0;
let lastTick = performance.now(), nextDecision = 0, targetX = null, lastUiTick = 0, lastSaved = 0;
let toastTimeout, saveTimeout, hovering = false, dirty = false, storageWarning = false;
let autoSleeping=false,activityState={away:false,typingUntil:0,outfit:'none',category:'none',typing:false},lastActivityInput={};
let lastLocalActivity=Date.now(),localTypingCount=0,previewCategory='none',previewAway=false;
let cursorChaseUntil=0,dizzyUntil=0,cursorCooldown=0,greetingUntil=0,previousPointer=null;
let frameWindow=performance.now(),frameCount=0,measuredFps=0,lastPetClass='',lastFacing=0;
let cachedBounds,worldRect,lastPointer=null;
const pet = {x:700,y:500,vx:0,vy:0,dir:1};
const commentator=createCommentator();
let inGame=false,gameHome=null,gameControlsHover=false,lastControlsOpen=null,personalitySequence=0;
const voice=event=>personalityLine(state.personality,event,personalitySequence++);
let currentFile=null,connectedRoots=[],chatBusy=false,lastFileComment=0;
const autoScheduler=createAutoScheduler();
const commentFilter=createCommentFilter();
const conversationGuard=createConversationGuard();
const physicalReactions=createReactionController();
const littleHabits=createHabitController();
let conversationRevision=0;
const perches=createPerchController();
let perchAnchor=null,perchMoving=false,demoWindowActive=false,demoWindowMoved=false;
const reactionContext=()=>({...commentContext(),userBusy:chatBusy||!$('#quick-talk').hidden,dizzy:performance.now()<dizzyUntil,airborne:perchMoving||Math.abs(pet.vx)>5||Math.abs(pet.vy)>5});
const currentReaction=()=>physicalReactions.current(state,reactionContext());
const habitContext=()=>({...reactionContext(),reacting:currentReaction()!=='none',speaking:bubbleUntil>performance.now(),hidden:document.hidden,walking:targetX!==null});
const currentHabit=()=>littleHabits.current(state,habitContext());
function react(kind,manual=false){if(physicalReactions.start(kind,state,reactionContext(),Date.now(),manual)){targetX=null;cursorChaseUntil=0;return true;}return false;}
let fileActivityId='0',fileObservedAt=0,activityChangedAt=0,autoPendingActivity=false,bubbleSpontaneous=false;
let aiInfo={ready:false,vision:false,models:[],message:'Checking local AI…'},aiRefreshBusy=false,aiRefreshTimer,autoPendingFile=false,lastAutoError=0;
const STORE = 'pocket-creature-v1';
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function refreshBounds(){worldRect=world.getBoundingClientRect();const w=world.clientWidth,h=world.clientHeight;cachedBounds={left:Math.min(120,w/2),right:Math.max(w-120,w/2),top:210,floor:h-(desktop?60:108)};}
refreshBounds();
const bounds = () => cachedBounds;

try {
  const stored = desktop ? await native.loadState() : JSON.parse(localStorage.getItem(STORE) || 'null');
  state = normalize(stored);
} catch { storageWarning = true; }
if(!desktop)state.chatMode='builtin';
if (prefersReduced) state.reducedMotion = true;
pet.x = clamp(world.clientWidth * .72,bounds().left,bounds().right); pet.y = bounds().floor;
if (desktop || world.clientWidth <= 760) {panel.hidden = true; $('#launcher').setAttribute('aria-expanded','false');}

function say(message, spontaneous = false, topic = false) {
  if (spontaneous && (state.quiet||chatBusy||!$('#quick-talk').hidden||bubbleUntil>performance.now()||conversationGuard.blocked())) return false;
  message=briefReply(message,spontaneous);if(!message||message==='SILENCE')return false;
  littleHabits.clear();
  if(!spontaneous)physicalReactions.clear();
  bubbleSpontaneous=spontaneous;
  $('#bubble').textContent = message; $('#bubble').hidden = false;
  bubbleUntil = performance.now() + clamp(message.length*45,3800,11000);
  commentator.hold(Date.now());
  if(topic)conversationGuard.observe(message,lastActivityInput.contextId??0);
  return true;
}
function toast(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').hidden = true, 4500);
}
async function saveNow() {
  clearTimeout(saveTimeout);
  if (!dirty) return;
  dirty = false;
  try {
    if (desktop) await native.saveState(state);
    else localStorage.setItem(STORE, JSON.stringify(state));
    $('#save-status').textContent = 'Saved on this device';
  } catch {dirty = true; $('#save-status').textContent = 'Could not save — keep this window open'; if (!storageWarning) {toast('Saving is unavailable. Progress will last for this visit.'); storageWarning = true;}}
}
function changed() {dirty = true;clearTimeout(saveTimeout);saveTimeout = setTimeout(saveNow,350);}
function particles(symbol = '♡', count = 5) {
  if (state.reducedMotion) return;
  for (let i=0;i<count;i++) {
    const p = document.createElement('span'); p.className='particle';p.textContent=symbol;
    p.style.left=`${pet.x-45+Math.random()*90}px`;p.style.top=`${pet.y-140+Math.random()*35}px`;
    p.style.animationDelay=`${i*.08}s`;$('#particles').append(p);setTimeout(()=>p.remove(),1500);
  }
}
function wake() {autoSleeping=false;if(sleeping) {sleeping=false;say(voice('wake'));}}
function interact(action) {
  const now=performance.now();
  if(action==='ball'&&inGame){toast('I’ll keep my corner while you play. Turn game mode off for fetch.');return;}
  if(action !== 'sleep') wake();
  if(action==='ball'){perches.detach();perchAnchor=null;}
  if(action === 'pet') {
    happyUntil=now+1500;
    say(voice('pet'));
    particles();
    if(now>=affectionCooldown) {state.happiness=clamp(state.happiness+4,0,100);state.friendship++;state.coins++;affectionCooldown=now+2500;}
  } else if(action === 'feed') {
    state.energy=clamp(state.energy+12,0,100);state.happiness=clamp(state.happiness+3,0,100);
    say(voice('feed'));happyUntil=now+1600;particles('✧',4);
  } else if(action === 'ball') {
    const b=bounds();
    ball={x:clamp(pet.x+(pet.x>world.clientWidth/2?-200:200),25,world.clientWidth-25),y:Math.max(35,pet.y-180),vx:(pet.x>world.clientWidth/2?150:-150),vy:-180};
    if(state.reducedMotion){ball.y=b.floor-4;ball.vx=0;ball.vy=0;ball.x=clamp(pet.x+65,25,world.clientWidth-25);}
    $('#ball').hidden=false;say(voice('ball'));targetX=null;
  } else if(action === 'sleep') {
    sleeping=!sleeping;autoSleeping=false;targetX=null;pet.vx=0;
    if(sleeping){ball=null;$('#ball').hidden=true;}
    say(voice(sleeping?'sleep':'wake'));
  }
  changed();updateUI();
}
function switchTab(tab) {
  activeTab=tab;
  document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('.tab-content').forEach(s=>s.hidden=s.id!==`tab-${tab}`);
}
function syncControlsInteraction(hover=gameControlsHover){gameControlsHover=hover;const open=!panel.hidden||!$('#quick-talk').hidden||hover;if(open!==lastControlsOpen){lastControlsOpen=open;native?.setControlsOpen?.(open);}}
function openPanel(tab=activeTab) {panel.hidden=false;$('#launcher').setAttribute('aria-expanded','true');switchTab(tab);syncControlsInteraction();updateClickThrough(false);}
function closePanel() {panel.hidden=true;$('#launcher').setAttribute('aria-expanded','false');$('#launcher').focus({preventScroll:true});syncControlsInteraction(false);updateClickThrough(true);}
function openQuickTalk(){littleHabits.clear();physicalReactions.clear();conversationGuard.hold();wake();autoScheduler.invalidate();$('#quick-talk').hidden=false;$('#bubble').hidden=true;bubbleUntil=0;targetX=null;syncControlsInteraction();updateClickThrough(false);$('#chat-input').focus({preventScroll:true});}
function closeQuickTalk(){const wasOpen=!$('#quick-talk').hidden;$('#quick-talk').hidden=true;if(wasOpen)petEl.focus({preventScroll:true});syncControlsInteraction(false);updateClickThrough(true);}
$('#close-talk').addEventListener('click',closeQuickTalk);
$('#launcher').addEventListener('click',()=>panel.hidden?openPanel():closePanel());
$('#close-panel').addEventListener('click',closePanel);
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>interact(b.dataset.action)));
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color;changed();updateUI();}));
document.querySelectorAll('[data-hat]').forEach(b=>b.addEventListener('click',()=>{
  if(purchase(state,b.dataset.hat)){say(b.dataset.hat==='none'?'Just me. Still fabulous.':'How do I look?');changed();updateUI();}
  else toast('A few more coins first. Earn them by petting, fetch, or focusing.');
}));
$('#name-input').value=state.name;
$('#name-input').addEventListener('input',e=>{autoScheduler.invalidate();state.name=e.target.value.trim().slice(0,24)||'Ember';changed();updateUI();renderChat();});
$('#notes').value=state.notes;
$('#notes').addEventListener('input',e=>{state.notes=e.target.value.slice(0,6000);$('#save-status').textContent='Saving…';changed();updateUI();});
for(const [id,key] of [['wander-setting','wander'],['quiet-setting','quiet'],['motion-setting','reducedMotion'],['awareness-setting','pcAwareness'],['reaction-setting','physicalReactions'],['habits-setting','littleHabits'],['perch-setting','windowPerching'],['personal-memory-setting','personalMemoryEnabled'],['cursor-setting','cursorReactions'],['typing-setting','typingReaction'],['outfits-setting','appOutfits'],['idle-setting','idleNaps'],['automatic-setting','autoConversations'],['memory-setting','autoMemory'],['screen-setting','screenAwareness'],['game-click-setting','gameClickThrough'],['game-monitor-setting','gameFollowMonitor']]) {
  $("#"+id).checked=state[key];
  $("#"+id).addEventListener('change',e=>{state[key]=e.target.checked;if(key==='personalMemoryEnabled'){clearConversation('Personal memory preference updated.');renderPersonalMemory();}autoScheduler.invalidate();syncChatSettings();targetX=null;if(key==='reducedMotion'){pet.vx=pet.vy=0;pet.y=bounds().floor;}if(autoSleeping&&(!state.pcAwareness||!state.idleNaps)){sleeping=false;autoSleeping=false;}receiveActivity({...lastActivityInput,typingCount:0},true);changed();updateUI();});
}
for(const [id,key] of [['personality-setting','personality'],['game-mode','gameMode'],['game-corner','gameCorner']]){
  $('#'+id).value=state[key];$('#'+id).addEventListener('change',e=>{state[key]=e.target.value;autoScheduler.invalidate();changed();receiveActivity(lastActivityInput,true);updateUI();});
}
$('#personality-description').textContent=personalityProfile(state.personality).description;
for(const button of document.querySelectorAll('[data-reaction-preview]'))button.addEventListener('click',()=>{const kind=button.dataset.reactionPreview;physicalReactions.clear();const lines={curious:'Something caught my eye.',surprised:'Oh! That surprised me.',celebrate:'A tiny victory dance, just for practice.'};say(lines[kind]);if(!react(kind,true))toast('Let me finish my current activity first.');});
for(const button of document.querySelectorAll('[data-habit-preview]'))button.addEventListener('click',()=>{physicalReactions.clear();targetX=null;cursorChaseUntil=0;if(!littleHabits.preview(button.dataset.habitPreview,state,habitContext()))toast('Let me finish my current activity first.');});
$('#personality-preview').addEventListener('click',()=>say(voice('intro')));
$('#recover-overlay').addEventListener('click',async()=>{try{await saveNow();await native?.recoverOverlay?.();toast('Brought him forward. If he’s still hidden, try Borderless Fullscreen in the game.');}catch{toast('Could not bring the overlay forward. Try the tray menu.');}});
$('#frame-mode').value=state.frameMode;
$('#frame-mode').addEventListener('change',e=>{state.frameMode=e.target.value;lastTick=performance.now();changed();});
$('#idle-after').value=String(state.idleAfter);
$('#idle-after').addEventListener('change',e=>{state.idleAfter=Number(e.target.value);receiveActivity(lastActivityInput);changed();});
$('#activity-preview').addEventListener('change',e=>{
  previewAway=e.target.value==='away';previewCategory=['coding','gaming','music'].includes(e.target.value)?e.target.value:'none';
  lastLocalActivity=Date.now();receiveActivity({category:previewCategory,idleSeconds:previewAway?state.idleAfter+1:0,typingCount:0});
});
$('#focus-minutes').value=Math.round(state.focus.duration/60000);
$('#focus-start').addEventListener('click',()=>{
  if(state.focus.status==='running')pauseFocus(state);
  else if(state.focus.status==='paused')resumeFocus(state);
  else {startFocus(state,$('#focus-minutes').value);wake();targetX=null;say('You’ve got this. I’ll be right here.');}
  changed();updateUI();
});
$('#focus-reset').addEventListener('click',()=>{state.focus={status:'idle',end:0,duration:state.focus.duration,remaining:state.focus.duration};changed();updateUI();});
$('#focus-minutes').addEventListener('change',e=>{const minutes=clamp(Number(e.target.value)||25,1,180);e.target.value=minutes;if(state.focus.status==='idle'){state.focus.duration=minutes*60000;state.focus.remaining=state.focus.duration;changed();updateUI();}});
$('#focus-badge').addEventListener('click',()=>openPanel('focus'));
$('#reminder-form').addEventListener('submit',e=>{
  e.preventDefault();const title=$('#reminder-title').value.trim();if(!title)return;
  if(state.reminders.length>=20){toast('You already have 20 reminders. Finish a few first.');return;}
  state.reminders.push({id:crypto.randomUUID(),title,at:Date.now()+clamp(Number($('#reminder-minutes').value)||10,1,1440)*60000});
  $('#reminder-title').value='';changed();renderReminders();toast('Reminder added. I’ll give you a nudge.');
});
function renderReminders() {
  const list=$('#reminders');list.replaceChildren();
  for(const r of state.reminders) {
    const li=document.createElement('li'),title=document.createElement('span'),time=document.createElement('small'),remove=document.createElement('button');
    title.textContent=r.title;time.textContent=`${Math.max(1,Math.ceil((r.at-Date.now())/60000))}m`;remove.textContent='×';remove.setAttribute('aria-label',`Remove reminder: ${r.title}`);
    remove.addEventListener('click',()=>{state.reminders=state.reminders.filter(x=>x.id!==r.id);changed();renderReminders();});li.append(title,time,remove);list.append(li);
  }
}
$('#hide-app').addEventListener('click',()=>native?.hide());
$('#quit-app').addEventListener('click',async()=>{await saveNow();native?.quit();});
petEl.addEventListener('contextmenu',e=>{e.preventDefault();openPanel();});
petEl.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openQuickTalk();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#quick-talk').hidden)closeQuickTalk();else closePanel();}});
petEl.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  e.preventDefault();wake();const rect=world.getBoundingClientRect();
  drag={startX:e.clientX,startY:e.clientY,offsetX:pet.x-(e.clientX-rect.left),offsetY:pet.y-(e.clientY-rect.top),lastX:e.clientX,lastY:e.clientY,lastTime:performance.now(),vx:0,vy:0,moved:false};
  pet.vx=pet.vy=0;targetX=null;petEl.setPointerCapture(e.pointerId);updateClickThrough(false);
});
petEl.addEventListener('pointermove',e=>{
  if(!drag)return;const rect=world.getBoundingClientRect(),now=performance.now(),dt=Math.max(.008,(now-drag.lastTime)/1000);
  if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6){drag.moved=true;perches.detach();perchAnchor=null;littleHabits.clear();physicalReactions.clear();}
  const b=bounds();pet.x=clamp(e.clientX-rect.left+drag.offsetX,b.left,b.right);pet.y=clamp(e.clientY-rect.top+drag.offsetY,Math.min(b.top,b.floor),b.floor);
  drag.vx=clamp((e.clientX-drag.lastX)/dt,-800,800);drag.vy=clamp((e.clientY-drag.lastY)/dt,-800,800);
  drag.lastX=e.clientX;drag.lastY=e.clientY;drag.lastTime=now;
});
function releaseDrag(e,cancelled=false){
  if(!drag)return;const d=drag;drag=null;
  if(petEl.hasPointerCapture(e.pointerId))petEl.releasePointerCapture(e.pointerId);
  if(d.moved&&!cancelled){const landed=perches.drop(pet,lastActivityInput.perchWindow,{width:world.clientWidth,height:world.clientHeight},state,{gameMode:inGame,playing:Boolean(ball)});if(landed){perchAnchor=landed;pet.x=landed.x;pet.y=landed.y;pet.vx=pet.vy=0;particles('✧',2);return;}}
  if(d.moved&&!state.reducedMotion){const stale=performance.now()-d.lastTime>120;pet.vx=stale?0:d.vx;pet.vy=stale?0:d.vy;say('Wheee!');}
  else if(!d.moved&&!cancelled)openQuickTalk();
  if(state.reducedMotion)pet.y=bounds().floor;
}
petEl.addEventListener('pointerup',e=>releaseDrag(e));petEl.addEventListener('pointercancel',e=>releaseDrag(e,true));
window.addEventListener('blur',()=>{if(drag){drag=null;pet.vx=pet.vy=0;}updateClickThrough(true);});

let ignored = true;
function updateClickThrough(ignore){if(desktop&&inGame&&state.gameClickThrough&&!lastControlsOpen)ignore=true;if(!desktop||ignore===ignored)return;ignored=ignore;native.setClickThrough(ignore);}
document.addEventListener('pointermove',e=>{
  syncControlsInteraction(Boolean(e.target.closest('#panel,#quick-talk,#launcher,#focus-badge')));
  hovering=Boolean(e.target.closest('.hit'));
  if(inGame&&state.gameClickThrough&&!lastControlsOpen)hovering=false;
  updateClickThrough(!hovering&&!drag);
});
document.addEventListener('pointerleave',()=>{if(!drag)updateClickThrough(true);});
native?.onOpenControls(()=>openPanel());
native?.onBeforeQuit(async()=>{await saveNow();native.readyToQuit();});
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();if(document.hidden)saveNow();});
window.addEventListener('pagehide',()=>{if(!desktop&&dirty){try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}}});
window.addEventListener('resize',()=>{refreshBounds();const b=bounds();pet.x=clamp(pet.x,b.left,b.right);pet.y=b.floor;pet.vx=pet.vy=0;targetX=null;});


const systemTheme=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){document.body.dataset.theme=state.theme==='system'?(systemTheme.matches?'dark':'light'):state.theme;$('#theme-selector').value=state.theme;}
$('#theme-selector').addEventListener('change',e=>{state.theme=e.target.value;applyTheme();changed();});
systemTheme.addEventListener('change',()=>{if(state.theme==='system')applyTheme();});applyTheme();
function rememberObservedFile(file){
  if(!state.autoMemory||!file?.projectId||state.forgottenProjects.includes(file.projectId))return;
  const remembered=observeProject(file,projectMemory());if(!remembered)return;
  state.projectMemories=[remembered,...state.projectMemories.filter(m=>m.id!==remembered.id)].slice(0,30);changed();
}
function projectMemory(){return state.projectMemories.find(m=>m.id===currentFile?.projectId);}
function fileIsCurrent(){return Boolean(currentFile&&(!desktop||fileActivityId===String(lastActivityInput.contextId??0)&&((lastActivityInput.windowTitle||'').toLowerCase().includes(currentFile.name.toLowerCase())||Date.now()-fileObservedAt<15000)));}
function renderChat(){
  $('#quick-label').textContent=`Say something to ${state.name}`;$('#quick-talk').setAttribute('aria-label',`Talk to ${state.name}`);
  $('#conversation-status').textContent=recentConversation(state.chatHistory).length?'Following our recent conversation · say “new topic” to move on.':'Recent conversation lasts 20 minutes. Replies stay in his bubble.';
}
function chatMessage(role,content,speak=false){content=role==='assistant'?briefReply(content):String(content).slice(0,1200);state.chatHistory.push({role,content,at:Date.now()});state.chatHistory=state.chatHistory.slice(-20);changed();renderChat();if(speak)say(content);}
function renderFile(){
  $('#file-card').hidden=!currentFile;$('#project-memory-form').hidden=!currentFile||currentFile.unread===true;
  if(!currentFile)return;
  $('#current-file-name').textContent=currentFile.name;$('#current-project').textContent=currentFile.project||'Selected file';$('#file-summary').textContent=currentFile.summary+(currentFile.partial?' · First 32 KB only':'');$('#file-excerpt').textContent=currentFile.excerpt||'';$('#file-details').hidden=currentFile.unread===true;
  const memory=projectMemory();$('#observed-files').textContent=memory?.files?.length?'Files I remember: '+memory.files.join(', '):'';$('#project-description').value=memory?.description||'';$('#memory-status').textContent=memory?(memory.automatic?'Automatically remembered from observed files or your conversation.':'Project description remembered on this device.'):'Automatic project memory is ready when enabled.';
}
function receiveFile(file){
  const previous=currentFile;autoScheduler.invalidate();currentFile=file;fileActivityId=String(lastActivityInput.contextId??0);fileObservedAt=Date.now();const previousMemory=projectMemory();rememberObservedFile(file);renderFile();if(!file){autoPendingFile=false;$('#file-status').textContent='Selected file cleared.';return;}
  $('#file-status').textContent=file.unread?'Filename noticed automatically; contents have not been read.':'File inspected automatically as text. Nothing was run.';
  if(previous?.path!==file.path||previous?.name!==file.name){lastFileComment=Date.now();if(say(fileGreeting(file,previousMemory),true,true))react('curious');autoPendingFile=true;}
  else if(previous.unread&&!file.unread){autoPendingFile=true;say(`I can read ${file.name} now.`,true);}
  else if(previous.excerpt!==file.excerpt&&Date.now()-lastFileComment>=15000){lastFileComment=Date.now();say(`You updated ${file.name}. What changed?`,true,true);autoPendingFile=true;}
}
function renderRoots(){
  const list=$('#connected-folders');list.replaceChildren();
  for(const root of connectedRoots){const li=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');name.textContent=root.split(/[\\/]/).pop()||root;name.title=root;remove.textContent='Disconnect';remove.addEventListener('click',async()=>{try{connectedRoots=await native.removeFolder(root);renderRoots();}catch(e){toast(e.message);}});li.append(name,remove);list.append(li);}
  if(desktop&&connectedRoots.length&&!currentFile)$('#file-status').textContent='Watching connected folders for files opened in VS Code, Cursor, or Notepad. Duplicate filenames need manual selection.';
}
$('#show-file').addEventListener('click',async()=>{if(!desktop){$('#browser-file').click();return;}try{const file=await native.chooseFile();if(file)receiveFile(file);}catch(e){toast(e.message);$('#file-status').textContent=e.message;}});
$('#browser-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>262144)throw Error('Choose a file smaller than 256 KB.');receiveFile({...inspectText(file.name,await file.text()),path:`browser:${file.name}`,project:file.name,projectId:`browser:${file.name}`});}catch(error){toast(error.message);}e.target.value='';});
$('#connect-folder').addEventListener('click',async()=>{try{connectedRoots=await native.chooseFolder();renderRoots();}catch(e){toast(e.message);}});
$('#clear-file').addEventListener('click',async()=>{try{if(desktop)await native.clearFile();receiveFile(null);}catch(e){toast(e.message);}});
$('#project-memory-form').addEventListener('submit',e=>{e.preventDefault();if(!currentFile)return;const description=$('#project-description').value.trim();if(!description){toast('Describe the project first.');return;}const files=projectMemory()?.files||[];state.projectMemories=state.projectMemories.filter(m=>m.id!==currentFile.projectId);state.forgottenProjects=state.forgottenProjects.filter(id=>id!==currentFile.projectId);state.projectMemories.unshift({id:currentFile.projectId,name:currentFile.project||currentFile.name,description,automatic:false,files});state.projectMemories=state.projectMemories.slice(0,30);changed();renderFile();chatMessage('assistant',`I’ll remember: ${description}`,true);});
$('#forget-project').addEventListener('click',()=>{if(!currentFile)return;autoScheduler.invalidate();state.forgottenProjects=[...state.forgottenProjects.filter(id=>id!==currentFile.projectId),currentFile.projectId].slice(-30);state.projectMemories=state.projectMemories.filter(m=>m.id!==currentFile.projectId);changed();renderFile();toast('Project description forgotten. Clear conversation to remove earlier messages too.');});
function clearConversation(message='Recent conversation forgotten.'){autoScheduler.invalidate();conversationGuard.clear();conversationRevision++;state.chatHistory=[];$('#bubble').hidden=true;bubbleUntil=0;changed();renderChat();$('#quick-status').textContent=message;}
$('#clear-chat').addEventListener('click',()=>clearConversation());
function renderPersonalMemory(){for(const key of Object.keys(PERSONAL_FIELDS))$('#personal-'+key).value=state.personalMemory[key];$('#personal-memory-status').textContent=state.personalMemoryEnabled?'Clear things you tell him can be remembered here. Saving edits also starts a fresh conversation.':'Personal memory is paused. Saved details stay editable and are not used in replies.';}
$('#personal-memory-form').addEventListener('submit',e=>{e.preventDefault();state.personalMemory=normalizePersonalMemory(Object.fromEntries(Object.keys(PERSONAL_FIELDS).map(key=>[key,$('#personal-'+key).value])));clearConversation('Personal memory updated.');renderPersonalMemory();toast('Personal memory saved. Our conversation starts fresh.');});
$('#forget-personal-memory').addEventListener('click',()=>{state.personalMemory=normalizePersonalMemory();clearConversation('Personal memory and recent conversation forgotten.');renderPersonalMemory();toast('Personal memory and recent conversation forgotten.');});
renderPersonalMemory();
function syncChatSettings(){
  $('#local-ai-settings').hidden=state.chatMode!=='local';$('#ai-status').textContent=!desktop?'Playground · built-in observations':state.chatMode==='local'?aiInfo.message+(chatBusy||autoScheduler.busy?' · answering…':''):'Built-in observations · local AI paused';$('#screen-status').textContent=!state.screenAwareness?'Off · screen snapshots are never saved.':!desktop?'Screen awareness needs the Windows app.':!aiInfo.vision?'Waiting for a connected vision model.':'On · compare screen changes locally; snapshots never saved.';$('#chat-engine').textContent=state.chatMode==='local'?(desktop?'Local AI · Ollama':'Local AI needs the Windows app'):'Built-in observations';
}
for(const [id,key] of [['talkativeness','talkativeness'],['chat-mode','chatMode'],['local-model','localModel']]){$('#'+id).value=state[key];$('#'+id).addEventListener(id==='local-model'?'input':'change',e=>{state[key]=e.target.value;autoScheduler.invalidate();changed();syncChatSettings();clearTimeout(aiRefreshTimer);aiRefreshTimer=setTimeout(refreshAIStatus,700);});}
$('#chat-form').addEventListener('submit',async e=>{
  e.preventDefault();if(chatBusy)return;const message=$('#chat-input').value.trim();if(!message)return;
  if(startsNewTopic(message)){state.chatHistory=[];conversationGuard.clear();changed();}
  const beforePersonal=state.personalMemory;
  if(state.personalMemoryEnabled){state.personalMemory=rememberPersonalDetails(message,state.personalMemory);if(JSON.stringify(beforePersonal)!==JSON.stringify(state.personalMemory)){changed();renderPersonalMemory();}}
  const personalChanged=Object.keys(PERSONAL_FIELDS).find(key=>beforePersonal[key]!==state.personalMemory[key]);
  const request=conversationRevision,priorHistory=[...state.chatHistory];
  const starter=conversationGuard.replyTo(lastActivityInput.contextId??0,Date.now(),message);
  autoScheduler.invalidate();conversationGuard.hold();chatBusy=true;syncChatSettings();$('#chat-send').disabled=true;$('#chat-send').textContent='…';$('#quick-status').textContent='Thinking…';commentator.hold(Date.now());
  try{const fresh=fileIsCurrent(),asksAboutFile=/\b(file|code|function|project|script|import|class)\b/i.test(message)||Boolean(currentFile&&message.toLowerCase().includes(currentFile.name.toLowerCase()));const file=fresh||asksAboutFile?currentFile:null,memory=file?projectMemory():null;
    if(state.autoMemory&&file?.projectId&&!state.forgottenProjects.includes(file.projectId)){const remembered=rememberConversation(message,file,memory);if(remembered){state.projectMemories=[remembered,...state.projectMemories.filter(m=>m.id!==remembered.id)].slice(0,30);changed();renderFile();}}
    if(starter&&state.chatHistory.at(-1)?.content!==starter.text)chatMessage('assistant',starter.text);
    chatMessage('user',message);$('#chat-input').value='';await saveNow();
    if(request!==conversationRevision)return;
    const recall=recallPersonalDetails(message,state.personalMemory,state.personalMemoryEnabled);
    const answer=recall??(state.chatMode==='local'?(desktop?await native.chat({message,conversationStarter:starter}):'Local AI is available in the Windows app. Switch to built-in replies to try file observations here.'):(personalChanged?`I’ll remember that. ${PERSONAL_FIELDS[personalChanged]}: ${state.personalMemory[personalChanged]}.`:localReply(message,file,memory,state.personality)));
    if(request!==conversationRevision)return;
    closeQuickTalk();conversationGuard.clear();chatMessage('assistant',answer,true);if(answer.includes('?'))conversationGuard.observe(answer,lastActivityInput.contextId??0);$('#quick-status').textContent='Replies appear in his speech bubble.';
  }catch(error){if(request!==conversationRevision)return;state.chatHistory=priorHistory;changed();renderChat();$('#chat-input').value=message;$('#quick-status').textContent=error.message;say('I couldn’t reach my local AI. Try again in a moment.');}
  finally{conversationGuard.hold();chatBusy=false;syncChatSettings();$('#chat-send').disabled=false;$('#chat-send').textContent='Send';}
});
function commentContext(){const fresh=fileIsCurrent();return {fileName:fresh?currentFile?.name:undefined,projectDescription:fresh?projectMemory()?.description.slice(0,100):undefined,category:activityState.category,gameMode:inGame,typing:isTyping(),focus:state.focus.status==='running',sleeping,dragging:Boolean(drag),playing:Boolean(ball),away:activityState.away};}
async function refreshAIStatus(){
  if(!native?.aiStatus||aiRefreshBusy||state.chatMode!=='local'){syncChatSettings();return;}
  aiRefreshBusy=true;const requested=state.localModel;
  try{const status=await native.aiStatus();if(requested!==state.localModel)return;aiInfo=status;if(!state.localModel&&status.ready&&status.model){state.localModel=status.model;$('#local-model').value=status.model;changed();}const models=$('#installed-models');models.replaceChildren();for(const name of status.models||[]){const option=document.createElement('option');option.value=name;models.append(option);}}
  catch{aiInfo={ready:false,vision:false,models:[],message:'AI offline · could not check Ollama.'};}
  finally{aiRefreshBusy=false;syncChatSettings();}
}
$('#check-ai').addEventListener('click',refreshAIStatus);
function screenExclusions(){return [petEl,$('#bubble'),panel,$('#quick-talk'),$('#launcher'),$('#focus-badge')].filter(el=>!el.hidden).map(el=>{const r=el.getBoundingClientRect();return {x:r.x-8,y:r.y-8,width:r.width+16,height:r.height+16};});}
async function automaticComment(urgent=false){
  const context=commentContext(),token=autoScheduler.begin(state,{...context,userBusy:chatBusy||conversationGuard.blocked()||!$('#quick-talk').hidden,ready:aiInfo.ready},Date.now(),urgent);if(token===null)return;
  const fileEvent=autoPendingFile;autoPendingFile=false;autoPendingActivity=false;syncChatSettings();const key=String(lastActivityInput.contextId??0),fileKey=currentFile?.path||'';
  $('#auto-status').textContent='Local AI is preparing an activity comment…';
  let reply,reaction='none',failed=false;
  try{await saveNow();if(chatBusy||conversationGuard.blocked()||!$('#quick-talk').hidden||state.quiet||!state.pcAwareness||!state.autoConversations||state.chatMode!=='local'){autoScheduler.finish(token);return;}const result=await native.chat({automatic:true,contextId:key,screenExclusions:screenExclusions(),message:fileEvent?'A current file was opened or saved. Comment on ONE specific detail, briefly.':'Observe the CURRENT foreground activity. One brief comment, or SILENCE if nothing new is worth saying.'});reaction=result?.reaction||'none';reply=typeof result==='string'?result:result?.contextKey===key?result.reply:'';if(result?.observation==='unchanged')$('#auto-status').textContent=state.screenAwareness?'Screen unchanged · watching for meaningful changes.':'Activity unchanged · watching for a new task.';}
  catch(error){if(key===String(lastActivityInput.contextId??0)&&!/cancelled/i.test(error.message)){failed=true;if(Date.now()-lastAutoError>45000){lastAutoError=Date.now();$('#auto-status').textContent=error.message;}}}
  const valid=autoScheduler.finish(token);syncChatSettings();
  if(!failed&&reply!=='SILENCE')$('#auto-status').textContent='Automatic activity comments are on.';
  if(valid&&!chatBusy&&!state.quiet&&state.pcAwareness&&state.autoConversations&&key===String(lastActivityInput.contextId??0)&&fileKey===(currentFile?.path||'')&&context.category===activityState.category&&!sleeping&&!drag&&!ball&&!activityState.away&&typeof reply==='string'){const line=briefReply(reply,true);if(commentFilter.accept(line)&&say(line,true,true))react(reaction);}
}
function proactiveComment(){
  if(chatBusy||conversationGuard.blocked()||autoScheduler.busy||!$('#quick-talk').hidden||bubbleUntil>performance.now()||Date.now()-activityChangedAt<2000)return;
  if(desktop&&state.chatMode==='local'&&state.autoConversations&&aiInfo.ready&&Date.now()-lastAutoError>45000){automaticComment(autoPendingFile||autoPendingActivity);return;}
  const line=commentator.next(commentContext(),state,Date.now());if(line&&commentFilter.accept(briefReply(line,true))){happyUntil=performance.now()+1200;say(line,true,true);}
}
native?.onFileContext?.(receiveFile);native?.onFileStatus?.(message=>{$('#file-status').textContent=message;});
if(native?.getRoots)try{connectedRoots=await native.getRoots();renderRoots();}catch{$('#file-status').textContent='Could not load connected folders. You can still show a file.';}
renderChat();syncChatSettings();refreshAIStatus();if(desktop)setInterval(refreshAIStatus,15000);

function mood(){const reaction=currentReaction(),habit=currentHabit();return drag?'airborne':sleeping?'sleepy':state.focus.status==='running'?'focused':ball?'playful':REACTION_MOODS[reaction]?REACTION_MOODS[reaction]:HABIT_MOODS[habit]?HABIT_MOODS[habit]:performance.now()<happyUntil?'loved':isTyping()?'typing':performance.now()<dizzyUntil?'dizzy':state.energy<30?'tired':'curious';}
function isTyping(){return state.pcAwareness&&state.typingReaction&&activityState.typingUntil>Date.now()&&!sleeping&&!drag&&!ball&&state.focus.status!=='running';}
function receiveActivity(signal,keepControls=false){
  const nextGame=gameActive(state,signal);
  if(nextGame!==inGame){
    littleHabits.clear();physicalReactions.clear();autoScheduler.invalidate();
    if(nextGame){gameHome={x:pet.x,y:pet.y};ball=null;$('#ball').hidden=true;closeQuickTalk();if(!keepControls)closePanel();cursorChaseUntil=dizzyUntil=0;targetX=null;}
    else if(gameHome){pet.x=clamp(gameHome.x,bounds().left,bounds().right);pet.y=clamp(gameHome.y,Math.min(bounds().top,bounds().floor),bounds().floor);pet.vx=pet.vy=0;gameHome=null;}
    inGame=nextGame;document.body.classList.toggle('game-mode',inGame);syncControlsInteraction(false);updateClickThrough(true);
  }

  if(String(signal.contextId??0)!==String(lastActivityInput.contextId??0)||signal.category!==lastActivityInput.category){
    littleHabits.clear();physicalReactions.clear();autoScheduler.invalidate();activityChangedAt=Date.now();autoPendingActivity=true;autoPendingFile=false;
    if(bubbleSpontaneous){$('#bubble').hidden=true;bubbleUntil=0;}
  }
  lastActivityInput=signal;
  activityState=activityTransition(activityState,signal,{...state,idleNaps:state.idleNaps&&!inGame});
  if(activityState.away&&!sleeping&&!drag&&!ball&&state.focus.status!=='running'){
    sleeping=true;autoSleeping=true;targetX=null;pet.vx=0;say('I’ll keep your spot warm.',true);
  }else if(activityState.returned){
    if(autoSleeping){sleeping=false;autoSleeping=false;happyUntil=performance.now()+2500;greetingUntil=performance.now()+3000;
      if(!state.reducedMotion&&state.wander&&state.focus.status!=='running')targetX=clamp(lastPointer?.x??pet.x,bounds().left,bounds().right);
      particles('♡',4);
    }
  }
  updateUI();
}
native?.onActivity?.(receiveActivity);
function cursorReaction(point){
  lastPointer=point;
  const now=performance.now();
  if(!perchAnchor&&!inGame&&previousPointer&&state.pcAwareness&&state.cursorReactions&&!state.reducedMotion&&!sleeping&&!drag&&!ball&&!isTyping()&&currentHabit()==='none'&&state.focus.status!=='running'&&now>cursorCooldown){
    const distance=Math.hypot(point.x-previousPointer.x,point.y-previousPointer.y),elapsed=Math.max(.01,(now-previousPointer.at)/1000);
    if(distance/elapsed>900&&distance>28&&Math.abs(point.x-pet.x)<480){
      dizzyUntil=now+1500;cursorChaseUntil=now+2200;cursorCooldown=now+6500;say('Hey! Wait for my tiny legs!',true);
    }
  }
  previousPointer={...point,at:now};
}
function demoSurface(){if(!demoWindowActive)return null;const r=$('#demo-window').getBoundingClientRect();return {id:'demo-window',bounds:{x:r.left-worldRect.left,y:r.top-worldRect.top,width:r.width,height:r.height}};}
$('#perch-preview').addEventListener('click',()=>{demoWindowActive=true;demoWindowMoved=false;const w=$('#demo-window');w.hidden=false;w.style.left=`${Math.max(12,world.clientWidth*.45)}px`;w.style.width=`${Math.max(250,Math.min(450,world.clientWidth-24))}px`;w.style.left=`${Math.max(12,Math.min(world.clientWidth-w.offsetWidth-12,world.clientWidth*.45))}px`;w.style.top='340px';lastLocalActivity=Date.now();perches.detach(Date.now()-45000);receiveActivity({...lastActivityInput,perchWindow:demoSurface()});});
$('#move-demo-window').addEventListener('click',()=>{demoWindowMoved=!demoWindowMoved;const w=$('#demo-window');w.style.top=demoWindowMoved?'400px':'340px';w.style.left=`${Math.max(12,Math.min(world.clientWidth-w.offsetWidth-12,world.clientWidth*(demoWindowMoved?.3:.45)))}px`;});
$('#close-demo-window').addEventListener('click',()=>{demoWindowActive=false;$('#demo-window').hidden=true;receiveActivity({...lastActivityInput,perchWindow:null});});
function localActivity(){lastLocalActivity=Date.now();if(previewAway){previewAway=false;$('#activity-preview').value='return';}}
if(!desktop){
  document.addEventListener('pointerdown',localActivity);document.addEventListener('wheel',localActivity,{passive:true});
  document.addEventListener('keydown',()=>{localActivity();localTypingCount++;});
  setInterval(()=>{receiveActivity({category:previewCategory,perchWindow:demoSurface(),idleSeconds:previewAway?state.idleAfter+1:(Date.now()-lastLocalActivity)/1000,typingCount:localTypingCount});localTypingCount=0;},500);
}
function timeText(ms){const sec=Math.ceil(ms/1000);return `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;}
function setText(selector,value){const el=$(selector),v=String(value);if(el.textContent!==v)el.textContent=v;}
function activityLabel(){
  if(inGame)return 'Keeping a tiny corner while you play';
  if(!state.pcAwareness)return 'Activity reactions paused';
  if(autoSleeping)return 'Napping while you’re away';
  if(perchAnchor)return 'Perched on your window';
  if(isTyping())return 'Typing along with you';
  if(activityState.outfit==='coding')return 'Your little coding buddy';
  if(activityState.outfit==='music')return 'Headphones on. Good company.';
  if(activityState.outfit==='gaming')return 'Ready for your next adventure';
  return state.cursorReactions?'Watching your cursor':'Hanging out with you';
}
function updateUI(){
  setText('#personality-description',personalityProfile(state.personality).description);
  setText('#perch-status',!state.windowPerching?'Window perching is off.':!state.pcAwareness?'Window perching is paused with PC awareness.':inGame?'Game corner takes priority over window perching.':perchAnchor?'Following this window’s edge.':desktop?'Waiting for a restored window with room above its top edge.':'Try a preview window here; PC windows work in the Windows app.');
  setText('#game-status',inGame?'Game mode on · smaller dragon, pinned corner, quiet spectator':state.gameMode==='off'?'Game mode off':!state.pcAwareness?'Automatic game detection paused with PC awareness':'Automatic game mode standing by');
  document.querySelector('[data-action="ball"]').disabled=inGame;
  for(const button of document.querySelectorAll('[data-reaction-preview]'))button.disabled=!state.physicalReactions;
  for(const button of document.querySelectorAll('[data-habit-preview]'))button.disabled=!state.littleHabits;
  const m=mood();setText('#pet-name',state.name);setText('#pet-mood',m);
  const title=$('#panel-name');if(title.dataset.name!==state.name){title.dataset.name=state.name;title.firstChild.nodeValue=`Meet ${state.name} `;petEl.setAttribute('aria-label',`Talk to ${state.name}. Drag to pick up; right click for controls.`);renderChat();}
  setText('#mood-pill',`● Feeling ${m}`);setText('#coins',state.coins);
  for(const key of ['energy','happiness']){const val=Math.round(state[key]);if($('#'+key).value!==val)$('#'+key).value=val;setText('#'+key+'-text',`${val}%`);}
  setText('#friendship',`Friendship · ${Math.floor(state.friendship)}`);setText('#note-count',`${state.notes.length} / 6000`);
  const sleepButton=$('#sleep-button');if(sleepButton.dataset.sleep!==String(sleeping)){sleepButton.dataset.sleep=String(sleeping);sleepButton.firstElementChild.textContent=sleeping?'☼':'☾';sleepButton.lastChild.nodeValue=sleeping?'Wake up':'Take a nap';}
  if(petEl.dataset.palette!==state.color){petEl.dataset.palette=state.color;const palette={mint:['#9edac2','#45796c','#c5ecdc'],lavender:['#baa9df','#7b6ba7','#dcd1f0'],peach:['#eeb29d','#b87967','#f7d7c0']}[state.color];['--mint','--dark','--light'].forEach((key,i)=>petEl.style.setProperty(key,palette[i]));}
  document.body.classList.toggle('reduced-motion',state.reducedMotion);
  for(const b of colorButtons){const v=String(b.dataset.color===state.color);if(b.getAttribute('aria-pressed')!==v)b.setAttribute('aria-pressed',v);}
  for(const b of hatButtons){const v=String(b.dataset.hat===state.hat);if(b.getAttribute('aria-pressed')!==v)b.setAttribute('aria-pressed',v);const label=state.owned.includes(b.dataset.hat)?'Owned':`${{sprout:10,crown:30,wizard:50}[b.dataset.hat]} coins`;if(b.lastElementChild.textContent!==label)b.lastElementChild.textContent=label;}
  const remaining=focusRemaining(state);setText('#focus-time',timeText(remaining));setText('#badge-time',timeText(remaining));
  $('#focus-badge').hidden=state.focus.status==='idle';setText('#focus-start',state.focus.status==='running'?'Pause session':state.focus.status==='paused'?'Keep going':'Start focusing');
  $('#focus-reset').hidden=state.focus.status==='idle';$('#focus-minutes').disabled=state.focus.status!=='idle';
  setText('#focus-message',state.focus.status==='running'?'One small step at a time.':state.focus.status==='paused'?'Take your time. We’re on pause.':'Your dragon will keep you company.');
  setText('label[for="talkativeness"]',`How chatty should ${state.name} be?`);setText('#sessions',state.sessions);setText('#activity-status',activityLabel());
  setText('#activity-source',!desktop?'Reactions inside this playground':!state.pcAwareness?'PC activity sensing is off':activityState.appAvailable?(state.typingReaction&&!activityState.typingAvailable?'App & idle signals ready · typing unavailable':'Local PC signals connected'):'Cursor & idle ready · app signals unavailable or starting');
  setText('#frame-rate',`${state.frameMode==='smooth'?'Display sync':'Economy mode'}${measuredFps?` · ${measuredFps} frames/s measured`:''}`);
  setText('#scene-state',sleeping?'Taking a well-deserved nap':state.focus.status==='running'?'Keeping you company while you focus':ball?'A very important game of fetch':activityLabel());
}
let lookX=0,lookY=0;
function drawPet(now=performance.now(),dt=1/60){
  if(!$('#quick-talk').hidden){const q=$('#quick-talk');q.style.left=`${clamp(pet.x-150,12,Math.max(12,world.clientWidth-q.offsetWidth-12))}px`;q.style.top=`${clamp(pet.y-350,12,Math.max(12,world.clientHeight-q.offsetHeight-12))}px`;}
  petEl.style.transform=`translate3d(${(pet.x-120).toFixed(2)}px,${(pet.y-205).toFixed(2)}px,0) scale(${inGame?.72:1})`;
  const outfit=state.pcAwareness&&state.appOutfits&&!sleeping&&state.focus.status!=='running'?activityState.outfit:'none';
  petEl.dataset.perched=String(Boolean(perchAnchor&&!drag));
  const reaction=currentReaction(),habit=currentHabit();if(petEl.dataset.habit!==habit)petEl.dataset.habit=habit;if(petEl.dataset.reaction!==reaction)petEl.dataset.reaction=reaction;
  const classes=`hit pet hat-${state.hat} outfit-${outfit}${reaction!=='none'?' reaction-'+reaction:''}${habit!=='none'?' habit-'+habit:''}${perchAnchor&&!drag?' perched':''}${sleeping?' sleeping':''}${state.focus.status==='running'?' focusing':''}${isTyping()?' mimicking':''}${drag?' dragging':''}${now<happyUntil?' happy':''}${now<dizzyUntil?' dizzy':''}${targetX!==null&&!drag?' walking':''}`;
  if(classes!==lastPetClass){petEl.className=classes;lastPetClass=classes;}
  if(pet.dir!==lastFacing){dragonEl.style.transform=`scaleX(${pet.dir})`;lastFacing=pet.dir;}
  const tracking=lastPointer&&state.pcAwareness&&state.cursorReactions&&!sleeping&&!state.reducedMotion;
  const targetLookX=tracking?clamp((lastPointer.x-pet.x)*.012*pet.dir,-4,4):0;
  const targetLookY=tracking?clamp((lastPointer.y-(pet.y-105))*.008,-2.5,2.5):0;
  const ease=1-Math.exp(-12*dt);lookX+=(targetLookX-lookX)*ease;lookY+=(targetLookY-lookY)*ease;
  petEl.style.setProperty('--gaze-x',`${lookX.toFixed(2)}px`);petEl.style.setProperty('--gaze-y',`${lookY.toFixed(2)}px`);
}
function checkTimers(){
  if(finishFocus(state)){say('You did it! Tiny dragon. Huge pride.');react('celebrate',true);toast('Focus session complete. +15 coins!');particles('✦',7);changed();native?.notify('Nice work!', 'Your focus session is complete. You earned 15 coins.');}
  const due=state.reminders.filter(r=>r.at<=Date.now());
  if(due.length){state.reminders=state.reminders.filter(r=>r.at>Date.now());for(const r of due){toast(`A gentle nudge: ${r.title}`);say(r.title);native?.notify('A gentle nudge',r.title);}changed();renderReminders();}
  proactiveComment();
  renderChat();updateUI();
}
// A main-process clock also drives reminders while the desktop overlay is hidden.
native?.onClock(checkTimers);
if(!desktop)setInterval(checkTimers,1000);

function tick(now){
  if(state.frameMode==='economy'&&now-lastTick<1000/30-.5){requestAnimationFrame(tick);return;}
  const dt=clamp((now-lastTick)/1000,0,.05);lastTick=now;const b=bounds();
  perchAnchor=perches.update(lastActivityInput.perchWindow,{width:world.clientWidth,height:world.clientHeight},state,{...reactionContext(),speaking:bubbleUntil>now},Date.now());
  perchMoving=false;
  if(perchAnchor&&!drag){const ease=state.reducedMotion?1:1-Math.exp(-12*dt);pet.x+=(perchAnchor.x-pet.x)*ease;pet.y+=(perchAnchor.y-pet.y)*ease;perchMoving=Math.hypot(perchAnchor.x-pet.x,perchAnchor.y-pet.y)>3;pet.vx=pet.vy=0;targetX=null;cursorChaseUntil=0;}
  if(inGame&&!drag){const anchor=gameAnchor(state.gameCorner,world.clientWidth,world.clientHeight);pet.x=anchor.x;pet.y=anchor.y;pet.vx=pet.vy=0;targetX=null;}
  frameCount++;if(now-frameWindow>=2000){measuredFps=Math.round(frameCount*1000/(now-frameWindow));frameCount=0;frameWindow=now;}
  if(!drag){
    const grounded=pet.y>=b.floor-.5&&Math.abs(pet.vy)<1;
    if(sleeping){state.energy=clamp(state.energy+dt*.65,0,100);}
    if(now>=nextDecision){
      nextDecision=now+5000+Math.random()*5000;
      if(!perchAnchor&&currentHabit()==='none'&&currentReaction()==='none'&&!inGame&&!sleeping&&!ball&&$('#quick-talk').hidden&&state.focus.status!=='running'&&state.wander&&!state.reducedMotion){
        const min=(!desktop&&world.clientWidth>760&&!panel.hidden)?Math.min(490,b.right):b.left;
        targetX=min+Math.random()*Math.max(0,b.right-min);

      }
    }
    if(!perchAnchor&&!inGame&&now<cursorChaseUntil&&state.pcAwareness&&state.cursorReactions&&state.wander&&!sleeping&&!ball&&!state.reducedMotion&&!isTyping()&&state.focus.status!=='running'&&lastPointer)targetX=clamp(lastPointer.x,b.left,b.right);
    if(ball&&!sleeping&&state.focus.status!=='running')targetX=ball.x;
    if(perchAnchor||currentHabit()!=='none'||currentReaction()!=='none'||inGame||sleeping||!$('#quick-talk').hidden||state.focus.status==='running'||isTyping()||!state.wander&&!ball||state.reducedMotion)targetX=null;
    if(targetX!==null&&grounded){
      const delta=targetX-pet.x;if(Math.abs(delta)<10)targetX=null;
      else{pet.dir=delta<0?-1:1;pet.x=clamp(pet.x+Math.sign(delta)*Math.min(Math.abs(delta),dt*(ball?185:now<cursorChaseUntil||now<greetingUntil?125:85)),b.left,b.right);state.energy=clamp(state.energy-dt*.015,0,100);}
    }
    if(!perchAnchor&&!state.reducedMotion&&!inGame)stepBody(pet,dt,{...b,top:Math.min(b.top,b.floor)},.22);
    else if(!perchAnchor&&!inGame){pet.y=b.floor;pet.vx=pet.vy=0;}
  }
  if(ball){
    if(!state.reducedMotion)stepBody(ball,dt,{left:20,right:world.clientWidth-20,top:25,floor:b.floor-3},.65);
    $('#ball').style.transform=`translate3d(${(ball.x-17).toFixed(2)}px,${(ball.y-35).toFixed(2)}px,0)`;
    const catchRadius=state.reducedMotion?90:65;
    if(!drag&&!sleeping&&$('#quick-talk').hidden&&state.focus.status!=='running'&&Math.abs(ball.x-pet.x)<catchRadius&&ball.y>b.floor-50&&now>fetchCooldown){
      ball=null;$('#ball').hidden=true;targetX=null;fetchCooldown=now+1500;
      state.coins+=3;state.friendship+=2;state.happiness=clamp(state.happiness+6,0,100);happyUntil=now+1500;say(voice('catch'));particles('✦',5);changed();
    }
  }
  if(bubbleUntil&&now>bubbleUntil){$('#bubble').hidden=true;bubbleUntil=0;}
  drawPet(now,dt);
  if(now-lastUiTick>=250){
    lastUiTick=now;
    updateUI();
  }
  if(now-lastSaved>15000){lastSaved=now;dirty=true;saveNow();renderReminders();}
  requestAnimationFrame(tick);
}

document.addEventListener('pointermove',e=>{if(!desktop)localActivity();cursorReaction({x:e.clientX-worldRect.left,y:e.clientY-worldRect.top});});
native?.onCursor(point=>{cursorReaction(point);if(!drag){let hit=false,control=false;for(const el of [petEl,panel,$('#quick-talk'),$('#launcher'),$('#focus-badge')]){if(el.hidden||el===petEl&&inGame&&state.gameClickThrough)continue;const r=el.getBoundingClientRect();if(point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom){hit=true;control=el!==petEl;break;}}syncControlsInteraction(control);updateClickThrough(!hit);}});
updateUI();renderReminders();drawPet();requestAnimationFrame(tick);
if(storageWarning)toast('Could not load saved progress. Starting a fresh visit.');
// Startup and idle return are silent; personality previews remain explicit.
