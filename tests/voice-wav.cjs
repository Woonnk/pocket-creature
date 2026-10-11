// One second, with silence at each end and a real silent gap between phrases.
module.exports=function voiceWav(){
 const rate=16000,bytes=Buffer.alloc(44+rate*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(rate*2,40);
 for(let i=0;i<rate;i++){const t=i/rate,sounding=t>=.1&&t<.35||t>=.6&&t<.85;bytes.writeInt16LE(sounding?Math.round(Math.sin(i/7)*9000):0,44+i*2);}return bytes;
};
