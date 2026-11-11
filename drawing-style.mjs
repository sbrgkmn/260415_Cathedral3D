export const isoProject=([x,y,z])=>[(x-y)/Math.sqrt(2),(x+y)/Math.sqrt(6)-z*Math.sqrt(2/3)];
const toneCache=new WeakMap();
export function prepareFaceTones(mesh){
 if(toneCache.has(mesh.vertices))return;
 const neighbors=mesh.faces.map(()=>new Set()),edges=new Map();
 mesh.faces.forEach((f,i)=>{for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],k=a<b?`${a}:${b}`:`${b}:${a}`;if(edges.has(k)){const other=edges.get(k);neighbors[i].add(other);neighbors[other].add(i);}else edges.set(k,i);}});
 const colors=[],tones=new Map();mesh.faces.forEach((f,i)=>{const used=new Set([...neighbors[i]].map(j=>colors[j]));let color=0;while(used.has(color))color++;colors[i]=color;tones.set(f.join(':'),[1,.58,.82,.68][color%4]);});if(mesh.regions?.walls)for(let i=mesh.regions.walls[0];i<mesh.regions.walls[1];i++)tones.set(mesh.faces[i].join(':'),.85);toneCache.set(mesh.vertices,tones);
}
export function facetGray(vertices,face,strength){
 const tone=toneCache.get(vertices)?.get(face.join(':'))??.85;
 return Math.round(255*(1-strength*(1-tone)));
}

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function silhouetteClasses(mesh){
 const points=mesh.vertices.map(isoProject),edges=new Map(),bins=new Map(),size=32;
 const min=[0,1].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1].map(i=>Math.max(...points.map(p=>p[i]))),span=Math.max(max[0]-min[0],max[1]-min[1],1),cell=span/size;
 const coordinate=(p,i)=>Math.floor((p[i]-min[i])/cell);
 const triangles=mesh.faces.map(f=>f.map(i=>points[i]));
 mesh.faces.forEach((f,index)=>{const t=triangles[index],[a,b,c]=t,cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  if(Math.abs(cross)>1e-10){const lo=[0,1].map(i=>Math.min(...t.map(p=>coordinate(p,i)))),hi=[0,1].map(i=>Math.max(...t.map(p=>coordinate(p,i))));for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++){const k=x+':'+y;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(index);}}
  for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],k=key(a,b);if(!edges.has(k))edges.set(k,{a,b,sides:[]});edges.get(k).sides.push(cross>0);}
 });
 const occupied=p=>{for(const index of bins.get(coordinate(p,0)+':'+coordinate(p,1))??[]){const [a,b,c]=triangles[index],cross=(a,b)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),s=[cross(a,b),cross(b,c),cross(c,a)];if(s.every(x=>x>=-1e-10)||s.every(x=>x<=1e-10))return true;}return false;};
 const result=new Map();
 for(const [k,e] of edges){if(e.sides.length>1&&e.sides.every(x=>x===e.sides[0]))continue;const a=points[e.a],b=points[e.b],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);if(L<1e-10)continue;const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],eps=span/10000,n=[-dy/L*eps,dx/L*eps];const inner=occupied(mid.map((v,i)=>v+n[i]))&&occupied(mid.map((v,i)=>v-n[i]));result.set(k,{...e,weight:inner?'inner':'outline'});}
 return result;
}

const closureCache=new WeakMap();
// Coplanar closure diagonals are tessellation, not architectural folds.
export function hiddenClosureEdges(mesh){
 if(closureCache.has(mesh))return closureCache.get(mesh);
 const hidden=new Set(),edges=new Map(),range=mesh.regions?.walls;
 if(range)for(let i=range[0];i<range[1];i++){
  const f=mesh.faces[i],[a,b,c]=f.map(id=>mesh.vertices[id]),u=b.map((x,j)=>x-a[j]),v=c.map((x,j)=>x-a[j]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],L=Math.hypot(...n),normal=n.map(x=>x/L);
  for(let j=0;j<3;j++){const k=key(f[j],f[(j+1)%3]);if(edges.has(k)){const other=edges.get(k);if(normal.reduce((sum,x,j)=>sum+x*other[j],0)>1-1e-8)hidden.add(k);}else edges.set(k,normal);}
 }
 closureCache.set(mesh,hidden);return hidden;
}
