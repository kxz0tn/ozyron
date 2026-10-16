// persistent settings + quality tiers (auto-detected per device)
const KEY='ozyron.settings.v2';
export const TIERS={
  low:  {pr:0.8, towers:650, bloom:false,rain:2500, traffic:30,drones:40, reflect:false,shafts:false,label:'low'},
  med:  {pr:1.0, towers:1000,bloom:true, rain:5000, traffic:45,drones:80, reflect:false,shafts:true, label:'med'},
  high: {pr:1.5, towers:1500,bloom:true, rain:9000, traffic:60,drones:140,reflect:true, shafts:true, label:'high'},
  ultra:{pr:2.0, towers:1900,bloom:true, rain:14000,traffic:80,drones:220,reflect:true, shafts:true, label:'ultra'},
};
export const DEFAULT_KEYS={left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],action:['Space','Enter'],pause:['Escape','KeyP'],restart:['KeyR']};
const DEF={quality:'auto',master:0.8,music:0.8,sfx:0.9,ambient:0.6,muted:false,sens:1,calib:0,reduceMotion:false,rain:false,cycle:true,haptics:true,keys:DEFAULT_KEYS,tutorials:{}};
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');return {...DEF,...s,keys:{...DEFAULT_KEYS,...(s.keys||{})},tutorials:{...(s.tutorials||{})}};}catch(e){return {...DEF};}}
export const settings=load();
const subs=new Set();
export function saveSettings(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(e){}subs.forEach(f=>f(settings));}
export function onSettings(f){subs.add(f);}
export function detectTier(){
  const q=new URLSearchParams(location.search).get('q');if(q&&TIERS[q])return q;
  const mobile=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let gpu='';try{const c=document.createElement('canvas').getContext('webgl2');const e=c&&c.getExtension('WEBGL_debug_renderer_info');gpu=e?c.getParameter(e.UNMASKED_RENDERER_WEBGL):'';}catch(e){}
  const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4;
  if(/SwiftShader|llvmpipe|Software/i.test(gpu))return 'low';
  if(mobile)return (cores>=8&&mem>=6)?'med':'low';
  if(/RTX|Radeon RX|Apple M[2-9]|Arc/i.test(gpu)&&cores>=8)return 'ultra';
  return cores>=6?'high':'med';
}
export function activeTier(){return settings.quality==='auto'?detectTier():settings.quality;}
