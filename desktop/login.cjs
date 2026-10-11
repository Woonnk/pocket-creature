const path=require('node:path');
function createLoginController(app,{platform=process.platform,packaged=app.isPackaged,portable=process.env.PORTABLE_EXECUTABLE_FILE,executable=process.execPath}={}){
  const target=portable||executable;
  const supported=platform==='win32'&&packaged===true&&typeof target==='string'&&path.win32.isAbsolute(target)&&/\.exe$/i.test(target);
  const options={path:target,args:[]};
  function status(){
    if(!supported)return {supported:false,enabled:false,message:'Startup is available in the packaged Windows app.'};
    const settings=app.getLoginItemSettings(options),enabled=Boolean(settings.openAtLogin&&settings.executableWillLaunchAtLogin);
    return {supported:true,enabled,message:settings.openAtLogin&&!enabled?'Windows has disabled this startup item. Enable Pocket Creature in Startup Apps.':enabled?'Starts with Windows. Keep this executable in its current folder.':'Manual startup. Enable this to start your companion when you sign in.'};
  }
  return {status,set(enabled){if(typeof enabled!=='boolean')throw Error('Invalid startup setting');if(!supported)throw Error('Startup is unavailable here.');app.setLoginItemSettings({...options,openAtLogin:enabled,name:'Pocket Creature'});return status();}};
}
module.exports={createLoginController};
