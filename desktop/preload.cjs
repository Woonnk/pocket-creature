const {contextBridge,ipcRenderer}=require('electron');
const subscribe=(channel,fn)=>{const handler=(_event,value)=>fn(value);ipcRenderer.on(channel,handler);return()=>ipcRenderer.removeListener(channel,handler);};
contextBridge.exposeInMainWorld('companion',Object.freeze({
  loadState:()=>ipcRenderer.invoke('load-state'),
  saveState:state=>ipcRenderer.invoke('save-state',state),
  setClickThrough:ignore=>ipcRenderer.send('click-through',ignore),
  setControlsOpen:value=>ipcRenderer.send('controls-open',value),
  recoverOverlay:()=>ipcRenderer.invoke('recover-overlay'),
  hide:()=>ipcRenderer.send('hide'),
  quit:()=>ipcRenderer.send('quit'),
  readyToQuit:()=>ipcRenderer.send('ready-to-quit'),
  notify:(title,body)=>ipcRenderer.send('notify',title,body),
  onOpenControls:fn=>subscribe('open-controls',fn),
  onBeforeQuit:fn=>subscribe('before-quit',fn),
  onClock:fn=>subscribe('clock',fn),
  onCursor:fn=>subscribe('cursor',fn),
  onActivity:fn=>subscribe('activity',fn),
  onFileContext:fn=>subscribe('file-context',fn),
  onFileStatus:fn=>subscribe('file-status',fn),
  getRoots:()=>ipcRenderer.invoke('file-roots'),
  chooseFolder:()=>ipcRenderer.invoke('choose-folder'),
  removeFolder:root=>ipcRenderer.invoke('remove-folder',root),
  chooseFile:()=>ipcRenderer.invoke('choose-file'),
  clearFile:()=>ipcRenderer.invoke('clear-file'),
  aiStatus:()=>ipcRenderer.invoke('ai-status'),
  chat:payload=>ipcRenderer.invoke('chat',payload)
}));
