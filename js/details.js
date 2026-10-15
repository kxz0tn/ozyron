import * as THREE from 'three';
import {rng} from './util.js';
// realism layer: skybridges, rooftop pads, street grid with moving lights, glyph-free sign panels, haze layers
export function buildDetails(scene,towers,{seed=11}={}){
  const r=rng(seed),g=new THREE.Group();scene.add(g);
  const o=new THREE.Object3D(),white=new THREE.MeshBasicMaterial({color:0xffffff});
  const metal=new THREE.MeshStandardMaterial({color:0x2c2c2c,metalness:0.9,roughness:0.3});
  // skybridges between near neighbours
  const bridges=new THREE.InstancedMesh(new THREE.BoxGeometry(1,2.2,3),metal,900),strips=new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.25,0.25),white,900);
  bridges.count=strips.count=0;
  for(let i=0;i<towers.length;i++)for(let j=i+1;j<towers.length&&bridges.count<899;j++){const a=towers[i],b=towers[j],d=Math.hypot(a.x-b.x,a.z-b.z);
    if(d<14||d>55||r()>0.35)continue;const top=Math.min(a.h,b.h)*0.85;if(top<30)continue;
    for(let y=25+r()*15;y<top&&bridges.count<899;y+=40+r()*50){o.position.set((a.x+b.x)/2,y,(a.z+b.z)/2);o.rotation.set(0,-Math.atan2(b.z-a.z,b.x-a.x),0);o.scale.set(d,1,1);o.updateMatrix();
      bridges.setMatrixAt(bridges.count++,o.matrix);o.position.y-=1.2;o.updateMatrix();strips.setMatrixAt(strips.count++,o.matrix);}}
  g.add(bridges,strips);
  // rooftop landing pads (ring + deck) on wide mid towers
  const deck=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,0.6,24),metal,300),ring=new THREE.InstancedMesh(new THREE.TorusGeometry(0.85,0.04,4,32),white,300);deck.count=ring.count=0;
  for(const t of towers){if(t.h<60||t.h>220||r()>0.3||deck.count>=299)continue;const R=Math.max(5,t.w*0.6);
    o.rotation.set(0,0,0);o.position.set(t.x,t.h+0.3,t.z);o.scale.set(R,1,R);o.updateMatrix();deck.setMatrixAt(deck.count++,o.matrix);
    o.rotation.set(Math.PI/2,0,0);o.position.y+=0.4;o.scale.set(R,R,R);o.updateMatrix();ring.setMatrixAt(ring.count++,o.matrix);}
  g.add(deck,ring);
  // signage: abstract stripe/bar panels, no glyphs
  const sc=document.createElement('canvas');sc.width=64;sc.height=256;const x=sc.getContext('2d');x.fillStyle='#111';x.fillRect(0,0,64,256);
  for(let y=6;y<250;y+=14){x.fillStyle=`rgb(${200+y%50},${200+y%50},${200+y%50})`;x.fillRect(6,y,8+((y*7)%44),6);}x.strokeStyle='#fff';x.lineWidth=3;x.strokeRect(2,2,60,252);
  const st=new THREE.CanvasTexture(sc),signs=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,4),new THREE.MeshBasicMaterial({map:st,side:THREE.DoubleSide}),400);signs.count=0;
  for(const t of towers){if(r()>0.4||signs.count>=399)continue;const a=r()*Math.PI*2,s=3+r()*4;o.position.set(t.x+Math.cos(a)*(t.w*0.55+0.5),10+r()*Math.min(80,t.h*0.6),t.z+Math.sin(a)*(t.w*0.55+0.5));
    o.rotation.set(0,-a+Math.PI/2,0);o.scale.set(s,s,s);o.updateMatrix();signs.setMatrixAt(signs.count++,o.matrix);}
  g.add(signs);
  // street grid + moving ground traffic
  const span=1100,step=55,roadM=new THREE.MeshStandardMaterial({color:0x0c0c0c,metalness:0.95,roughness:0.08});
  const roads=[];for(let k=-span/2;k<=span/2;k+=step){roads.push({ax:'x',k},{ax:'z',k});}
  const roadG=new THREE.PlaneGeometry(span,7);roadG.rotateX(-Math.PI/2);
  for(const rd of roads){const m=new THREE.Mesh(roadG,roadM);m.position.y=0.15;if(rd.ax==='x')m.position.z=rd.k;else{m.rotation.y=Math.PI/2;m.position.x=rd.k;}g.add(m);}
  const per=26,N=roads.length*per,cars=new THREE.InstancedMesh(new THREE.BoxGeometry(2.6,0.6,1),white,N);g.add(cars);
  const lanes=[];for(let i=0;i<N;i++)lanes.push({rd:roads[Math.floor(i/per)],u:r(),sp:(0.01+r()*0.02)*(r()<0.5?1:-1),side:r()<0.5?-1.6:1.6});
  // haze layers
  const hz=[];for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshBasicMaterial({color:0x9a9a9a,transparent:true,opacity:0.018,depthWrite:false}));
    m.rotation.x=-Math.PI/2;m.position.y=15+i*45;g.add(m);hz.push(m);}
  return {group:g,update(t){for(let i=0;i<N;i++){const c=lanes[i],u=((c.u+t*c.sp)%1+1)%1,p=(u-0.5)*span;
      if(c.rd.ax==='x')o.position.set(p,0.6,c.rd.k+c.side);else o.position.set(c.rd.k+c.side,0.6,p);o.rotation.set(0,c.rd.ax==='x'?0:Math.PI/2,0);o.scale.set(1,1,1);o.updateMatrix();cars.setMatrixAt(i,o.matrix);}
    cars.instanceMatrix.needsUpdate=true;hz.forEach((m,i)=>m.position.x=Math.sin(t*0.02+i)*40);}};
}
