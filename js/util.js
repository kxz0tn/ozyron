// shared helpers: seeded rng + tonal canvas textures
export function rng(seed=1){let s=seed>>>0;return()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0,(s^s>>>7)>>>0)/4294967296);}
export function windowTexture(seed=7,w=128,h=512){
  const r=rng(seed),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.fillStyle='#000';g.fillRect(0,0,w,h);
  for(let y=4;y<h;y+=8){const band=r()<0.08;for(let x=2;x<w;x+=6){const v=r();
    if(band||v<0.22){const l=band?255:Math.floor(120+r()*135);g.fillStyle=`rgb(${l},${l},${l})`;g.fillRect(x,y,4,3);}}}
  for(let y=0;y<h;y+=64){g.fillStyle='#fff';g.fillRect(0,y,w,1);}
  return c;
}
