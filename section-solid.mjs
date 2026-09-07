const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const equal=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8;

// Clip the material polygon to its right half. Triangulating one half and
// reflecting its triangles makes the cap's tessellation symmetric as well.
export function sectionProfile(points,preserve=[]) {
  let half=[];
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length],insideA=a[0]>=0,insideB=b[0]>=0;
    if(insideA)half.push([...a]);
    if(insideA!==insideB){const t=-a[0]/(b[0]-a[0]);half.push([0,a[1]+t*(b[1]-a[1])]);}
  }
  half=half.filter((p,i)=>!equal(p,half[(i+half.length-1)%half.length]));
  let changed=true;
  while(changed&&half.length>3) {
    changed=false;
    for(let i=0;i<half.length;i++) {
      const a=half[(i+half.length-1)%half.length],b=half[i],c=half[(i+1)%half.length];
      if(b[0]!==0&&!preserve.some(p=>equal(p,b))&&Math.abs(cross(a,b,c))<1e-8*Math.max(1,Math.hypot(c[0]-a[0],c[1]-a[1]))) {
        half.splice(i,1);changed=true;break;
      }
    }
  }
  const axis=half.map((p,i)=>({p,i})).filter(({p})=>Math.abs(p[0])<1e-8).sort((a,b)=>b.p[1]-a.p[1]);
  if(axis.length!==2)throw new Error('Section must meet its symmetry axis along one material interval.');
  const start=axis[0].i;half=[...half.slice(start),...half.slice(0,start)];
  if(half[1][0]===0)half=[half[0],...half.slice(1).reverse()];
  const profile=[...half,...half.slice(1,-1).reverse().map(([x,y])=>[-x,y])];
  return {half,profile};
}

export function triangulateSection(points) {
  const order=points.map((_,i)=>i),faces=[];
  const area=points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a[0]*b[1]-b[0]*a[1];},0);
  if(area<0)order.reverse();
  const inTriangle=(p,a,b,c)=>cross(a,b,p)>=-1e-10&&cross(b,c,p)>=-1e-10&&cross(c,a,p)>=-1e-10;
  while(order.length>3) {
    let clipped=false;
    for(let i=0;i<order.length;i++) {
      const a=order[(i+order.length-1)%order.length],b=order[i],c=order[(i+1)%order.length];
      if(cross(points[a],points[b],points[c])<=1e-10)continue;
      if(order.some(j=>j!==a&&j!==b&&j!==c&&inTriangle(points[j],points[a],points[b],points[c])))continue;
      faces.push([a,b,c]);order.splice(i,1);clipped=true;break;
    }
    if(!clipped)throw new Error('The section cannot be triangulated without a degenerate face.');
  }
  faces.push([...order]);return faces;
}

export function meshIntegrity(mesh) {
  const edges=new Map(),used=new Set(),adjacency=mesh.vertices.map(()=>[]),links=mesh.vertices.map(()=>[]),faceKeys=new Set();
  let volume=0,degenerateFaces=0,duplicateFaces=0;
  for(const face of mesh.faces) {
    const [a,b,c]=face.map(i=>mesh.vertices[i]);
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
    const normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(Math.hypot(...normal)<1e-10||new Set(face).size!==3)degenerateFaces++;
    volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    const fk=face.slice().sort((a,b)=>a-b).join(',');if(faceKeys.has(fk))duplicateFaces++;faceKeys.add(fk);
    for(let i=0;i<3;i++) {
      const a=face[i],b=face[(i+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;
      if(!edges.has(key))edges.set(key,[]);edges.get(key).push([a,b]);used.add(a);used.add(b);adjacency[a].push(b);adjacency[b].push(a);
      links[a].push([b,face[(i+2)%3]]);
    }
  }
  let boundaryEdges=0,nonManifoldEdges=0,windingErrors=0,components=0,nonManifoldVertices=0;
  for(const uses of edges.values()) {
    if(uses.length===1)boundaryEdges++;
    if(uses.length>2)nonManifoldEdges++;
    if(uses.length===2&&uses[0][0]===uses[1][0])windingErrors++;
  }
  const seen=new Set();for(const v of used)if(!seen.has(v)){components++;const stack=[v];seen.add(v);while(stack.length){for(const w of adjacency[stack.pop()])if(!seen.has(w)){seen.add(w);stack.push(w);}}}
  for(const v of used) {
    const ring=new Map();for(const [a,b] of links[v]){if(!ring.has(a))ring.set(a,[]);if(!ring.has(b))ring.set(b,[]);ring.get(a).push(b);ring.get(b).push(a);}
    const visited=new Set(),stack=[ring.keys().next().value];while(stack.length){const v=stack.pop();if(visited.has(v))continue;visited.add(v);for(const w of ring.get(v))stack.push(w);}
    if(visited.size!==ring.size||[...ring.values()].some(neighbors=>neighbors.length!==2))nonManifoldVertices++;
  }
  return {watertight:boundaryEdges===0&&nonManifoldEdges===0&&nonManifoldVertices===0&&windingErrors===0&&degenerateFaces===0&&duplicateFaces===0&&volume>0,boundaryEdges,nonManifoldEdges,nonManifoldVertices,windingErrors,degenerateFaces,duplicateFaces,components,volume,vertices:used.size,faces:mesh.faces.length,euler:used.size-edges.size+mesh.faces.length};
}
