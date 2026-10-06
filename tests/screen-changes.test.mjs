import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {captureSelectedScreen,normalizedExclusions,createScreenChangeTracker}=require('../desktop/screen.cjs');
const {chatWithLocalModel}=require('../desktop/chat.cjs');
const frame=(value=0,image='before')=>({width:160,height:90,pixels:Buffer.alloc(160*90*4,value),image});
function paint(sample,x,y,w,h,value){for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++){const i=(row*sample.width+col)*4;sample.pixels.fill(value,i,i+3);}return sample;}
test('screen comparison skips static views, pixel noise and tiny cursor motion, but sees dialog-sized local changes',()=>{
 const tracker=createScreenChangeTracker(),baseline=frame(),first=tracker.inspect(baseline,'tab');assert.equal(first.kind,'new-view');tracker.commit(first);
 assert.equal(tracker.inspect(frame(),'tab').changed,false);assert.equal(tracker.inspect(frame(12),'tab').changed,false);assert.equal(tracker.inspect(paint(frame(),40,40,2,2,255),'tab').changed,false);
 const dialog=tracker.inspect(paint(frame(0,'after'),42,23,10,9,255),'tab');assert.equal(dialog.changed,true);assert.equal(dialog.kind,'screen-change');assert.equal(dialog.previousImage,'before');assert.ok(dialog.fraction<.025);tracker.commit(dialog);assert.equal(tracker.inspect(dialog.candidate,'tab').changed,false);
});
test('moving companion regions are ignored and new monitor/context/reset never compares old images',()=>{
 const tracker=createScreenChangeTracker(),first=tracker.inspect(paint(frame(),10,10,20,20,255),'tab:1',[{x:10/160,y:10/90,width:20/160,height:20/90}]);tracker.commit(first);
 const moved=tracker.inspect(paint(frame(),50,10,20,20,255),'tab:1',[{x:50/160,y:10/90,width:20/160,height:20/90}]);assert.equal(moved.changed,false);
 assert.equal(tracker.inspect(frame(),'tab:2').previousImage,undefined);tracker.reset();assert.equal(tracker.inspect(frame(),'tab:1').previousImage,undefined);
});
test('overlay mask coordinates support work-area offsets and negative-coordinate monitors',()=>{
 const [r]=normalizedExclusions([{x:100,y:50,width:200,height:100},{x:NaN,y:0,width:1,height:1}],{x:-1920,y:40},{x:-1920,y:0,width:1920,height:1080});assert.equal(r.x,100/1920);assert.equal(r.y,90/1080);assert.equal(r.width,200/1920);assert.deepEqual(normalizedExclusions('invalid'),[]);
});
test('snapshot sampling normalizes DPI, bounds larger thumbnails, and checks bitmap size',async()=>{
 let resizeOptions,createOptions;const pixels=Buffer.alloc(160*90*4);const small={getSize:()=>({width:160,height:90}),toBitmap:options=>{assert.equal(options.scaleFactor,1);return pixels;}};
 const normal={getSize:()=>({width:2560,height:1440}),resize:options=>{resizeOptions=options;return options.width===160?small:{toJPEG:()=>Buffer.from('bounded'),resize:normal.resize};}};
 const result=await captureSelectedScreen({displayId:1,withSample:true,getSources:async()=>[{display_id:'1',thumbnail:{isEmpty:()=>false,toJPEG:()=>Buffer.from('highDPI')}}],createImage:bytes=>{createOptions=bytes.toString();return normal;}});assert.equal(createOptions,'highDPI');assert.equal(result.image,Buffer.from('bounded').toString('base64'));assert.equal(result.pixels.length,57600);assert.equal(resizeOptions.width,160);
 await assert.rejects(captureSelectedScreen({displayId:1,withSample:true,getSources:async()=>[{display_id:'1',thumbnail:{isEmpty:()=>false,toJPEG:()=>Buffer.from('image'),resize:()=>({getSize:()=>({width:160,height:90}),toBitmap:()=>Buffer.alloc(4)})}}]}),/comparison unavailable/);
});
test('vision change reactions label before/current correctly, preserve short output, and keep manual images current-only',async()=>{
 let body;const fetchImpl=async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:'Hi! That new error dialog caught my eye. Here is a recap.'}})};};
 const request={model:'local',message:'Observe',image:'current',previousImage:'before',observationKind:'screen-change',automatic:true};assert.equal(await chatWithLocalModel(request,{fetchImpl}),'That new error dialog caught my eye.');assert.deepEqual(body.messages.at(-1).images,['before','current']);assert.match(body.messages[0].content,/BEFORE, then CURRENT/);assert.match(body.messages[0].content,/ordinary gameplay motion/);assert.match(body.messages[0].content,/If uncertain/);
 await chatWithLocalModel({...request,automatic:false},{fetchImpl});assert.deepEqual(body.messages.at(-1).images,['current']);assert.doesNotMatch(body.messages[0].content,/BEFORE, then CURRENT/);
});
