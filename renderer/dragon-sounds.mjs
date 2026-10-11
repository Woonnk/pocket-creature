export function dragonSoundAllowed(s,c={}){
  return s.dragonSounds===true&&s.dragonSoundVolume>0&&!s.quiet&&!c.hidden&&!c.gameMode&&!c.listening&&!c.speaking&&!c.focused;
}
// Short synthesized creature sounds: no extra service, downloaded files, or mic.
export function createDragonSounds({getSettings,getContext,host=globalThis,now=Date.now}){
  let context=null,nodes=[],last=-Infinity,generation=0;
  function stop(){generation++;for(const node of nodes)try{node.stop();}catch{}nodes=[];}
  return {
    stop,
    async play(kind='chirp'){
      const s=getSettings();if(!dragonSoundAllowed(s,getContext())||now()-last<1800)return false;
      const AudioContext=host.AudioContext||host.webkitAudioContext;if(!AudioContext)return false;
      const token=generation;try{
        context??=new AudioContext();if(context.state==='suspended')await context.resume();
        if(token!==generation||!dragonSoundAllowed(getSettings(),getContext()))return false;
        stop();last=now();const at=context.currentTime,volume=getSettings().dragonSoundVolume*.09;
        const notes=kind==='yawn'?[[0,.55,240,95]]:kind==='happy'?[[0,.14,460,680],[.17,.16,560,850]]:[[0,.24,390,580]];
        for(const [delay,duration,from,to] of notes){
          const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(from,at+delay);oscillator.frequency.exponentialRampToValueAtTime(to,at+delay+duration);
          gain.gain.setValueAtTime(0,at+delay);gain.gain.linearRampToValueAtTime(volume,at+delay+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+delay+duration);
          oscillator.connect(gain);gain.connect(context.destination);nodes.push(oscillator);
          oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();nodes=nodes.filter(n=>n!==oscillator);};
          oscillator.start(at+delay);oscillator.stop(at+delay+duration+.02);
        }
        return true;
      }catch{return false;}
    }
  };
}
