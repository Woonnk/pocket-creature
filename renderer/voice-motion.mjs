// Voice presentation only. No microphone, dialogue generation, or world movement.
const voiceClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const voiceFinite=(v,f=0)=>Number.isFinite(v)?v:f;
export function wavEnvelope(input){
  // Kokoro emits RIFF PCM. Unsupported WAV encodings still play with a still mouth.
  try{
    const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
    if(bytes.length<44||bytes.length>12*1024*1024)return null;
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const tag=p=>String.fromCharCode(...bytes.subarray(p,p+4));
    if(tag(0)!=='RIFF'||tag(8)!=='WAVE')return null;
    let format=null,data=null;
    for(let p=12;p+8<=bytes.length;){
      const size=view.getUint32(p+4,true),start=p+8;if(start+size>bytes.length)return null;
      if(tag(p)==='fmt '&&size>=16)format={code:view.getUint16(start,true),channels:view.getUint16(start+2,true),rate:view.getUint32(start+4,true),align:view.getUint16(start+12,true),bits:view.getUint16(start+14,true)};
      if(tag(p)==='data'&&!data)data={start,size};p=start+size+(size%2);
    }
    if(!format||!data)return null;
    const {code,channels,rate,align,bits}=format,width=bits/8;
    if(![1,3].includes(code)||channels<1||channels>8||rate<8000||rate>192000||align!==width*channels||!(code===3?bits===32:[8,16,24,32].includes(bits))||data.size%align)return null;
    const frames=data.size/align;if(!frames||frames/rate>60)return null;
    const hop=Math.max(1,Math.round(rate/50)),values=[];
    for(let frame=0;frame<frames;frame+=hop){
      let sum=0,count=0;
      for(let i=frame;i<Math.min(frames,frame+hop);i++)for(let channel=0;channel<channels;channel++){
        const p=data.start+i*align+channel*width;
        let sample=code===3?view.getFloat32(p,true):bits===8?(view.getUint8(p)-128)/128:bits===16?view.getInt16(p,true)/32768:bits===32?view.getInt32(p,true)/2147483648:((view.getUint8(p)|view.getUint8(p+1)<<8|view.getInt8(p+2)<<16)/8388608);
        sample=voiceClamp(voiceFinite(sample),-1,1);sum+=sample*sample;count++;
      }
      values.push(Math.sqrt(sum/count));
    }
    const sorted=[...values].sort((a,b)=>a-b),reference=Math.max(.025,sorted[Math.floor(sorted.length*.9)]);
    return {duration:frames/rate,step:hop/rate,values:values.map(v=>v<.004?0:voiceClamp(Math.sqrt(v/reference)*.8,0,1))};
  }catch{return null;}
}
// SAPI mouth positions: silence and p/b/m close the jaw; vowels open it wider.
export function visemeOpening(value){return [0,.65,.95,.85,.6,.45,.35,.35,.6,.85,.7,.7,.3,.45,.4,.2,.3,.25,.15,.2,.25,0][value]??0;}
export function createVoiceMotion(){
  let id=null,active=false,text='',target=0,mouth=0,expires=0,gestureAt=-Infinity,lastGesture=-Infinity,lastSound=-Infinity,start=0,visemes=false;
  const pose={head:0,arm:0,lean:0,y:0,gazeX:0,gazeY:0};
  function phrase(now){if(now-lastGesture<650)return;gestureAt=lastGesture=now;}
  return {
    receive(event,now=0){
      if(event.state==='pending'){id=event.id;active=false;text=event.text||'';target=mouth=0;expires=0;gestureAt=lastGesture=lastSound=-Infinity;visemes=false;return;}
      if(['ended','error'].includes(event.state)&&event.id!==id)return;
      if(['stopped','ended','error','cancelled'].includes(event.state)){active=false;target=mouth=0;expires=0;gestureAt=-Infinity;id=null;return;}
      if(event.id!==id)return;
      if(event.state==='speaking'){active=true;start=now;return;}
      if(event.state!=='timing'||!active)return;
      if(event.kind==='amplitude'){
        target=voiceClamp(voiceFinite(event.value),0,1);expires=now+120;
        if(target>.12){if(now-lastSound>180)phrase(now);lastSound=now;}
      }else if(event.kind==='viseme'){
        visemes=true;target=visemeOpening(event.value);expires=now+voiceClamp(voiceFinite(event.duration,150),20,1000);
        if(target>.12){if(now-lastSound>180)phrase(now);lastSound=now;}
      }else if(event.kind==='word'){
        const index=voiceClamp(voiceFinite(event.index),0,text.length),count=voiceClamp(voiceFinite(event.length,4),1,80);
        if(index===0||/[.!?;:]\s*$/.test(text.slice(0,index)))phrase(now);
        if(!visemes){target=.45;expires=now+voiceClamp(count*48,80,340);lastSound=now;}
      }
    },
    update(settings={},context={},now=0,dt=1/60){
      const hard=context.gameMode||settings.reducedMotion||context.hidden;
      const blocked=hard||context.locked||context.sleeping||context.typing||context.focus||context.voiceBusy||context.dragging||context.airborne||context.moving||context.carrying;
      const frame={mouth:0,head:0,arm:0,lean:0,y:0,gazeX:0,gazeY:0,speaking:active,source:visemes?'viseme':'timing'};
      if(hard){mouth=0;for(const key of Object.keys(pose))pose[key]=0;return frame;}
      if(now>expires)target=0;
      mouth+=(target-mouth)*(1-Math.exp(-(target>mouth?35:24)*voiceClamp(voiceFinite(dt,1/60),0,.05)));
      frame.mouth=active&&!context.hidden&&!context.sleeping?mouth:0;
      if(blocked||settings.speechGestures===false){for(const key of Object.keys(pose))pose[key]=0;return frame;}
      const scale=({gentle:.55,normal:1,lively:1.25})[settings.motionLevel]||1;
      const elapsed=now-gestureAt,p=voiceClamp(elapsed/750,0,1),pulse=Math.sin(p*Math.PI)**2;
      const personality=settings.personality||'playful';
      if(personality==='cozy'){frame.head=1.2;frame.y=.7;frame.arm=active?-pulse*3:0;frame.head+=pulse*1.5;}
      else if(personality==='curious'){frame.head=-1.5;frame.lean=-.6;frame.gazeY=-.35;frame.head-=pulse*3;frame.arm=-pulse*8;}
      else if(personality==='cheeky'){frame.head=2.8;frame.gazeX=1.2;frame.lean=.4;frame.head-=pulse*4;frame.arm=-pulse*10;}
      else {frame.head=active?Math.sin((now-start)/900)*.6:0;frame.head+=pulse*2.6;frame.arm=-pulse*8;frame.y=-pulse*.8;}
      const ease=1-Math.exp(-16*voiceClamp(voiceFinite(dt,1/60),0,.05));
      for(const key of Object.keys(pose)){pose[key]+=(frame[key]*scale-pose[key])*ease;frame[key]=pose[key];}
      return frame;
    }
  };
}
