import {BOND_SNACKS,BOND_MILESTONES,bondFavorite,bondProgress,recordBond,forgetBond,claimBondMilestone,createBondGesture} from './bond.mjs';
import {createPoseTransitions} from './transitions.mjs';
import {createVoiceMotion} from './voice-motion.mjs';
import {createDragonSounds} from './dragon-sounds.mjs';
import {MOTION_PREVIEWS,createMotionController,neutralMotion} from './motion.mjs';
import {SPRITES,applySprite} from './sprites.mjs';
import {EMOTIONS,MOMENTS,createEmotionController,createMomentController} from './expressive.mjs';
import {createAdventureController} from './adventures.mjs';
import {TRICKS,createTrickController,parseTrickRequest} from './tricks.mjs';
import {describeAttention} from './attention.mjs';
import {createDailyController,dayPeriod,livingProfile,LIVING_POSES} from './living.mjs';
import {parseReminderRequest,assistanceOffer} from './assistance.mjs';
import {encodeBackup,decodeBackup} from './backup.mjs';
import {createVoiceInputSession} from './voice-input.mjs';
import {createHomeController} from './home.mjs';
import {createHomeView} from './home-view.mjs';
import {createTaskReactions} from './task-reactions.mjs';
import {parseVoiceCommand,voicePose} from './voice-commands.mjs';
import {createSpeaker,createBrowserSpeechBridge,createDesktopSpeechBridge} from './speech.mjs';
import {normalize, normalizePersonalMemory, clamp, startFocus, pauseFocus, resumeFocus, finishFocus, focusRemaining, purchase, stepBody, activityTransition,gameActive,gameAnchor} from './core.mjs';

import {observeProject,rememberConversation,createAutoScheduler,createConversationGuard,briefReply,createCommentFilter} from './autonomy.mjs';
import {createReactionController,createActivityTiming,createFileNotice,REACTION_MOODS} from './reactions.mjs';
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
function makeSpritePreview(){
  const preview=dragonEl.cloneNode(true);preview.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));preview.removeAttribute('id');preview.removeAttribute('style');
  preview.querySelectorAll('.accessory,.emotion-face,.reaction-mouth,.voice-mouth,.brow,.focus-glasses,.activity-headphones,.activity-helmet,.tiny-keyboard,.dizzy-mark,.sleep-z,.moment-toy').forEach(node=>node.remove());
  const paint=new Set(['pet-main','pet-dark','pet-light','outline','no-fill','belly','horn','cheek','claw','eye-glint','shadow','sprite-detail']);
  for(const node of preview.querySelectorAll('[class]')){const classes=[...node.classList].map(name=>name==='mouth'?'sprite-mouth':name==='eyes'?'sprite-eyes':name).filter(name=>paint.has(name)||name==='sprite-mouth'||name==='sprite-eyes');if(classes.length)node.setAttribute('class',classes.join(' '));else node.removeAttribute('class');}
  return preview;
}
const spriteButtons=SPRITES.map(look=>{
  const button=document.createElement('button');button.type='button';button.className='sprite-choice';button.dataset.sprite=look.id;
  button.setAttribute('aria-label',look.name+'. '+look.description);button.setAttribute('aria-pressed','false');
  const preview=makeSpritePreview();
  applySprite(preview,look.id);button.append(preview);
  const name=document.createElement('strong');name.textContent=look.name;const description=document.createElement('small');description.textContent=look.description;button.append(name,description);
  $('#sprite-gallery').append(button);return button;
});
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
const physicalReactions=createReactionController(),activityTiming=createActivityTiming(),fileNotice=createFileNotice();
let noticedActivity=-1;
const littleHabits=createHabitController();
let conversationRevision=0;
const perches=createPerchController();
const homeController=createHomeController(),taskReactions=createTaskReactions();
const dailyController=createDailyController(),adventures=createAdventureController(),trickController=createTrickController();
const emotions=createEmotionController(),moments=createMomentController(),bondGestures=createBondGesture();
let bondGestureFrame='none',manualMoment=null;
let emotionFrame='none',momentFrame={kind:'none',phase:'none',target:null,carrying:false};
const emptyAdventure=()=>({kind:'none',phase:'none',pose:'none',target:null});
let adventureFrame=emptyAdventure(),trickFrame={kind:'none'},lastActivitySeenAt=0,fileObservedTitle='',observedTypingUntil=0;
let dailyPose='none',helpOffer=null,pendingBackup=null;
let homeFrame={phase:'none',pose:'none',target:null},taskPose='none';
let perchAnchor=null,perchMoving=false,demoWindowActive=false,demoWindowMoved=false;
const reactionContext=()=>({...commentContext(),typing:isUserTyping(),userBusy:bondGestures.active||chatBusy||inputSession.busy()||!$('#quick-talk').hidden||homeFrame.phase!=='none',dizzy:performance.now()<dizzyUntil,airborne:perchMoving||Math.abs(pet.vx)>5||Math.abs(pet.vy)>5});
const currentReaction=()=>physicalReactions.current(state,reactionContext());
const habitContext=()=>({...reactionContext(),reacting:bondGestures.active||currentReaction()!=='none'||dailyPose!=='none'||taskPose!=='none'||adventures.active||trickController.active||moments.active,speaking:bubbleUntil>performance.now(),hidden:document.hidden,walking:targetX!==null});
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

