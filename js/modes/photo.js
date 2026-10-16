import {register} from '../core/registry.js';
import {audio} from '../core/audio.js';
// photo mode: free camera, cinematic presets, time scrub, fov, one-tap capture, ui hidden
const PRESETS=[
  ['skyline',[-430,150,380],[0,140,0],48],['core',[110,25,-40],[0,300,0],62],['ring',[-120,420,-300],[0,560,0],50],
  ['yard',[200,70,40],[330,30,-120],50],['street',[-60,30,40],[-200,90,-160],64],['orbit',[160,820,520],[20,0,-60],44],['rail',[-330,60,280],[-150,40,200],56]];
register({id:'photo',label:'photo',order:40,
  enter(app){app.rig.set('free');this.i=0;this.app=app;this.fov=app.camera.fov;this.go(0,true);
    const el=this.el=document.createElement('div');el.id='photo';el.className='keep';
    el.innerHTML=`<div class="reticle"></div><div class="bar2 ui-hit">${PRESETS.map((p,i)=>`<button class="cbtn" data-p="${i}">${i+1} ${p[0]}</button>`).join('')}
      <button class="cbtn" data-a="time">time</button><button class="cbtn" data-a="fov">lens</button><button class="cbtn" data-a="rain">rain</button><button class="cbtn" data-a="hide">hide</button><button class="cbtn" data-a="exit">exit</button><button class="shut" data-a="shot" aria-label="capture"></button></div>`;
    app.ui.root.appendChild(el);app.ui.hidden(true);
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.p)this.go(+b.dataset.p);else this.act(b.dataset.a);});
    this.onKey=e=>{if(/^Digit[1-7]$/.test(e.code))this.go(+e.code.slice(5)-1);else if(e.code==='KeyH')this.act('hide');else if(e.code==='KeyT')this.act('time');else if(e.code==='KeyF')this.act('fov');else if(e.code==='Enter'||e.code==='KeyX')this.act('shot');};
    addEventListener('keydown',this.onKey);},
  go(i,silent){const p=PRESETS[i];this.i=i;const a=this.app;a.rig.set('locked');a.rig.flyTo(p[1],p[2],p[3],silent?1.4:1.1).then(()=>{if(a.mode&&a.mode.id==='photo'){a.cam.controls.target.set(...p[2]);a.rig.set('free');}});},
  act(a){const app=this.app;
    if(a==='hide'){this.el.classList.toggle('bare');this.el.querySelector('.bar2').style.opacity=this.el.classList.contains('bare')?'0':'';this.el.querySelector('.reticle').style.display=this.el.classList.contains('bare')?'none':'';}
    else if(a==='time'){const d=app.daynight;const steps=[null,0,0.33,0.5,0.62];this.ti=((this.ti||0)+1)%steps.length;d.override=steps[this.ti];}
    else if(a==='fov'){const f=[55,35,24,75];this.fi=((this.fi||0)+1)%f.length;app.camera.fov=f[this.fi];app.camera.updateProjectionMatrix();}
    else if(a==='rain'){app.settings.rain=!app.settings.rain;}
    else if(a==='exit')app.stop();
    else if(a==='shot')this.shot();},
  shot(){const app=this.app,bar=this.el;bar.style.visibility='hidden';audio.sfx('shutter');
    requestAnimationFrame(()=>{app.renderer.domElement.toBlob(b=>{const u=URL.createObjectURL(b),a=document.createElement('a');const d=new Date(),z=n=>String(n).padStart(2,'0');
      a.href=u;a.download=`ozyron-${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
      bar.style.visibility='';app.ui.flash();window.__lastShot=a.download;},'image/png');});},
  frame(t,dt,app){if(app.rig.mode==='free')app.cam.setAuto(false);},
  exit(app){removeEventListener('keydown',this.onKey);this.el.remove();app.ui.hidden(false);app.daynight.override=null;app.camera.fov=55;app.camera.updateProjectionMatrix();},
});
