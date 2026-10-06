// Desktop-window recovery only. Exclusive fullscreen is outside this overlay's control.
function createOverlayController({getWindow,getScreen,getSettings,getBaseDisplay,evaluateGame,platform=process.platform,now=Date.now}){
  let signature='',foreground='',lastRaise=-Infinity,status={active:false,displayId:null},manualDisplayId=null;
  return {
    snapshot:()=>({...status}),
    update(signal={},options={}){
      const win=getWindow();if(!win||win.isDestroyed())return status;
      const settings=getSettings(),screen=getScreen(),active=Boolean(evaluateGame(settings,signal));
      if(!active)manualDisplayId=null;
      const displays=screen.getAllDisplays();let display=getBaseDisplay();
      if(options.manualDisplay&&active)manualDisplayId=display.id;
      if(active&&manualDisplayId!==null)display=displays.find(d=>d.id===manualDisplayId)||display;
      else if(active&&settings.gameFollowMonitor&&signal.monitorCenter){
        try{const point=platform==='win32'?screen.screenToDipPoint(signal.monitorCenter):signal.monitorCenter;display=screen.getDisplayNearestPoint(point)||display;}catch{/* Keep the chosen monitor if geometry is unavailable. */}
      }
      const area=active&&signal.fullscreen&&display.bounds?display.bounds:display.workArea;
      const immersive=active||settings.pcAwareness&&signal.fullscreen===true;
      const level=immersive||options.show?'screen-saver':'floating',key=JSON.stringify([display.id,area,level]);
      const changed=key!==signature,context=String(signal.contextId??0),contextChanged=foreground!==context;
      if(changed){win.setBounds(area);signature=key;}
      if(options.show)win.showInactive();
      if(changed||options.force||immersive&&(contextChanged||now()-lastRaise>=5000)){
        win.setAlwaysOnTop(true,level);
        if(win.isVisible()){win.moveTop();lastRaise=now();}
      }
      foreground=context;status={active,fullscreen:signal.fullscreen===true,displayId:display.id,following:active&&settings.gameFollowMonitor&&manualDisplayId===null,level};
      return {...status};
    }
  };
}
module.exports={createOverlayController};
