import {meshIntegrity} from './section-solid.mjs';
import {developVerticalEC} from './vertical-ec.mjs?v=39';
import {balanceTriangles} from './balanced-mesh.mjs';
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function valid(roof,boundary){
 const v=roof.vertices,poly=boundary.map(i=>v[i]);
 for(let i=0;i<poly.length;i++)for(let j=i+2;j<poly.length;j++){
  if(i===0&&j===poly.length-1)continue;
  const a=poly[i],b=poly[(i+1)%poly.length],c=poly[j],d=poly[(j+1)%poly.length];
  if(cross(a,b,c)*cross(a,b,d)<-1e-9&&cross(c,d,a)*cross(c,d,b)<-1e-9)return false;
 }
 let area=0;for(const f of roof.faces){const a=cross(...f.map(i=>v[i]));if(a<1e-9)return false;area+=a;}
 const polygon=poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-a[1]*b[0];},0);
 return Math.abs(polygon-area)<Math.max(1e-6,Math.abs(polygon)*1e-8);
}
export function buildLeaf(p,{capture=false}={},closeRoof){
 if(!Number.isInteger(p.leafCycles)||p.leafCycles<0||p.leafCycles>4)throw Error('Use 0-4 leaf cycles.');
 if(p.leafSpan<=0||p.height<=p.wall||p.wall<=0||p.leafMin<=0)throw Error('Use positive dimensions with height above the base.');
 if(p.leafContraction<=0||p.leafContraction>=.85||p.leafExpansion<=0||p.leafExpansion>.8||p.leafDecay<=0||p.leafDecay>=1)throw Error('Leaf C must be 0-85%, E 0-80%, and child peak ratio 0-100%.');
 if(p.leafAspect<=0||p.leafBalance<=0||p.leafBalance>=1)throw Error("Leaf aspect must be positive and balance between 0 and 1.");
 const r=p.leafSpan/2,vertices=[[0,0,p.height],[-r,-r,p.wall],[r,-r,p.wall],[r,r,p.wall],[-r,r,p.wall]];
 const angle=p.leafRotation*Math.PI/180;
 for(const point of vertices.slice(1)){const x=point[0]/Math.sqrt(p.leafAspect),y=point[1]*Math.sqrt(p.leafAspect)*2*(point[1]>0?p.leafBalance:1-p.leafBalance);point[0]=x*Math.cos(angle)-y*Math.sin(angle);point[1]=x*Math.sin(angle)+y*Math.cos(angle);}
 let boundary=[1,2,3,4];const faces=boundary.map((a,i)=>[0,a,boundary[(i+1)%4]]);
 let roof={vertices,faces,ridges:[],tipFaceStart:Infinity,widths:[p.leafSpan]},active=faces.map((f,sector)=>({face:f,apex:0,a:f[1],b:f[2],depth:0,sector}));
 const nodes=[{id:0,point:[...vertices[0]],generation:0,parent:null,kind:'root'}],edges=[],nodeFor=new Map([[0,0]]),snapshots=[],operations=[];
 const record=(label,r=roof,b=boundary)=>{if(capture)snapshots.push({label,roof:structuredClone(r),boundary:[...b]});};
 record('Seed - four-triangle pyramid');

 function orient(f){if(cross(...f.map(i=>roof.vertices[i]))<0)[f[1],f[2]]=[f[2],f[1]];return f;}
 function register(id,parent,depth,kind){if(nodeFor.has(id))return nodeFor.get(id);const n=nodes.length;nodes.push({id:n,parent:nodeFor.get(parent)??0,point:[...roof.vertices[id]],generation:depth,kind});edges.push([nodes[n].parent,n]);nodeFor.set(id,n);return n;}
 function establishSpines(){
  const next=[],newFaces=[],loop=[];
  for(let i=0;i<4;i++){const a=boundary[i],b=boundary[(i+1)%4],A=roof.vertices[a],B=roof.vertices[b],mid=roof.vertices.push(A.map((v,j)=>(v+B[j])/2))-1;loop.push(a,mid);
   for(const [tip,other]of [[a,mid],[b,mid]]){const f=orient([0,tip,other]);newFaces.push(f);next.push({face:f,apex:0,a:f[1],b:f[2],depth:0,sector:tip-1,axisTip:tip});}
  }
  roof.faces=newFaces;boundary=loop;active=next;
 }
 function addSpineStations(cycle){
  const groups=new Map();for(const cell of active){if(cell.axisTip===undefined)continue;const key=cell.apex+':'+cell.axisTip;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(cell);}
  const replacements=new Map(),cuts=new Map(),next=[],processed=new Set();let stations=0;
  for(const pair of groups.values()){
   if(pair.length!==2)continue;
   const {apex,axisTip:tip,depth}=pair[0],P=roof.vertices[apex],T=roof.vertices[tip],L=Math.hypot(T[0]-P[0],T[1]-P[1]);
   const count=Math.min(5,Math.floor(L/(p.spineSpacing*p.spineSpacingDecay**depth)));
   if(count<2)continue;
   const ridge=[apex];let parent=apex;
   for(let j=1;j<count;j++){const t=j/count,id=roof.vertices.push(P.map((v,k)=>v+(T[k]-v)*t))-1;ridge.push(id);register(id,parent,depth,'station');roof.ridges.push([parent,id]);parent=id;stations++;}ridge.push(tip);roof.ridges.push([parent,tip]);
   for(const cell of pair){
    processed.add(cell);const other=cell.a===tip?cell.b:cell.a,O=roof.vertices[other],side=[other];
    for(let j=1;j<count;j++){const t=j/count;side.push(roof.vertices.push(O.map((v,k)=>v+(T[k]-v)*t))-1);}side.push(tip);
    const panels=[];
    for(let j=0;j<count;j++){
     if(j<count-1)panels.push(orient([ridge[j],ridge[j+1],side[j+1]]));
     const face=orient([ridge[j],side[j+1],side[j]]);panels.push(face);next.push({face,apex:ridge[j],a:face[1],b:face[2],depth,sector:cell.sector});
    }
    replacements.set(cell.face,panels);cuts.set(cell.a,{b:cell.b,ids:cell.a===other?side.slice(1,-1):side.slice(1,-1).reverse()});
   }
  }
  roof.faces=roof.faces.flatMap(f=>replacements.get(f)??[f]);boundary=boundary.flatMap((a,i)=>{const c=cuts.get(a);return c?.b===boundary[(i+1)%boundary.length]?[a,...c.ids]:[a];});active=[...active.filter(c=>!processed.has(c)),...next];
  if(stations)record(`Axis ${cycle+1} - repeated spine stations`);
 }
 if(p.spineGrowth){if(p.spineSpacing<=0||p.spineSpacingDecay<=0)throw Error('Spine spacing and decay must be positive.');establishSpines();}
 for(let cycle=0;cycle<p.leafCycles;cycle++){
  if(p.spineGrowth)addSpineStations(cycle);

  const radial=cell=>Math.hypot((roof.vertices[cell.a][0]+roof.vertices[cell.b][0])/2,(roof.vertices[cell.a][1]+roof.vertices[cell.b][1])/2);
  const chosen=active.filter(cell=>{
   if(Math.abs(cross(...cell.face.map(i=>roof.vertices[i])))/2<p.leafMin)return false;
   if(p.leafPattern===2)return cell.sector%2===0;
   if(p.leafPattern===3)return cell.sector%2===cycle%2;
   if(p.leafPattern===1&&cycle>0)return radial(cell)>=Math.max(...active.filter(c=>c.apex===cell.apex).map(radial))-1e-7;
   return true;
  });
  const deferred=active.filter(cell=>!chosen.includes(cell));
  if(!chosen.length)continue;
  // C: each live boundary edge retreats toward its own parent apex.
  const replacements=new Map(),inserts=new Map(),contracted=[];
  for(const cell of chosen){const {apex,a,b,depth}=cell,A=roof.vertices[a],B=roof.vertices[b],P=roof.vertices[apex],c=p.leafContraction;
   const q=roof.vertices.push([(A[0]+B[0])*.5*(1-c)+P[0]*c,(A[1]+B[1])*.5*(1-c)+P[1]*c,(A[2]+B[2])*.5])-1;
   const parts=[[apex,a,q],[apex,q,b]];replacements.set(cell.face,parts);inserts.set(a,{b,ids:[q]});
   for(const f of parts)contracted.push({face:f,apex,a:f[1],b:f[2],depth,sector:cell.sector});
  }
  roof.faces=roof.faces.flatMap(f=>replacements.get(f)??[f]);boundary=boundary.flatMap((a,i)=>{const cut=inserts.get(a);return cut?.b===boundary[(i+1)%boundary.length]?[a,...cut.ids]:[a];});
  if(!valid(roof,boundary))throw Error('Leaf contraction creates an invalid local cell.');
  record(`C${cycle+1} - divide parent lobes`);operations.push({type:'C',cycle:cycle+1,cells:chosen.length});
  // E: the newly created edges produce shoulders and child axes. Retry the whole
  // symmetry family together if neighboring shoulders would intersect.
  let accepted=false;
  for(let attempt=0;attempt<10;attempt++){
   const candidate={...roof,vertices:roof.vertices.map(v=>[...v]),faces:[],ridges:[...roof.ridges]},replacements=new Map(),inserts=new Map(),children=[],peaks=[];
   for(const cell of contracted){const {apex,a,b,depth}=cell,A=candidate.vertices[a],B=candidate.vertices[b],P=candidate.vertices[apex],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy),offset=L*p.leafExpansion*2**(-attempt);
    const gain=depth===0?(p.leafPeakPattern===1?(cell.sector%2===0?1.8:.8):p.leafPeakPattern===2?1.55:p.leafPeakPattern===3?(cell.sector===0?1.9:.85):1):1;
    const rise=(P[2]-p.wall)*p.leafDecay*gain;
    const shoulder=[(A[0]+B[0])*.5+dy/L*offset,(A[1]+B[1])*.5-dx/L*offset,p.wall+rise*.18];
    const s=candidate.vertices.push(shoulder)-1;
    const center=[(P[0]+A[0]+B[0]+shoulder[0])/4,(P[1]+A[1]+B[1]+shoulder[1])/4,p.wall+rise];
    const q=candidate.vertices.push(center)-1;
    const parts=[[apex,a,q],[a,s,q],[s,b,q],[b,apex,q]];
    replacements.set(cell.face,parts);inserts.set(a,{b,ids:[s]});candidate.ridges.push([apex,q],[q,s]);
    children.push({face:parts[1],apex:q,a,b:s,depth:depth+1,sector:cell.sector,axisTip:s},{face:parts[2],apex:q,a:s,b,depth:depth+1,sector:cell.sector,axisTip:s});peaks.push({vertex:q,parent:apex,depth:depth+1});
   }
   candidate.faces=roof.faces.flatMap(f=>replacements.get(f)??[f]);
   const loop=boundary.flatMap((a,i)=>{const cut=inserts.get(a);return cut?.b===boundary[(i+1)%boundary.length]?[a,...cut.ids]:[a];});
   if(!valid(candidate,loop))continue;
   roof=candidate;boundary=loop;active=[...deferred,...children];
   for(const peak of peaks){const id=nodes.length,parent=nodeFor.get(peak.parent);nodes.push({id,parent,point:[...roof.vertices[peak.vertex]],generation:peak.depth,kind:'branch'});edges.push([parent,id]);nodeFor.set(peak.vertex,id);}
   record(`E${cycle+1} - grow child lobes`);operations.push({type:'E',cycle:cycle+1,cells:contracted.length,amplitudeScale:2**(-attempt)});accepted=true;break;
  }
  if(!accepted)throw Error('Leaf shoulders overlap. Reduce expansion or contraction.');
 }
 const refinement=developVerticalEC(roof,p,capture?(label,r)=>record(label,r,boundary):null);
 const solid=closeRoof(roof,boundary),triangleBalance=balanceTriangles(solid,p.triangleSize);
 if(p.triangleSize>0){roof.vertices=solid.vertices;roof.faces=solid.faces.slice(...solid.regions.roof);}
 const integrity=meshIntegrity(solid);if(!integrity.watertight)throw Error('Leaf solid failed closure validation.');
 const sequence=capture?snapshots.map(frame=>{const solid=closeRoof(frame.roof,frame.boundary),integrity=meshIntegrity(solid);if(!integrity.watertight)throw Error(frame.label+' failed closure validation');return {...frame,solid,integrity};}):undefined;
 return {parameters:p,nodes,edges,roof,boundary,solid,integrity,sequence,refinement,triangleBalance,operations,margins:{lobes:operations.filter(o=>o.type==='E').reduce((s,o)=>s+o.cells,0)},heightScale:1,branchWidth:p.leafSpan,widthRange:[p.leafSpan,p.leafSpan]};
}
