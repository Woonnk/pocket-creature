// Only an explicit, whole-message request creates a reminder. Model output never runs actions.
export function parseReminderRequest(message){
  const match=String(message).trim().match(/^remind me in (\d+)\s+(minute|minutes|hour|hours)\s+to\s+(.+?)[.!]?$/i);
  if(!match)return null;
  const minutes=Number(match[1])*(match[2].toLowerCase().startsWith('hour')?60:1);
  if(!Number.isInteger(minutes)||minutes<1||minutes>1440)return {invalid:true};
  const title=match[3].trim().slice(0,100);return title?{minutes,title}:null;
}
export function assistanceOffer(message,settings={}){
  if(settings.helpfulOffers===false||settings.focus?.status!=='idle')return null;
  const text=String(message).replace(/[’‘]/g,"'");
  if(/\b(no|don't|do not|stop|cancel)\b.{0,25}\b(focus|homework|study)\b/i.test(text))return null;
  if(/\b(homework|studying|study for|assignment|need to focus|finish my work)\b/i.test(text))return {kind:'focus',label:'Want a 25-minute focus buddy?'};
  return null;
}
