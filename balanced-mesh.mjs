import {triangleQuality} from './triangle-quality.mjs';
// Conforming midpoint bisection. Shared edges are split on both incident faces.
// Coordinates stay on the original surface: no peak, fold or silhouette moves.
export function balanceTriangles(mesh,target){
 if(!(target>0))return {passes:0,splits:0};
 const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
 const length=(a,b)=>Math.hypot(...mesh.vertices[a].map((x,i)=>x-mesh.vertices[b][i]));
 let tags=mesh.faces.map((_,i)=>Object.keys(mesh.regions).find(k=>i>=mesh.regions[k][0]&&i<mesh.regions[k][1]));
 const stats={passes:0,splits:0};
 for(let pass=0;pass<8;pass++){
  const cuts=new Map();
  mesh.faces.forEach((f,j)=>{if(tags[j]==='base')return;const lengths=f.map((a,i)=>length(a,f[(i+1)%3]));const longest=Math.max(...lengths);if(longest<=target*1.5)return;
   lengths.forEach((L,i)=>{if(L<longest-1e-8)return;const a=f[i],b=f[(i+1)%3];cuts.set(key(a,b),{a,b});});});
    // A shared edge may only split when BOTH incident faces have room in plan.
  // This veto also prevents a broad neighbor from forcing cuts into a narrow ridge.
  for(const [j,f] of mesh.faces.entries()){
   const pts=f.map(i=>mesh.vertices[i]);
   const planArea=Math.abs((pts[1][0]-pts[0][0])*(pts[2][1]-pts[0][1])-(pts[1][1]-pts[0][1])*(pts[2][0]-pts[0][0]))/2;
   const cramped=tags[j]==='roof'&&(triangleQuality(pts,true)<.18||planArea<target*target*.04);
      for(let i=0;i<3;i++){
    const a=f[i],b=f[(i+1)%3],k=key(a,b);if(!cuts.has(k))continue;
    const A=mesh.vertices[a],B=mesh.vertices[b],C=mesh.vertices[f[(i+2)%3]],M=A.map((v,j)=>(v+B[j])/2),children=[[A,M,C],[M,B,C]];
    const poorer=children.some(t=>triangleQuality(t)<Math.min(.12,triangleQuality(pts)*.7));
    const planSliver=tags[j]==='roof'&&children.some(t=>triangleQuality(t,true)<.1);
    if(cramped||poorer||planSliver)cuts.delete(k);
   }
  }
  if(!cuts.size)break;
  if(mesh.faces.length+cuts.size*4>80000)break;
  for(const e of cuts.values())e.id=mesh.vertices.push(mesh.vertices[e.a].map((v,i)=>(v+mesh.vertices[e.b][i])/2))-1;
  const faces=[],nextTags=[];
  mesh.faces.forEach((f,j)=>{
   const ids=f.map((a,i)=>cuts.get(key(a,f[(i+1)%3]))?.id),count=ids.filter(x=>x!==undefined).length;
   const add=(...tri)=>{faces.push(tri);nextTags.push(tags[j]);};
   if(!count){add(...f);return;}
   if(count===3){const [a,b,c]=f,[ab,bc,ca]=ids;add(a,ab,ca);add(ab,b,bc);add(ca,bc,c);add(ab,bc,ca);return;}
   if(count===1){const i=ids.findIndex(x=>x!==undefined),a=f[i],b=f[(i+1)%3],c=f[(i+2)%3],m=ids[i];add(a,m,c);add(m,b,c);return;}
   const i=ids.findIndex(x=>x===undefined),a=f[i],b=f[(i+1)%3],c=f[(i+2)%3],bc=ids[(i+1)%3],ca=ids[(i+2)%3];
   add(c,ca,bc);
   if(length(a,bc)<length(b,ca)){add(a,b,bc);add(a,bc,ca);}else{add(a,b,ca);add(b,bc,ca);}
  });
  mesh.faces=faces;tags=nextTags;stats.passes++;stats.splits+=cuts.size;
 }
 for(const name of Object.keys(mesh.regions)){const start=tags.indexOf(name),end=tags.lastIndexOf(name)+1;mesh.regions[name]=[start,end];}
 return stats;
}


