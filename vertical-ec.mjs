import {triangleQuality} from './triangle-quality.mjs';
// Conforming, tip-directed expansion/contraction on sloping roof edges.
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const area=(v,f)=>{const [a,b,c]=f.map(i=>v[i]);return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;};
export function developVerticalEC(roof,p,record=null){
 const stats={splits:0,depth:0,expansions:0,contractions:0,stopped:0,passes:[]};
 let frontier=null;
 let tipFaces=new Set(roof.tipFaceIndices??roof.faces.map((_,i)=>i).filter(i=>i>=roof.tipFaceStart));
 const measure=(index)=>{const f=roof.faces[index],plan=area(roof.vertices,f);if(!tipFaces.has(index)||plan<1e-9)return plan;const [a,b,c]=f.map(i=>roof.vertices[i]),u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;};
 for(let step=0;step<p.verticalSteps;step++){
  const uses=new Map();roof.faces.forEach((f,index)=>{for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],k=key(a,b);if(!uses.has(k))uses.set(k,{a,b,faces:[]});uses.get(k).faces.push(index);}});
  const cuts=new Map(),next=new Set();
  for(const [k,e] of uses){
   if(frontier&&!frontier.has(k))continue;
   // Leave the outer boundary and vertical gables intact. Both neighbors
   // must have room for a new fold, avoiding a hanging vertex at any scale.
   if(e.faces.length!==2)continue;
      if(p.triangleSize>0&&e.faces.some(i=>triangleQuality(roof.faces[i].map(id=>roof.vertices[id]),true)<.22)){stats.stopped++;continue;}
   const areas=e.faces.map(measure);
   if(Math.min(...areas)<p.minArea){stats.stopped++;continue;}
   let lo=e.a,hi=e.b;if(roof.vertices[lo][2]>roof.vertices[hi][2])[lo,hi]=[hi,lo];
   const A=roof.vertices[lo],B=roof.vertices[hi],rise=B[2]-A[2];
   if(rise<1e-6)continue;
   const strength=Math.min(.55,p.verticalLift);
   const point=(t,z)=>[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+rise*z];
   const expansion=roof.vertices.push(point(.42,.42+strength*.8))-1;
   const contraction=roof.vertices.push(point(.64,.64-strength*.6))-1;
   cuts.set(k,{lo,hi,ids:[expansion,contraction]});next.add(key(contraction,hi));
   stats.splits++;stats.expansions++;stats.contractions++;
  }
  if(!cuts.size)break;
  if(roof.vertices.length+roof.faces.length>50000)throw Error('E/C development exceeds the interactive mesh budget. Increase minimum triangle area or reduce steps.');
  const faces=[],expansionFaces=[],nextTipFaces=new Set();
  const contractions=new Set([...cuts.values()].map(c=>c.ids[1]));
  for(const [faceIndex,f] of roof.faces.entries()){const polygon=[];let changed=false;
   for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3];polygon.push(a);const cut=cuts.get(key(a,b));if(cut){changed=true;polygon.push(...(cut.lo===a?cut.ids:[...cut.ids].reverse()));}}
   if(!changed){if(tipFaces.has(faceIndex))nextTipFaces.add(faces.length);faces.push(f);expansionFaces.push(f);continue;}
   // An interior hub connects the conforming edge chains. Its coordinates
   // remain on the parent plane; only E/C edge points alter the surface.
   const center=[0,1,2].map(axis=>f.reduce((sum,id)=>sum+roof.vertices[id][axis],0)/3),hub=roof.vertices.push(center)-1;
   const expanded=polygon.filter(id=>!contractions.has(id));
   for(let i=0;i<expanded.length;i++)expansionFaces.push([expanded[i],expanded[(i+1)%expanded.length],hub]);
   for(let i=0;i<polygon.length;i++){if(tipFaces.has(faceIndex))nextTipFaces.add(faces.length);faces.push([polygon[i],polygon[(i+1)%polygon.length],hub]);}
  }
  if(record)record(`E${step+1} - vertical shoulders`,{...roof,faces:expansionFaces});
  roof.faces=faces;tipFaces=nextTipFaces;
  if(record)record(`C${step+1} - vertical valleys`,roof);
  roof.ridges=roof.ridges.flatMap(([a,b])=>{const c=cuts.get(key(a,b));if(!c)return [[a,b]];const chain=[a,...(c.lo===a?c.ids:[...c.ids].reverse()),b];return chain.slice(1).map((id,i)=>[chain[i],id]);});
  stats.depth=step+1;stats.passes.push({step:step+1,folds:cuts.size,faces:faces.length});frontier=next;
 }
 return stats;
}
