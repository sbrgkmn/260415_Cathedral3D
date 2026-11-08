const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function developMargins(roof,boundary,p,valid){
 const stats={steps:0,lobes:0,notches:0,limited:false};
 if(p.marginSteps>3||p.marginSteps<0||p.marginSize<0||p.marginSize>.4||p.marginMin<=0)throw Error('Margins need 0-3 cycles, size 0-40%, and positive minimum edge length.');
 for(let step=0;step<p.marginSteps;step++){
  const vertices=roof.vertices,faces=roof.faces,uses=new Map();
  const tipFaces=new Set(roof.tipFaceIndices??faces.map((_,i)=>i).filter(i=>i>=roof.tipFaceStart));
  faces.forEach((f,i)=>{for(let j=0;j<3;j++)uses.set(key(f[j],f[(j+1)%3]),{index:i,tip:f[(j+2)%3]});});
  const signed=boundary.reduce((s,id,i)=>{const a=vertices[id],b=vertices[boundary[(i+1)%boundary.length]];return s+a[0]*b[1]-a[1]*b[0];},0),orientation=signed>0?1:-1;
  let accepted=false;
  for(let attempt=0;attempt<9;attempt++){
   const nextVertices=vertices.map(v=>[...v]),cuts=new Map(),nextBoundary=[];let count=0;
   for(let i=0;i<boundary.length;i++){
    const a=boundary[i],b=boundary[(i+1)%boundary.length],A=vertices[a],B=vertices[b],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy);nextBoundary.push(a);
    if(L<p.marginMin||p.marginSize===0)continue;
    const tip=vertices[uses.get(key(a,b)).tip],altitude=Math.abs(cross(A,B,tip))/L;
    // Limit the inward notch to the adjoining cell, not the whole branch.
    const amplitude=Math.min(L*p.marginSize,altitude*.25)*Math.pow(.5,attempt);
    if(amplitude<1e-5)continue;
    const ids=[];
    for(const [t,sign] of [[.25,1],[.5,-.55],[.75,1]]){const d=amplitude*sign;ids.push(nextVertices.push([A[0]+dx*t+orientation*dy/L*d,A[1]+dy*t-orientation*dx/L*d,A[2]*(1-t)+B[2]*t+amplitude*(sign>0?.7:.1)])-1);}
    cuts.set(key(a,b),{a,ids});nextBoundary.push(...ids);count++;
   }
   if(!count)return stats;
   const nextFaces=[],nextTipFaces=[];
   for(const [faceIndex,f] of faces.entries()){let changed=false;const polygon=[];for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3];polygon.push(a);const cut=cuts.get(key(a,b));if(cut){changed=true;polygon.push(...(cut.a===a?cut.ids:[...cut.ids].reverse()));}}
    if(!changed){if(tipFaces.has(faceIndex))nextTipFaces.push(nextFaces.length);nextFaces.push(f);continue;}
    const hub=nextVertices.push([0,1,2].map(axis=>f.reduce((s,id)=>s+vertices[id][axis],0)/3))-1;
    for(let i=0;i<polygon.length;i++){if(tipFaces.has(faceIndex))nextTipFaces.push(nextFaces.length);nextFaces.push([polygon[i],polygon[(i+1)%polygon.length],hub]);}
   }
   if(nextVertices.length>50000)throw Error('Margin detail exceeds the mesh budget. Increase minimum edge length or reduce cycles.');
   const candidate={vertices:nextVertices,faces:nextFaces};
   if(valid(candidate,nextBoundary)){roof.vertices=nextVertices;roof.faces=nextFaces;roof.tipFaceIndices=nextTipFaces;boundary.splice(0,boundary.length,...nextBoundary);stats.steps++;stats.lobes+=count*2;stats.notches+=count;stats.limited ||= attempt>0;accepted=true;break;}
  }
  if(!accepted)throw Error('Marginal growth crosses a neighboring fold. Reduce margin size or cycles.');
 }
 return stats;
}
