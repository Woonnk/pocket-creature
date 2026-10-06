const {spawn}=require('node:child_process');
const path=require('node:path');
// Recognized process names become a coarse category. Raw names never leave this adapter.
function classifyProcess(value){
  const name=typeof value==='string'?value.toLowerCase().replace(/\.exe$/,''):'';
  if(['code','code - insiders','cursor','devenv','pycharm64','idea64','rider64','notepad++','windowsterminal','powershell','pwsh'].includes(name))return 'coding';
  if(['spotify','itunes','musicbee','foobar2000','vlc'].includes(name))return 'music';
  if(['steam','robloxplayerbeta','minecraft.windows','overwatch','valorant-win64-shipping','fortniteclient-win64-shipping','cs2','rocketleague','marvelrivals','eldenring','bg3','bg3_dx11','deadbydaylight-win64-shipping'].includes(name))return 'gaming';
  if(['chrome','msedge','firefox','brave','opera'].includes(name))return 'browsing';
  return 'none';
}
function createActivityAdapter(onChange,{platform=process.platform,spawnProcess=spawn}={}){
  let child=null,buffer='',generation=0,restartTimer=null,retries=0,enabled=false,typingEnabled=false;
  let current={category:'none',typingCount:0,appAvailable:false,typingAvailable:false,contextId:0,windowTitle:'',fullscreen:false,monitorCenter:null,windowSurface:null},editorTitle='',lastSeen=0,foregroundKey='',contextId=0;
  const emit=()=>onChange({...current});
  function stop(){generation++;clearTimeout(restartTimer);restartTimer=null;if(child){child.kill();child=null;}buffer='';foregroundKey='';current={category:'none',typingCount:0,appAvailable:false,typingAvailable:false,contextId:++contextId,windowTitle:'',fullscreen:false,monitorCenter:null,windowSurface:null};emit();}
  function launch(){
    if(!enabled||platform!=='win32')return;
    const token=++generation;
    const script=path.join(__dirname,'activity.ps1').replace(`app.asar${path.sep}`,`app.asar.unpacked${path.sep}`);
    const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    try{
      child=spawnProcess(powershell,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-ParentPid',String(process.pid),'-EnableTyping',typingEnabled?'1':'0'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    }catch{fail(token);return;}
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{
      if(token!==generation)return;
      buffer+=chunk;if(buffer.length>16384){buffer='';return;}
      const lines=buffer.split(/\r?\n/);buffer=lines.pop();
      for(const line of lines){try{const data=JSON.parse(line);if(typeof data.process!=='string'||!Number.isFinite(data.typing))continue;
        const center=data.monitorCenter,monitorCenter=center&&Number.isFinite(center.x)&&Number.isFinite(center.y)&&Math.abs(center.x)<=100000&&Math.abs(center.y)<=100000?{x:Math.round(center.x),y:Math.round(center.y)}:null;
        const surface=data.windowSurface,rect=surface?.bounds;
        const windowSurface=surface&&typeof surface.id==='string'&&/^-?\d{1,20}$/.test(surface.id)&&rect&&['x','y','width','height'].every(key=>Number.isFinite(rect[key]))&&Math.abs(rect.x)<=100000&&Math.abs(rect.y)<=100000&&rect.width>=240&&rect.width<=20000&&rect.height>=100&&rect.height<=20000?{id:surface.id,bounds:Object.fromEntries(['x','y','width','height'].map(key=>[key,Math.round(rect[key])])),maximized:surface.maximized===true,fullscreen:surface.fullscreen===true}:null;
        const title=typeof data.title==='string'?data.title.replace(/[\x00-\x1f]/g,'').slice(0,512):'';
        if(data.self!==true){
          const key=data.process+'\0'+title+'\0'+(data.fullscreen===true)+'\0'+JSON.stringify(monitorCenter)+'\0'+(typeof data.windowId==='string'?data.windowId.slice(0,20):'');if(key!==foregroundKey){foregroundKey=key;contextId++;}
          editorTitle=/^(code|code - insiders|cursor|notepad|notepad\+\+)$/i.test(data.process)?title:'';
        }
        current={category:data.self===true?current.category:classifyProcess(data.process),typingCount:typingEnabled?Math.max(0,Math.min(500,Math.floor(data.typing))):0,appAvailable:true,typingAvailable:typingEnabled&&data.hook===true,contextId,windowTitle:data.self===true?current.windowTitle:title.slice(0,180),fullscreen:data.self===true?current.fullscreen:data.fullscreen===true,monitorCenter:data.self===true?current.monitorCenter:monitorCenter,windowSurface};lastSeen=Date.now();retries=0;emit();
      }catch{/* Ignore diagnostics; only the fixed JSON schema is accepted. */}}
    });
    child.stderr.on('data',()=>{});
    child.on('error',()=>fail(token));child.on('exit',()=>fail(token));
  }
  function fail(token){if(token!==generation)return;generation++;child=null;buffer='';editorTitle='';current={category:'none',typingCount:0,appAvailable:false,typingAvailable:false,contextId:++contextId,windowTitle:'',fullscreen:false,monitorCenter:null,windowSurface:null};emit();if(enabled&&retries++<2)restartTimer=setTimeout(launch,3000);}
  return {configure(options){const next=options.pcAwareness===true,nextTyping=options.typingReaction===true;if(next===enabled&&nextTyping===typingEnabled)return;stop();editorTitle='';lastSeen=0;enabled=next;typingEnabled=nextTyping;retries=0;launch();},stop(){enabled=false;stop();editorTitle='';},editorTitle:()=>lastSeen&&Date.now()-lastSeen<5000?editorTitle:'',snapshot:()=>lastSeen&&Date.now()-lastSeen>5000?{category:'none',typingCount:0,appAvailable:false,typingAvailable:false,contextId:-contextId,windowTitle:'',fullscreen:false,monitorCenter:null,windowSurface:null}:{...current}};
}
module.exports={classifyProcess,createActivityAdapter};
