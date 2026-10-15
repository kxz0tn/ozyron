import * as THREE from 'three';
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
  const shipG=new THREE.ConeGeometry(2.4,12,8);shipG.rotateX(Math.PI/2);
  const shipM=new THREE.MeshStandardMaterial({color:0x666666,metalness:1,roughness:0.2});
  const flights=[];
  for(let i=0;i<5;i++){const m=new THREE.Mesh(shipG,shipM);const tail=new THREE.Mesh(new THREE.ConeGeometry(1.6,14,8,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false}));
    tail.rotation.x=-Math.PI/2;tail.position.z=-12;m.add(tail);g.add(m);
    const a=i*1.25,from=new THREE.Vector3(Math.cos(a)*300,4,Math.sin(a)*300),to=new THREE.Vector3(Math.cos(a+0.6)*1400,900,Math.sin(a+0.6)*1400);
    flights.push({m,tail,c:new THREE.CubicBezierCurve3(from,from.clone().setY(260),to.clone().multiplyScalar(0.4).setY(500),to),o:i/5,dur:26+i*3});}
  return {group:g,update(t){
    let i=0;for(const L of curves){for(let k=0;k<perLane;k++,i++){const u=((k/perLane)+L.dir*t*L.sp+1000)%1;
      L.c.getPointAt(u,p);L.c.getPointAt((u+0.002*L.dir+1)%1,tg);o.position.copy(p);o.lookAt(tg);o.rotateY(Math.PI/2);o.updateMatrix();cars.setMatrixAt(i,o.matrix);}}
    cars.instanceMatrix.needsUpdate=true;
    for(const f of flights){let u=((t/f.dur)+f.o)%1;const landing=Math.floor(t/f.dur+f.o)%2===1;if(landing)u=1-u;
      f.c.getPoint(u,p);f.c.getPoint(Math.min(1,Math.max(0,u+(landing?-0.01:0.01))),tg);f.m.position.copy(p);f.m.lookAt(tg);
      f.tail.scale.set(1,1+Math.random()*0.3,1);f.m.visible=u>0.01;}
  }};
}
