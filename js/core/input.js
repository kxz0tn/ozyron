// unified input: keyboard (remappable) / mouse / touch / gamepad -> timestamped action queue + rotation axes.
// events carry audio-clock timestamps so rhythm judgement uses the real moment of input, not the frame it was seen on.
import {settings} from './settings.js';
import {audio} from './audio.js';
const q=[];const held=new Set();let capture=null;
const state={drag:0,aim:null,aimSrc:null,pointer:null,stick:null,lastDevice:'kb'};
const pads={prev:[]};
function push(type,ts,src){q.push({type,t:ts==null?audio.now():audio.atPerf(ts),src});}
function keyAction(code){const K=settings.keys;for(const a in K)if(K[a].includes(code))return a;return null;}
addEventListener('keydown',e=>{
  if(capture){e.preventDefault();const c=capture;capture=null;c(e.code);return;}
  if(window.__inputBlock)return;
  const a=keyAction(e.code);state.lastDevice='kb';
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.repeat){if(e.code==='ArrowUp'||e.code==='ArrowDown'||e.code==='KeyW'||e.code==='KeyS')push(e.code==='ArrowUp'||e.code==='KeyW'?'up':'down',e.timeStamp,'kb');return;}
  held.add(e.code);
  if(a==='action')push('action',e.timeStamp,'kb');
  else if(a==='pause')push('pause',e.timeStamp,'kb');
  else if(a==='restart')push('restart',e.timeStamp,'kb');
  if(e.code==='ArrowUp'||e.code==='KeyW')push('up',e.timeStamp,'kb');
  if(e.code==='ArrowDown'||e.code==='KeyS')push('down',e.timeStamp,'kb');
  if(a==='left')push('left',e.timeStamp,'kb');if(a==='right')push('right',e.timeStamp,'kb');
  if(e.code==='Backspace')push('back',e.timeStamp,'kb');
  if(e.code==='KeyM')push('mute',e.timeStamp,'kb');
},{capture:true});
addEventListener('keyup',e=>held.delete(e.code));
addEventListener('blur',()=>held.clear());
// touch / mouse: game modes enable "zones" (left half drag = rotate; action button handled by ui)
let zones=false,dragId=null,lastX=0,mouseAim=false;
export const input={
  state,
  drain(){return q.splice(0);},
  peek(){return q;},
  push,
  setZones(on){zones=on;dragId=null;},
  setMouseAim(on){mouseAim=on;},
  // digital axis from keys + dpad + stick x (when not used for absolute aim)
  axis(){const K=settings.keys;let v=0;if(K.left.some(k=>held.has(k)))v-=1;if(K.right.some(k=>held.has(k)))v+=1;
    const p=pads.cur;if(p){if(p.buttons[14]?.pressed)v-=1;if(p.buttons[15]?.pressed)v+=1;}return Math.max(-1,Math.min(1,v));},
  consumeDrag(){const d=state.drag;state.drag=0;return d;},
  capture(cb){capture=cb;},
  buzz(ms){if(settings.haptics&&navigator.vibrate)try{navigator.vibrate(ms);}catch(e){}},
  pollPads(){const list=navigator.getGamepads?navigator.getGamepads():[];let p=null;for(const g of list)if(g&&g.connected){p=g;break;}
    pads.cur=p;if(!p){state.stick=null;return;}
    const prev=pads.prev;const edge=i=>p.buttons[i]?.pressed&&!prev[i];
    if(edge(0))push('action',null,'pad');if(edge(9))push('pause',null,'pad');if(edge(1))push('back',null,'pad');if(edge(3))push('restart',null,'pad');
    if(edge(12))push('up',null,'pad');if(edge(13))push('down',null,'pad');if(edge(14))push('left',null,'pad');if(edge(15))push('right',null,'pad');
    const x=p.axes[0]||0,y=p.axes[1]||0,m=Math.hypot(x,y);
    if(m>0.45){state.stick={x,y,m};state.lastDevice='pad';
      if(!pads.sy&&Math.abs(y)>0.7)push(y<0?'up':'down',null,'pad');pads.sy=Math.abs(y)>0.7;}else{state.stick=null;pads.sy=false;}
    pads.prev=p.buttons.map(b=>b.pressed);},
};
addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('.ui-hit'))return;
  state.lastDevice=e.pointerType==='touch'?'touch':'mouse';
  if(zones&&(e.pointerType!=='mouse'?e.clientX<innerWidth*0.62:true)&&dragId===null){dragId=e.pointerId;lastX=e.clientX;}
  if(zones&&e.pointerType==='mouse'&&e.button===0)push('action',e.timeStamp,'mouse');},{passive:true});
addEventListener('pointermove',e=>{state.pointer={x:e.clientX,y:e.clientY,type:e.pointerType};
  if(e.pointerId===dragId){const dx=e.clientX-lastX;lastX=e.clientX;state.drag+=dx/Math.min(innerWidth,900)*Math.PI*2.2*settings.sens;}},{passive:true});
const up=e=>{if(e.pointerId===dragId)dragId=null;};addEventListener('pointerup',up);addEventListener('pointercancel',up);
// no accidental scroll / zoom / context menu
['touchmove','gesturestart','gesturechange'].forEach(t=>addEventListener(t,e=>{if(!(e.target.closest&&e.target.closest('.scroll')))e.preventDefault();},{passive:false}));
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('dblclick',e=>e.preventDefault());
