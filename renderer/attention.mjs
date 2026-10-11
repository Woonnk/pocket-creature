const attentionText=(value,max=120)=>typeof value==='string'?value.replace(/[\x00-\x1f]/g,'').trim().slice(0,max):'';
export function describeAttention(s,c={},now=Date.now()){
  if(c.voicePhase==='transcribing')return {kind:'voice',label:'Recognizing your words',detail:'Microphone closed · recognizing your push-to-talk recording.'};
  if(['starting','listening'].includes(c.voicePhase))return {kind:'voice',label:'Listening to you',detail:'Push-to-talk has priority over PC observations.'};
  if(c.chatBusy)return {kind:'conversation',label:'Your conversation',detail:'Preparing your reply; automatic comments are paused.'};
  if(c.focus)return {kind:'focus',label:'Focus together',detail:'Keeping you company during your focus session.'};
  if(c.sleeping||c.away)return {kind:'rest',label:'Resting quietly',detail:'No new automatic activity comments while resting or away.'};
  if(!s.pcAwareness)return {kind:'off',label:'PC awareness off',detail:'Automatic PC observation is paused. Files you explicitly show remain available for questions.'};
  if(c.desktop&&(!c.seenAt||now-c.seenAt>6000))return {kind:'waiting',label:'Waiting for fresh activity',detail:'No recent PC signal. Old titles are not shown as current.'};
  const file=c.fileCurrent?c.file:null,name=attentionText(file?.name,80);
  if(name)return file.unread?{kind:'filename',label:name,detail:'Filename only · file contents have not been read.'}:{kind:'file',label:name,detail:`Read text sample${file.partial?' · first 32 KB only':''}. This identifies the current file, not a full understanding of your screen.`};
  const title=attentionText(c.windowTitle);
  if(title&&c.appAvailable!==false)return {kind:'window',label:title,detail:'Window title only · contents have not been read from this title.'};
  if(!c.desktop&&c.category&&c.category!=='none')return {kind:'preview',label:'Preview: '+c.category,detail:'Simulated activity inside this playground.'};
  return {kind:'idle',label:'Hanging out with you',detail:c.appAvailable===false?'App signal unavailable. Basic cursor and idle reactions can still work.':'No identifiable foreground task. I won’t guess what you are doing.'};
}
