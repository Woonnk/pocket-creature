// Only recent, explicit conversation belongs in manual prompts. Ambient screen
// comments stay transient unless the human actually answers one.
export const CONVERSATION_WINDOW=20*60000;
export function startsNewTopic(message){
  return /^(?:new topic|change (?:the )?(?:topic|subject)|let['’]s (?:change (?:the )?(?:topic|subject)|talk about something else)|forget (?:that|this)|never ?mind|moving on)\b/i.test(String(message).trim());
}
export function recentConversation(history,message='',now=Date.now()){
  if(startsNewTopic(message))return [];
  let turns=(Array.isArray(history)?history:[]).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&Number.isFinite(m.at)&&m.at>0&&m.at<=now&&now-m.at<CONVERSATION_WINDOW).slice(-20);
  const boundary=turns.findLastIndex(m=>m.role==='user'&&startsNewTopic(m.content));
  if(boundary>=0)turns=turns.slice(boundary);
  if(turns.at(-1)?.role==='user'&&turns.at(-1).content===message)turns=turns.slice(0,-1);
  return turns.slice(-10).map(m=>({role:m.role,content:m.content.slice(0,m.role==='user'?1200:280)}));
}
export function answersRecentQuestion(message){
  const text=String(message).trim();
  return Boolean(text)&&!/[?]/.test(text)&&!/^(?:what|why|how|where|when|explain|show|help|tell me)\b/i.test(text)&&text.split(/\s+/).length<=30&&!startsNewTopic(text)&&!/\b(?:screen|window|file|code|function|script|opened|click|look at|what is this|what['’]s this|what is that|what['’]s that)\b/i.test(text);
}
