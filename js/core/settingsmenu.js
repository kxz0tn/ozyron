// settings list (shared by main menu and pause), plus the tap-to-pulse latency calibration
import {settings,saveSettings,TIERS,detectTier,DEFAULT_KEYS} from './settings.js';
import {audio} from './audio.js';
import {ui} from './ui.js';
const keyName=c=>(c||'').replace(/^Key/,'').replace(/^Digit/,'').replace('Arrow','').replace('Space','space').replace('Escape','esc').toLowerCase();
export function settingsItems(app){const S=settings;const set=(k)=>v=>{S[k]=v;saveSettings();};
  const pct=v=>Math.round(v*100)+'%';
  const keyRow=(act,label)=>({kind:'key',label,get:()=>S.keys[act].map(keyName).join(' / '),set:c=>{S.keys[act]=[c,...S.keys[act].filter(k=>k!==c)].slice(0,2);saveSettings();}});
  return [
    {kind:'hdr',label:'display'},
    {kind:'choice',label:'quality',options:['auto','low','med','high','ultra'],get:()=>S.quality,set:v=>{S.quality=v;saveSettings();app.applyQuality&&app.applyQuality();},fmt:v=>v==='auto'?'auto \u00b7 '+detectTier():v},
    {kind:'toggle',label:'reduce motion',get:()=>S.reduceMotion,set:set('reduceMotion')},
    {kind:'toggle',label:'rain',get:()=>S.rain,set:set('rain')},
    {kind:'toggle',label:'day cycle',get:()=>S.cycle,set:set('cycle')},
    {kind:'hdr',label:'audio'},
    {kind:'toggle',label:'sound',get:()=>!S.muted,set:v=>{S.muted=!v;saveSettings();}},
    {kind:'slider',label:'master',min:0,max:1,step:0.05,get:()=>S.master,set:set('master'),fmt:pct},
    {kind:'slider',label:'music',min:0,max:1,step:0.05,get:()=>S.music,set:set('music'),fmt:pct},
    {kind:'slider',label:'effects',min:0,max:1,step:0.05,get:()=>S.sfx,set:set('sfx'),fmt:pct},
    {kind:'slider',label:'ambient',min:0,max:1,step:0.05,get:()=>S.ambient,set:set('ambient'),fmt:pct},
    {kind:'hdr',label:'input'},
    {kind:'slider',label:'sensitivity',min:0.4,max:2,step:0.05,get:()=>S.sens,set:set('sens'),fmt:v=>v.toFixed(2)},
    {kind:'slider',label:'latency offset',min:-200,max:200,step:5,get:()=>S.calib,set:set('calib'),fmt:v=>(v>0?'+':'')+v+' ms'},
    {label:'calibrate',on:()=>calibrate(app)},
    {kind:'toggle',label:'haptics',get:()=>S.haptics,set:set('haptics')},
    keyRow('left','rotate left'),keyRow('right','rotate right'),keyRow('action','action'),keyRow('pause','pause'),keyRow('restart','restart'),
    {label:'reset keys',on:()=>{S.keys=JSON.parse(JSON.stringify(DEFAULT_KEYS));saveSettings();ui.top()&&ui.top().refresh();}},
    {label:'reset tutorials',on:()=>{S.tutorials={};saveSettings();}},
  ];}
// tap on the pulse: 12 clicks at 100 bpm, offset = median(tap - heard click)
export function calibrate(app){audio.init();const prev=ui.top();if(prev)prev.el.style.opacity='0.15';
  const el=document.createElement('div');el.className='pnl center on ui-hit';el.innerHTML='<div class="ttl">sync</div><div class="sub">tap on the pulse \u00b7 space / click / tap</div><div class="rule"></div><div style="display:flex;justify-content:center;padding:2em 0"><div class="cal" style="width:5em;height:5em;border:2px solid #fff;border-radius:50%"></div></div><div class="lbl" style="text-align:center">0 / 8</div>';
  window.__inputBlock=true;ui.root.appendChild(el);const ring=el.querySelector('.cal'),cnt=el.querySelector('.lbl');
  const spb=0.6,t0=audio.now()+0.8,N=12,taps=[];let done=false;
  for(let i=0;i<N;i++)audio.sfx(i%4?'tick':'select',t0+i*spb);
  const anim=()=>{if(done)return;const b=(audio.now()-audio.outLatency()-t0)/spb,f=b-Math.floor(b+0.5);const k=Math.max(0,1-Math.abs(f)*6);ring.style.background=`rgba(255,255,255,${k*0.8})`;ring.style.transform=`scale(${1+k*0.15})`;requestAnimationFrame(anim);};anim();
  const tap=t=>{const heardT=t-audio.outLatency();const n=Math.round((heardT-t0)/spb);if(n<2||n>=N)return;taps.push(heardT-(t0+n*spb));cnt.textContent=Math.min(8,taps.length)+' / 8';if(taps.length>=8)finish();};
  const onKey=e=>{if(e.code==='Escape'){finish(true);return;}e.preventDefault();e.stopPropagation();tap(audio.atPerf(e.timeStamp));};
  const onPtr=e=>{tap(audio.atPerf(e.timeStamp));};
  addEventListener('keydown',onKey,{capture:true});el.addEventListener('pointerdown',onPtr);
  const to=setTimeout(()=>finish(),(0.8+N*spb+1.5)*1000);
  function finish(cancel){if(done)return;done=true;window.__inputBlock=false;clearTimeout(to);removeEventListener('keydown',onKey,{capture:true});
    if(!cancel&&taps.length>=4){const s=taps.slice().sort((a,b)=>a-b),m=s[Math.floor(s.length/2)];settings.calib=Math.max(-200,Math.min(200,Math.round(m*1000)));saveSettings();}
    el.classList.remove('on');setTimeout(()=>el.remove(),300);if(prev){prev.el.style.opacity='';prev.refresh();}}
}
