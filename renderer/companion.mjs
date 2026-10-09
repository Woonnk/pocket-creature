import {personalityLine} from './personality.mjs';
export const TEXT_EXTENSIONS=new Set(['py','js','mjs','cjs','jsx','ts','tsx','json','html','css','md','txt','cpp','c','h','hpp','cs','rs','go','java','lua','luau','toml','yaml','yml','xml','sql','vue','svelte','sh','ps1']);
export function inspectText(name,content){
  const filename=String(name).split(/[\\/]/).pop().slice(0,180),extension=filename.split('.').pop().toLowerCase();
  if(!TEXT_EXTENSIONS.has(extension))throw Error('Choose a text or source-code file for this version.');
  if(typeof content!=='string'||content.includes('\0'))throw Error('This file does not look like readable text.');
  const encoded=new TextEncoder().encode(content),sample=new TextDecoder().decode(encoded.subarray(0,32768)),lines=sample.split(/\r?\n/),functionNames=[],imports=[];
  for(const line of lines){
    const fn=line.match(/^\s*(?:async\s+)?def\s+(\w+)\s*\(/)||line.match(/\b(?:function\s+|fn\s+)([\w$]+)\s*\(/)||line.match(/(?:const|let)\s+([\w$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/);
    if(fn&&!functionNames.includes(fn[1]))functionNames.push(fn[1]);
    const imp=line.match(/^\s*(?:from\s+(\S+)\s+import|import\s+([\w.]+))/)||line.match(/(?:from\s*|require\s*\()\s*['"]([^'"]+)['"]/);
    if(imp){const value=imp.slice(1).find(Boolean);if(value&&!imports.includes(value))imports.push(value.slice(0,80));}
  }
  const heading=sample.match(/^#\s+(.+)$/m)?.[1]?.slice(0,120)||'';
  let detail=`${lines.length} lines of ${extension.toUpperCase()} text`;
  if(extension==='json'){try{const value=JSON.parse(sample);detail=Array.isArray(value)?`a JSON list with ${value.length} entries`:`JSON with keys: ${Object.keys(value??{}).slice(0,8).join(', ')||'(none)'}`;}catch{detail='JSON text; it may be partial or not valid JSON';}}
  else if(functionNames.length)detail+=`; functions include ${functionNames.slice(0,5).join(', ')}`;
  else if(heading)detail+=`; heading: ${heading}`;
  return {name:filename,extension,lines:lines.length,functions:functionNames.slice(0,30),imports:imports.slice(0,30),heading,summary:detail,excerpt:sample,partial:encoded.length>32768};
}
export function fileGreeting(file,memory){
  if(file.unread)return `Oh, what’s ${file.name}? I noticed it in your editor. What are you working on?`;
  if(memory?.automatic)return `Back to ${file.project||file.name}? I remember working with ${(memory.files||[]).slice(0,3).join(', ')||file.name}. What’s next?`;
  if(memory?.description)return `Back to ${file.project||file.name}? You told me: “${memory.description}” What are we working on next?`;
  return `Oh, what’s ${file.name}? I can see ${file.summary}. What are you making?`;
}
export function localReply(message,file,memory,personality='playful'){
  const q=String(message).trim().toLowerCase();
  if(!file&&/^(hi|hello|hey|how are you|what’s up|what's up)\b/.test(q))return personalityLine(personality,'intro');
  if(!file)return 'Show me a text or code file, or tell me what you’re working on. I can remember a project description once a file is selected.';
  if(file.unread)return `I noticed ${file.name}, but haven’t read its contents. Connect its project folder once so I can inspect files there automatically.`;
  if(/function|method/.test(q))return file.functions.length?`In ${file.name}, I found these function declarations: ${file.functions.join(', ')}. Which one should we look at?`:`I didn’t find recognizable function declarations in the sample of ${file.name}. ${file.summary}.`;
  if(/import|depend|librar/.test(q))return file.imports.length?`${file.name} references ${file.imports.join(', ')}. This is a text inspection; I haven’t run the code.`:`I didn’t find recognizable import statements in the sample of ${file.name}.`;
  if(/remember|project|making|building/.test(q)&&memory?.description)return `For ${file.project||file.name}, ${memory.automatic?'I remember':'you told me'}: ${memory.description}. We can inspect the current file or choose a small next task.`;
  if(/next|improv|test/.test(q))return `For ${file.name}, I’d start by clarifying its purpose, then checking one normal input and one edge case${file.functions.length?` for ${file.functions[0]}`:''}. I can describe the structure; deeper reasoning is available with the optional local AI.`;
  if(/what|explain|summary|describe/.test(q))return `${file.name} contains ${file.summary}${file.imports.length?`. It references ${file.imports.slice(0,5).join(', ')}`:''}.${file.partial?' I only inspected the first 32 KB.':''} What part are you curious about?`;
  return `I’m keeping you company with ${file.name}. ${memory?.description?`I remember it’s about: ${memory.description}. `:''}My built-in replies cover structure, imports, functions, and project notes. Enable local AI for a freer conversation about the file.`;
}
const CHAT_LINES={
  coding:['Coding time? I’ll bring the glasses. What are we building?','A little code, a little dragon company. What’s the next task?','I’ve got my tiny keyboard ready. You lead, I’ll keep you company.'],
  gaming:['Game time! I brought a very small helmet.','What’s the plan for this session? I’m on moral-support duty.','I’m ready for the adventure. Tell me what we’re playing!'],
  music:['Headphones on. What are we listening to?','Music companion reporting for duty. Got a favorite song today?','I’ve got the headphones; you choose the soundtrack.'],
  browsing:['Looking for something interesting? Tell me what caught your eye.','We’re browsing! Hunting for an answer, or just exploring?','A little internet adventure. What are we looking for?'],
  typing:['You type; I’ll work on my tiny keyboard.','That keyboard’s getting a workout. What are you working on?','I’m typing along. My paws are doing their best.'],
  focus:['One small step at a time. I’m right here.','Focus buddy reporting for duty. What’s our one goal?','I’ll keep this one short: you’ve got this.'],
  none:['What are we working on today?','Want to show me a file? I’m feeling curious.','I’m here for code, projects, and excellent head scratches.']
};
export function createCommentator(){
  let stable='none',candidate='none',candidateSince=0,lastSpoke=-Infinity,lastTyping=false,nextAmbient=0;
  const indices=new Map();
  const lineFor=(key,personality)=>{const token=personality+':'+key,i=indices.get(token)||0;indices.set(token,i+1);indices.set(key,i+1);return personalityLine(personality,key,i);};
  return {
    hold(now){lastSpoke=now;},
    next(context,settings,now,force=false){
      if(!force&&(settings.quiet||!settings.pcAwareness||context.sleeping||context.dragging||context.playing||context.away))return null;
      const gap=context.gameMode?Math.max(60000,{chatty:7000,balanced:18000,minimal:45000}[settings.talkativeness]||7000):{chatty:7000,balanced:18000,minimal:45000}[settings.talkativeness]||7000;
      const ambient={chatty:24000,balanced:65000,minimal:180000}[settings.talkativeness]||24000;
      const category=CHAT_LINES[context.category]?context.category:'none';
      const activityKey=context.contextId===undefined?category:category+':'+String(context.contextId);
      if(activityKey!==candidate){candidate=activityKey;candidateSince=now;}
      const changed=candidate!==stable&&now-candidateSince>=1200;
      const typingStarted=context.typing&&!lastTyping;
      if(force||now-lastSpoke>=gap&&(changed||typingStarted||now>=nextAmbient)){
        if(changed)stable=candidate;
        const key=context.focus?'focus':typingStarted?'typing':category;
        lastSpoke=now;lastTyping=context.typing;nextAmbient=now+(context.gameMode?Math.max(60000,ambient):context.focus?ambient*2:ambient);
        const line=lineFor(key,settings.personality||'playful');
        const title=typeof context.windowTitle==='string'?context.windowTitle.replace(/[\x00-\x1f]/g,'').trim().slice(0,64):'';
        if(changed&&!context.focus&&!context.typing&&title&&settings.contextReactions!==false){
          if(category==='browsing')return `You switched to “${title}”. What caught your eye?`;
          if(category==='coding'&&!context.fileName)return `Working in “${title}”? I’ll keep you company.`;
          if(category==='music')return `I noticed “${title}”. Got a soundtrack in mind?`;
        }
        if(context.fileName&&(key==='coding'||key==='typing'||key==='none')&&(indices.get(key)||0)%2===0)return `Still working on ${context.fileName}? ${context.projectDescription?'How’s '+context.projectDescription+' coming along?':'What’s the next little step?'} `;
        return line;
      }
      if(!context.typing)lastTyping=false;
      return null;
    }
  };
}