let speechInfo={ready:false,voices:[],message:'Voice is off. Enable spoken replies to get started.'},speechEvent={state:'stopped'};
const voiceMotion=createVoiceMotion();
const dragonSounds=createDragonSounds({getSettings:()=>state,getContext:()=>({hidden:document.hidden,gameMode:inGame,listening:inputSession.busy(),speaking:speaker.active(),focused:state.focus.status!=='idle'})});
const speechBridge=desktop?createDesktopSpeechBridge(native,{getSettings:()=>state}):createBrowserSpeechBridge();
let lastReply='',voiceInputEvent={state:'disabled'},voiceDraft='',pendingHistory=null,voiceButtonHeld=false,voiceHoldRevision=0,commandConfirmedUntil=0;
const inputSession=createVoiceInputSession({getSettings:()=>state,onState:event=>{voiceInputEvent=event;if(event.state==='listening'){commandConfirmedUntil=0;targetX=null;cursorChaseUntil=0;pet.vx=0;speaker.stop();cancelPendingConversation();littleHabits.clear();physicalReactions.clear();autoScheduler.invalidate();conversationGuard.hold();voiceDraft='';}renderVoiceInput();},submit:text=>submitMessage(text,true),review:text=>{voiceDraft=text;renderVoiceInput();}});
function renderVoiceInput(){
  const active=inputSession.busy(),labels={starting:'Preparing offline dictation…',listening:'Listening · release to send',transcribing:'Recognizing · microphone closed',thinking:'Thinking…',heard:'Heard you',empty:'Didn’t catch that · try again',error:voiceInputEvent.message||'Check Windows speech and microphone settings.'};
  const status=!desktop?'Push-to-talk works in the Windows app.':state.quiet?'Quiet mode pauses push-to-talk.':!state.voiceInputEnabled?'Push-to-talk is off.':voiceDraft?'Transcript needs review.':labels[voiceInputEvent.state]|| (speechEvent.state==='speaking'?'Speaking…':speechEvent.state==='pending'?'Preparing voice…':'')||voiceInputEvent.message||'Hold Ctrl + Shift + '+state.voiceInputKey.toUpperCase()+' to talk.';
  $('#voice-input-status').textContent=status;$('#voice-dock-status').textContent=status;
  $('#voice-dock').hidden=!desktop||!state.voiceInputEnabled;$('#voice-heard').textContent=voiceInputEvent.text?'You: '+voiceInputEvent.text:'';
  $('#review-voice').hidden=!voiceDraft;$('#cancel-voice').hidden=!active&&!voiceDraft;
  if(desktop&&state.voiceInputEnabled&&world.clientWidth<=1100)document.documentElement.style.setProperty('--voice-dock-space',($('#voice-dock').offsetHeight+40)+'px');
  for(const button of document.querySelectorAll('[data-voice-hold]')){button.disabled=!desktop||!state.voiceInputEnabled||state.quiet||['starting','transcribing','thinking'].includes(voiceInputEvent.state);button.textContent=voiceInputEvent.state==='listening'?'Listening…':'Hold to talk';button.setAttribute('aria-pressed',String(voiceInputEvent.state==='listening'));}
}
function cancelPendingConversation(){if(chatBusy){conversationRevision++;native?.cancelChat?.();if(pendingHistory){state.chatHistory=pendingHistory;pendingHistory=null;changed();renderChat();}}}
function cancelVoiceInput(){commandConfirmedUntil=0;voiceHoldRevision++;voiceButtonHeld=false;native?.cancelVoiceInput?.();inputSession.reset();voiceDraft='';cancelPendingConversation();speaker.stop();renderVoiceInput();}
native?.onVoiceInput?.(event=>inputSession.receive(event));
for(const [id,key] of [['voice-input-enabled','voiceInputEnabled'],['voice-input-review','voiceInputReview']]){
  $('#'+id).checked=state[key];$('#'+id).addEventListener('change',async e=>{cancelVoiceInput();state[key]=e.target.checked;changed();await saveNow();if(native?.voiceInputStatus)inputSession.receive(await native.voiceInputStatus());renderVoiceInput();});
}
$('#voice-input-key').value=state.voiceInputKey;$('#voice-input-key').addEventListener('change',async e=>{cancelVoiceInput();state.voiceInputKey=e.target.value;changed();await saveNow();if(native?.voiceInputStatus)inputSession.receive(await native.voiceInputStatus());renderVoiceInput();});
for(const button of document.querySelectorAll('[data-voice-hold]')){
  let pressed=false;
  const begin=async()=>{if(pressed)return;pressed=true;const holdRevision=++voiceHoldRevision;voiceButtonHeld=true;syncControlsInteraction(true);updateClickThrough(false);speaker.stop();try{await saveNow();if(pressed&&voiceButtonHeld&&holdRevision===voiceHoldRevision&&!(await native?.startVoiceInput?.()))toast('Dictation is not ready. Enable push-to-talk and check its status.');}catch{toast('Could not start voice input.');}};
  const end=()=>{if(!pressed)return;pressed=false;voiceHoldRevision++;voiceButtonHeld=false;native?.finishVoiceInput?.();};
  button.addEventListener('pointerdown',e=>{if(e.button!==0||button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);begin();});
  button.addEventListener('pointerup',end);button.addEventListener('pointercancel',()=>{pressed=false;cancelVoiceInput();});
  button.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)begin();}});button.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();end();}});button.addEventListener('blur',()=>{if(pressed){pressed=false;cancelVoiceInput();}});
}
$('#cancel-voice').addEventListener('click',cancelVoiceInput);$('#review-voice').addEventListener('click',()=>{const text=voiceDraft;cancelVoiceInput();openQuickTalk();$('#chat-input').value=text;$('#quick-status').textContent='Check what I heard, then Send.';});
function repeatReply(){if(lastReply)speaker.speak(lastReply,{preview:true});}
$('#repeat-reply').addEventListener('click',repeatReply);$('#repeat-reply-dock').addEventListener('click',repeatReply);
$('#speech-engine').value=state.speechEngine;$('#speech-engine').addEventListener('change',async e=>{speaker.stop();state.speechEngine=e.target.value;changed();await saveNow();await refreshSpeech();renderSpeech();});
const speaker=createSpeaker({bridge:speechBridge,getSettings:()=>state,prepare:()=>desktop?saveNow():undefined,getContext:()=>({inGame,listening:['listening','transcribing'].includes(voiceInputEvent.state),hidden:document.hidden,away:activityState.away,busy:chatBusy||inputSession.busy()||!$('#quick-talk').hidden,focused:state.focus.status==='running'}),onState:event=>{
  voiceMotion.receive(event,performance.now());if(event.state==='timing')return;
  dragonSounds.stop();speechEvent=event;petEl.dataset.speaking=String(event.state==='speaking');petEl.dataset.voiceMouth='false';$('#voice-stop').hidden=!['pending','speaking'].includes(event.state);if(event.state==='error')speechInfo.message=event.message;renderSpeech();renderVoiceInput();
}});
function renderSpeech(){
  $('#speech-status').textContent=speechEvent.state==='error'?speechInfo.message:state.quiet?'Quiet mode mutes voice.':inGame&&!state.speechInGames?'Voice is muted during games.':speechEvent.state==='pending'?'Preparing voice…':speechEvent.state==='speaking'?'Speaking · Ctrl + Shift + M stops voice in the Windows app.':!state.speechEnabled?'Voice is off. Test a voice, then enable spoken replies.':speechInfo.message;
  const hasReply=Boolean(lastReply)&&!['listening','transcribing'].includes(voiceInputEvent.state);$('#repeat-reply').disabled=!hasReply||state.quiet;$('#repeat-reply-dock').disabled=!hasReply||state.quiet;$('#kokoro-setup').hidden=state.speechEngine!=='kokoro';
  $('#speech-volume-value').textContent=Math.round(state.speechVolume*100)+'%';$('#speech-rate-value').textContent=state.speechRate.toFixed(2)+'×';
}
async function refreshSpeech(){
  try{speechInfo=await speechBridge?.speechStatus?.()||{ready:false,voices:[],message:'Voice is unavailable in this app version.'};}catch{speechInfo={ready:false,voices:[],message:'Could not check installed voices. Try Refresh voices.'};}
  const key=state.speechEngine==='kokoro'?'kokoroVoice':'speechVoice',select=$('#speech-voice');select.replaceChildren(new Option(state.speechEngine==='kokoro'?'Kokoro default · af_heart':'Windows default voice',state.speechEngine==='kokoro'?'af_heart':''));
  if(!desktop)select.firstChild.textContent='Local browser default';
  for(const item of speechInfo.voices)select.add(new Option(item.name+' · '+item.lang,item.name));
  if(state[key]&&!speechInfo.voices.some(v=>v.name===state[key]))select.add(new Option(state[key]+' · unavailable',state[key]));
  select.value=state[key];renderSpeech();return speechInfo.ready;
}
for(const [id,key] of [['speech-enabled','speechEnabled'],['speech-games','speechInGames'],['speech-expression','speechExpression'],['speech-gestures','speechGestures']]){
  $('#'+id).checked=state[key];$('#'+id).addEventListener('change',async e=>{speaker.stop();state[key]=e.target.checked;changed();await saveNow();if(state.speechEnabled)await refreshSpeech();renderSpeech();});
}
for(const [id,key] of [['speech-chatter','speechChatter'],['speech-volume','speechVolume'],['speech-rate','speechRate']]){
  $('#'+id).value=state[key];$('#'+id).addEventListener(id==='speech-volume'||id==='speech-rate'?'input':'change',e=>{speaker.stop();state[key]=id==='speech-volume'||id==='speech-rate'?Number(e.target.value):e.target.value;changed();renderSpeech();});
}
$('#speech-voice').addEventListener('change',e=>{speaker.stop();state[state.speechEngine==='kokoro'?'kokoroVoice':'speechVoice']=e.target.value;changed();});
$('#refresh-voices').addEventListener('click',async()=>{await saveNow();await refreshSpeech();});
$('#test-voice').addEventListener('click',async()=>{cancelVoiceInput();speaker.stop();await saveNow();if(await refreshSpeech())speaker.speak('Tiny dragon, big voice. How does this sound?',{preview:true,mood:'playful'});else toast(speechInfo.message);});
$('#voice-stop').addEventListener('click',e=>{e.stopPropagation();speaker.stop();});
$('#speech-stop').addEventListener('click',()=>speaker.stop());
if(state.speechEnabled)refreshSpeech();
$('#dragon-sounds').checked=state.dragonSounds;$('#dragon-sounds').addEventListener('change',e=>{dragonSounds.stop();state.dragonSounds=e.target.checked;changed();});
$('#dragon-sound-volume').value=state.dragonSoundVolume;
const renderDragonVolume=()=>$('#dragon-sound-volume-value').textContent=Math.round(state.dragonSoundVolume*100)+'%';renderDragonVolume();
$('#dragon-sound-volume').addEventListener('input',e=>{dragonSounds.stop();state.dragonSoundVolume=Number(e.target.value);changed();renderDragonVolume();});
$('#test-dragon-sound').addEventListener('click',async()=>{if(!await dragonSounds.play('chirp'))toast(state.dragonSounds?'Sounds pause during speech, focus, quiet mode, and games.':'Turn on Little dragon sounds to try a chirp.');});
if(state.voiceInputEnabled&&native?.voiceInputStatus)inputSession.receive(await native.voiceInputStatus());
const homeView=createHomeView({getState:()=>state,getViewport:()=>({width:world.clientWidth,height:world.clientHeight,floor:bounds().floor}),getObstacles:()=>{
  const dock=$('#voice-dock');if(dock.hidden)return [];const r=dock.getBoundingClientRect();return [{left:r.left-worldRect.left,right:r.right-worldRect.left,top:r.top-worldRect.top,bottom:r.bottom-worldRect.top}];
},isGame:()=>inGame,onChange:()=>{changed();updateUI();},onInterrupt:()=>{cancelVoiceInput();pauseHome();},onDrag:active=>{syncControlsInteraction(active);updateClickThrough(!active);},onOpen:()=>{openPanel('pet');$('#creature-home').open=true;$('#creature-home').scrollIntoView({block:'start'});},onMove:()=>{closePanel();$('#home-handle').focus({preventScroll:true});},onPreview:previewHome,toast});
function interruptPlay(){bondGestures.clear();bondGestureFrame='none';manualMoment=null;moments.clear();momentFrame={kind:'none',phase:'none',target:null,carrying:false};adventures.clear();adventureFrame=emptyAdventure();if(trickController.active)$('#trick-status').textContent='Practice paused. Interruptions don’t count.';trickController.clear();trickFrame={kind:'none'};}
function pauseHome(delay=45000){interruptPlay();dailyController.clear();dailyPose='none';homeController.pause(Date.now(),delay);homeFrame={phase:'none',pose:'none',target:null};if(ball?.automatic){ball=null;$('#ball').hidden=true;}taskReactions.clear();}
function prepareHomeRest(){if(state.home.enabled){perches.detach();perchAnchor=null;}homeController.pause(Date.now(),0);homeFrame={phase:'none',pose:'none',target:null};}
function prepareHomeFocus(){prepareHomeRest();ball=null;$('#ball').hidden=true;}
function previewHome(kind){
  if(inGame||!state.home.enabled||sleeping||state.focus.status!=='idle'){toast('Wake him up and finish focus before trying a home routine.');return false;}
  cancelVoiceInput();pauseHome();perches.detach();perchAnchor=null;littleHabits.clear();physicalReactions.clear();homeController.preview(kind);targetX=null;pet.vx=pet.vy=0;toast(kind==='toys'?'Off to inspect the toy basket.':'A little stretch for those paws.');return true;
}
function say(message, spontaneous = false, topic = false, speechMood) {
  if (spontaneous && (isUserTyping()||state.focus.status!=='idle'||document.hidden||state.quiet||chatBusy||adventures.active||trickController.active||moments.active||bondGestures.active||!$('#quick-talk').hidden||bubbleUntil>performance.now()||conversationGuard.blocked())) return false;
  message=briefReply(message,spontaneous);if(!message||message==='SILENCE')return false;
  if(!spontaneous)interruptPlay();
  littleHabits.clear();dailyController.clear();dailyPose='none';
  if(!spontaneous)physicalReactions.clear();
  bubbleSpontaneous=spontaneous;
  $('#bubble').textContent = message; $('#bubble').hidden = false;
  bubbleUntil = performance.now() + clamp(message.length*45,3800,11000);
  commentator.hold(Date.now());
  if(topic)conversationGuard.observe(message,lastActivityInput.contextId??0);
  lastReply=message;renderSpeech();speaker.speak(message,{automatic:spontaneous,mood:speechMood||mood()});
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
function changed() {const milestone=claimBondMilestone(state.bond,state.friendship);if(milestone)toast(`${milestone.name} · ${milestone.label} unlocked! Find it in Our bond.`);dirty = true;clearTimeout(saveTimeout);saveTimeout = setTimeout(saveNow,350);}
function particles(symbol = '♡', count = 5) {
  if (state.reducedMotion) return;
  for (let i=0;i<count;i++) {
    const p = document.createElement('span'); p.className='particle';p.textContent=symbol;
    p.style.left=`${pet.x-45+Math.random()*90}px`;p.style.top=`${pet.y-140+Math.random()*35}px`;
    p.style.animationDelay=`${i*.08}s`;$('#particles').append(p);setTimeout(()=>p.remove(),1500);
  }
}
function wake() {autoSleeping=false;if(sleeping) {sleeping=false;homeController.wake();say(voice('wake'));}}
function interact(action) {
  const now=performance.now();
  if(action==='ball'&&inGame){toast('I’ll keep my corner while you play. Turn game mode off for fetch.');return;}
  if(action==='ball'&&state.focus.status!=='idle'){toast('End the focus session before we play fetch.');return;}
  if(action!=='sleep')pauseHome();
  if(action !== 'sleep') wake();
  if(action==='ball'){perches.detach();perchAnchor=null;}
  if(action === 'pet') {
    happyUntil=now+1500;
    say(voice('pet'));
    particles();
    emotions.notice('care');
    if(now>=affectionCooldown) {state.happiness=clamp(state.happiness+4,0,100);state.friendship++;state.coins++;affectionCooldown=now+2500;recordBond(state.bond,'interactions','pet');}
  } else if(action === 'feed') {
    emotions.notice('care');state.energy=clamp(state.energy+12,0,100);state.happiness=clamp(state.happiness+3,0,100);
    recordBond(state.bond,'snacks',state.bond.snackChoice);const favorite=bondFavorite(state.bond,'snacks');say(favorite?.id===state.bond.snackChoice?`${BOND_SNACKS[state.bond.snackChoice]}! My favorite. Tiny paws approve.`:`${BOND_SNACKS[state.bond.snackChoice]}. ${voice('feed')}`,false,false,'playful');happyUntil=now+1600;particles('✧',4);
  } else if(action === 'ball') {
    emotions.notice('play');const b=bounds();
    ball={x:clamp(pet.x+(pet.x>world.clientWidth/2?-200:200),25,world.clientWidth-25),y:Math.max(35,pet.y-180),vx:(pet.x>world.clientWidth/2?150:-150),vy:-180};
    if(state.reducedMotion){ball.y=b.floor-4;ball.vx=0;ball.vy=0;ball.x=clamp(pet.x+65,25,world.clientWidth-25);}
    $('#ball').hidden=false;say(voice('ball'),false,false,'playful');targetX=null;
  } else if(action === 'sleep') {
    sleeping=!sleeping;autoSleeping=false;targetX=null;pet.vx=0;
    if(sleeping){prepareHomeRest();ball=null;$('#ball').hidden=true;}else homeController.wake();
    say(voice(sleeping?'sleep':'wake'));
  }
  dragonSounds.play(action==='sleep'&&sleeping?'yawn':['pet','feed'].includes(action)?'happy':'chirp');
  changed();updateUI();
}
let settingsPage='general';
const settingsScroll=new Map(),tabScroll=new Map();
function switchTab(tab) {
  const scroller=$('#panel-body');if(scroller)tabScroll.set(activeTab,scroller.scrollTop);activeTab=tab;
  document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('.tab-content').forEach(s=>s.hidden=s.id!==`tab-${tab}`);if(scroller)scroller.scrollTop=tabScroll.get(tab)||0;
}
const avatar=makeSpritePreview();
$('.companion-avatar').replaceChildren(avatar);
function showSettingsPage(page,focusTarget=null){
  if(!document.querySelector('[data-settings-page="'+page+'"]'))return;
  const scroller=$('#panel-body');settingsScroll.set(settingsPage,scroller.scrollTop);settingsPage=page;
  for(const button of document.querySelectorAll('[data-settings-tab]'))button.setAttribute('aria-pressed',String(button.dataset.settingsTab===page));
  for(const section of document.querySelectorAll('[data-settings-page]'))section.hidden=section.dataset.settingsPage!==page;
  $('#settings-search').value='';$('#settings-search-results').hidden=true;$('#settings-workspace').hidden=false;
  scroller.scrollTop=focusTarget?0:settingsScroll.get(page)||0;
  if(focusTarget){if(focusTarget.id==='local-model'&&$('#local-ai-settings').hidden){focusTarget=$('#chat-mode');toast('Choose Local AI to see your installed models.');}for(let node=focusTarget.parentElement;node&&node!==scroller;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;focusTarget.scrollIntoView({block:'center'});focusTarget.focus({preventScroll:true});focusTarget.classList.add('setting-highlight');setTimeout(()=>focusTarget.classList.remove('setting-highlight'),1600);}
}
for(const button of document.querySelectorAll('[data-settings-tab]')){
  button.addEventListener('click',()=>showSettingsPage(button.dataset.settingsTab));
  button.addEventListener('keydown',event=>{const keys=['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const buttons=[...document.querySelectorAll('[data-settings-tab]')],i=buttons.indexOf(button),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowUp'||event.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;buttons[next].focus();buttons[next].click();});
}
const searchableSettings=[];
for(const page of document.querySelectorAll('[data-settings-page]'))for(const control of page.querySelectorAll('input[id]:not([type=file]),select[id],button[id],textarea[id]')){
  if(!desktop&&control.closest('.desktop-only'))continue;
  const label=control.closest('label')||document.querySelector('label[for="'+control.id+'"]');
  const searchLabel=label?.cloneNode(true);for(const output of searchLabel?.querySelectorAll('output')||[])output.remove();
  const title=(searchLabel?.querySelector('b')?.textContent||searchLabel?.textContent||control.textContent||'').trim().replace(/\s+/g,' ');
  if(title)searchableSettings.push({control,page:page.dataset.settingsPage,category:$('#settings-nav-'+page.dataset.settingsPage).textContent.slice(1).trim(),title,match:(title+' '+label?.textContent+' '+page.querySelector('h3').textContent).toLowerCase()});
}
searchableSettings.push({control:$('#quiet-setting'),page:'general',category:'General',title:'Quiet mode',match:'quiet mode mute voices pause push-to-talk'});
function searchSettings(){
  const query=$('#settings-search').value.trim().toLowerCase();$('#settings-workspace').hidden=Boolean(query);$('#settings-search-results').hidden=!query;
  const matches=searchableSettings.filter(item=>item.match.includes(query));$('#settings-search-status').textContent=matches.length?matches.length+' settings found. Choose one to open it.':'No settings found. Try “voice”, “game”, or “memory”.';
  $('#settings-search-list').replaceChildren();for(const item of matches){const button=document.createElement('button'),title=document.createElement('span'),category=document.createElement('small');button.type='button';title.textContent=item.title;category.textContent=item.category;button.append(title,category);button.addEventListener('click',()=>showSettingsPage(item.page,item.control));$('#settings-search-list').append(button);}
}
$('#settings-search').addEventListener('input',searchSettings);$('#settings-search').addEventListener('keydown',event=>{if(event.key==='Escape'&&event.target.value){event.preventDefault();event.stopPropagation();event.target.value='';searchSettings();}else if(event.key==='Enter'){event.preventDefault();document.querySelector('#settings-search-list button')?.click();}});
function syncControlsInteraction(hover=gameControlsHover){gameControlsHover=hover;const open=voiceButtonHeld||!panel.hidden||!$('#quick-talk').hidden||hover;if(open!==lastControlsOpen){lastControlsOpen=open;native?.setControlsOpen?.(open);}}
function openPanel(tab=activeTab) {panel.hidden=false;$('#launcher').setAttribute('aria-expanded','true');switchTab(tab);syncControlsInteraction();updateClickThrough(false);}
function closePanel() {panel.hidden=true;$('#launcher').setAttribute('aria-expanded','false');$('#launcher').focus({preventScroll:true});syncControlsInteraction(false);updateClickThrough(true);}
function openQuickTalk(){littleHabits.clear();physicalReactions.clear();conversationGuard.hold();wake();autoScheduler.invalidate();cancelVoiceInput();speaker.stop();$('#quick-talk').hidden=false;$('#bubble').hidden=true;bubbleUntil=0;targetX=null;syncControlsInteraction();updateClickThrough(false);$('#chat-input').focus({preventScroll:true});}
function closeQuickTalk(){const wasOpen=!$('#quick-talk').hidden;$('#quick-talk').hidden=true;if(wasOpen)petEl.focus({preventScroll:true});syncControlsInteraction(false);updateClickThrough(true);}
$('#close-talk').addEventListener('click',closeQuickTalk);
$('#launcher').addEventListener('click',()=>panel.hidden?openPanel():closePanel());
$('#close-panel').addEventListener('click',closePanel);
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>interact(b.dataset.action)));
spriteButtons.forEach(b=>b.addEventListener('click',()=>{state.sprite=b.dataset.sprite;changed();updateUI();}));
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color;changed();updateUI();}));
document.querySelectorAll('[data-hat]').forEach(b=>b.addEventListener('click',()=>{
  if(purchase(state,b.dataset.hat)){say(b.dataset.hat==='none'?'Just me. Still fabulous.':'How do I look?');changed();updateUI();}
  else toast('A few more coins first. Earn them by petting, fetch, or focusing.');
}));
$('#name-input').value=state.name;
$('#name-input').addEventListener('input',e=>{autoScheduler.invalidate();state.name=e.target.value.trim().slice(0,24)||'Ember';changed();updateUI();renderChat();});
$('#notes').value=state.notes;
$('#notes').addEventListener('input',e=>{state.notes=e.target.value.slice(0,6000);$('#save-status').textContent='Saving…';changed();updateUI();});
for(const [id,key] of [['emotion-setting','expressiveMoods'],['moments-setting','littleInteractions'],['adventures-setting','screenAdventures'],['attention-setting','attentionIndicator'],['daily-setting','dailyRoutines'],['helpful-setting','helpfulOffers'],['task-setting','contextReactions'],['wander-setting','wander'],['quiet-setting','quiet'],['motion-setting','reducedMotion'],['awareness-setting','pcAwareness'],['reaction-setting','physicalReactions'],['habits-setting','littleHabits'],['perch-setting','windowPerching'],['personal-memory-setting','personalMemoryEnabled'],['cursor-setting','cursorReactions'],['typing-setting','typingReaction'],['outfits-setting','appOutfits'],['idle-setting','idleNaps'],['automatic-setting','autoConversations'],['memory-setting','autoMemory'],['screen-setting','screenAwareness'],['game-click-setting','gameClickThrough'],['game-monitor-setting','gameFollowMonitor']]) {
  $("#"+id).checked=state[key];
  $("#"+id).addEventListener('change',e=>{state[key]=e.target.checked;if(key==='quiet'){speaker.stop();cancelVoiceInput();}if(key==='personalMemoryEnabled'){clearConversation('Personal memory preference updated.');renderPersonalMemory();}autoScheduler.invalidate();syncChatSettings();targetX=null;if(key==='reducedMotion'){pet.vx=pet.vy=0;pet.y=bounds().floor;}if(autoSleeping&&(!state.pcAwareness||!state.idleNaps)){sleeping=false;autoSleeping=false;}receiveActivity({...lastActivityInput,typingCount:0},true);changed();updateUI();});
}
for(const [id,key] of [['motion-level','motionLevel'],['personality-setting','personality'],['game-mode','gameMode'],['game-corner','gameCorner']]){
  $('#'+id).value=state[key];$('#'+id).addEventListener('change',e=>{state[key]=e.target.value;dailyController.clear();dailyPose='none';littleHabits.clear();targetX=null;autoScheduler.invalidate();changed();receiveActivity(lastActivityInput,true);updateUI();});
}
function dailyContext(){return {...reactionContext(),trickBusy:trickController.active,gameMode:inGame,hidden:document.hidden,speaking:bubbleUntil>performance.now(),homeBusy:homeFrame.phase!=='none',habitBusy:currentHabit()!=='none',reacting:bondGestures.active||currentReaction()!=='none'||taskPose!=='none'||adventures.active||trickController.active||moments.active,perched:Boolean(perchAnchor),walking:targetX!==null};}
function playContext(){return {...commentContext(),focus:state.focus.status!=='idle',gameMode:inGame,userBusy:chatBusy||inputSession.busy()||!$('#quick-talk').hidden,hidden:document.hidden,speaking:bubbleUntil>performance.now(),homeBusy:homeFrame.phase!=='none',reacting:bondGestures.active||currentReaction()!=='none'||taskPose!=='none',habitBusy:currentHabit()!=='none',dailyBusy:dailyPose!=='none',trickBusy:trickController.active||moments.active,walking:targetX!==null,airborne:Math.abs(pet.vy)>5};}
function adventureGeometry(){return {pet,bounds:bounds(),perch:perchAnchor};}
function preparePlay(){autoScheduler.invalidate();conversationGuard.hold();speaker.stop();$('#bubble').hidden=true;bubbleUntil=0;pauseHome();littleHabits.clear();physicalReactions.clear();dailyController.clear();dailyPose='none';taskReactions.clear();taskPose='none';targetX=null;cursorChaseUntil=0;pet.vx=pet.vy=0;}
function startTrick(kind,practice){
  if(chatBusy||inputSession.busy()){toast('Let me finish our conversation first.');return false;}
  if(trickController.active){toast('One trick at a time.');return false;}
  preparePlay();const result=trickController.start(kind,practice,state,playContext());$('#trick-status').textContent=result.ok?`${practice?'Practicing':'Performing'} ${TRICKS[kind].label.toLowerCase()}…`:result.message;
  if(result.ok){$('#trick-choice').value=kind;trickFrame=trickController.update(state,playContext());}else toast(result.message);updateUI();return result.ok;
}
$('#trick-choice').addEventListener('change',()=>{$('#trick-status').textContent='Three completed practices teach a trick. Interruptions don’t count.';updateUI();});
$('#practice-trick').addEventListener('click',()=>startTrick($('#trick-choice').value,true));$('#perform-trick').addEventListener('click',()=>startTrick($('#trick-choice').value,false));
function previewAdventure(kind){if(chatBusy||inputSession.busy()){toast('Let me finish our conversation first.');return;}preparePlay();if(!adventures.preview(kind,state,playContext(),adventureGeometry()))toast(kind==='window-climb'&&!perchAnchor?'Let me perch on a usable window first.':'Wake me up and finish the current activity first.');else adventureFrame=adventures.update(state,playContext(),adventureGeometry());updateUI();}
$('#adventure-edge').addEventListener('click',()=>{if(perchAnchor){perches.detach();perchAnchor=null;}previewAdventure('edge-peek');});$('#adventure-window').addEventListener('click',()=>previewAdventure('window-climb'));$('#adventure-stop').addEventListener('click',()=>{adventures.clear();adventureFrame=emptyAdventure();targetX=null;pet.vx=pet.vy=0;nextDecision=performance.now()+5000;updateUI();});
function momentContext(){const c=playContext();return {...c,typing:isUserTyping(),perched:Boolean(perchAnchor),otherBusy:bondGestures.active||c.homeBusy||c.reacting||c.habitBusy||c.dailyBusy||trickController.active||adventures.active};}
function momentGeometry(){return {pet,bounds:bounds(),home:homeView.geometry()};}
function startMoment(kind){
  if(chatBusy||inputSession.busy()||sleeping||inGame||state.focus.status!=='idle'||isUserTyping()){toast('Let me finish the current activity first.');return false;}
  preparePlay();if(!moments.start(kind,state,momentContext(),momentGeometry())){toast(kind==='toy'?'Bring a toy needs a visible home and room to walk off the perch.':'Turn on Little interactions and try while I’m settled.');return false;}
  manualMoment=kind;momentFrame=moments.update(state,momentContext(),momentGeometry());if(kind==='scratch'||kind==='paw')emotions.notice('care');else if(kind==='toy')emotions.notice('play');updateUI();return true;
}
$('#moment-start').addEventListener('click',()=>startMoment($('#moment-choice').value));$('#moment-stop').addEventListener('click',()=>{manualMoment=null;moments.clear();momentFrame={kind:'none',phase:'none',target:null,carrying:false};pet.vx=pet.vy=0;targetX=null;nextDecision=performance.now()+5000;updateUI();});
function attentionContext(){return {desktop,voicePhase:voiceInputEvent.state,chatBusy,focus:state.focus.status==='running',sleeping,away:activityState.away,file:currentFile,fileCurrent:fileIsCurrent(),seenAt:lastActivitySeenAt,windowTitle:lastActivityInput.windowTitle,category:activityState.category,appAvailable:lastActivityInput.appAvailable};}
function renderAttention(){const info=describeAttention(state,attentionContext());setText('#attention-label',info.label);setText('#attention-detail',info.detail);setText('#attention-tag-label',info.label);$('#attention-tag').dataset.kind=info.kind;$('#attention-card').dataset.kind=info.kind;$('#attention-tag').hidden=!state.attentionIndicator||inGame||!panel.hidden;$('#attention-tag').title=info.detail;$('#attention-tag').setAttribute('aria-label',`${state.name} notices: ${info.label}. Open attention details.`);setText('#attention-snapshots',state.screenAwareness?(aiInfo.vision?'Optional screen snapshots enabled · no continuous video.':'Screen snapshots enabled · waiting for a vision model.'):'Screen snapshots off.');}
$('#attention-tag').addEventListener('click',()=>{openPanel('pet');$('#creature-extras').open=true;$('#attention-card').scrollIntoView({block:'center'});});$('#attention-activity').addEventListener('click',()=>{openPanel('settings');showSettingsPage('activity');});$('#attention-files').addEventListener('click',()=>{openPanel('settings');showSettingsPage('files');});
$('#daily-preview').addEventListener('click',()=>{pauseHome();taskPose='none';littleHabits.clear();targetX=null;pet.vx=0;if(!dailyController.preview(state,dailyContext()))toast('Let me finish my current activity first.');else dailyPose=dailyController.pose;});
$('#assist-focus').addEventListener('click',()=>{helpOffer=null;runCreatureCommand({action:'startFocus',minutes:25});openPanel('focus');});
$('#assist-file').addEventListener('click',()=>{if(!currentFile){toast('Show me a text or code file first.');return;}submitMessage('Explain the selected file '+currentFile.name+'.');});
$('#assist-dismiss').addEventListener('click',()=>{helpOffer=null;updateUI();});
function showHelpOffer(message){const offer=assistanceOffer(message,state);if(offer){helpOffer={...offer,until:Date.now()+600000};$('#little-assistance').open=true;toast('Focus buddy offered in Creature → A little help.');updateUI();}}
async function refreshStartup(){try{const info=await native?.startupStatus?.();$('#startup-setting').disabled=!info?.supported;$('#startup-setting').checked=Boolean(info?.enabled);$('#startup-status').textContent=info?.message||'Startup is available in the Windows app.';}catch{$('#startup-setting').disabled=true;$('#startup-status').textContent='Could not check Windows startup settings.';}}
$('#startup-setting').addEventListener('change',async e=>{const value=e.target.checked;e.target.disabled=true;try{const info=await native.setStartup(value);e.target.checked=info.enabled;$('#startup-status').textContent=info.message;}catch(error){$('#startup-status').textContent=error.message;await refreshStartup();}finally{e.target.disabled=false;}});
refreshStartup();
$('#refresh-connections').addEventListener('click',async e=>{e.target.disabled=true;try{await saveNow();await Promise.allSettled([refreshAIStatus(),refreshSpeech(),refreshStartup()]);updateUI();}finally{e.target.disabled=false;}});
$('#export-backup').addEventListener('click',async()=>{try{await saveNow();if(dirty)throw Error('Save failed. Try exporting again.');if(native?.exportBackup){if(!await native.exportBackup())return;}else{const url=URL.createObjectURL(new Blob([encodeBackup(state)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='Pocket-Creature-Backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}$('#backup-status').textContent='Backup exported. Keep it somewhere safe.';}catch(error){$('#backup-status').textContent=error.message;}});
function previewBackup(text){pendingBackup=null;$('#backup-confirm').hidden=true;try{pendingBackup=decodeBackup(text,state);$('#backup-preview').textContent=`Restore ${pendingBackup.name}, ${pendingBackup.coins} coins, ${pendingBackup.sessions} focus sessions, and saved notes? This replaces your current save.`;$('#backup-confirm').hidden=false;$('#backup-status').textContent='Review the backup before restoring.';}catch(error){$('#backup-status').textContent=error.message;}}
$('#import-backup').addEventListener('click',async()=>{try{if(native?.importBackup){const text=await native.importBackup();if(text!==null)previewBackup(text);}else{$('#backup-file').value='';$('#backup-file').click();}}catch(error){$('#backup-status').textContent=error.message;}});
$('#backup-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>120000){$('#backup-status').textContent='Choose a backup smaller than 120 KB.';pendingBackup=null;$('#backup-confirm').hidden=true;return;}previewBackup(await file.text());});
$('#backup-cancel').addEventListener('click',()=>{pendingBackup=null;$('#backup-confirm').hidden=true;$('#backup-status').textContent='Import canceled. Your current save is unchanged.';});
$('#backup-restore').addEventListener('click',async e=>{if(!pendingBackup)return;e.target.disabled=true;cancelVoiceInput();const previous=state;try{state=decodeBackup(encodeBackup(pendingBackup),previous);changed();await saveNow();if(dirty)throw Error('Could not save the backup. Your current progress is still open.');location.reload();}catch(error){state=previous;dirty=true;$('#backup-status').textContent=error.message;await saveNow();}finally{e.target.disabled=false;}});
$('#personality-description').textContent=personalityProfile(state.personality).description;
for(const button of document.querySelectorAll('[data-reaction-preview]'))button.addEventListener('click',()=>{const kind=button.dataset.reactionPreview;physicalReactions.clear();const lines={curious:'Something caught my eye.',surprised:'Oh! That surprised me.',celebrate:'A tiny victory dance, just for practice.'};say(lines[kind]);if(!react(kind,true))toast('Let me finish my current activity first.');});
for(const button of document.querySelectorAll('[data-habit-preview]'))button.addEventListener('click',()=>{dailyController.clear();dailyPose='none';taskReactions.clear();taskPose='none';physicalReactions.clear();targetX=null;cursorChaseUntil=0;if(!littleHabits.preview(button.dataset.habitPreview,state,habitContext()))toast('Let me finish my current activity first.');});
$('#personality-preview').addEventListener('click',()=>say(voice('intro')));
$('#recover-overlay').addEventListener('click',async()=>{try{await saveNow();await native?.recoverOverlay?.();toast('Brought him forward. If he’s still hidden, try Borderless Fullscreen in the game.');}catch{toast('Could not bring the overlay forward. Try the tray menu.');}});
$('#frame-mode').value=state.frameMode;
$('#frame-mode').addEventListener('change',e=>{state.frameMode=e.target.value;lastTick=performance.now();changed();});
$('#idle-after').value=String(state.idleAfter);
$('#idle-after').addEventListener('change',e=>{state.idleAfter=Number(e.target.value);receiveActivity(lastActivityInput);changed();});
$('#activity-preview').addEventListener('change',e=>{
  previewAway=e.target.value==='away';previewCategory=['coding','gaming','music','browsing'].includes(e.target.value)?e.target.value:'none';
  lastLocalActivity=Date.now();receiveActivity({category:previewCategory,idleSeconds:previewAway?state.idleAfter+1:0,typingCount:0});
});
$('#focus-minutes').value=Math.round(state.focus.duration/60000);
$('#focus-start').addEventListener('click',()=>{
  if(state.focus.status==='running')pauseFocus(state);
  else if(state.focus.status==='paused'){prepareHomeFocus();resumeFocus(state);}
  else {prepareHomeFocus();startFocus(state,$('#focus-minutes').value);wake();targetX=null;say('You’ve got this. I’ll be right here.');}
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(homeView.dragging){homeView.cancelDrag();return;}cancelVoiceInput();speaker.stop();if(!$('#quick-talk').hidden)closeQuickTalk();else closePanel();}});
petEl.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  e.preventDefault();pauseHome();wake();cancelVoiceInput();speaker.stop();const rect=world.getBoundingClientRect();
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
window.addEventListener('blur',()=>{homeView.cancelDrag();if(voiceButtonHeld)cancelVoiceInput();if(drag){drag=null;pet.vx=pet.vy=0;}updateClickThrough(true);});

let ignored = true;
function updateClickThrough(ignore){if(desktop&&inGame&&state.gameClickThrough&&!lastControlsOpen)ignore=true;if(voiceButtonHeld||homeView.dragging)ignore=false;if(!desktop||ignore===ignored)return;ignored=ignore;native.setClickThrough(ignore);}
document.addEventListener('pointermove',e=>{
  syncControlsInteraction(homeView.dragging||Boolean(e.target.closest('#panel,#quick-talk,#launcher,#voice-stop,#voice-dock,#focus-badge,#home-handle')));
  hovering=Boolean(e.target.closest('.hit'));
  if(inGame&&state.gameClickThrough&&!lastControlsOpen)hovering=false;
  updateClickThrough(!hovering&&!drag);
});
document.addEventListener('pointerleave',()=>{if(!drag)updateClickThrough(true);});
native?.onOpenControls(()=>openPanel());
native?.onBeforeQuit(async()=>{cancelVoiceInput();speaker.stop();await saveNow();native.readyToQuit();});
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();if(document.hidden){homeView.cancelDrag();pauseHome();cancelVoiceInput();speaker.stop();saveNow();}});
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
function fileIsCurrent(){return Boolean(currentFile&&(!desktop||fileActivityId===String(lastActivityInput.contextId??0)&&((lastActivityInput.windowTitle||'').toLowerCase().includes(currentFile.name.toLowerCase())||Date.now()-fileObservedAt<15000&&fileObservedTitle===String(lastActivityInput.windowTitle||''))));}
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
function receiveFile(file,explicit=false){fileObservedTitle=String(lastActivityInput.windowTitle||'');
  const previous=currentFile;autoScheduler.invalidate();currentFile=file;fileActivityId=String(lastActivityInput.contextId??0);fileObservedAt=Date.now();const previousMemory=projectMemory();rememberObservedFile(file);renderFile();if(!file){fileNotice.clear();autoPendingFile=false;$('#file-status').textContent='Selected file cleared.';return;}
  $('#file-status').textContent=file.unread?'Filename noticed automatically; contents have not been read.':'File inspected automatically as text. Nothing was run.';
  let notice=null;
  if(previous?.path!==file.path||previous?.name!==file.name||previous.unread&&!file.unread){notice=fileGreeting(file,previousMemory);autoPendingFile=true;}
  else if(previous.excerpt!==file.excerpt&&Date.now()-lastFileComment>=15000){notice=`You updated ${file.name}. What changed?`;autoPendingFile=true;}
  if(notice){
    if(explicit){fileNotice.clear();if(say(notice,true,true))react('curious');}
    else fileNotice.offer(notice,file,activityTiming.revision);
  }
}
function renderRoots(){
  const list=$('#connected-folders');list.replaceChildren();
  for(const root of connectedRoots){const li=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');name.textContent=root.split(/[\\/]/).pop()||root;name.title=root;remove.textContent='Disconnect';remove.addEventListener('click',async()=>{try{connectedRoots=await native.removeFolder(root);renderRoots();}catch(e){toast(e.message);}});li.append(name,remove);list.append(li);}
  if(desktop&&connectedRoots.length&&!currentFile)$('#file-status').textContent='Watching connected folders for files opened in VS Code, Cursor, or Notepad. Duplicate filenames need manual selection.';
}
$('#show-file').addEventListener('click',async()=>{if(!desktop){$('#browser-file').click();return;}try{const file=await native.chooseFile();if(file)receiveFile(file,true);}catch(e){toast(e.message);$('#file-status').textContent=e.message;}});
$('#browser-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>262144)throw Error('Choose a file smaller than 256 KB.');receiveFile({...inspectText(file.name,await file.text()),path:`browser:${file.name}`,project:file.name,projectId:`browser:${file.name}`},true);}catch(error){toast(error.message);}e.target.value='';});
$('#connect-folder').addEventListener('click',async()=>{try{connectedRoots=await native.chooseFolder();renderRoots();}catch(e){toast(e.message);}});
$('#clear-file').addEventListener('click',async()=>{try{if(desktop)await native.clearFile();receiveFile(null);}catch(e){toast(e.message);}});
$('#project-memory-form').addEventListener('submit',e=>{e.preventDefault();if(!currentFile)return;const description=$('#project-description').value.trim();if(!description){toast('Describe the project first.');return;}const files=projectMemory()?.files||[];state.projectMemories=state.projectMemories.filter(m=>m.id!==currentFile.projectId);state.forgottenProjects=state.forgottenProjects.filter(id=>id!==currentFile.projectId);state.projectMemories.unshift({id:currentFile.projectId,name:currentFile.project||currentFile.name,description,automatic:false,files});state.projectMemories=state.projectMemories.slice(0,30);changed();renderFile();chatMessage('assistant',`I’ll remember: ${description}`,true);});
$('#forget-project').addEventListener('click',()=>{if(!currentFile)return;autoScheduler.invalidate();state.forgottenProjects=[...state.forgottenProjects.filter(id=>id!==currentFile.projectId),currentFile.projectId].slice(-30);state.projectMemories=state.projectMemories.filter(m=>m.id!==currentFile.projectId);changed();renderFile();toast('Project description forgotten. Clear conversation to remove earlier messages too.');});
function clearConversation(message='Recent conversation forgotten.'){cancelVoiceInput();lastReply='';renderSpeech();autoScheduler.invalidate();conversationGuard.clear();conversationRevision++;state.chatHistory=[];$('#bubble').hidden=true;bubbleUntil=0;changed();renderChat();$('#quick-status').textContent=message;}
$('#clear-chat').addEventListener('click',()=>clearConversation());
function renderPersonalMemory(){if(document.activeElement!==$('#bond-games-input'))$('#bond-games-input').value=state.personalMemory.favoriteGames;for(const key of Object.keys(PERSONAL_FIELDS))$('#personal-'+key).value=state.personalMemory[key];$('#personal-memory-status').textContent=state.personalMemoryEnabled?'Clear things you tell him can be remembered here. Saving edits also starts a fresh conversation.':'Personal memory is paused. Saved details stay editable and are not used in replies.';renderBond();}
$('#personal-memory-form').addEventListener('submit',e=>{e.preventDefault();state.personalMemory=normalizePersonalMemory(Object.fromEntries(Object.keys(PERSONAL_FIELDS).map(key=>[key,$('#personal-'+key).value])));clearConversation('Personal memory updated.');renderPersonalMemory();toast('Personal memory saved. Our conversation starts fresh.');});
$('#forget-personal-memory').addEventListener('click',()=>{state.personalMemory=normalizePersonalMemory();clearConversation('Personal memory and recent conversation forgotten.');renderPersonalMemory();toast('Personal memory and recent conversation forgotten.');});
const bondCards=BOND_MILESTONES.map(m=>{
  const card=document.createElement('div');card.className='bond-milestone';card.dataset.bondTier=m.gesture;
  const name=document.createElement('strong');name.textContent=m.name;const hint=document.createElement('small');
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=m.label;button.dataset.bondTry=m.gesture;
  button.addEventListener('click',()=>{
    if(!bondGestureAvailable(m)){toast('Gestures wait for a quiet moment on the ground.');return;}
    preparePlay();if(bondGestures.start(m.gesture,state.friendship,bondGestureContext())){bondGestureFrame=m.gesture;nextDecision=performance.now()+8000;updateUI();}
  });card.append(name,hint,button);$('#bond-milestones').append(card);return {m,hint,button};
});
function bondGestureContext(){return {gameMode:inGame,reducedMotion:state.reducedMotion,hidden:document.hidden,sleeping,dragging:Boolean(drag),typing:isUserTyping(),focus:state.focus.status!=='idle',voiceBusy:inputSession.busy()||speaker.active(),
  busy:chatBusy||!$('#quick-talk').hidden||bubbleUntil>performance.now()||Boolean(ball)||homeFrame.phase!=='none'||moments.active||trickController.active||adventures.active||dailyPose!=='none'||taskPose!=='none'||currentReaction()!=='none'||currentHabit()!=='none',
  moving:targetX!==null||Math.abs(pet.vx)>5,airborne:Boolean(perchAnchor)||pet.y<bounds().floor-1||Math.abs(pet.vy)>5};}
function bondGestureAvailable(m){const c=bondGestureContext();return state.friendship>=m.points&&!bondGestures.active&&!Object.values(c).some(Boolean);}
function renderBond(){
  const progress=bondProgress(state.friendship);setText('#bond-summary',progress.name);setText('#bond-level',progress.name);
  setText('#bond-next',progress.next?`${Math.floor(state.friendship)} friendship · ${Math.ceil(progress.next.points-state.friendship)} to ${progress.next.name}`:`${Math.floor(state.friendship)} friendship · All four gestures unlocked`);
  $('#bond-progress').max=progress.max;$('#bond-progress').value=progress.progress;
  const snack=bondFavorite(state.bond,'snacks'),interaction=bondFavorite(state.bond,'interactions');
  setText('#bond-snack',snack?.label||(state.bond.snackPin==='none'?'No favorite':state.bond.learning?'Still learning':'No favorite yet'));setText('#bond-snack-source',snack?.source||(state.bond.snackPin==='none'?'Chosen by you':state.bond.learning?'Choose snacks during care':'Learning paused'));
  setText('#bond-interaction',interaction?.label||(state.bond.interactionPin==='none'?'No favorite':state.bond.learning?'Still learning':'No favorite yet'));setText('#bond-interaction-source',interaction?.source||(state.bond.interactionPin==='none'?'Chosen by you':state.bond.learning?'Complete moments together':'Learning paused'));
  setText('#bond-games',state.personalMemory.favoriteGames||'Tell him in chat');setText('#bond-games-source',state.personalMemory.favoriteGames?(state.personalMemoryEnabled?'What you told him · Personal memory':'Personal memory paused · not used in replies'):'He won’t guess from your screen');
  $('#bond-enjoy').disabled=!interaction||inGame||sleeping||chatBusy||inputSession.busy()||isUserTyping()||state.focus.status!=='idle';
  for(const {m,hint,button} of bondCards){hint.textContent=state.friendship>=m.points?'Unlocked':`${m.points} friendship`;button.disabled=!bondGestureAvailable(m);}
  $('#bond-stop').hidden=!bondGestures.active;
  setText('#bond-gesture-status',bondGestures.active?`${BOND_MILESTONES.find(m=>m.gesture===bondGestureFrame)?.label||'Gesture'} · stays in place, no extra rewards`:inGame?'Gestures pause during games.':state.reducedMotion?'Gestures pause with reduced motion.':'Gestures wait for a quiet moment on the ground.');
  setText('#bond-learning-status',state.bond.learning?'Learning from care and completed play. Pinned favorites stay as you chose them.':'Learning paused. Turn it on to learn new care and play favorites. Games follow Personal memory separately.');
}
$('#bond-learning').checked=state.bond.learning;$('#bond-next-snack').value=state.bond.snackChoice;$('#bond-snack-pin').value=state.bond.snackPin;$('#bond-interaction-pin').value=state.bond.interactionPin;
$('#bond-learning').addEventListener('change',e=>{state.bond.learning=e.target.checked;changed();renderBond();});
$('#bond-next-snack').addEventListener('change',e=>{state.bond.snackChoice=e.target.value;changed();});
$('#bond-form').addEventListener('submit',e=>{
  e.preventDefault();state.bond.snackPin=$('#bond-snack-pin').value;state.bond.interactionPin=$('#bond-interaction-pin').value;
  const games=$('#bond-games-input').value.trim().slice(0,240);if(games!==state.personalMemory.favoriteGames){state.personalMemory.favoriteGames=games;clearConversation('Favorite games updated.');renderPersonalMemory();}
  changed();renderBond();toast('Favorites saved.');
});
$('#bond-forget').addEventListener('click',()=>{forgetBond(state.bond);$('#bond-learning').checked=false;$('#bond-snack-pin').value='auto';$('#bond-interaction-pin').value='auto';changed();renderBond();toast('Care and play favorites forgotten. Learning is paused.');});
$('#bond-forget-games').addEventListener('click',()=>{state.personalMemory.favoriteGames='';clearConversation('Favorite games and recent conversation forgotten.');renderPersonalMemory();renderBond();});
$('#bond-enjoy').addEventListener('click',()=>{const id=bondFavorite(state.bond,'interactions')?.id;if(id==='pet')interact('pet');else if(id==='fetch')interact('ball');else if(id)startMoment(id);});
$('#bond-stop').addEventListener('click',()=>{bondGestures.clear();bondGestureFrame='none';updateUI();});
renderPersonalMemory();
function syncChatSettings(){
  $('#local-ai-settings').hidden=state.chatMode!=='local';$('#ai-status').textContent=!desktop?'Playground · built-in observations':state.chatMode==='local'?aiInfo.message+(chatBusy||autoScheduler.busy?' · answering…':''):'Built-in observations · local AI paused';$('#screen-status').textContent=!state.screenAwareness?'Off · screen snapshots are never saved.':!desktop?'Screen awareness needs the Windows app.':!aiInfo.vision?'Waiting for a connected vision model.':'On · compare screen changes locally; snapshots never saved.';$('#chat-engine').textContent=state.chatMode==='local'?(desktop?'Local AI · Ollama':'Local AI needs the Windows app'):'Built-in observations';
}
for(const [id,key] of [['talkativeness','talkativeness'],['chat-mode','chatMode'],['local-model','localModel']]){$('#'+id).value=state[key];$('#'+id).addEventListener(id==='local-model'?'input':'change',e=>{state[key]=e.target.value;autoScheduler.invalidate();changed();syncChatSettings();clearTimeout(aiRefreshTimer);aiRefreshTimer=setTimeout(refreshAIStatus,700);});}
$('#chat-form').addEventListener('submit',e=>{e.preventDefault();submitMessage($('#chat-input').value.trim());});
function runCreatureCommand(command){
  autoScheduler.invalidate();conversationGuard.hold();littleHabits.clear();physicalReactions.clear();targetX=null;cursorChaseUntil=0;
  const respond=text=>say(text);
  const decline=text=>{say(text);return false;};
  switch(command.action){
    case 'sleep':if(!sleeping)interact('sleep');else respond('Already tucked in.');break;
    case 'wake':if(sleeping){wake();updateUI();}else respond('I’m already awake.');break;
    case 'home':if(!state.home.enabled||inGame)return decline('Your home needs to be visible first.');if(state.focus.status!=='idle')return decline('I’m already keeping you company during focus.');if(!sleeping)interact('sleep');break;
    case 'visitToys':if(!previewHome('toys'))return false;break;
    case 'feed':interact('feed');break;
    case 'pet':interact('pet');break;
    case 'fetch':
      if(inGame)return decline('I’ll keep my game corner. Turn game mode off for fetch.');
      if(state.focus.status!=='idle')return decline('End the focus session before we play fetch.');
      interact('ball');break;
    case 'startFocus':{
      if(state.focus.status!=='idle')return decline(state.focus.status==='paused'?'Your session is paused. Say “resume focus” to keep going.':'Your focus session is already running.');
      const minutes=command.minutes??Math.round(state.focus.duration/60000);
      prepareHomeFocus();sleeping=false;autoSleeping=false;pet.vx=0;
      startFocus(state,minutes);$('#focus-minutes').value=minutes;changed();updateUI();respond(`${minutes}-minute focus session started. You’ve got this.`);break;
    }
    case 'pauseFocus':
      if(state.focus.status!=='running')return decline(state.focus.status==='paused'?'Your session is already paused.':'There’s no focus session to pause.');
      pauseFocus(state);changed();updateUI();respond('Focus paused. Take your time.');break;
    case 'resumeFocus':
      if(state.focus.status!=='paused')return decline(state.focus.status==='running'?'Your session is already running.':'There’s no paused focus session.');
      prepareHomeFocus();sleeping=false;autoSleeping=false;resumeFocus(state);changed();updateUI();respond('Focus resumed. I’m right here.');break;
    case 'endFocus':
      if(state.focus.status==='idle')return decline('There’s no focus session to end.');
      state.focus={status:'idle',end:0,duration:state.focus.duration,remaining:state.focus.duration};changed();updateUI();respond('Focus session ended.');break;
    case 'invalidFocus':return decline('Choose a whole number from 1 to 180 minutes.');
    case 'repeat':
      if(!lastReply)return decline('I don’t have a reply to repeat yet.');
      $('#bubble').hidden=false;bubbleUntil=performance.now()+clamp(lastReply.length*45,3800,11000);repeatReply();break;
    case 'stopSpeech':speaker.stop();toast('Voice stopped.');break;
    case 'quiet':
      state.quiet=true;$('#quiet-setting').checked=true;cancelVoiceInput();changed();updateUI();respond('Quiet mode on. I’ll keep you company silently.');break;
    default:return false;
  }
  commandConfirmedUntil=performance.now()+1100;return true;
}
async function submitMessage(message,fromVoice=false){
  message=String(message).trim().slice(0,1200);if(!message){if(fromVoice)inputSession.finish();return;}
  const trick=parseTrickRequest(message,state.name);if(trick){if(fromVoice)inputSession.finish();voiceDraft='';$('#chat-input').value='';closeQuickTalk();startTrick(trick.kind,trick.practice);renderVoiceInput();return;}
  const reminder=parseReminderRequest(message);
  if(reminder){if(fromVoice)inputSession.finish();voiceDraft='';$('#chat-input').value='';closeQuickTalk();autoScheduler.invalidate();conversationGuard.hold();if(reminder.invalid)say('Choose a reminder from 1 minute to 24 hours.');else if(state.reminders.length>=20)say('You already have 20 reminders. Finish a few first.');else{state.reminders.push({id:crypto.randomUUID(),title:reminder.title,at:Date.now()+reminder.minutes*60000});changed();renderReminders();say(`I’ll remind you in ${reminder.minutes} minute${reminder.minutes===1?'':'s'}: ${reminder.title}.`);}return;}
  const command=parseVoiceCommand(message,state.name);
  if(command){if(fromVoice)inputSession.finish();voiceDraft='';$('#chat-input').value='';closeQuickTalk();runCreatureCommand(command);$('#quick-status').textContent='Creature command handled on this device.';renderVoiceInput();return;}
  if(chatBusy){if(fromVoice){inputSession.finish();voiceDraft=message;renderVoiceInput();}return;}
  if(startsNewTopic(message)){lastReply='';state.chatHistory=[];conversationGuard.clear();changed();}
  const beforePersonal=state.personalMemory;
  if(state.personalMemoryEnabled){state.personalMemory=rememberPersonalDetails(message,state.personalMemory);if(JSON.stringify(beforePersonal)!==JSON.stringify(state.personalMemory)){changed();renderPersonalMemory();}}
  const personalChanged=Object.keys(PERSONAL_FIELDS).find(key=>beforePersonal[key]!==state.personalMemory[key]);
  const request=conversationRevision,priorHistory=[...state.chatHistory];pendingHistory=priorHistory;
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
    closeQuickTalk();conversationGuard.clear();chatMessage('assistant',answer,true);showHelpOffer(message);if(answer.includes('?'))conversationGuard.observe(answer,lastActivityInput.contextId??0);$('#quick-status').textContent='Replies appear in his speech bubble.';
  }catch(error){if(request!==conversationRevision)return;state.chatHistory=priorHistory;changed();renderChat();$('#chat-input').value=message;$('#quick-status').textContent=error.message;say('I couldn’t reach my local AI. Try again in a moment.');}
  finally{pendingHistory=null;conversationGuard.hold();chatBusy=false;syncChatSettings();$('#chat-send').disabled=false;$('#chat-send').textContent='Send';if(fromVoice&&request===conversationRevision)inputSession.finish();}
}
function commentContext(){const fresh=fileIsCurrent();return {fileName:fresh?currentFile?.name:undefined,projectDescription:fresh?projectMemory()?.description.slice(0,100):undefined,category:activityState.category,contextId:lastActivityInput.contextId,windowTitle:lastActivityInput.windowTitle,gameMode:inGame,typing:isTyping(),focus:state.focus.status==='running',sleeping,dragging:Boolean(drag),playing:Boolean(ball),away:activityState.away};}
async function refreshAIStatus(){
  if(!native?.aiStatus||aiRefreshBusy||state.chatMode!=='local'){syncChatSettings();return;}
  aiRefreshBusy=true;const requested=state.localModel;
  try{const status=await native.aiStatus();if(requested!==state.localModel)return;aiInfo=status;if(!state.localModel&&status.ready&&status.model){state.localModel=status.model;$('#local-model').value=status.model;changed();}const models=$('#installed-models');models.replaceChildren();for(const name of status.models||[]){const option=document.createElement('option');option.value=name;models.append(option);}}
  catch{aiInfo={ready:false,vision:false,models:[],message:'AI offline · could not check Ollama.'};}
  finally{aiRefreshBusy=false;syncChatSettings();}
}
$('#check-ai').addEventListener('click',refreshAIStatus);
function screenExclusions(){return [$('#attention-tag'),petEl,$('#bubble'),panel,$('#quick-talk'),$('#launcher'),$('#voice-stop'),$('#voice-dock'),$('#focus-badge'),$('#little-home'),$('#home-handle')].filter(el=>!el.hidden&&el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {x:r.x-8,y:r.y-8,width:r.width+16,height:r.height+16};});}
async function automaticComment(urgent=false){
  if(desktop&&!activityTiming.ready())return;
  const timingRevision=activityTiming.revision,context=commentContext(),token=autoScheduler.begin(state,{...context,userBusy:automaticBusy(),ready:aiInfo.ready},Date.now(),urgent);if(token===null)return;
  const fileEvent=autoPendingFile;autoPendingFile=false;autoPendingActivity=false;syncChatSettings();const key=String(lastActivityInput.contextId??0),fileKey=currentFile?.path||'';
  $('#auto-status').textContent='Local AI is preparing an activity comment…';
  let reply,reaction='none',failed=false;
  try{await saveNow();if(automaticBusy()||state.quiet||!state.pcAwareness||!state.autoConversations||state.chatMode!=='local'){autoScheduler.finish(token);return;}const result=await native.chat({automatic:true,contextId:key,screenExclusions:screenExclusions(),message:fileEvent?'A current file was opened or saved. Comment on ONE specific detail, briefly.':'Observe the CURRENT foreground activity. One brief comment, or SILENCE if nothing new is worth saying.'});reaction=result?.reaction||'none';reply=typeof result==='string'?result:result?.contextKey===key?result.reply:'';if(result?.observation==='unchanged')$('#auto-status').textContent=state.screenAwareness?'Screen unchanged · watching for meaningful changes.':'Activity unchanged · watching for a new task.';}
  catch(error){if(key===String(lastActivityInput.contextId??0)&&!/cancelled/i.test(error.message)){failed=true;if(Date.now()-lastAutoError>45000){lastAutoError=Date.now();$('#auto-status').textContent=error.message;}}}
  const valid=autoScheduler.finish(token);syncChatSettings();
  if(!failed&&reply!=='SILENCE')$('#auto-status').textContent='Automatic activity comments are on.';
  if(valid&&(!desktop||activityTiming.ready()&&timingRevision===activityTiming.revision)&&!automaticBusy()&&!state.quiet&&state.pcAwareness&&state.autoConversations&&key===String(lastActivityInput.contextId??0)&&fileKey===(currentFile?.path||'')&&context.category===activityState.category&&context.windowTitle===lastActivityInput.windowTitle&&!sleeping&&!drag&&!ball&&!activityState.away&&typeof reply==='string'){const line=briefReply(reply,true);if(commentFilter.canAccept(line)&&say(line,true,true,reaction)){commentFilter.record(line);react(reaction);}}
}
function automaticBusy(){return chatBusy||inputSession.busy()||conversationGuard.blocked()||isUserTyping()||state.focus.status!=='idle'||adventures.active||trickController.active||moments.active||bondGestures.active||!$('#quick-talk').hidden||bubbleUntil>performance.now()||document.hidden;}
function proactiveComment(){
  const settled=!desktop||activityTiming.ready(),busy=automaticBusy()||sleeping||Boolean(drag)||Boolean(ball)||activityState.away||state.quiet||!state.pcAwareness;
  const notice=fileNotice.take(fileIsCurrent()?currentFile:null,activityTiming.revision,{ready:settled,busy});
  if(notice){lastFileComment=Date.now();if(commentFilter.canAccept(briefReply(notice,true))&&say(notice,true,true,'curious')){commentFilter.record(briefReply(notice,true));react('curious');}autoPendingFile=false;autoPendingActivity=false;return;}
  if(busy||autoScheduler.busy||!settled||Date.now()-activityChangedAt<2000)return;
  if(desktop&&state.chatMode==='local'&&state.autoConversations&&aiInfo.ready&&Date.now()-lastAutoError>45000){automaticComment(autoPendingFile||autoPendingActivity);return;}
  const line=commentator.next(commentContext(),state,Date.now());if(line&&commentFilter.canAccept(briefReply(line,true))&&say(line,true,true)){commentFilter.record(briefReply(line,true));happyUntil=performance.now()+1200;}
}
native?.onFileContext?.(receiveFile);native?.onFileStatus?.(message=>{$('#file-status').textContent=message;});
if(native?.getRoots)try{connectedRoots=await native.getRoots();renderRoots();}catch{$('#file-status').textContent='Could not load connected folders. You can still show a file.';}
renderChat();syncChatSettings();refreshAIStatus();if(desktop)setInterval(refreshAIStatus,15000);

function mood(){const reaction=currentReaction(),habit=currentHabit();return dailyPose!=='none'?LIVING_POSES[dailyPose]:drag?'airborne':homeFrame.phase.startsWith('going-')?'heading home':sleeping?'sleepy':state.focus.status==='running'?'focused':homeFrame.pose==='stretch'?'stretching':homeFrame.pose==='inspect'?'checking toys':ball?'playful':REACTION_MOODS[reaction]?REACTION_MOODS[reaction]:HABIT_MOODS[habit]?HABIT_MOODS[habit]:performance.now()<happyUntil?'loved':isTyping()?'typing':performance.now()<dizzyUntil?'dizzy':state.energy<30?'tired':EMOTIONS[emotionFrame]||'curious';}
function isUserTyping(){return state.pcAwareness&&Date.now()<observedTypingUntil;}
function isTyping(){return !inputSession.busy()&&state.pcAwareness&&state.typingReaction&&activityState.typingUntil>Date.now()&&!sleeping&&!drag&&!ball&&state.focus.status!=='running';}
function receiveActivity(signal,keepControls=false){
  if(!keepControls){lastActivitySeenAt=Date.now();if(signal.typingCount>0){observedTypingUntil=Date.now()+2500;autoScheduler.invalidate();}}
  const activityChanged=!keepControls&&activityTiming.observe(signal);
  if(!keepControls)taskReactions.observe(signal);
  const nextGame=gameActive(state,signal);
  if(nextGame!==inGame){
    littleHabits.clear();physicalReactions.clear();autoScheduler.invalidate();
    if(nextGame&&!state.speechInGames)speaker.stop();
    if(nextGame){homeView.cancelDrag();pauseHome();gameHome={x:pet.x,y:pet.y};ball=null;$('#ball').hidden=true;closeQuickTalk();if(!keepControls)closePanel();cursorChaseUntil=dizzyUntil=0;targetX=null;}
    else if(gameHome){pet.x=clamp(gameHome.x,bounds().left,bounds().right);pet.y=clamp(gameHome.y,Math.min(bounds().top,bounds().floor),bounds().floor);pet.vx=pet.vy=0;gameHome=null;}
    inGame=nextGame;document.body.classList.toggle('game-mode',inGame);syncControlsInteraction(false);updateClickThrough(true);
  }

  if(activityChanged){
    interruptPlay();dailyController.clear();dailyPose='none';littleHabits.clear();physicalReactions.clear();autoScheduler.invalidate();activityChangedAt=Date.now();fileNotice.clear();autoPendingActivity=true;autoPendingFile=false;
    speaker.stop(true);
    if(bubbleSpontaneous){$('#bubble').hidden=true;bubbleUntil=0;}
  }
  lastActivityInput=signal;
  activityState=activityTransition(activityState,signal,{...state,idleNaps:state.idleNaps&&!inGame});
  if(!inputSession.busy()&&activityState.away&&!sleeping&&!drag&&!ball&&state.focus.status!=='running'){
    sleeping=true;autoSleeping=true;prepareHomeRest();targetX=null;pet.vx=0;say('I’ll keep your spot warm.',true);
  }else if(activityState.returned){
    if(!sleeping)adventures.returned(state,playContext());
    if(autoSleeping){sleeping=false;autoSleeping=false;homeController.wake();happyUntil=performance.now()+2500;greetingUntil=performance.now()+3000;
      if(!state.reducedMotion&&state.wander&&state.focus.status!=='running')targetX=clamp(lastPointer?.x??pet.x,bounds().left,bounds().right);
      particles('♡',4);adventures.returned(state,{...playContext(),sleeping:false,speaking:false});
    }
  }
  if(activityState.away)speaker.stop(true);
  updateUI();
}
native?.onActivity?.(receiveActivity);
function overCompanionControls(point){
  return [$('#attention-tag'),panel,$('#quick-talk'),$('#voice-dock'),$('#launcher'),$('#voice-stop'),$('#focus-badge'),$('#home-handle')].some(node=>{if(node.hidden||!node.getClientRects().length)return false;const r=node.getBoundingClientRect();return point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom;});
}
function cursorReaction(point){
  lastPointer=point;
  const now=performance.now();
  if(!inputSession.busy()&&!perchAnchor&&!inGame&&previousPointer&&state.pcAwareness&&state.cursorReactions&&!state.reducedMotion&&!sleeping&&!drag&&!ball&&!isTyping()&&currentHabit()==='none'&&state.focus.status!=='running'&&now>cursorCooldown){
    const distance=Math.hypot(point.x-previousPointer.x,point.y-previousPointer.y),elapsed=Math.max(.01,(now-previousPointer.at)/1000);
    if(distance/elapsed>900&&distance>28&&Math.abs(point.x-pet.x)<480&&!overCompanionControls(point)){
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
  renderBond();renderAttention();setText('#emotion-status',state.expressiveMoods?'Feeling '+(EMOTIONS[emotionFrame]||mood())+' · expressions follow what’s happening.':'Expressive moods are off.');$('#moment-start').disabled=!state.littleInteractions||moments.active||chatBusy||inputSession.busy()||inGame||sleeping||isUserTyping()||state.focus.status!=='idle';$('#moment-stop').hidden=!moments.active;
  setText('#moment-status',momentFrame.kind==='none'?'Quiet company · automatic moments pause while you’re busy. No rewards or extra AI calls.':MOMENTS[momentFrame.kind]+' · '+momentFrame.phase);
  const selectedTrick=$('#trick-choice').value,progress=state.tricks[selectedTrick];setText('#trick-description',TRICKS[selectedTrick].description);$('#trick-progress').value=progress.practice;setText('#trick-progress-label',progress.practice===3?'Learned · ready to perform':`${progress.practice} / 3 practices`);const trickBlocked=trickController.active||inGame||sleeping||drag||ball||isTyping()||state.focus.status!=='idle'||inputSession.busy()||chatBusy;$('#practice-trick').disabled=Boolean(trickBlocked)||progress.practice>=3||(Date.now()>=progress.lastPracticeAt&&Date.now()-progress.lastPracticeAt<10000&&progress.lastPracticeAt>0);$('#perform-trick').disabled=Boolean(trickBlocked)||progress.practice<3;
  for(const option of $('#trick-choice').options){const count=state.tricks[option.value].practice;option.textContent=TRICKS[option.value].label+(count===3?' · learned':` · ${count}/3`);}
  setText('#adventure-status',!state.screenAdventures?'Screen adventures are off.':inGame?'Adventures pause during games.':state.reducedMotion?'Adventures pause with reduced motion.':adventureFrame.kind!=='none'?`${adventureFrame.kind==='window-climb'?'Exploring this window':adventureFrame.kind==='return-peek'?'Peeking hello':'Exploring this screen'} · ${adventureFrame.phase}`:!state.wander?'Automatic exploring pauses with Wandering; previews still work.':'Quiet adventures when there’s room and time.');$('#adventure-stop').hidden=!adventures.active;$('#adventure-edge').disabled=!state.screenAdventures||state.reducedMotion||inGame;$('#adventure-window').disabled=!state.screenAdventures||state.reducedMotion||inGame||!perchAnchor;
  homeView.render();setText('#home-state',inGame?'Home folds away while he keeps his game corner.':!state.home.enabled?'Home is tucked away. Your decorations are saved.':homeFrame.phase.startsWith('going-')?'On his way to his little corner.':homeFrame.phase==='bed'?'Curled up in his sleeping basket.':homeFrame.phase==='focus'?'Settled beside you for focus.':homeFrame.phase==='play'?'A small game, just for fun.':'Drag the Home handle to choose a spot.');
  renderSpeech();renderVoiceInput();
  if(helpOffer&&(Date.now()>=helpOffer.until||!state.helpfulOffers||state.focus.status!=='idle'))helpOffer=null;
  setText('#assistance-status',helpOffer?.label||'Ask “remind me in 10 minutes to drink water”, or show me a file.');$('#assist-dismiss').hidden=!helpOffer;$('#assist-focus').disabled=state.focus.status!=='idle'||chatBusy;$('#assist-file').disabled=!currentFile||chatBusy;
  setText('#daily-status',!state.dailyRoutines?'Daily routines are off.':inGame?'Daily routines pause during games.':state.reducedMotion?'Daily routines pause with reduced motion.':`${dayPeriod()} · ${dailyPose!=='none'?LIVING_POSES[dailyPose]:'quiet company, with occasional little routines'}`);$('#daily-preview').disabled=!state.dailyRoutines||state.reducedMotion||inGame;
  setText('#connection-ai',!desktop?'Ollama: available in the Windows app.':state.chatMode!=='local'?'Ollama: not in use (built-in replies).':aiInfo.ready?`Ollama: connected · ${aiInfo.model||state.localModel}`:`Ollama: ${aiInfo.message}`);
  setText('#connection-voice',!desktop?'Voice: browser preview.':state.speechEngine==='kokoro'?`Kokoro: ${speechInfo.ready?'connected · '+state.kokoroVoice:speechInfo.message}${!state.speechEnabled?' · spoken replies off':''}`:`Windows voice: ${speechInfo.ready?'ready':speechInfo.message}`);
  setText('#personality-description',personalityProfile(state.personality).description);
  setText('#perch-status',!state.windowPerching?'Window perching is off.':!state.pcAwareness?'Window perching is paused with PC awareness.':inGame?'Game corner takes priority over window perching.':perchAnchor?'Following this window’s edge.':desktop?'Waiting for a restored window with room above its top edge.':'Try a preview window here; PC windows work in the Windows app.');
  setText('#game-status',inGame?'Game mode on · smaller dragon, pinned corner, quiet spectator':state.gameMode==='off'?'Game mode off':!state.pcAwareness?'Automatic game detection paused with PC awareness':'Automatic game mode standing by');
  document.querySelector('[data-action="ball"]').disabled=inGame||state.focus.status!=='idle';
  for(const button of document.querySelectorAll('[data-reaction-preview]'))button.disabled=!state.physicalReactions;
  for(const button of document.querySelectorAll('[data-habit-preview]'))button.disabled=!state.littleHabits;
  const m=mood();setText('#pet-name',state.name);setText('#pet-mood',m);
  const title=$('#panel-name');if(title.dataset.name!==state.name){title.dataset.name=state.name;title.firstChild.nodeValue=`Meet ${state.name} `;petEl.setAttribute('aria-label',`Talk to ${state.name}. Drag to pick up; right click for controls.`);renderChat();}
  setText('#mood-pill',`● Feeling ${m}`);setText('#coins',state.coins);
  for(const key of ['energy','happiness']){const val=Math.round(state[key]);if($('#'+key).value!==val)$('#'+key).value=val;setText('#'+key+'-text',`${val}%`);}
  setText('#friendship',`Friendship · ${Math.floor(state.friendship)}`);setText('#note-count',`${state.notes.length} / 6000`);
  const sleepButton=$('#sleep-button');if(sleepButton.dataset.sleep!==String(sleeping)){sleepButton.dataset.sleep=String(sleeping);sleepButton.firstElementChild.textContent=sleeping?'☼':'☾';sleepButton.lastChild.nodeValue=sleeping?'Wake up':'Take a nap';}
  if(petEl.dataset.palette!==state.color){petEl.dataset.palette=state.color;const palette={mint:['#9edac2','#45796c','#c5ecdc'],lavender:['#baa9df','#7b6ba7','#dcd1f0'],peach:['#eeb29d','#b87967','#f7d7c0']}[state.color];['--mint','--dark','--light'].forEach((key,i)=>{petEl.style.setProperty(key,palette[i]);$('.companion-avatar').style.setProperty(key,palette[i]);$('#sprite-gallery').style.setProperty(key,palette[i]);});}
  if(petEl.dataset.sprite!==state.sprite){applySprite(dragonEl,state.sprite);applySprite(avatar,state.sprite);petEl.dataset.sprite=state.sprite;}
  for(const button of spriteButtons)button.setAttribute('aria-pressed',String(button.dataset.sprite===state.sprite));
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
  $('#animation-stop').hidden=!motionController.active;
  const motionBusy=motionContext();$('#animation-start').disabled=state.reducedMotion||motionBusy.gameMode||motionBusy.sleeping||motionBusy.locked||motionBusy.typing||motionBusy.focus||motionBusy.voiceBusy||motionBusy.dragging||motionBusy.airborne||motionBusy.moving;
  setText('#animation-status',motionFrame.preview!=='none'?`Previewing ${MOTION_PREVIEWS[motionFrame.preview].toLowerCase()} · stays in place.`:$('#animation-start').disabled?'Previews wait for an idle moment. Games and reduced motion keep things still.':'Natural motion follows your chosen dragon and motion level. Previews stay in place and earn no coins.');
  setText('#scene-state',sleeping?'Taking a well-deserved nap':state.focus.status==='running'?'Keeping you company while you focus':ball?'A very important game of fetch':activityLabel());
}
const motionController=createMotionController(),poseTransitions=createPoseTransitions(dragonEl);
const motionNodes=new Map([...dragonEl.querySelectorAll('[data-motion-part]')].map(node=>[node.dataset.motionPart,node]));
let motionFrame=neutralMotion(1,'idle'),lookX=0,lookY=0;
function motionContext(){return {
  x:pet.x,y:pet.y,dir:pet.dir,vx:drag?.vx??pet.vx,vy:drag?.vy??pet.vy,
  height:Math.max(0,bounds().floor-pet.y),airborne:!perchAnchor&&!drag&&pet.y<bounds().floor-1,
  dragging:Boolean(drag),gameMode:inGame,hidden:document.hidden,sleeping,typing:isUserTyping(),focus:state.focus.status!=='idle',
  voiceBusy:inputSession.busy()||voicePose(voiceInputEvent.state,commandConfirmedUntil,performance.now())!=='none',
  perched:Boolean(perchAnchor),speaking:bubbleUntil>performance.now(),lookX,lookY,carrying:momentFrame.carrying,
  moving:targetX!==null||Boolean(homeFrame.target||momentFrame.target||adventureFrame.target),
  locked:bondGestures.active||currentReaction()!=='none'||currentHabit()!=='none'||dailyPose!=='none'||taskPose!=='none'||trickController.active||
    (adventureFrame.pose!=='none'&&adventureFrame.pose!=='walking')||
    (homeFrame.pose!=='none'&&homeFrame.pose!=='walking')||
    (momentFrame.kind!=='none'&&!['fetch','return'].includes(momentFrame.phase))||
    !$('#quick-talk').hidden||chatBusy||perchMoving||performance.now()<dizzyUntil,
};}
function applyMotion(frame){
  const n=v=>v.toFixed(3),set=(part,value)=>{const node=motionNodes.get(part);if(node.getAttribute('transform')!==value)node.setAttribute('transform',value);};
  const b=frame.body;set('body',`translate(0 ${n(b.y)}) rotate(${n(b.lean)} 120 205) translate(120 205) scale(${n(b.sx)} ${n(b.sy)}) translate(-120 -205)`);
  set('head',`rotate(${n(frame.head)} 120 140)`);set('wing',`rotate(${n(frame.wing)} 157 139)`);set('tail',`rotate(${n(frame.tail)} 168 156)`);set('arm',`rotate(${n(frame.arm)} 85 142)`);
  for(const [part,cx,cy] of [['front',88,186],['back',148,185]]){const foot=frame[part];set(part,`translate(${n(foot.x)} ${n(foot.y)}) rotate(${n(foot.angle)} ${cx} ${cy})`);}
  set('blink',`translate(120 99) scale(1 ${n(frame.blink)}) translate(-120 -99)`);
  const height=frame.mode==='fall'?Math.max(0,bounds().floor-pet.y):0;
  set('shadow',`translate(118 ${n(205+height)}) scale(${n(frame.shadow.scale)} 1) translate(-118 -205)`);motionNodes.get('shadow').style.opacity=n(frame.shadow.opacity);
  petEl.dataset.motionReady='true';petEl.dataset.motionMode=frame.mode;petEl.dataset.motionPreview=frame.preview;
  if(frame.facing!==lastFacing){dragonEl.style.transform=`scaleX(${n(frame.facing)})`;lastFacing=frame.facing;}
}
$('#animation-start').addEventListener('click',()=>{
  if(motionController.preview($('#animation-choice').value,state,motionContext(),performance.now()))updateUI();
  else toast('I need a quiet moment on the ground to preview that move.');
});
$('#animation-stop').addEventListener('click',()=>{motionController.clear(performance.now());updateUI();});
function drawPet(now=performance.now(),dt=1/60){
  if(!$('#quick-talk').hidden){const q=$('#quick-talk');q.style.left=`${clamp(pet.x-150,12,Math.max(12,world.clientWidth-q.offsetWidth-12))}px`;q.style.top=`${clamp(pet.y-350,12,Math.max(12,world.clientHeight-q.offsetHeight-12))}px`;}
  petEl.style.transform=`translate3d(${(pet.x-120).toFixed(2)}px,${(pet.y-205).toFixed(2)}px,0) scale(${inGame?.72:1})`;
  const outfit=state.pcAwareness&&state.appOutfits&&!sleeping&&state.focus.status!=='running'?activityState.outfit:'none';
  const reaction=currentReaction(),habit=currentHabit();
  const pose=drag?'none':voicePose(voiceInputEvent.state,commandConfirmedUntil,now);
  const classes=`hit pet hat-${state.hat}${trickFrame.kind!=='none'?' trick-'+trickFrame.kind:''}${adventureFrame.pose!=='none'?' adventure-'+adventureFrame.pose:''} outfit-${outfit}${dailyPose!=='none'?' daily-'+dailyPose:''}${homeFrame.pose!=='none'&&homeFrame.pose!=='walking'?' home-'+homeFrame.pose:''}${reaction!=='none'?' reaction-'+reaction:''}${habit!=='none'?' habit-'+habit:''}${perchAnchor&&!drag?' perched':''}${sleeping&&!homeFrame.phase.startsWith('going-')?' sleeping':''}${state.focus.status==='running'?' focusing':''}${isTyping()?' mimicking':''}${drag?' dragging':''}${now<happyUntil?' happy':''}${now<dizzyUntil?' dizzy':''}${targetX!==null&&!drag?' walking':''}`;
  const poseKey=[bondGestureFrame,classes,pose,taskPose,momentFrame.kind,momentFrame.phase,inGame,state.reducedMotion].join('|');
  poseTransitions.before(poseKey,inGame||state.reducedMotion||document.hidden);
  petEl.dataset.perched=String(Boolean(perchAnchor&&!drag));
  if(petEl.dataset.habit!==habit)petEl.dataset.habit=habit;if(petEl.dataset.reaction!==reaction)petEl.dataset.reaction=reaction;
  if(petEl.dataset.voicePose!==pose)petEl.dataset.voicePose=pose;
  if(petEl.dataset.homePhase!==homeFrame.phase)petEl.dataset.homePhase=homeFrame.phase;if(petEl.dataset.taskPose!==taskPose)petEl.dataset.taskPose=taskPose;
  petEl.dataset.emotion=emotionFrame;petEl.dataset.moment=momentFrame.kind;petEl.dataset.momentPhase=momentFrame.phase;petEl.dataset.carrying=String(momentFrame.carrying);petEl.dataset.toy=state.home.toy;
  petEl.dataset.bondGesture=bondGestureFrame;petEl.dataset.dailyPose=dailyPose;petEl.dataset.adventure=adventureFrame.phase;petEl.dataset.trick=trickFrame.kind;
  if(classes!==lastPetClass){petEl.className=classes;lastPetClass=classes;}
  const tracking=lastPointer&&state.pcAwareness&&state.cursorReactions&&!sleeping&&!state.reducedMotion;
  const targetLookX=tracking?clamp((lastPointer.x-pet.x)*.012*pet.dir,-4,4):0;
  const targetLookY=tracking?clamp((lastPointer.y-(pet.y-105))*.008,-2.5,2.5):0;
  const ease=1-Math.exp(-12*dt);lookX+=(targetLookX-lookX)*ease;lookY+=(targetLookY-lookY)*ease;
  const motionContextNow=motionContext();
  const actionLocked=motionContextNow.locked&&($('#quick-talk').hidden||reaction!=='none'||habit!=='none'||dailyPose!=='none'||taskPose!=='none'||trickController.active||adventures.active||homeFrame.pose!=='none'||moments.active||perchMoving||now<dizzyUntil);
  const voiceFrame=voiceMotion.update(state,{...motionContextNow,locked:bondGestures.active||actionLocked||now<happyUntil||motionController.active},now,dt);
  petEl.style.setProperty('--gaze-x',`${(lookX+voiceFrame.gazeX).toFixed(2)}px`);petEl.style.setProperty('--gaze-y',`${(lookY+voiceFrame.gazeY).toFixed(2)}px`);
  petEl.dataset.voiceMouth=String(voiceFrame.mouth>.06);petEl.dataset.voiceOpening=voiceFrame.mouth.toFixed(3);
  $('#dragon .voice-mouth').setAttribute('transform',`translate(113 120) scale(${(.8+voiceFrame.mouth*.2).toFixed(3)} ${Math.max(.08,voiceFrame.mouth).toFixed(3)}) translate(-113 -120)`);
  motionFrame=motionController.update(state,{...motionContextNow,voiceFrame},now,dt);applyMotion(motionFrame);poseTransitions.update(now);
  if(state.quiet||inGame||document.hidden||inputSession.busy()||state.focus.status!=='idle')dragonSounds.stop();
}
function checkTimers(){
  if(finishFocus(state)){emotions.notice('focusDone');say('You did it! Tiny dragon. Huge pride.',false,false,'celebrate');react('celebrate',true);toast('Focus session complete. +15 coins!');particles('✦',7);changed();native?.notify('Nice work!', 'Your focus session is complete. You earned 15 coins.');}
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
  const homeGeometry=homeView.geometry();
  bondGestureFrame=bondGestures.update(bondGestureContext(),now);
  homeFrame=homeController.update(state,{x:pet.x,y:pet.y,sleeping,focus:state.focus.status==='running',gameMode:inGame,dragging:Boolean(drag),homeDragging:homeView.dragging,hidden:document.hidden,userBusy:inputSession.busy()||chatBusy||!$('#quick-talk').hidden,manualPlaying:Boolean(ball&&!ball.automatic),typing:isTyping(),reacting:bondGestures.active||currentReaction()!=='none'||dailyPose!=='none'||adventures.active||trickController.active||moments.active,away:activityState.away,perched:Boolean(perchAnchor),speaking:bubbleUntil>now,toy:ball?.automatic?ball:null},homeGeometry);
  if(ball?.automatic&&homeFrame.phase!=='play'){ball=null;$('#ball').hidden=true;}
  if(homeFrame.throwToy){const p=homeGeometry.toys;ball={x:p.x,y:p.y-90,vx:-95,vy:-230,automatic:true,toy:state.home.toy};$('#ball').hidden=false;}
  if(state.pcAwareness&&activityTiming.ready()&&noticedActivity!==activityTiming.revision&&!automaticBusy()&&!sleeping&&!activityState.away){noticedActivity=activityTiming.revision;if(lastActivityInput.windowTitle)emotions.notice('discovery');}
  const previousTask=taskPose;taskPose=taskReactions.current(state,{...commentContext(),typing:isUserTyping(),userBusy:chatBusy||inputSession.busy()||!$('#quick-talk').hidden,hidden:document.hidden,homeBusy:bondGestures.active||homeFrame.phase!=='none'||dailyPose!=='none'||adventures.active||trickController.active||moments.active,reacting:currentReaction()!=='none'});
  if(previousTask!==taskPose&&taskPose==='paw-break'&&state.chatMode==='builtin')say('Tiny paw stretch while your keyboard takes a break.',true);
  perchAnchor=perches.update(lastActivityInput.perchWindow,{width:world.clientWidth,height:world.clientHeight},state,{...reactionContext(),userBusy:bondGestures.active||reactionContext().userBusy||adventures.active||trickController.active||moments.active,speaking:bubbleUntil>now},Date.now());
  trickFrame=trickController.update(state,playContext());
  if(trickFrame.completed){changed();$('#trick-status').textContent=trickFrame.learned?`${TRICKS[trickFrame.completed].label} learned! You can ask me to perform it now.`:`Practice complete · ${state.tricks[trickFrame.completed].practice}/3. A tiny breather before the next one.`;if(trickFrame.learned){emotions.notice('learned');particles('✦',3);}}
  if(trickFrame.interrupted)$('#trick-status').textContent='Practice paused. Interruptions don’t count.';
  momentFrame=moments.update(state,momentContext(),momentGeometry());
  if(momentFrame.completed&&manualMoment===momentFrame.completed){if(recordBond(state.bond,'interactions',manualMoment))changed();manualMoment=null;}
  if(!moments.active)manualMoment=null;
  emotionFrame=emotions.current(state,{dragging:Boolean(drag),dizzy:now<dizzyUntil,voiceBusy:chatBusy||inputSession.busy(),speaking:speaker.active()||bubbleUntil>now,sleeping,away:activityState.away,typing:isUserTyping(),focus:state.focus.status!=='idle',playing:Boolean(ball),interaction:momentFrame.kind,otherPose:bondGestures.active||currentReaction()!=='none'||currentHabit()!=='none'||dailyPose!=='none'||taskPose!=='none'||trickController.active||adventures.active||homeFrame.pose!=='none'},Date.now());
  adventureFrame=adventures.update(state,playContext(),adventureGeometry());
  dailyPose=dailyController.current(state,dailyContext());
  perchMoving=false;
  if(perchAnchor&&!drag&&adventureFrame.kind==='none'&&!momentFrame.target){const ease=state.reducedMotion?1:1-Math.exp(-12*dt);pet.x+=(perchAnchor.x-pet.x)*ease;pet.y+=(perchAnchor.y-pet.y)*ease;perchMoving=Math.hypot(perchAnchor.x-pet.x,perchAnchor.y-pet.y)>3;pet.vx=pet.vy=0;targetX=null;cursorChaseUntil=0;}
  if(adventureFrame.target&&!drag&&!inGame){const goal=adventureFrame.target,dx=goal.x-pet.x,dy=goal.y-pet.y,distance=Math.hypot(dx,dy),step=Math.min(distance,95*livingProfile(state).speed*dt);if(distance>0){pet.x+=dx/distance*step;pet.y+=dy/distance*step;if(Math.abs(dx)>1)pet.dir=dx<0?-1:1;}pet.vx=pet.vy=0;targetX=null;cursorChaseUntil=0;}
  if(momentFrame.target&&!drag&&!inGame){const goal=momentFrame.target,dx=goal.x-pet.x,dy=goal.y-pet.y,distance=Math.hypot(dx,dy),step=Math.min(distance,120*livingProfile(state).speed*dt);if(distance>0){pet.x+=dx/distance*step;pet.y+=dy/distance*step;if(Math.abs(dx)>1)pet.dir=dx<0?-1:1;}pet.vx=pet.vy=0;targetX=null;cursorChaseUntil=0;}
  if(inGame&&!drag){const anchor=gameAnchor(state.gameCorner,world.clientWidth,world.clientHeight);pet.x=anchor.x;pet.y=anchor.y;pet.vx=pet.vy=0;targetX=null;}
  frameCount++;if(now-frameWindow>=2000){measuredFps=Math.round(frameCount*1000/(now-frameWindow));frameCount=0;frameWindow=now;}
  if(!drag&&homeFrame.target&&!inGame){const goal=homeFrame.target,dx=goal.x-pet.x,dy=goal.y-pet.y,distance=Math.hypot(dx,dy),step=state.reducedMotion?distance:Math.min(distance,150*dt);if(distance>.1){pet.x+=dx/distance*step;pet.y+=dy/distance*step;if(Math.abs(dx)>1)pet.dir=dx<0?-1:1;}pet.vx=pet.vy=0;targetX=homeFrame.pose==='walking'?goal.x:null;cursorChaseUntil=0;}
  if(sleeping&&!homeFrame.phase.startsWith('going-'))state.energy=clamp(state.energy+dt*.65,0,100);
  if(!bondGestures.active&&!drag&&momentFrame.kind==='none'&&adventureFrame.kind==='none'&&!homeFrame.target&&homeFrame.pose==='none'&&!inputSession.busy()){
    const grounded=pet.y>=b.floor-.5&&Math.abs(pet.vy)<1;
    if(now>=nextDecision){
      nextDecision=now+(5000+Math.random()*5000)*livingProfile(state).interval;
      if(!adventures.active&&!trickController.active&&!inputSession.busy()&&!perchAnchor&&dailyPose==='none'&&taskPose==='none'&&currentHabit()==='none'&&currentReaction()==='none'&&!inGame&&!sleeping&&!ball&&$('#quick-talk').hidden&&state.focus.status!=='running'&&state.wander&&!state.reducedMotion){
        const min=(!desktop&&world.clientWidth>760&&!panel.hidden)?Math.min(490,b.right):b.left;
        targetX=min+Math.random()*Math.max(0,b.right-min);

      }
    }
    if(!perchAnchor&&!inGame&&now<cursorChaseUntil&&state.pcAwareness&&state.cursorReactions&&state.wander&&!sleeping&&!ball&&!state.reducedMotion&&!isTyping()&&state.focus.status!=='running'&&lastPointer)targetX=clamp(lastPointer.x,b.left,b.right);
    if(ball&&!sleeping&&state.focus.status!=='running')targetX=ball.x;
    if(adventures.active||trickController.active||dailyPose!=='none'||taskPose!=='none'||inputSession.busy()||perchAnchor||currentHabit()!=='none'||currentReaction()!=='none'||inGame||sleeping||!$('#quick-talk').hidden||state.focus.status==='running'||isTyping()||!state.wander&&!ball||state.reducedMotion)targetX=null;
    if(targetX!==null&&grounded){
      const delta=targetX-pet.x;if(Math.abs(delta)<10)targetX=null;
      else{pet.dir=delta<0?-1:1;pet.x=clamp(pet.x+Math.sign(delta)*Math.min(Math.abs(delta),dt*(ball?185:now<cursorChaseUntil||now<greetingUntil?125:85*livingProfile(state).speed)),b.left,b.right);state.energy=clamp(state.energy-dt*.015,0,100);}
    }
    if(!perchAnchor&&!state.reducedMotion&&!inGame)stepBody(pet,dt,{...b,top:Math.min(b.top,b.floor)},.22);
    else if(!perchAnchor&&!inGame){pet.y=b.floor;pet.vx=pet.vy=0;}
  }
  if(ball){
    const toyFloor=ball.automatic?homeGeometry.toys.y:b.floor-3;
    $('#ball').dataset.toy=ball.toy||'ball';
    if(!state.reducedMotion)stepBody(ball,dt,{left:ball.automatic?homeGeometry.x-80:20,right:ball.automatic?homeGeometry.x+115:world.clientWidth-20,top:Math.max(25,toyFloor-190),floor:toyFloor},.65);
    else if(ball.automatic){ball.x=homeGeometry.toys.x-35;ball.y=toyFloor;ball.vx=ball.vy=0;}
    $('#ball').style.transform=`translate3d(${(ball.x-17).toFixed(2)}px,${(ball.y-35).toFixed(2)}px,0)`;
    const catchRadius=state.reducedMotion?90:65;
    if(!inputSession.busy()&&!drag&&!sleeping&&$('#quick-talk').hidden&&state.focus.status!=='running'&&Math.abs(ball.x-pet.x)<(ball.automatic?35:catchRadius)&&ball.y>toyFloor-47&&now>fetchCooldown){
      const automatic=ball.automatic;
      ball=null;$('#ball').hidden=true;targetX=null;fetchCooldown=now+1500;
      if(automatic){homeController.pause(Date.now(),90000);particles('✧',2);}else{state.coins+=3;state.friendship+=2;recordBond(state.bond,'interactions','fetch');state.happiness=clamp(state.happiness+6,0,100);happyUntil=now+1500;say(voice('catch'),false,false,'celebrate');particles('✦',5);changed();}
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
native?.onCursor(point=>{cursorReaction(point);if(!drag&&!homeView.dragging){let hit=false,control=false;for(const el of [$('#attention-tag'),petEl,panel,$('#quick-talk'),$('#launcher'),$('#voice-stop'),$('#voice-dock'),$('#focus-badge'),$('#home-handle')]){if(el.hidden||!el.getClientRects().length||el===petEl&&inGame&&state.gameClickThrough)continue;const r=el.getBoundingClientRect();if(point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom){hit=true;control=el!==petEl;break;}}syncControlsInteraction(control);updateClickThrough(!hit);}});
updateUI();renderReminders();drawPet();requestAnimationFrame(tick);
// Show the native overlay only after modules, save data, controls and art are ready.
native?.rendererReady?.();
if(storageWarning)toast('Could not load saved progress. Starting a fresh visit.');
// Startup and idle return are silent; personality previews remain explicit.
