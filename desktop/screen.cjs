async function captureSelectedScreen({displayId,getSources,withSample=false,createImage}){
  const sources=await getSources({types:['screen'],thumbnailSize:{width:1280,height:720},fetchWindowIcons:false});
  const source=sources.find(item=>item.display_id===String(displayId));
  if(!source||source.thumbnail.isEmpty())throw Error('Screen image unavailable. Check screen capture access.');
  let encoded=source.thumbnail.toJPEG(65),normalized=createImage?createImage(encoded):source.thumbnail;
  // Decode into a 1x image to avoid display DPI changing bitmap dimensions.
  if(createImage){const size=normalized.getSize(),factor=Math.min(1,(withSample?960:1280)/size.width,(withSample?540:720)/size.height);if(factor<1){normalized=normalized.resize({width:Math.max(1,Math.round(size.width*factor)),height:Math.max(1,Math.round(size.height*factor))});encoded=normalized.toJPEG(65);}}
  if(encoded.length>2*1024*1024)throw Error('Screen snapshot exceeds the local image limit.');
  const image=encoded.toString('base64');
  if(!withSample)return image;
  const small=normalized.resize({width:160,height:90,quality:'good'}),size=small.getSize(1),pixels=small.toBitmap({scaleFactor:1});
  if(size.width<=0||size.height<=0||size.width*size.height*4!==pixels.length||pixels.length>160*90*4)throw Error('Screen comparison unavailable.');
  return {image,pixels,width:size.width,height:size.height};
}
function normalizedExclusions(rectangles=[],windowBounds={},displayBounds={}){
  if(!Array.isArray(rectangles)||!displayBounds.width||!displayBounds.height)return [];
  return rectangles.slice(0,6).filter(r=>r&&['x','y','width','height'].every(k=>Number.isFinite(r[k]))&&r.width>0&&r.height>0).map(r=>({
    x:(r.x+(windowBounds.x||0)-(displayBounds.x||0))/displayBounds.width,
    y:(r.y+(windowBounds.y||0)-(displayBounds.y||0))/displayBounds.height,
    width:r.width/displayBounds.width,height:r.height/displayBounds.height
  }));
}
function createScreenChangeTracker(){
  let baseline=null;
  const inside=(x,y,rects)=>rects.some(r=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height);
  return {
    inspect(frame,key,exclusions=[]){
      const previous=baseline&&baseline.key===key&&baseline.width===frame.width&&baseline.height===frame.height?baseline:null;
      const candidate={...frame,key,exclusions};
      if(!previous)return {changed:true,kind:'new-view',previousImage:undefined,candidate};
      const masks=[...previous.exclusions,...exclusions],tiles=Array.from({length:32},()=>({seen:0,changed:0}));let seen=0,changed=0;
      for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
        if(inside((x+.5)/frame.width,(y+.5)/frame.height,masks))continue;
        const tile=tiles[Math.min(3,Math.floor(y/frame.height*4))*8+Math.min(7,Math.floor(x/frame.width*8))],i=(y*frame.width+x)*4;
        tile.seen++;seen++;
        const delta=(Math.abs(frame.pixels[i]-previous.pixels[i])+Math.abs(frame.pixels[i+1]-previous.pixels[i+1])+Math.abs(frame.pixels[i+2]-previous.pixels[i+2]))/3;
        if(delta>=28){tile.changed++;changed++;}
      }
      const fraction=seen?changed/seen:0,localized=tiles.some(t=>t.seen>=100&&t.changed>=45&&t.changed/t.seen>=.18);
      return {changed:seen>=500&&(fraction>=.025||localized),kind:'screen-change',fraction,previousImage:previous.image,candidate};
    },
    commit(result){baseline=result.candidate;},
    reset(){baseline=null;}
  };
}
module.exports={captureSelectedScreen,normalizedExclusions,createScreenChangeTracker};
