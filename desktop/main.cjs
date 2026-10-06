const {app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, screen, Notification, protocol, net, session, powerMonitor,dialog,desktopCapturer} = require('electron');
const {createActivityAdapter}=require('./activity.cjs');
const {createFileService,basenameFromTitle}=require('./files.cjs');
const {chatWithLocalModel,checkLocalAI}=require('./chat.cjs');
const {captureSelectedScreen,normalizedExclusions,createScreenChangeTracker}=require('./screen.cjs');
const {createHash}=require('node:crypto');
const screenChanges=createScreenChangeTracker();
let lastObservedSignature='';
function resetObservations(){screenChanges.reset();lastObservedSignature='';}
const {createOverlayController}=require('./overlay.cjs');
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const rendererRoot=path.join(__dirname,'..','renderer');
const HOME='pocket://companion/index.html';
protocol.registerSchemesAsPrivileged([{scheme:'pocket',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let win,tray,normalize,gameActive,windowInOverlay,savedState,clock,cursorTimer,activityTimer,activity,fileService,fileTimer,activeFile=null,lastFileKey='',dismissedTitle='',fileBusy=false,fileSelection=0,lastFileError='',quitting=false,quitRequested=false,displayIndex=0;
let aiConnection={ready:false,model:'',vision:false,models:[]},aiChecked=0,aiChecking=null,pendingAutomatic=null,lastAutoRequest=0;
let foregroundId,selectedFileId='',selectedFileAt=0,recentComments=[],overlayController,controlsOpen=false;
const single=app.requestSingleInstanceLock();
if(!single)app.quit();
else{
  app.on('second-instance',()=>showControls());
  app.whenReady().then(async()=>{
    ({normalize,gameActive}=await import('../renderer/core.mjs'));
    ({windowInOverlay}=await import('../renderer/perching.mjs'));
    try{savedState=normalize(JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'companion.json'),'utf8')));}catch{savedState=normalize();}
    const {inspectText}=await import('../renderer/companion.mjs');
    let roots=[];try{const parsed=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'connected-folders.json'),'utf8'));if(Array.isArray(parsed))roots=parsed.filter(x=>typeof x==='string'&&path.isAbsolute(x)).slice(0,8);}catch{}
    fileService=createFileService({roots,inspect:inspectText});
    protocol.handle('pocket',request=>{
      const url=new URL(request.url);
      const publicFiles=new Set(['index.html','style.css','app.mjs','core.mjs','companion.mjs','autonomy.mjs','personality.mjs','reactions.mjs','conversation.mjs','habits.mjs','perching.mjs','personal-memory.mjs','icon.png']);
      const name=url.pathname.slice(1);
      if(url.hostname!=='companion'||!publicFiles.has(name))return new Response('Not found',{status:404});
      return net.fetch(pathToFileURL(path.join(rendererRoot,name)).href);
    });
    session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    createWindow();
    overlayController=createOverlayController({getWindow:()=>win,getScreen:()=>screen,getSettings:()=>savedState,getBaseDisplay:()=>screen.getAllDisplays()[displayIndex]||screen.getPrimaryDisplay(),evaluateGame:gameActive});
    refreshOverlay(true);
    createTray();
    activity=createActivityAdapter(()=>{});
    activity.configure(savedState);
    activityTimer=setInterval(()=>{
      if(!win||win.isDestroyed())return;
      const signal=activity.snapshot();
      if(!savedState.screenAwareness||!savedState.pcAwareness||savedState.quiet||!win.isVisible()||powerMonitor.getSystemIdleTime()>savedState.idleAfter&&!gameActive(savedState,signal))screenChanges.reset();
      if(!win.isVisible()||powerMonitor.getSystemIdleTime()>savedState.idleAfter&&!gameActive(savedState,signal))pendingAutomatic?.abort();
      if(foregroundId!==signal.contextId){foregroundId=signal.contextId;pendingAutomatic?.abort();screenChanges.reset();}
      refreshOverlay();
      const perchWindow=savedState.pcAwareness&&savedState.windowPerching?windowInOverlay(signal.windowSurface,win.getBounds(),rect=>process.platform==='win32'?screen.screenToDipRect(null,rect):rect):null;
      win.webContents.send('activity',{...signal,windowSurface:undefined,perchWindow,idleSeconds:powerMonitor.getSystemIdleTime()});
    },500);
    fileTimer=setInterval(pollEditorFile,2500);
    globalShortcut.register('CommandOrControl+Shift+P',()=>win.isVisible()?win.hide():recoverOverlay());
    globalShortcut.register('CommandOrControl+Shift+G',recoverOverlay);
    clock=setInterval(()=>{if(win&&!win.isDestroyed())win.webContents.send('clock');},1000);
    cursorTimer=setInterval(()=>{
      if(!win||win.isDestroyed()||!win.isVisible())return;
      const p=screen.getCursorScreenPoint(),b=win.getBounds();
      win.webContents.send('cursor',{x:p.x-b.x,y:p.y-b.y});
    },33);
    screen.on('display-metrics-changed',()=>fitDisplay());
    screen.on('display-removed',()=>{displayIndex=0;fitDisplay();});
  }).catch(error=>{console.error(error);app.quit();});
}
function createWindow(){
  const area=screen.getPrimaryDisplay().workArea;
  win=new BrowserWindow({...area,show:false,frame:false,transparent:true,resizable:false,hasShadow:false,alwaysOnTop:true,skipTaskbar:true,backgroundColor:'#00000000',title:'Pocket Creature',webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,webSecurity:true}});
  win.setIgnoreMouseEvents(true,{forward:true});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.on('will-attach-webview',e=>e.preventDefault());
  win.once('ready-to-show',()=>win.showInactive());
  win.on('close',e=>{if(!quitting){e.preventDefault();requestQuit();}});
  win.loadURL(HOME);
}
function fitDisplay(){
  if(!win||win.isDestroyed())return;
  const displays=screen.getAllDisplays();displayIndex=Math.min(displayIndex,displays.length-1);
  refreshOverlay(true);
}
function refreshOverlay(force=false,options={}){return overlayController?.update(activity?.snapshot()||{}, {force,...options});}
function recoverOverlay(){if(!win||win.isDestroyed())return;refreshOverlay(true,{show:true});}
function showControls(){
  if(!win||win.isDestroyed())return;
  controlsOpen=true;win.setIgnoreMouseEvents(false);win.show();win.webContents.send('open-controls');
}
function createTray(){
  const icon=nativeImage.createFromPath(path.join(rendererRoot,'icon.png'));
  tray=new Tray(icon.resize({width:24,height:24}));tray.setToolTip('Pocket Creature — your little desktop dragon');
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Open companion controls',click:showControls},
    {label:'Show / hide dragon',click:()=>win.isVisible()?win.hide():recoverOverlay()},
    {label:'Bring dragon over game (Ctrl + Shift + G)',click:recoverOverlay},
    {label:'Move to next monitor',click:()=>{const displays=screen.getAllDisplays();const current=displays.findIndex(d=>d.id===overlayController.snapshot().displayId);displayIndex=(current+1)%displays.length;refreshOverlay(true,{manualDisplay:true,show:true});}},
    {type:'separator'},
    {label:'Quit Pocket Creature',click:requestQuit}
  ]));
  tray.on('click',showControls);
}
function trusted(event){return win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame&&event.senderFrame.url===HOME;}
function persist(state){
  const previous=savedState;
  savedState=normalize(state);
  if(previous&&(previous.personality!==savedState.personality||previous.gameMode!==savedState.gameMode||previous.personalMemoryEnabled!==savedState.personalMemoryEnabled||JSON.stringify(previous.personalMemory)!==JSON.stringify(savedState.personalMemory)))pendingAutomatic?.abort();
  if(previous&&(previous.screenAwareness&&!savedState.screenAwareness||previous.localModel!==savedState.localModel))pendingAutomatic?.abort();
  if(previous&&(previous.screenAwareness!==savedState.screenAwareness||previous.localModel!==savedState.localModel||previous.pcAwareness!==savedState.pcAwareness||previous.chatMode!==savedState.chatMode))resetObservations();
  activity?.configure(savedState);
  refreshOverlay();
  if(savedState.quiet||!savedState.pcAwareness||!savedState.autoConversations||savedState.chatMode!=='local'){pendingAutomatic?.abort();resetObservations();}
  const target=path.join(app.getPath('userData'),'companion.json');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target+'.tmp',JSON.stringify(savedState),'utf8');fs.renameSync(target+'.tmp',target);
}
ipcMain.handle('load-state',event=>{if(!trusted(event))throw Error('Invalid sender');return savedState;});
ipcMain.handle('save-state',(event,value)=>{if(!trusted(event))throw Error('Invalid sender');if(JSON.stringify(value).length>120000)throw Error('Save too large');persist(value);return true;});
function selectFile(file){pendingAutomatic?.abort();activeFile=file;selectedFileId=String(activity?.snapshot().contextId??0);selectedFileAt=Date.now();}
function sendFile(file){selectFile(file);win.webContents.send('file-context',file);}
async function pollEditorFile(){
  if(fileBusy||!savedState.pcAwareness||!fileService||!win||win.isDestroyed())return;
  const title=activity?.editorTitle();if(!title||title===dismissedTitle)return;
  const name=basenameFromTitle(title);if(!name)return;
  fileBusy=true;const selection=fileSelection;
  try{
    const resolved=await fileService.resolveTitle(title);
    if(selection!==fileSelection||!savedState.pcAwareness||title!==activity?.editorTitle())return;
    const file=resolved&&!resolved.ambiguous?resolved:{name,path:'observed:'+name,project:'Opened in your editor',unread:true,summary:resolved?.ambiguous?'Several connected files share this name; content was not read.':'Filename noticed automatically. Connect its folder once to allow content inspection.'};
    const key=file.path+'\0'+(file.excerpt||'');if(key!==lastFileKey){lastFileKey=key;sendFile(file);}
  }catch(error){if(selection===fileSelection&&name!==activeFile?.name)sendFile({name,path:'observed:'+name,project:'Opened in your editor',unread:true,summary:error.message.slice(0,180)});}
  finally{fileBusy=false;}
}
async function refreshAI(force=false){
  if(aiChecking)return aiChecking;
  if(!force&&Date.now()-aiChecked<15000&&(!savedState.localModel||aiConnection.model===savedState.localModel))return aiConnection;
  aiChecking=(async()=>{aiConnection=await checkLocalAI(savedState.localModel);aiChecked=Date.now();return aiConnection;})();
  try{return await aiChecking;}finally{aiChecking=null;}
}
ipcMain.handle('ai-status',async event=>{if(!trusted(event))throw Error('Invalid sender');return refreshAI(true);});
async function captureScreen(withSample=false){
  const display=screen.getAllDisplays().find(d=>d.id===overlayController?.snapshot().displayId)||screen.getAllDisplays()[displayIndex]||screen.getPrimaryDisplay();
  const frame=await captureSelectedScreen({displayId:display.id,withSample,createImage:bytes=>nativeImage.createFromBuffer(bytes,{scaleFactor:1}),getSources:options=>desktopCapturer.getSources(options)});
  return withSample?{...frame,display}:frame;
}
async function saveRoots(){const roots=await fileService.roots();const target=path.join(app.getPath('userData'),'connected-folders.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(roots));return roots;}
ipcMain.handle('file-roots',event=>{if(!trusted(event))throw Error('Invalid sender');return fileService.roots();});
ipcMain.handle('choose-folder',async event=>{if(!trusted(event))throw Error('Invalid sender');const result=await dialog.showOpenDialog(win,{title:'Choose a project folder Ember can read',properties:['openDirectory']});if(result.canceled)return fileService.roots();await fileService.addRoot(result.filePaths[0]);lastFileKey='';dismissedTitle='';return saveRoots();});
ipcMain.handle('remove-folder',async(event,root)=>{if(!trusted(event)||typeof root!=='string')throw Error('Invalid sender');fileSelection++;fileService.removeRoot(root);lastFileKey='';if(activeFile?.projectId===root){activeFile=null;win.webContents.send('file-context',null);}return saveRoots();});
ipcMain.handle('choose-file',async event=>{if(!trusted(event))throw Error('Invalid sender');fileSelection++;const result=await dialog.showOpenDialog(win,{title:'Show Ember a text or code file',properties:['openFile']});if(result.canceled)return null;const file=await fileService.inspectFile(result.filePaths[0],{explicit:true});selectFile(file);dismissedTitle=activity?.editorTitle()||'';return file;});
ipcMain.handle('clear-file',event=>{if(!trusted(event))throw Error('Invalid sender');fileSelection++;selectFile(null);lastFileKey='';dismissedTitle=activity?.editorTitle()||'';return true;});
ipcMain.handle('chat',async(event,payload)=>{
  if(!trusted(event)||!payload||typeof payload.message!=='string'||payload.message.length>1200)throw Error('Invalid message');
  if(savedState.chatMode!=='local')throw Error('Enable local AI in Settings first.');
  const automatic=payload.automatic===true;
  if(automatic&&(!savedState.autoConversations||savedState.quiet||!savedState.pcAwareness||!win.isVisible()||powerMonitor.getSystemIdleTime()>savedState.idleAfter&&!gameActive(savedState,activity?.snapshot()||{})||Date.now()-lastAutoRequest<(gameActive(savedState,activity?.snapshot()||{})?60000:8000)))return '';
  const connection=await refreshAI();if(!connection.ready)throw Error(connection.message);
  if(automatic&&pendingAutomatic)return '';
  pendingAutomatic?.abort();const controller=new AbortController();if(automatic){pendingAutomatic=controller;lastAutoRequest=Date.now();}
  const snapshot=activity?.snapshot()||{},contextKey=String(snapshot.contextId??0);
  if(automatic&&payload.contextId!==undefined&&String(payload.contextId)!==contextKey){if(pendingAutomatic===controller)pendingAutomatic=null;return '';}
  const editorName=basenameFromTitle(activity?.editorTitle()||'');
  const currentFile=activeFile&&(editorName?.toLowerCase()===activeFile.name.toLowerCase()||selectedFileId===contextKey&&Date.now()-selectedFileAt<15000);
  // Selected files remain available for explicit questions; automatic comments follow the foreground.
  const asksAboutFile=/\b(file|code|function|project|script|import|class)\b/i.test(payload.message)||Boolean(activeFile&&payload.message.toLowerCase().includes(activeFile.name.toLowerCase()));
  const file=currentFile||!automatic&&asksAboutFile?activeFile:null,memory=savedState.projectMemories.find(m=>m.id===file?.projectId);
  const history=automatic?[]:savedState.chatHistory;
  try{
    let image,previousImage,comparison,observationKind;
    const signature=contextKey+'\0'+(file?file.path+'\0'+createHash('sha256').update(String(file.excerpt||file.summary||'')).digest('hex'):'');
    const newContext=signature!==lastObservedSignature;
    if(savedState.screenAwareness&&connection.vision&&savedState.pcAwareness){
      if(automatic){const frame=await captureScreen(true);image=frame.image;comparison=screenChanges.inspect(frame,contextKey+':'+frame.display.id,normalizedExclusions(payload.screenExclusions,win.getBounds(),frame.display.bounds||frame.display.workArea));if(comparison.changed&&comparison.kind==='screen-change'){previousImage=comparison.previousImage;observationKind='screen-change';}else if(newContext)observationKind='new-context';}
      else image=await captureScreen();if(controller.signal.aborted)throw Error('Request cancelled.');if(!savedState.screenAwareness||!savedState.pcAwareness)image=undefined;}
    if(automatic&&contextKey!==String(activity?.snapshot().contextId??0))return '';
    if(automatic&&!newContext&&(!comparison||!comparison.changed)){return {reply:'SILENCE',contextKey,observation:'unchanged'};}
    const result=await chatWithLocalModel({model:connection.model,message:payload.message,file,memory,history,recentComments,conversationStarter:!automatic&&payload.conversationStarter?.contextId===contextKey&&typeof payload.conversationStarter.text==='string'?payload.conversationStarter.text.slice(0,170):'',personalMemory:!automatic&&savedState.personalMemoryEnabled?savedState.personalMemory:null,name:savedState.name,personality:savedState.personality,gameMode:gameActive(savedState,snapshot),activity:snapshot,image,previousImage,observationKind,automatic,withReaction:automatic&&savedState.physicalReactions,think:connection.think,signal:controller.signal});
    const answer=typeof result==='string'?result:result?.reply||'SILENCE',reaction=['curious','surprised','celebrate'].includes(result?.reaction)?result.reaction:'none';
    if(automatic&&(controller.signal.aborted||!win.isVisible()||savedState.quiet||!savedState.pcAwareness||!savedState.autoConversations||contextKey!==String(activity?.snapshot().contextId??0)))return '';
    if(automatic){lastObservedSignature=signature;if(comparison&&savedState.screenAwareness&&savedState.pcAwareness)screenChanges.commit(comparison);}
    if(automatic&&answer!=='SILENCE')recentComments=[...recentComments,answer].slice(-4);
    return automatic?{reply:answer,reaction,contextKey,observation:observationKind||'new-context'}:answer;
  }finally{if(pendingAutomatic===controller)pendingAutomatic=null;}
});
ipcMain.on('click-through',(event,ignore)=>{if(trusted(event)&&typeof ignore==='boolean')win.setIgnoreMouseEvents(!controlsOpen&&gameActive(savedState,activity?.snapshot()||{})&&savedState.gameClickThrough?true:ignore,{forward:true});});
ipcMain.on('controls-open',(event,value)=>{if(trusted(event)&&typeof value==='boolean')controlsOpen=value;});
ipcMain.handle('recover-overlay',event=>{if(!trusted(event))throw Error('Invalid sender');recoverOverlay();return overlayController.snapshot();});
ipcMain.on('hide',event=>{if(trusted(event))win.hide();});
ipcMain.on('quit',event=>{if(trusted(event))requestQuit();});
ipcMain.on('ready-to-quit',event=>{if(trusted(event)&&quitRequested){quitting=true;app.quit();}});
let lastNotice=0;
ipcMain.on('notify',(event,title,body)=>{
  if(!trusted(event)||typeof title!=='string'||typeof body!=='string'||Date.now()-lastNotice<1500)return;
  lastNotice=Date.now();
  if(Notification.isSupported())new Notification({title:title.slice(0,80),body:body.slice(0,160),icon:path.join(rendererRoot,'icon.png')}).show();
});
function requestQuit(){
  if(quitRequested)return;quitRequested=true;
  if(!win||win.isDestroyed()){quitting=true;app.quit();return;}
  win.webContents.send('before-quit');
  setTimeout(()=>{quitting=true;app.quit();},2000).unref();
}
app.on('before-quit',event=>{if(!quitting&&win&&!win.isDestroyed()){event.preventDefault();requestQuit();}});
app.on('will-quit',()=>{globalShortcut.unregisterAll();clearInterval(clock);clearInterval(cursorTimer);clearInterval(activityTimer);clearInterval(fileTimer);activity?.stop();pendingAutomatic?.abort();resetObservations();});
app.on('window-all-closed',()=>{if(quitting)app.quit();});
