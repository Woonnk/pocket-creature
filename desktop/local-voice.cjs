// Fixed loopback service only. No configurable host, credentials, redirects, or stored audio.
async function boundedVoiceBytes(response,limit){
  if(!response.ok)throw Error('Local voice service returned an error.');
  if(Number(response.headers.get('content-length'))>limit)throw Error('Voice response is too large.');
  const reader=response.body?.getReader();if(!reader)throw Error('Empty voice response.');
  const chunks=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('Voice response is too large.');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks,size);
}
function createLocalVoiceAdapter({fetchImpl=fetch,timeout=45000}={}){
  let job=null,closed=false;
  function stop(){const old=job;job=null;old?.controller.abort();}
  async function status(){
    if(closed)return {ready:false,voices:[],message:'Local voice is stopped.'};
    try{const response=await fetchImpl('http://127.0.0.1:8880/v1/audio/voices',{redirect:'error',signal:AbortSignal.timeout(7000)});const data=JSON.parse((await boundedVoiceBytes(response,128000)).toString('utf8'));
      const voices=(Array.isArray(data.voices)?data.voices:[]).map(v=>typeof v==='string'?v:v?.id).filter(v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v)).slice(0,200).map(name=>({name,lang:'Kokoro'}));
      return {ready:voices.length>0,voices,message:voices.length?'Natural local voices ready.':'Kokoro is connected but has no usable voices.'};
    }catch{return {ready:false,voices:[],message:'Kokoro is offline. Start the local voice service, then Refresh voices.'};}
  }
  async function synthesize(payload){
    stop();if(closed||!Number.isSafeInteger(payload?.id)||typeof payload.text!=='string'||!payload.text.trim()||payload.text.length>280)throw Error('Invalid voice request.');
    const controller=new AbortController(),entry={controller,id:payload.id};job=entry;const timer=setTimeout(()=>controller.abort(),timeout);timer.unref?.();
    try{const voice=/^[a-zA-Z0-9_-]{1,80}$/.test(payload.voice)?payload.voice:'af_heart';
      const response=await fetchImpl('http://127.0.0.1:8880/v1/audio/speech',{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'kokoro',input:payload.text,voice,speed:Math.max(.7,Math.min(1.4,Number(payload.rate)||1)),response_format:'wav',allow_voice_tags:false})});
      const bytes=await boundedVoiceBytes(response,8*1024*1024);if(job!==entry||controller.signal.aborted)return null;
      if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Local voice returned invalid audio.');
      return {id:entry.id,audio:new Uint8Array(bytes)};
    }catch(error){if(job!==entry)return null;throw error;}finally{clearTimeout(timer);if(job===entry)job=null;}
  }
  return {status,synthesize,stop,close(){closed=true;stop();}};
}
module.exports={createLocalVoiceAdapter,boundedVoiceBytes};
