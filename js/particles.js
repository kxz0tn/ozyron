import * as THREE from 'three';
// seeded PRNG so capture renders are deterministic
export function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
// GPU point sprites with per-particle size (world units), alpha and grey level; soft gaussian falloff
export function pointCloud(N,{additive=true,soft=2.2}={}){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
  geo.setAttribute('size',new THREE.BufferAttribute(new Float32Array(N),1));
  geo.setAttribute('alpha',new THREE.BufferAttribute(new Float32Array(N),1));
  geo.setAttribute('lum',new THREE.BufferAttribute(new Float32Array(N),1));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,
    uniforms:{scale:{value:600*Math.max(1,(window.innerHeight||804)/804)},soft:{value:soft}},
    vertexShader:`attribute float size;attribute float alpha;attribute float lum;uniform float scale;varying float vA;varying float vL;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float s=size*scale/max(1.,-mv.z);
        vA=alpha*min(1.,s*s);gl_PointSize=max(1.,s);vL=lum;}`,
    fragmentShader:`uniform float soft;varying float vA;varying float vL;
      void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d)*4.;float a=exp(-r*soft)*(1.-smoothstep(.8,1.,r))*vA;if(a<.003)discard;gl_FragColor=vec4(vec3(vL),a);}`});
  const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;
  const P=[];for(let i=0;i<N;i++)P.push({p:new THREE.Vector3(0,-9999,0),v:new THREE.Vector3(),life:0,l0:1,s0:1,s1:1,lum:1,a0:1,ph:0});
  let head=0;
  return {pts,P,spawn(){const q=P[head];head=(head+1)%N;return q;},
    write(fn){const pa=geo.attributes.position.array,sa=geo.attributes.size.array,aa=geo.attributes.alpha.array,la=geo.attributes.lum.array;
      for(let i=0;i<N;i++){const q=P[i];if(q.life>0){const k=1-q.life/q.l0;const r=fn(q,k);pa[i*3]=q.p.x;pa[i*3+1]=q.p.y;pa[i*3+2]=q.p.z;sa[i]=r[0];aa[i]=r[1];la[i]=q.lum;}else{aa[i]=0;pa[i*3+1]=-9999;}}
      geo.attributes.position.needsUpdate=geo.attributes.size.needsUpdate=geo.attributes.alpha.needsUpdate=geo.attributes.lum.needsUpdate=true;}};
}
