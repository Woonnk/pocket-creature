import {HOME_ITEMS,purchaseHome,homePosition,homeFractions} from './home.mjs';
export function createHomeView({getState,getViewport,getObstacles=()=>[],isGame=()=>false,onChange=()=>{},onInterrupt=()=>{},onDrag=()=>{},onOpen=()=>{},onMove=()=>{},onPreview=()=>{},toast=()=>{}}){
  const root=document.querySelector('#little-home'),handle=document.querySelector('#home-handle'),preview=document.querySelector('#home-preview'),catalog=document.querySelector('#home-catalog');
  let dragging=null,category='bed',catalogKey='',geometryKey='';
  preview.append(root.querySelector('svg').cloneNode(true));
  const geometry=()=>homePosition(getState().home,getViewport(),getObstacles());
  function paint(){
    const state=getState(),g=geometry(),key=JSON.stringify([g.x,g.y,g.scale]);
    if(key!==geometryKey){geometryKey=key;root.style.left=(g.x-g.width/2)+'px';root.style.top=(g.y-145*g.scale)+'px';root.style.width=g.width+'px';root.style.setProperty('--home-scale',g.scale);handle.style.left=g.x+'px';handle.style.top=(g.y+10*g.scale)+'px';}
    root.hidden=!state.home.enabled||isGame();handle.hidden=root.hidden;
    for(const el of [root,preview])for(const slot of ['bed','rug','plant','lamp','toy'])if(el.dataset[slot]!==state.home[slot])el.dataset[slot]=state.home[slot];
    document.querySelector('#home-enabled').checked=state.home.enabled;document.querySelector('#home-routines').checked=state.home.routines;
    for(const id of ['home-move','home-recenter','home-visit','home-stretch'])document.querySelector('#'+id).disabled=!state.home.enabled||isGame();
    const nextKey=JSON.stringify([category,state.home.owned,state.home[category],state.coins]);
    if(nextKey!==catalogKey){catalogKey=nextKey;catalog.replaceChildren();for(const [id,item] of Object.entries(HOME_ITEMS)){if(item.slot!==category)continue;
      const button=document.createElement('button'),icon=document.createElement('span'),name=document.createElement('b'),detail=document.createElement('small'),cost=document.createElement('span');
      button.type='button';button.dataset.homeItem=id;button.setAttribute('aria-pressed',String(state.home[item.slot]===item.value));icon.className='decor-icon';icon.textContent=item.icon;name.textContent=item.name;detail.textContent=item.description;cost.className='decor-cost';cost.textContent=state.home[item.slot]===item.value?'Equipped':state.home.owned.includes(id)?'Owned · use':item.cost+' coins';button.append(icon,name,detail,cost);
      button.addEventListener('click',()=>{onInterrupt();if(purchaseHome(getState(),id)){onChange();paint();toast(item.name+' selected.');}else toast('Earn a few more coins with care, fetch, or focus.');});catalog.append(button);
    }}
  }
  function finish(cancelled=false){if(!dragging)return;const current=dragging;dragging=null;if(cancelled)Object.assign(getState().home,current.original);if(current.moved)onChange();if(handle.hasPointerCapture(current.pointerId))handle.releasePointerCapture(current.pointerId);onDrag(false);paint();if(!cancelled&&!current.moved)onOpen();}
  handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();handle.focus({preventScroll:true});onInterrupt();const g=geometry(),rect=document.querySelector('#world').getBoundingClientRect();dragging={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,offsetX:g.x-(event.clientX-rect.left),offsetY:g.y-(event.clientY-rect.top),moved:false,original:{x:getState().home.x,y:getState().home.y}};handle.setPointerCapture(event.pointerId);onDrag(true);});
  handle.addEventListener('pointermove',event=>{if(!dragging||event.pointerId!==dragging.pointerId)return;const rect=document.querySelector('#world').getBoundingClientRect();if(Math.hypot(event.clientX-dragging.startX,event.clientY-dragging.startY)>5)dragging.moved=true;if(!dragging.moved)return;Object.assign(getState().home,homeFractions({x:event.clientX-rect.left+dragging.offsetX,y:event.clientY-rect.top+dragging.offsetY},getViewport()));paint();});
  handle.addEventListener('pointerup',()=>finish());handle.addEventListener('pointercancel',()=>finish(true));handle.addEventListener('lostpointercapture',()=>finish(true));
  handle.addEventListener('keydown',event=>{if(event.key==='Escape'&&dragging){event.preventDefault();event.stopPropagation();finish(true);return;}if(['Enter',' '].includes(event.key)){event.preventDefault();onOpen();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();onInterrupt();const g=geometry(),step=event.shiftKey?40:12;Object.assign(getState().home,homeFractions({x:g.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),y:g.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0)},getViewport()));onChange();paint();});
  for(const [id,key] of [['home-enabled','enabled'],['home-routines','routines']])document.querySelector('#'+id).addEventListener('change',event=>{onInterrupt();getState().home[key]=event.target.checked;onChange();paint();});
  for(const button of document.querySelectorAll('[data-home-category]'))button.addEventListener('click',()=>{category=button.dataset.homeCategory;for(const tab of document.querySelectorAll('[data-home-category]'))tab.setAttribute('aria-pressed',String(tab===button));paint();});
  document.querySelector('#home-recenter').addEventListener('click',()=>{onInterrupt();Object.assign(getState().home,{x:.79,y:1});onChange();paint();toast('Home moved back to its starting spot.');});
  document.querySelector('#home-move').addEventListener('click',()=>{onMove();toast('Drag the Home handle. Arrow keys also move it; Shift takes bigger steps.');});
  document.querySelector('#home-visit').addEventListener('click',()=>onPreview('toys'));document.querySelector('#home-stretch').addEventListener('click',()=>onPreview('stretch'));
  return {render:paint,geometry,cancelDrag:()=>finish(true),get dragging(){return Boolean(dragging);}};
}
