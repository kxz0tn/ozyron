// module registry: every mode (explore, photo, games, future modules) registers here.
// a module: {id, label, order, camera:{pos,target,fov}, enter(ctx), exit(ctx), step(dt,ctx) [fixed 120hz], frame(t,dt,ctx) [render rate]}
const mods=new Map();
export function register(m){if(mods.has(m.id))throw new Error('module exists: '+m.id);mods.set(m.id,{order:50,...m});return m;}
export function get(id){return mods.get(id);}
export function list(){return [...mods.values()].sort((a,b)=>a.order-b.order);}
