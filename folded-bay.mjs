import { normalizeParameters, bayOffsets } from './section-grammar.mjs';
import { sectionProfile, triangulateSection } from './section-solid.mjs';

// X / height / longitudinal Z. Boundary strips carry the extrados, intrados and
// pier soles. Material-only end faces connect them into one closed volume.
export function buildFoldedBay(frame,input={}) {
  const p=normalizeParameters(input),features=frame.pinnacles??[];
  const preserve=features.flatMap(f=>[f.left,f.right]);
  const {half,profile}=sectionProfile(frame.carrierPoints??frame.points,preserve);
  const vertices=[],faces=[],faceKinds=[],lookup=new Map(),n=profile.length;
  const vertex=point=>{
    const key=point.map(x=>(Math.abs(x)<1e-9?0:x).toFixed(9)).join(',');
    if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(point.map(x=>Math.abs(x)<1e-9?0:x));}
    return lookup.get(key);
  };
  const collarDepth=p.depth*.22;
  const vaultRise=Math.min(.055*p.fold*p.depth,p.height*(.10+.48*p.pinnacle)*.10);
  // Two projecting support planes flank a recessed middle. The deformation
  // increases toward the feet: a battered buttress, not a uniform roof warp.
  // Each horizontal level scales positively, preserving the material passages.
  const transform=([x,y],z)=>{
    const t=Math.abs(z),weight=t<=collarDepth?t/collarDepth:(p.depth/2-t)/(p.depth/2-collarDepth);
    const active=features.length?1:0;
    return [x*(1+.30*p.buttress*active*weight*Math.max(0,1-y/p.height)),y+vaultRise*active*weight*(y/p.height)**2,z];
  };
  const stations=[p.depth/2,collarDepth,0];
  const mirrored=features.flatMap(f=>f.center===0?[f]:[f,{...f,center:-f.center,left:[-f.right[0],f.right[1]],right:[-f.left[0],f.left[1]]}]);
  const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8;
  const onPatch=(a,b)=>mirrored.some(f=>{
    const peak=[f.center,f.base];
    return (same(a,peak)&&(same(b,f.left)||same(b,f.right)))||(same(b,peak)&&(same(a,f.left)||same(a,f.right)));
  });
  const creaseEdges=[];
  for(let i=0;i<n;i++) {
    const j=(i+1)%n;
    for(let band=0;band<stations.length-1;band++)for(const sign of [1,-1]) {
      // The spire replaces this roof patch. There is no hidden roof face under
      // it, so the pinnacle and bay form a single manifold solid.
      if(band===1&&onPatch(profile[i],profile[j]))continue;
      const q=[transform(profile[i],stations[band]),transform(profile[j],stations[band]),transform(profile[j],stations[band+1]),transform(profile[i],stations[band+1])].map(([x,y,z])=>vertex([x,y,z*sign]));
      // Mirror the diagonal choice across X. The paired half-bay reverses
      // winding across Z, so both the panels and crease graph are symmetric.
      const split=(profile[i][0]+profile[j][0])>=0?[[0,1,2],[0,2,3]]:[[0,1,3],[1,2,3]];
      for(const f of split){const face=f.map(k=>q[k]);faces.push(sign===1?face:[face[0],face[2],face[1]]);faceKinds.push('shell');}
      creaseEdges.push([q[0],q[3]]);
    }
  }
  const pinnacleTips=[];
  for(const f of mirrored) {
    const L=f.left,R=f.right,P=[f.center,f.base];
    // Counterclockwise viewed from above: eight boundary points retain all
    // carrier-strip vertices and prevent T-junctions at the attachment.
    const ring=[[L,-collarDepth],[L,0],[L,collarDepth],[P,collarDepth],[R,collarDepth],[R,0],[R,-collarDepth],[P,-collarDepth]].map(([point,z])=>transform(point,z));
    // Neck rings contract in BOTH plan directions; every tip is one vertex.
    const neck=ring.map(([x,,z])=>[f.center+(x-f.center)*f.neck,f.stem,z*f.neck]);
    const bottom=ring.map(vertex),upper=neck.map(vertex),tip=vertex([f.center,f.tip,0]);
    pinnacleTips.push(tip);
    for(let i=0;i<8;i++) {
      const j=(i+1)%8;
      const meanX=(ring[i][0]+ring[j][0])/2,meanZ=(ring[i][2]+ring[j][2])/2;
      const q=[bottom[i],bottom[j],upper[j],upper[i]];
      // Reflect diagonal decisions as well as vertices in both symmetry planes.
      const split=meanX*meanZ>=0?[[0,1,2],[0,2,3]]:[[0,1,3],[1,2,3]];
      for(const face of split){faces.push(face.map(k=>q[k]));faceKinds.push('shell');}
      faces.push([upper[i],upper[j],tip]);faceKinds.push('shell');
      creaseEdges.push([bottom[i],upper[i]],[upper[i],tip],[upper[i],upper[j]]);
    }
  }
  const caps=triangulateSection(half);
  for(const zSign of [1,-1])for(const xSign of [1,-1]) {
    const ids=half.map(([x,y])=>vertex([x*xSign,y,zSign*p.depth/2]));
    for(const f of caps){const face=f.map(i=>ids[i]);faces.push(zSign*xSign===1?face:[face[0],face[2],face[1]]);faceKinds.push(zSign===1?'front':'back');}
  }
  // A second, longitudinal contraction opens the lower silhouette between the
  // support planes. It develops with C maturity. Lift the whole local web so
  // it stays connected, tapering the displacement to zero at the crown.
  // The center transverse section and both array interfaces remain unchanged.
  const maturity=1-Math.exp(-(features[0]?.age??0));
  const heights=features.flatMap(f=>[[Math.max(0,f.center-f.width),f.base],[f.center+f.width,f.base]]);
  const supportHeight=x=>{
    x=Math.abs(x);
    for(let i=1;i<heights.length;i++) {
      const [a,b]=[heights[i-1],heights[i]];
      if(x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
    }
    return heights.at(-1)?.[1]??p.height;
  };
  for(const point of vertices) {
    const z=Math.abs(point[2]),t=z<=collarDepth?z/collarDepth:(p.depth/2-z)/(p.depth/2-collarDepth);
    const datum=supportHeight(point[0]);
    point[1]+=.52*p.longitudinal*maturity*t*Math.max(0,datum-point[1]);
  }
  return {vertices,faces,faceKinds,creaseEdges,pinnacleTips,sectionVertexCount:n,profile};
}

export function repeatFoldedBay(mesh,input={},array=false) {
  const p=normalizeParameters(input),offsets=bayOffsets(p,array),vertices=[],faces=[],faceKinds=[],creaseEdges=[],lookup=new Map();
  const joined=offsets.length>1&&p.gap===0;
  for(let bay=0;bay<offsets.length;bay++) {
    const offset=offsets[bay];
    const indices=mesh.vertices.map(([x,y,z])=>{
      const point=[x,y,z+offset],key=point.map(v=>(Math.abs(v)<1e-8?0:v).toFixed(8)).join(',');
      if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(point);}
      return lookup.get(key);
    });
    for(let i=0;i<mesh.faces.length;i++) {
      const kind=mesh.faceKinds[i];
      if(joined&&((kind==='front'&&bay<offsets.length-1)||(kind==='back'&&bay>0)))continue;
      faces.push(mesh.faces[i].map(i=>indices[i]));faceKinds.push(kind);
    }
    for(const edge of mesh.creaseEdges)creaseEdges.push(edge.map(i=>indices[i]));
  }
  return {vertices,faces,faceKinds,creaseEdges,bayCount:offsets.length};
}
