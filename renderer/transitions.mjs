// Compensate artwork transforms during pose handoffs; world position stays untouched.
const poseIdentity=[1,0,0,1,0,0];
export function multiplyPose(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
export function poseCompensation(previous,next){
  if(![...previous,...next].every(Number.isFinite))return [...poseIdentity];
  const [a,b,c,d,e,f]=next,det=a*d-b*c;
  if(Math.abs(det)<.01)return [...poseIdentity];
  return multiplyPose(previous,[d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det]);
}
export function settlePose(matrix,progress){
  const p=Math.max(0,Math.min(1,progress)),weight=1-p*p*(3-2*p);
  if(weight===0)return [...poseIdentity];if(weight===1)return [...matrix];
  const [a,b,c,d,e,f]=matrix,sx=Math.hypot(a,b),det=a*d-b*c;
  // Mirrored/edge-on 3D projections use a bounded affine fallback.
  if(sx<.01||det<=0)return matrix.map((v,i)=>poseIdentity[i]+(v-poseIdentity[i])*weight);
  const angle=Math.atan2(b,a)*weight,scaleX=1+(sx-1)*weight,scaleY=1+(det/sx-1)*weight,skew=(a*c+b*d)/(sx*sx)*weight;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  return [cos*scaleX,sin*scaleX,cos*scaleX*skew-sin*scaleY,sin*scaleX*skew+cos*scaleY,e*weight,f*weight];
}
export function createPoseTransitions(root){
  const parts=[...root.querySelectorAll('#dragon-art,#habit-art,#reaction-art,.head,.arm,.wing,.tail,.leg,.eyes')].map(node=>{
    const wrapper=document.createElementNS('http://www.w3.org/2000/svg','g');wrapper.dataset.poseBlend=node.id||node.classList[0];
    node.before(wrapper);wrapper.append(node);return {node,wrapper,matrix:[...poseIdentity],blend:null};
  });
  let key=null,snapshot=null,at=0,disabled=true;
  const read=node=>{
    const style=getComputedStyle(node),m=new DOMMatrix(style.transform==='none'?undefined:style.transform);
    if(!m.is2D)return null;
    const [x,y]=style.transformOrigin.split(' ').map(parseFloat),ox=Number.isFinite(x)?x:0,oy=Number.isFinite(y)?y:0;
    return [m.a,m.b,m.c,m.d,m.e+ox-m.a*ox-m.c*oy,m.f+oy-m.b*ox-m.d*oy];
  };
  function reset(){for(const part of parts){part.blend=null;part.matrix=[...poseIdentity];part.wrapper.removeAttribute('transform');}snapshot=null;root.dataset.poseTransition='false';}
  return {
    before(nextKey,hard=false){
      disabled=hard;if(hard){reset();key=nextKey;return;}
      if(key===nextKey)return;
      snapshot=key===null?null:parts.map(part=>{const m=read(part.node);return m?multiplyPose(part.matrix,m):null;});key=nextKey;
    },
    update(now){
      if(disabled)return;
      if(snapshot){parts.forEach((part,i)=>{const next=read(part.node);part.blend=snapshot[i]&&next?poseCompensation(snapshot[i],next):null;if(!part.blend){part.matrix=[...poseIdentity];part.wrapper.removeAttribute('transform');}});at=now;snapshot=null;}
      let active=false;
      for(const part of parts){
        if(!part.blend)continue;
        const p=(now-at)/240;part.matrix=settlePose(part.blend,p);
        if(p>=1){part.blend=null;part.wrapper.removeAttribute('transform');}else{active=true;part.wrapper.setAttribute('transform','matrix('+part.matrix.map(v=>v.toFixed(5)).join(' ')+')');}
      }
      root.dataset.poseTransition=String(active);
    },
    clear(){reset();root.dataset.poseTransition='false';},
  };
}
