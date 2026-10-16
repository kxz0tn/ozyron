import * as THREE from 'three';
import {shipHull} from '../shipyard.js';
// shipyard expansion: two more dry docks with bridge cranes and ships at different build stages
export function buildDocks(yard){
  const g=new THREE.Group();yard.add(g);
  const dark=new THREE.MeshStandardMaterial({color:0x101010,metalness:0.9,roughness:0.45});
  const steel=new THREE.MeshStandardMaterial({color:0x6c6c6c,metalness:0.85,roughness:0.35});
  const white=new THREE.MeshBasicMaterial({color:0xffffff});
  const hullM=new THREE.MeshStandardMaterial({color:0xc4c4c4,metalness:0.3,roughness:0.45,emissive:0x262626,side:THREE.DoubleSide});
  const cranes=[];
  [-128,128].forEach((dz,di)=>{const d=new THREE.Group();d.position.z=dz;g.add(d);
    const pit=new THREE.Mesh(new THREE.BoxGeometry(210,3,72),dark);pit.position.y=1.5;d.add(pit);
    [-35,35].forEach(z=>{const s=new THREE.Mesh(new THREE.BoxGeometry(210,0.5,0.6),white);s.position.set(0,3.3,z);d.add(s);});
    for(let x=-90;x<=90;x+=30){const m=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,6),white);m.position.set(x,3.3,0);d.add(m);}
    // crane runway legs + rails
    for(let x=-100;x<=100;x+=50)[-38,38].forEach(z=>{const l=new THREE.Mesh(new THREE.BoxGeometry(2.6,62,2.6),steel);l.position.set(x,33,z);d.add(l);});
    [-38,38].forEach(z=>{const r=new THREE.Mesh(new THREE.BoxGeometry(206,2.4,2.6),steel);r.position.set(0,64,z);d.add(r);});
    // bridge crane: bridge moves along x, trolley along z, hook raises/lowers a hull plate
    const bridge=new THREE.Group();bridge.position.y=67;d.add(bridge);
    const bb=new THREE.Mesh(new THREE.BoxGeometry(6,4,80),steel);bridge.add(bb);const bl=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,74),white);bl.position.y=-2.3;bridge.add(bl);
    const trolley=new THREE.Mesh(new THREE.BoxGeometry(8,4,8),dark);trolley.position.y=-3;bridge.add(trolley);
    const cable=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,1,4),white);trolley.add(cable);
    const load=new THREE.Mesh(new THREE.BoxGeometry(14,1.2,8),hullM);trolley.add(load);
    const beacon=new THREE.Mesh(new THREE.SphereGeometry(0.8,8,6),white);beacon.position.y=2.6;trolley.add(beacon);
    cranes.push({bridge,trolley,cable,load,beacon,ph:di*2.1});
    // ship at a different stage of construction
    if(di===0){ // stage 1: keel + ribs only
      const keel=new THREE.Mesh(new THREE.BoxGeometry(110,2,2.4),steel);keel.position.y=14;d.add(keel);
      for(let i=0;i<16;i++){const u=i/15,R=Math.sin((0.1+u*0.8)*Math.PI)**0.6*9*0.85+1;const r=new THREE.Mesh(new THREE.TorusGeometry(R,0.32,5,28,Math.PI*1.4),i%3?steel:white);
        r.rotation.y=Math.PI/2;r.rotation.x=-Math.PI*0.2;r.position.set(-50+u*100,14+R*0.9,0);d.add(r);}
      for(let k=0;k<5;k++){const a=-0.4+k*0.45,sp=new THREE.Mesh(new THREE.BoxGeometry(100,0.5,0.5),steel);sp.position.set(0,14+8+Math.cos(a)*7,Math.sin(a)*7);d.add(sp);}
      for(let x=-40;x<=40;x+=20){[-6,6].forEach(z=>{const st=new THREE.Mesh(new THREE.BoxGeometry(1.4,12,1.4),steel);st.position.set(x,8,z);d.add(st);});}
    }else{ // stage 2: half-plated hull (clipped), wings not yet fitted
      const s=shipHull(hullM,white);s.scale.setScalar(0.62);s.position.y=16;d.add(s);
      const clip=new THREE.Plane(new THREE.Vector3(-1,0,0),0);hullM.clippingPlanes=[clip];
      s.children.forEach(c=>{if(c.geometry&&c.geometry.type==='ExtrudeGeometry')c.visible=false;});
      cranes[1].clip=clip;cranes[1].dockX=yard;
      for(let x=-30;x<=30;x+=30){[-7,7].forEach(z=>{const st=new THREE.Mesh(new THREE.BoxGeometry(1.4,14,1.4),steel);st.position.set(x,7,z);d.add(st);});}
    }
    // floodlight masts
    [-108,108].forEach(x=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1.4,40,1.4),steel);m.position.set(x,20,0);d.add(m);const h=new THREE.Mesh(new THREE.BoxGeometry(5,1.6,3),white);h.position.set(x,40,0);d.add(h);});
  });
  const wp=new THREE.Vector3();
  return {group:g,update(t){cranes.forEach((c,i)=>{const s=t*0.09+c.ph;c.bridge.position.x=Math.sin(s)*80;c.trolley.position.z=Math.sin(s*1.7)*28;
      const drop=18+16*(0.5+0.5*Math.sin(s*2.3));c.cable.scale.y=drop;c.cable.position.y=-drop/2;c.load.position.y=-drop-0.6;c.beacon.visible=Math.sin(t*4+i)>0;
      });
    if(cranes[1]&&cranes[1].clip){const yard=cranes[1].dockX;yard.updateMatrixWorld();const n=new THREE.Vector3(-1,0,0).transformDirection(yard.matrixWorld);
      g.children[1].localToWorld(wp.set(10,0,0));const c=cranes[1].clip;c.normal.copy(n);c.constant=-n.dot(wp)+Math.sin(t*0.05)*6;}}};
}
