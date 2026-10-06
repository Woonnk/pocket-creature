import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {verifyPE}=createRequire(import.meta.url)('../scripts/check-release.cjs');
test('release verifier rejects truncated/wrong executables and accepts a correctly placed PE signature',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pocket-pe-'));try{const file=path.join(dir,'portable.exe'),data=Buffer.alloc(256);await fs.writeFile(file,data);assert.throws(()=>verifyPE(file),/DOS signature/);data.write('MZ');data.writeUInt32LE(128,60);await fs.writeFile(file,data);assert.throws(()=>verifyPE(file),/PE signature/);Buffer.from([80,69,0,0]).copy(data,128);await fs.writeFile(file,data);assert.doesNotThrow(()=>verifyPE(file));data.writeUInt32LE(9999,60);await fs.writeFile(file,data);assert.throws(()=>verifyPE(file),/header offset/);await fs.writeFile(file,Buffer.alloc(5));assert.throws(()=>verifyPE(file),/truncated/);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
