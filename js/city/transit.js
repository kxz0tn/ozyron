import * as THREE from 'three';
import {rng} from '../util.js';
// layered sky corridors, elevated rail loop with trains, and drones docking at tower tops
export function buildTransit(scene,{towers,tier}){
  const g=new THREE.Group();scene.add(g);const R=rng(91);
  const o=new THREE.Object3D(),p=new THREE.Vector3(),q=new THREE.Vector3();
  // --- sky corridors: straight high lanes in three altitude bands, both directions
  const corridors=[];const bands=[230,300,380];
  for(let b=0;b<3;b++)for(let k=0;k<3;k++){const a=b*0.7+k*Math.PI/3+R()*0.2,off=(k-1)*140,y=bands[b]+k*12;
    const d=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),n=new THREE.Vector3(-d.z,0,d.x);
    const A=d.clone().multiplyScalar(-900).addScaledVector(n,off).setY(y),B=d.clone().multiplyScalar(900).addScaledVector(n,off).setY(y);
    corridors.push({A,B,n,sp:0.018+R()*0.012});}
  const per=tier.traffic,NC=corridors.length*per*2;
  const craft=new THREE.InstancedMesh(new THREE.BoxGeometry(5,0.6,1.1),new THREE.MeshBasicMaterial({color:0xffffff}),NC);
  const trail=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,0.5),new THREE.MeshBasicMaterial({color:0x8a8a8a,transparent:true,opacity:0.35,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),NC);
  const col=new THREE.Color();for(let i=0;i<NC;i++){craft.setColorAt(i,col.setScalar(0.5+R()*0.5));}
  craft.frustumCulled=trail.frustumCulled=false;g.add(craft,trail);
  // corridor marker lights
  const mk=[];corridors.forEach(c=>{for(let i=0;i<=36;i++){const u=i/36;mk.push(c.A.clone().lerp(c.B,u).addScaledVector(c.n,6),c.A.clone().lerp(c.B,u).addScaledVector(c.n,-6));}});
  const mg=new THREE.BufferGeometry().setFromPoints(mk);const markers=new THREE.Points(mg,new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,transparent:true,opacity:0.5}));g.add(markers);
  // --- elevated rail: rounded rectangle along the street grid, pylons + twin rails
  const pts=[],corner=(cx,cz,a0)=>{for(let i=0;i<=6;i++){const a=a0+i/6*Math.PI/2;pts.push(new THREE.Vector3(cx+Math.cos(a)*40,44,cz+Math.sin(a)*40));}};
  corner(125,235,0);corner(-290,235,Math.PI/2);corner(-290,-235,Math.PI);corner(125,-235,Math.PI*1.5);
  const rail=new THREE.CatmullRomCurve3(pts,true,'centripetal');
  const railM=new THREE.MeshStandardMaterial({color:0x3a3a3a,metalness:0.9,roughness:0.35});
  g.add(new THREE.Mesh(new THREE.TubeGeometry(rail,400,2.2,6,true),railM));
  [-1.6,1.6].forEach(dy=>{const off=rail.getSpacedPoints(400).map((v,i,arr)=>v.clone().setY(v.y+2.4));const l=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(off),new THREE.LineBasicMaterial({color:0xbdbdbd}));l.position.y=dy*0.2;g.add(l);});
  const len=rail.getLength(),np=Math.floor(len/34);const pyl=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,1,2.4),railM,np),cap=new THREE.InstancedMesh(new THREE.BoxGeometry(9,1.6,3),railM,np);
  for(let i=0;i<np;i++){rail.getPointAt(i/np,p);o.position.set(p.x,p.y/2,p.z);o.rotation.set(0,0,0);o.scale.set(1,p.y,1);o.updateMatrix();pyl.setMatrixAt(i,o.matrix);
    rail.getTangentAt(i/np,q);o.position.set(p.x,p.y-1.5,p.z);o.scale.set(1,1,1);o.rotation.set(0,Math.atan2(q.x,q.z)+Math.PI/2,0);o.updateMatrix();cap.setMatrixAt(i,o.matrix);}
  g.add(pyl,cap);
  // trains: cars with lit window strips
  const wc=document.createElement('canvas');wc.width=128;wc.height=16;{const x=wc.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,128,16);for(let i=4;i<124;i+=8){x.fillStyle='#e8e8e8';x.fillRect(i,5,6,5);}}
  const wt=new THREE.CanvasTexture(wc);const carM=new THREE.MeshStandardMaterial({color:0x9a9a9a,metalness:0.6,roughness:0.3,emissive:0xffffff,emissiveMap:wt,emissiveIntensity:1.2});
  const trains=[0,0.5].map((u0,ti)=>({u0,sp:(ti?-1:1)*0.012,ph:ti*7,cars:Array.from({length:7},(_,k)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(16,4.2,4.4),carM);g.add(m);
    if(k===0){const hl=new THREE.Mesh(new THREE.BoxGeometry(0.3,1,3),new THREE.MeshBasicMaterial({color:0xffffff}));hl.position.x=8.2;m.add(hl);}return m;})}));
  // --- drones hopping between tower-top docks
  const tops=towers.towers.filter(t=>t.h>60).sort(()=>R()-0.5).slice(0,60);
  const padM=new THREE.MeshBasicMaterial({color:0xffffff});const pads=new THREE.InstancedMesh(new THREE.TorusGeometry(3,0.25,4,20),padM,tops.length);
  tops.forEach((t,i)=>{o.position.set(t.x,t.h+3,t.z);o.rotation.set(Math.PI/2,0,0);o.scale.set(1,1,1);o.updateMatrix();pads.setMatrixAt(i,o.matrix);});g.add(pads);
  const ND=tier.drones;const dr=[];for(let i=0;i<ND;i++){const a=tops[Math.floor(R()*tops.length)],b=tops[Math.floor(R()*tops.length)];dr.push({a,b,ph:R(),dur:14+R()*14});}
  const dg=new THREE.BoxGeometry(2.2,0.5,2.2);const drones=new THREE.InstancedMesh(dg,new THREE.MeshStandardMaterial({color:0x777777,metalness:0.7,roughness:0.4}),ND);
  const dl=new THREE.InstancedMesh(new THREE.SphereGeometry(0.55,6,4),new THREE.MeshBasicMaterial({color:0xffffff}),ND);drones.frustumCulled=dl.frustumCulled=false;g.add(drones,dl);
  return {group:g,rail,update(t,dt){
    let i=0;for(const c of corridors){for(let s=-1;s<=1;s+=2)for(let k=0;k<per;k++,i++){const u=((k/per+t*c.sp*s)%1+1)%1;p.copy(c.A).lerp(c.B,u).addScaledVector(c.n,s*3);
      o.position.copy(p);o.lookAt(p.x+(c.B.x-c.A.x)*s,p.y,p.z+(c.B.z-c.A.z)*s);o.rotateY(Math.PI/2);o.scale.set(1,1,1);o.updateMatrix();craft.setMatrixAt(i,o.matrix);
      o.translateX(-9);o.scale.set(14,1,1);o.updateMatrix();trail.setMatrixAt(i,o.matrix);}}
    craft.instanceMatrix.needsUpdate=trail.instanceMatrix.needsUpdate=true;markers.material.opacity=0.35+0.25*Math.sin(t*2);
    const prof=x=>{const a=0.25;return x<a?x*x/(2*a*(1-a)):x>1-a?1-(1-x)*(1-x)/(2*a*(1-a)):(x-a/2)/(1-a);};// accel / cruise / brake
    for(const tr of trains){const P=22,DW=6,c=((t+tr.ph)%(P+DW)),seg=Math.floor((t+tr.ph)/(P+DW));tr.s=(seg+prof(Math.min(1,c/P)))*0.25*Math.sign(tr.sp);}
    for(const tr of trains)tr.cars.forEach((m,k)=>{const u=((tr.u0+tr.s-k*0.0072*Math.sign(tr.sp))%1+1)%1;rail.getPointAt(u,p);rail.getPointAt((u+0.001)%1,q);m.position.copy(p).setY(p.y+5.2);m.lookAt(q.x,p.y+5.2,q.z);m.rotateY(tr.sp>0?-Math.PI/2:Math.PI/2);});
    for(let j=0;j<ND;j++){const d=dr[j];const u=((t/d.dur+d.ph)%1);let x,y,z;
      // dock (hover low over pad) -> lift -> cruise arc -> descend -> dock
      const A=d.a,B=d.b;if(u<0.18){x=A.x;z=A.z;y=A.h+4+u/0.18*2;}else if(u>0.82){x=B.x;z=B.z;y=B.h+6-(u-0.82)/0.18*2;}
      else{const k=(u-0.18)/0.64,e=k*k*(3-2*k);x=A.x+(B.x-A.x)*e;z=A.z+(B.z-A.z)*e;y=A.h+(B.h-A.h)*e+6+Math.sin(k*Math.PI)*(30+Math.hypot(B.x-A.x,B.z-A.z)*0.08);}
      const px=d.px??x,pz=d.pz??z;const vx=(x-px)/Math.max(dt,1e-3),vz=(z-pz)/Math.max(dt,1e-3);d.px=x;d.pz=z;const sp=Math.hypot(vx,vz);d.bank=(d.bank||0)+(Math.min(0.35,sp*0.01)-(d.bank||0))*Math.min(1,dt*3);o.position.set(x,y,z);o.rotation.set(0,sp>0.5?Math.atan2(-vz,vx):(d.yaw||0),0);d.yaw=o.rotation.y;o.rotateZ(-d.bank);o.scale.set(1,1,1);o.updateMatrix();drones.setMatrixAt(j,o.matrix);
      o.position.y-=0.6;const bl=((t*3+j)%1)<0.3?1:0.25;o.scale.setScalar(bl);o.updateMatrix();dl.setMatrixAt(j,o.matrix);}
    drones.instanceMatrix.needsUpdate=dl.instanceMatrix.needsUpdate=true;}};
}
