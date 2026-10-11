import {normalize} from './core.mjs';
const BACKUP_MAX_BYTES=120000;
export function encodeBackup(state){
  const backupText=JSON.stringify({format:'pocket-creature',backupVersion:1,state:normalize(state)},null,2);
  if(new TextEncoder().encode(backupText).length>BACKUP_MAX_BYTES)throw Error('This save is too large to export.');
  return backupText;
}
export function decodeBackup(text,current){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>BACKUP_MAX_BYTES)throw Error('Choose a Pocket Creature backup smaller than 120 KB.');
  let backup;try{backup=JSON.parse(text);}catch{throw Error('That file is not a valid JSON backup.');}
  if(backup?.format!=='pocket-creature'||backup.backupVersion!==1||!backup.state||typeof backup.state!=='object'||Array.isArray(backup.state))throw Error('That is not a supported Pocket Creature backup.');
  const restored=normalize(backup.state),existing=normalize(current);
  // Restore memories and preferences without enabling observation or recording on a new PC.
  for(const key of ['pcAwareness','screenAwareness','voiceInputEnabled','speechEnabled','autoConversations'])restored[key]=existing[key];
  return restored;
}
