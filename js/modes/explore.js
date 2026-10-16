import {register} from '../core/registry.js';
// free roam: cinematic tour until you take control (orbit drag / wheel, wasd + q/e fly, shift boost, c tour)
register({id:'explore',label:'explore',order:10,
  enter(app){app.rig.set('tour');const touch=matchMedia('(pointer:coarse)').matches;
    app.ui.hudSet(`<div class="hud-bc"><div class="lbl">${touch?'drag orbit \u00b7 pinch zoom':'drag orbit \u00b7 wasd fly \u00b7 q e height \u00b7 c tour \u00b7 esc menu'}</div></div><div class="hud-tl"><div class="lbl">explore</div><div class="mid" id="ex-t">--</div></div>`);
    if(touch)app.ui.root.querySelector('#corner').classList.add('ingame');},
  frame(t,dt,app){const el=document.getElementById('ex-t');if(el&&Math.floor(t*4)!==this._k){this._k=Math.floor(t*4);const d=app.daynight;el.textContent=d.d>0.6?'dawn':d.d>0.15?'twilight':'night';}},
  exit(app){app.ui.root.querySelector('#corner').classList.remove('ingame');},
});
