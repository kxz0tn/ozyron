// OZYRON boot terminal: shows system lines, waits for scene readiness, then scans away. Any key/tap skips.
const SYSTEMS=['reactor core','energy ring','orbital collectors','shipyard','transit lanes','city grid'];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export function boot(ready){
  const el=document.createElement('div');el.id='boot';el.setAttribute('aria-label','ozyron boot');
  el.innerHTML='<div class="wrap"><div class="mark">Ozyron</div><div class="rule"></div><div class="lines"></div><div class="pr">&gt;</div></div>';
  document.body.appendChild(el);
  const scan=document.createElement('div');scan.id='bootscan';document.body.appendChild(scan);
  const lines=el.querySelector('.lines'),mark=el.querySelector('.mark'),rule=el.querySelector('.rule'),pr=el.querySelector('.pr');
  let skip=false,isReady=false;ready.then(()=>isReady=true);
  const done=new Promise(res=>{
    const finish=async()=>{window.__bootStage='out';el.classList.add('out');scan.classList.add('go');await wait(1150);el.remove();scan.remove();window.__bootStage='done';res();};
    const onSkip=()=>{if(!skip){skip=true;}};
    addEventListener('keydown',onSkip,{once:true});el.addEventListener('pointerdown',onSkip,{once:true});
    (async()=>{
      const step=async ms=>{if(!skip)await wait(ms);};
      window.__bootStage='mark';await step(150);mark.classList.add('on');await step(1300);rule.classList.add('on');await step(600);
      window.__bootStage='systems';
      for(const name of SYSTEMS){const l=document.createElement('div');l.className='ln';l.innerHTML='<span class="k"></span><span class="s">[ .. ]</span>';
        l.querySelector('.k').textContent=name;lines.appendChild(l);requestAnimationFrame(()=>l.classList.add('on'));
        await step(260);
        while(!isReady&&name==='city grid')await wait(60); // last system waits for real scene readiness
        l.classList.add('ok');l.querySelector('.s').textContent='[ ok ]';await step(140);}
      const f=document.createElement('div');f.className='ln fin';f.innerHTML='<span class="k">ozyron online</span>';lines.appendChild(f);requestAnimationFrame(()=>f.classList.add('on'));
      window.__bootStage='online';await step(1100);pr.style.display='none';
      while(!isReady)await wait(60);
      finish();
    })();
  });
  return done;
}
