import * as THREE from 'three';
// energy system upgrade: rotating/pulsing collectors, arcs crawling along the ring, pulses travelling down the beam into the core
export function buildEnergyFX(scene,energy){
  const orbit=energy.orbit,g=new THREE.Group();scene.add(g);
  const steel=new THREE.MeshStandardMaterial({color:0x8c8c8c,metalness:0.8,roughness:0.3,emissive:0x111111});
  const NC=12,cols=[];
  const dishG=new THREE.CylinderGeometry(11,4,3,6,1,false);const cellG=new THREE.CircleGeometry(9.6,6);
  for(let i=0;i<NC;i++){const a=i/NC*Math.PI*2,piv=new THREE.Group();piv.position.set(Math.cos(a)*180,0,Math.sin(a)*180);piv.rotation.y=-a;orbit.add(piv);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(2,16,2),steel);arm.position.y=8;piv.add(arm);
    const head=new THREE.Group();head.position.y=18;piv.add(head);
    const dish=new THREE.Mesh(dishG,steel);head.add(dish);
    const cm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,side:THREE.DoubleSide});const cell=new THREE.Mesh(cellG,cm);cell.rotation.x=-Math.PI/2;cell.position.y=1.6;head.add(cell);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(1.4,8,6),new THREE.MeshBasicMaterial({color:0xffffff}));tip.position.y=7;head.add(tip);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,7,4),steel);mast.position.y=3.5;head.add(mast);
    cols.push({piv,head,cm,tip,a,ph:i*0.7,charge:0});}
  // arcs along the ring between neighbouring collectors
  const SEG=14,arcG=new THREE.BufferGeometry(),arcP=new Float32Array(NC*SEG*2*3);arcG.setAttribute('position',new THREE.BufferAttribute(arcP,3));
  const arcs=new THREE.LineSegments(arcG,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));arcs.frustumCulled=false;orbit.add(arcs);
  const arcOn=new Array(NC).fill(0);
  // beam pulses
  const NP=6,pulses=[];const pg=new THREE.CylinderGeometry(9,9,26,24,1,true);
  for(let i=0;i<NP;i++){const m=new THREE.Mesh(pg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{a:{value:0}},
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float a;varying vec2 vU;void main(){float e=sin(vU.y*3.14159);gl_FragColor=vec4(vec3(1.),pow(e,3.)*a);}'}));m.visible=false;g.add(m);pulses.push({m,y:0,on:false,sp:420});}
  const flash=new THREE.Sprite(new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),r=x.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.2,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0}));
  flash.position.y=40;flash.scale.setScalar(120);g.add(flash);
  let fl=0,auto=0,ringFlash=0;const R=Math.random;
  const api={group:g,cols,autoPulse:true,intensity:1,
    pulse(strength=1){const p=pulses.find(q=>!q.on);if(!p)return;p.on=true;p.y=560;p.str=strength;p.m.visible=true;},
    ringFlash(v=1){ringFlash=Math.max(ringFlash,v);},
    update(t,dt){
      cols.forEach((c,i)=>{c.head.rotation.y=t*0.6+c.ph;c.head.rotation.x=0.25*Math.sin(t*0.4+c.ph);const pul=0.5+0.5*Math.sin(t*3-c.ph*2);
        c.cm.opacity=Math.min(1,(0.25+0.55*pul+c.charge+ringFlash)*this.intensity);c.tip.visible=((t*2+i*0.37)%1)<0.5;c.charge=Math.max(0,c.charge-dt*2.2);});
      // regenerate arcs a few times per second for a crackling read
      if(Math.floor(t*24)!==this._f){this._f=Math.floor(t*24);let k=0;
        for(let i=0;i<NC;i++){if(arcOn[i]>0||R()<0.06*this.intensity)arcOn[i]=arcOn[i]>0?arcOn[i]:0.15+R()*0.25;
          const a0=cols[i].a,a1=a0+Math.PI*2/NC,on=arcOn[i]>0;let px,py,pz;
          for(let s=0;s<=SEG;s++){const u=s/SEG,a=a0+(a1-a0)*u,j=on?(s===0||s===SEG?0:(R()-0.5)*5):0;const x=Math.cos(a)*(180+j),y=18+(on?(R()-0.5)*4:-9999),z=Math.sin(a)*(180+j);
            if(s>0){arcP.set([px,py,pz,x,y,z],k);k+=6;}px=x;py=y;pz=z;}}
        arcG.attributes.position.needsUpdate=true;}
      for(let i=0;i<NC;i++)arcOn[i]=Math.max(0,arcOn[i]-dt);
      if(this.autoPulse){auto-=dt;if(auto<=0){auto=1.4+R()*1.2;this.pulse(0.7);}}
      for(const p of pulses)if(p.on){p.y-=p.sp*dt;p.m.position.y=p.y;const k=p.y/560;p.m.scale.set(0.6+0.6*k,1,0.6+0.6*k);p.m.material.uniforms.a.value=0.8*p.str;
        if(p.y<40){p.on=false;p.m.visible=false;fl=Math.max(fl,p.str);}}
      fl=Math.max(0,fl-dt*2.5);ringFlash=Math.max(0,ringFlash-dt*2);flash.material.opacity=fl*0.9;flash.scale.setScalar(80+fl*120);energy.light.intensity+=fl*8;}};
  return api;
}
