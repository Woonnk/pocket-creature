// Only explicit, whole-message requests can change the creature. Ordinary
// conversation, quoted examples and model replies never execute actions.
function spokenMinutes(text){
  if(/^\d+$/.test(text))return Number(text);
  const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  function belowHundred(words){if(words.length===1&&small.includes(words[0]))return small.indexOf(words[0]);if(words.length===1&&tens[words[0]])return tens[words[0]];if(words.length===2&&tens[words[0]]&&small.indexOf(words[1])>0&&small.indexOf(words[1])<10)return tens[words[0]]+small.indexOf(words[1]);return NaN;}
  let words=text.split(' '),base=0;
  if(words[0]==='one'&&words[1]==='hundred'){base=100;words=words.slice(2);if(words[0]==='and')words=words.slice(1);if(!words.length)return base;}
  return base+belowHundred(words);
}
export function parseVoiceCommand(message,name=''){
  let text=String(message||'').trim().toLowerCase().replace(/[.!?]+$/,'').replace(/([a-z0-9])-(?=[a-z])/g,'$1 ').replace(/\s+/g,' ');
  const prefix=String(name).trim().toLowerCase();
  for(const greeting of prefix?[`hey ${prefix}, `,`hey ${prefix} `,`${prefix}, `]:[]){if(text.startsWith(greeting)){text=text.slice(greeting.length);break;}}
  text=text.replace(/^(?:please |(?:can|could|would) you (?:please )?)/,'').replace(/(?:,? please)$/,'');
  const phrases={
    home:['go home','go to bed'],visitToys:['check your toys','visit your toy basket'],sleep:['take a nap','go to sleep','sleep'],wake:['wake up'],feed:['give him a snack','give her a snack','have a snack','eat a snack','feed him','feed her','feed yourself'],
    pet:['give him a pet','give her a pet'],fetch:['play fetch','lets play fetch',"let's play fetch"],
    repeat:['repeat that','repeat your last reply','say that again'],quiet:['be quiet','quiet mode','turn on quiet mode'],
    stopSpeech:['stop talking','stop speaking'],pauseFocus:['pause focus','pause the focus session','pause my focus session'],resumeFocus:['resume focus','resume the focus session','resume my focus session'],endFocus:['end focus','end the focus session','cancel the focus session']
  };
  for(const [action,list] of Object.entries(phrases))if(list.includes(text))return {action};
  if(['start focus','start a focus session','start focusing'].includes(text))return {action:'startFocus',minutes:null};
  const match=text.match(/^start (?:a |an )?(.+?) minute focus(?: session)?$/);
  if(match){const minutes=spokenMinutes(match[1]);return Number.isInteger(minutes)&&minutes>=1&&minutes<=180?{action:'startFocus',minutes}:{action:'invalidFocus'};}
  return null;
}

export function voicePose(phase,confirmedUntil=0,now=0){
  if(phase==='listening')return 'listening';
  if(['transcribing','thinking'].includes(phase))return 'thinking';
  return now<confirmedUntil?'confirmed':'none';
}
