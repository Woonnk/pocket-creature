function createStartupGuard({getWindow,onReady=()=>{},onFailure=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,timeoutMs=15000}){
 let state='loading',timer;
 const release=()=>{const win=getWindow();if(win&&!win.isDestroyed()){win.setIgnoreMouseEvents(true,{forward:true});win.hide();}};
 return {
  start(){if(state!=='loading'||timer)return;const win=getWindow();if(win&&!win.isDestroyed())win.setIgnoreMouseEvents(true,{forward:true});timer=setTimer(()=>this.fail('The companion did not finish loading.'),timeoutMs);timer?.unref?.();},
  ready(){if(state!=='loading')return false;state='ready';clearTimer(timer);timer=null;onReady();return true;},
  fail(message){if(state==='failed')return;state='failed';clearTimer(timer);timer=null;release();onFailure(message);},
  canInteract(){return state==='ready';},
  dispose(){clearTimer(timer);timer=null;},
  get state(){return state;}
 };
}
module.exports={createStartupGuard};
