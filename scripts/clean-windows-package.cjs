const fs=require('node:fs'),path=require('node:path');
// Some filesystems retain atomic-copy work files beside the runtime executable.
// They are build intermediates and must never enter the portable archive.
module.exports=async context=>{
 if(context.electronPlatformName!=='win32')return;
 for(const entry of fs.readdirSync(context.appOutDir,{withFileTypes:true})){
  if(entry.isFile()&&/^\..+\.exe\./i.test(entry.name))fs.unlinkSync(path.join(context.appOutDir,entry.name));
 }
};
