const TASK_POSES={coding:'inspect',browsing:'peek',music:'sway',gaming:'watch'};
export function createTaskReactions(){
  let candidate='',since=0,pending=false,last=-Infinity,active=null,typed=0,lastTyped=0;
  return {
    observe(signal,now=Date.now()){
      const key=String(signal.contextId??0)+':'+signal.category;
      if(key!==candidate){candidate=key;since=now;pending=true;active=null;typed=0;lastTyped=0;}
      if(signal.typingCount>0){if(now-lastTyped>5000)typed=0;typed=Math.min(500,typed+signal.typingCount);lastTyped=now;}
    },
    current(settings,c,now=Date.now()){
      if(!settings.pcAwareness||!settings.physicalReactions||!settings.contextReactions||c.sleeping||c.dragging||c.playing||c.focus||c.userBusy||c.away||c.hidden||c.homeBusy||c.reacting){active=null;pending=false;typed=0;return 'none';}
      if(c.typing){active=null;return 'none';}
      if(active&&now>=active.until)active=null;
      if(active)return active.pose;
      if(now-last<(c.gameMode?60000:45000))return 'none';
      if(!c.gameMode&&settings.typingReaction&&typed>=24&&now-lastTyped>=2000&&now-lastTyped<15000){active={pose:'paw-break',until:now+4500};last=now;typed=0;pending=false;return active.pose;}
      if(pending&&now-since>=3000){pending=false;const pose=c.gameMode?'watch':TASK_POSES[c.category];if(pose){active={pose,until:now+6000};last=now;return pose;}}
      return 'none';
    },
    clear(){active=null;pending=false;typed=0;}
  };
}
