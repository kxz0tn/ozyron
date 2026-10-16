import * as THREE from 'three';
// deep night -> pale dawn -> night. drives sky dome, fog, lights, stars and the tower lighting waves.
export function buildDayNight(scene,{world,towers,period=210}={}){
  const sky=new THREE.Mesh(new THREE.SphereGeometry(2400,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{d:{value:0},t:{value:0}},
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float d,t;varying vec3 vP;
      float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
      void main(){float y=vP.y;float hor=exp(-max(y,0.)*5.);float east=pow(max(0.,dot(normalize(vec3(vP.x,0.,vP.z)),normalize(vec3(-.6,0.,-1.)))),3.);
        float l=.008+hor*(.035+d*(.28+.35*east))+d*.12*(1.-y)+max(-y,0.)*.0;
        float band=exp(-pow((y-.08)*18.,2.))*d*.12; // thin bright horizon line at dawn
        gl_FragColor=vec4(vec3(l+band),1.);}`}));
  sky.renderOrder=-10;scene.add(sky);scene.background=null;
  const hemi=scene.children.find(o=>o.isHemisphereLight),dir=scene.children.find(o=>o.isDirectionalLight);
  const fogA=new THREE.Color(0x060606),fogB=new THREE.Color(0x404040);
  const api={n:1,d:0,override:null,cycle:true,period,phase:0,
    update(t,dt){let p;if(this.override!==null)p=this.override;else if(this.cycle){this.phase=(this.phase+dt/period)%1;p=this.phase;}else p=this.phase=0;
      // deep night lingers: n stays near 1 for a long stretch, dawn is a shorter pale window
      const c=Math.cos(p*Math.PI*2);const n=THREE.MathUtils.smoothstep(c,-0.9,0.35);this.n=n;this.d=1-n;
      sky.material.uniforms.d.value=this.d;sky.position.copy(scene.userData.cam?scene.userData.cam.position:sky.position);
      scene.fog.color.copy(fogA).lerp(fogB,this.d);scene.fog.density=0.0009+this.d*0.0006;
      if(hemi)hemi.intensity=0.35+this.d*0.9;if(dir)dir.intensity=0.5+this.d*1.0;
      if(world.stars)world.stars.material.opacity=1-this.d*0.92;
      // tower lights switch on in a wave travelling out from the core as night falls, and off again at dawn
      towers.U.uNight.value=n;towers.U.uWaveR.value=THREE.MathUtils.clamp((n-0.3)/0.45,0,1)*1500;towers.U.uT.value=t;}};
  return api;
}
