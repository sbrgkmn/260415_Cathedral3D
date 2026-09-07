import {normalizeParameters,bayOffsets} from './cell-grammar.mjs';
import {sectionProfile,triangulateSection} from './section-solid.mjs';

// The same material boundary is folded through five mirrored stations. The
// middle slice is exact. No supplementary pinnacles or architectural objects.
export function buildFoldedBay(frame,input={}){
  const p=normalizeParameters(input),{half,profile}=sectionProfile(frame.points);
  const H=Math.max(...profile.map(p=>p[1])),vertices=[],faces=[],faceKinds=[],creaseEdges=[],lookup=new Map();
  const vertex=point=>{const key=point.map(v=>(Math.abs(v)<1e-9?0:v).toFixed(9)).join(',');if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(point.map(v=>Math.abs(v)<1e-9?0:v));}return lookup.get(key);};
  // Uniform scale at each station keeps corresponding edge strips planar.
  // Independent X/Y warps can cross thin recursive webs after triangulation.
  const transform=([x,y],station)=>station===0?[x,y,0]:station===1?[x*(1-.06*p.fold),y*(1-.06*p.fold)+H*.18*p.fold,p.depth*.25]:[x*(1-.14*p.fold),y*(1-.14*p.fold),p.depth*.5];
  for(let i=0;i<profile.length;i++){
    const j=(i+1)%profile.length;
    for(const band of [2,1])for(const sign of [-1,1]){
      const q=[transform(profile[i],band),transform(profile[j],band),transform(profile[j],band-1),transform(profile[i],band-1)].map(([x,y,z])=>vertex([x,y,z*sign]));
      const split=profile[i][0]+profile[j][0]>=0?[[0,1,2],[0,2,3]]:[[0,1,3],[1,2,3]];
      for(const f of split){const face=f.map(k=>q[k]);faces.push(sign===1?face:[face[0],face[2],face[1]]);faceKinds.push('shell');}
      creaseEdges.push([q[0],q[3]]);
    }
  }
  for(const signZ of [-1,1])for(const signX of [-1,1]){
    const ids=half.map(([x,y])=>{const v=transform([x*signX,y],2);return vertex([v[0],v[1],v[2]*signZ]);});
    for(const f of triangulateSection(half)){const face=f.map(i=>ids[i]);faces.push(signZ*signX===1?face:[face[0],face[2],face[1]]);faceKinds.push(signZ===1?'front':'back');}
  }
  return {vertices,faces,faceKinds,creaseEdges,profile};
}
export function repeatFoldedBay(mesh,input={},array=false){
  const p=normalizeParameters(input),offsets=bayOffsets(p,array),joined=array&&p.gap===0,vertices=[],faces=[],faceKinds=[],creaseEdges=[],lookup=new Map();
  for(let k=0;k<offsets.length;k++){
    const ids=mesh.vertices.map(([x,y,z])=>{const point=[x,y,z+offsets[k]],key=point.map(v=>(Math.abs(v)<1e-8?0:v).toFixed(8)).join(',');if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(point);}return lookup.get(key);});
    for(let i=0;i<mesh.faces.length;i++){const kind=mesh.faceKinds[i];if(joined&&((kind==='front'&&k<offsets.length-1)||(kind==='back'&&k>0)))continue;faces.push(mesh.faces[i].map(i=>ids[i]));faceKinds.push(kind);}
    for(const e of mesh.creaseEdges)creaseEdges.push(e.map(i=>ids[i]));
  }
  return {vertices,faces,faceKinds,creaseEdges,bayCount:offsets.length};
}
