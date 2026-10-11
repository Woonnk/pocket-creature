const fs=require('node:fs'),path=require('node:path');
// Some filesystems retain atomic-copy work files beside the runtime executable.
// They are build intermediates and must never enter the portable archive.
module.exports=async context=>{
 if(context.electronPlatformName!=='win32')return;
 const product=context.packager.appInfo.productFilename+'.exe';
 require('./check-release.cjs').verifyPE(path.join(context.appOutDir,product),true);
 for(const entry of fs.readdirSync(context.appOutDir,{withFileTypes:true})){
  if(entry.isFile()&&(/^\..+\.exe\./i.test(entry.name)||entry.name==='electron.exe'&&product!=='electron.exe'&&fs.existsSync(path.join(context.appOutDir,product))))fs.unlinkSync(path.join(context.appOutDir,entry.name));
 }
};
