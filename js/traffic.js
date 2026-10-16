import * as THREE from 'three';
import {shipHull} from './shipyard.js';
import {rng,pointCloud} from './particles.js';
// flying traffic lanes (instanced light streaks) + launching/landing ships
export function buildTraffic(scene,{lanes=14,perLane=60}={}){
  const g=new THREE.Group();scene.add(g);
  const curves=[];
  for(let i=0;i<lanes;i++){const R=140+i*28,y=50+(i%5)*35,tilt=(i%3-1)*0.08,pts=[];
    for(let k=0;k<16;k++){const a=k/16*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*R*(1+0.15*Math.sin(a*3+i)),y+Math.sin(a*2+i)*R*tilt,Math.sin(a)*R));}
    const c=new THREE.CatmullRomCurve3(pts,true);curves.push({c,dir:i%2?1:-1,sp:0.012+((i*7)%5)*0.003});
    const lg=new THREE.BufferGeometry().setFromPoints(c.getSpacedPoints(300));
    g.add(new THREE.LineLoop(lg,new THREE.LineBasicMaterial({color:0x444444,transparent:true,opacity:0.35})));}
  const N=lanes*perLane,cars=new THREE.InstancedMesh(new THREE.BoxGeometry(3.2,0.5,0.7),new THREE.MeshBasicMaterial({color:0xffffff}),N);
  const col=new THREE.Color();for(let i=0;i<N;i++){const l=0.45+((i*37)%11)/20;cars.setColorAt(i,col.setScalar(l));}
  g.add(cars);
  const o=new THREE.Object3D(),p=new THREE.Vector3(),tg=new THREE.Vector3();
  // ships: launch from shipyard pad region & land
  const shipG=new THREE.ConeGeometry(3.2,18,8);shipG.rotateX(Math.PI/2);
  const shipM=new THREE.MeshStandardMaterial({color:0xb0b0b0,metalness:0.5,roughness:0.3,emissive:0x3a3a3a});
  const flights=[];
  // animated exhaust plume: tapered, fading, flickering turbulence
  const plumes=[];
  const plumeMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{t:{value:0},seed:{value:0}},
    vertexShader:`uniform float t;uniform float seed;varying vec2 vU;varying vec3 vN;varying vec3 vV;
      void main(){vU=uv;vec3 p=position;float k=1.-uv.y;
        p.xz*=1.+0.18*sin(uv.y*18.-t*40.+seed)*uv.y; // turbulence widens/ripples toward the tail
        vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalMatrix*normal;vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float t;uniform float seed;varying vec2 vU;varying vec3 vN;varying vec3 vV;
      float h(vec2 q){return fract(sin(dot(q,vec2(12.9898,78.233)))*43758.5453);}
      float n(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){float v=vU.y;float fall=pow(1.-v,1.6);
        float turb=n(vec2(vU.x*12.,v*10.-t*26.+seed))*0.6+n(vec2(vU.x*30.,v*24.-t*55.))*0.4;
        float flick=0.82+0.18*sin(t*63.+seed)*sin(t*37.+seed*2.);
        float edge=0.35+0.65*pow(abs(dot(normalize(vN),normalize(vV))),0.8);
        float core=smoothstep(0.35,0.,v)*0.6;
        float a=(fall*(0.45+0.75*turb)+core)*edge*flick;
        gl_FragColor=vec4(vec3(1.),clamp(a*1.4,0.,1.));}`});
  const heroMetal=new THREE.MeshStandardMaterial({color:0xc8c8c8,metalness:0.35,roughness:0.4,emissive:0x2a2a2a}),heroWhite=new THREE.MeshBasicMaterial({color:0xffffff});
  for(let i=0;i<5;i++){let m;if(i===0){m=new THREE.Group();const h=shipHull(heroMetal,heroWhite);h.rotation.y=-Math.PI/2;h.scale.setScalar(0.32);h.traverse(o=>{if(o.geometry&&o.geometry.type==='TorusGeometry')o.visible=false;});m.add(h);}else m=new THREE.Mesh(shipG,shipM);const tail=new THREE.Mesh(new THREE.ConeGeometry(2.4,34,16,24,true),plumeMat.clone());tail.material.uniforms.seed.value=i*7.3;plumes.push(tail.material);
    tail.rotation.x=-Math.PI/2;tail.position.z=-26;m.add(tail);if(i>0)[-1,1].forEach(k=>{const w=new THREE.Mesh(new THREE.BoxGeometry(9,0.5,5),shipM);w.position.set(k*4.5,0,-3);w.rotation.y=k*0.5;m.add(w);});g.add(m);
    const a=i*1.25,from=new THREE.Vector3(Math.cos(a)*300,4,Math.sin(a)*300),to=new THREE.Vector3(Math.cos(a+0.6)*1400,900,Math.sin(a+0.6)*1400);
    flights.push({m,tail,c:new THREE.CubicBezierCurve3(from,from.clone().setY(260),to.clone().multiplyScalar(0.4).setY(500),to),o:i/5,dur:26+i*3});}
  // hero exhaust: layered particle plume (hot core, turbulent billow, fading smoke trail) in world space
  flights[0].tail.visible=false;
  const R=rng(4242),core=pointCloud(5000,{additive:true,soft:2.4}),bil=pointCloud(5000,{additive:true,soft:1.6}),smoke=pointCloud(4000,{additive:false,soft:1.4});
  g.add(smoke.pts);g.add(bil.pts);g.add(core.pts);
  const nz=new THREE.Vector3(),bk=new THREE.Vector3(),rt=new THREE.Vector3(),up=new THREE.Vector3(),prev=new THREE.Vector3(),sv=new THREE.Vector3();let havePrev=false,ac=[0,0,0];
  const turb=(q,t,amp)=>{q.v.x+=amp*Math.sin(q.p.y*0.21+t*3.1+q.ph)*0.5;q.v.y+=amp*Math.sin(q.p.z*0.19+t*2.7+q.ph*1.7)*0.5;q.v.z+=amp*Math.sin(q.p.x*0.23+t*3.4+q.ph*0.6)*0.5;};
  function exhaust(t,dt){const f=flights[0],m=f.m;if(!m.visible||dt<=0){havePrev=false;return;}
    m.updateMatrixWorld(true);nz.set(0,0,-9.5);m.localToWorld(nz);g.worldToLocal(nz);
    bk.set(0,0,-1).transformDirection(m.matrixWorld);rt.set(1,0,0).transformDirection(m.matrixWorld);up.set(0,1,0).transformDirection(m.matrixWorld);
    if(havePrev)sv.copy(nz).sub(prev).divideScalar(dt);else sv.set(0,0,0);prev.copy(nz);havePrev=true;
    const thr=0.82+0.18*Math.sin(t*41)*Math.sin(t*27+1.3)+0.08*(R()-0.5); // per-frame throttle flicker
    const emit=(cl,rate,i,fn)=>{ac[i]+=rate*dt*thr;while(ac[i]>=1){ac[i]-=1;const q=cl.spawn();fn(q,R()*dt);}};
    emit(core,6500,0,(q,sub)=>{const a=R()*6.283,r=Math.sqrt(R())*0.9;q.p.copy(nz).addScaledVector(rt,Math.cos(a)*r).addScaledVector(up,Math.sin(a)*r);
      q.v.copy(bk).multiplyScalar(70+R()*40).addScaledVector(rt,(R()-.5)*6).addScaledVector(up,(R()-.5)*6).add(sv);q.p.addScaledVector(q.v,-sub);
      q.l0=q.life=0.08+R()*0.16;q.s0=0.6+R()*0.6;q.lum=1;q.a0=0.42*thr;q.ph=R()*9;});
    emit(bil,2600,1,(q,sub)=>{const a=R()*6.283,r=Math.sqrt(R())*1.6;q.p.copy(nz).addScaledVector(rt,Math.cos(a)*r).addScaledVector(up,Math.sin(a)*r);
      q.v.copy(bk).multiplyScalar(40+R()*35).addScaledVector(rt,(R()-.5)*14).addScaledVector(up,(R()-.5)*14).addScaledVector(sv,0.7);
      q.l0=q.life=0.25+R()*0.45;q.s0=0.9+R()*1.1;q.lum=0.9;q.a0=0.15;q.ph=R()*9;});
    emit(smoke,650,2,(q,sub)=>{q.p.copy(nz).addScaledVector(bk,4+R()*6).addScaledVector(rt,(R()-.5)*2).addScaledVector(up,(R()-.5)*2);
      q.v.copy(bk).multiplyScalar(12+R()*10).addScaledVector(rt,(R()-.5)*6).addScaledVector(up,(R()-.5)*6).addScaledVector(sv,0.25);
      q.l0=q.life=1.6+R()*1.8;q.s0=1.6+R()*1.6;q.lum=0.42+R()*0.12;q.a0=0.13;q.ph=R()*9;});
    for(const [cl,dr,amp] of [[core,0.5,0],[bil,1.8,5],[smoke,0.9,3]])for(const q of cl.P)if(q.life>0){q.life-=dt;if(amp)turb(q,t,amp*dt*10);q.v.multiplyScalar(Math.max(0,1-dr*dt));q.p.addScaledVector(q.v,dt);}
    core.write((q,k)=>[q.s0*(1-0.7*k),q.a0*(1-k)]);
    bil.write((q,k)=>[q.s0*(1+2.5*k),q.a0*Math.pow(1-k,1.5)*(0.7+0.3*Math.sin(t*30+q.ph))]);
    smoke.write((q,k)=>[q.s0*(1+4*k),q.a0*Math.sin(Math.PI*Math.min(1,k*1.15))*(1-k)]);}
  return {group:g,flights,update(t,dt=0){plumes.forEach(m=>m.uniforms.t.value=t);
    let i=0;for(const L of curves){for(let k=0;k<perLane;k++,i++){const u=((k/perLane)+L.dir*t*L.sp+1000)%1;
      L.c.getPointAt(u,p);L.c.getPointAt((u+0.002*L.dir+1)%1,tg);o.position.copy(p);o.lookAt(tg);o.rotateY(Math.PI/2);o.updateMatrix();cars.setMatrixAt(i,o.matrix);}}
    cars.instanceMatrix.needsUpdate=true;
    for(const f of flights){let u=((t/f.dur)+f.o)%1;const landing=Math.floor(t/f.dur+f.o)%2===1;if(landing)u=1-u;
      f.c.getPoint(u,p);f.c.getPoint(Math.min(1,Math.max(0,u+(landing?-0.01:0.01))),tg);f.m.position.copy(p);f.m.lookAt(tg);
      f.tail.scale.set(1,1+0.12*Math.sin(t*23.+f.o*9.),1);f.m.visible=u>0.01;}
    exhaust(t,dt);
  }};
}
