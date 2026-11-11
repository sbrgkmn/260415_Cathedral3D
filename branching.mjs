import {buildLeaf} from './leaf-growth.mjs?v=50';
import {planStages} from './plan-sequence.mjs?v=50';
import {balanceTriangles} from './balanced-mesh.mjs';
import {developMargins} from './marginal-growth.mjs?v=50';
import {developVerticalEC} from './vertical-ec.mjs?v=39';
import {meshIntegrity} from './section-solid.mjs';

export const DEFAULTS=Object.freeze({levels:2,angle:70,length:65,lengthRatio:.7,stemLength:35,branchWidth:20,height:125,falloff:.72,wall:38,valley:.68,growth:0,spacing:18,spurRatio:.65,spurAngle:75,descent:.7,angleRatio:.5,spacingRatio:.35,growthLength:.65,growthAngle:.8,widthFill:1,forkIncrement:0,sideIncrement:0,spineWidth:1,projectionWidth:1,verticalSteps:0,minArea:10,verticalLift:.3,nave:0,branchTaper:.65,branchReach:1,morphology:0,packing:1,proportionLock:1,tipNose:0,marginSteps:0,marginSize:.15,marginMin:6,leftRight:.5,frontBack:.5,balanceMode:0,baseRiseRatio:0,triangleSize:0,symmetryGroups:0,generator:0,leafCycles:2,leafSpan:80,leafContraction:.4,leafExpansion:.22,leafDecay:.65,leafMin:8,leafAspect:1,leafRotation:0,leafPattern:0,leafPeakPattern:0,leafBalance:.5,spineGrowth:0,spineSpacing:18,spineSpacingDecay:.3});
export const MOUNTAIN_DEFAULTS=Object.freeze({...DEFAULTS,angle:90,length:25,lengthRatio:.52,stemLength:13,branchWidth:27,height:180,wall:8,falloff:.48,valley:.72});
export const RANGE_DEFAULTS=Object.freeze({...MOUNTAIN_DEFAULTS,levels:2,angle:150,length:90,lengthRatio:.6,stemLength:55,branchWidth:28,height:125,falloff:.62,growth:2,spacing:16,spurRatio:.85,spurAngle:80,descent:.62});
export function normalize(input={}) {
  // Migrate old bookmarks to measured lengths and a full fork angle.
  input={...input};
  if(input.spread!==undefined||input.depth!==undefined){
    const dx=Number(input.spread??150)/4,dy=Number(input.depth??105)/Math.max(1,Number(input.levels??2));
    input.angle??=2*Math.atan2(dx,dy)*180/Math.PI;input.length??=Math.hypot(dx,dy);input.stemLength??=Number(input.depth??105)*.28;
  }
  if(input.thickness!==undefined)input.branchWidth??=2*Math.min(Number(input.depth??105)*.28,Number(input.spread??150)/2**Number(input.levels??2))*Number(input.thickness);
  const p={};for(const [k,value] of Object.entries(DEFAULTS)){const n=Number(input[k]??value);p[k]=Number.isFinite(n)?n:value;}
  if(p.symmetryGroups){p.leftRight=.5;p.frontBack=.5;}
  p.marginSteps=Math.round(p.marginSteps);p.verticalSteps=Math.max(0,Math.round(p.verticalSteps));p.growth=Math.max(0,Math.round(p.growth));p.levels=Math.round(p.levels);return p;
}
const mix=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function tree(input={}) {
  const p=normalize(input),nodes=[],edges=[];
  if(p.levels<1)throw Error('Branch generations must be at least 1.');
  if(2**(p.levels+1)>512)throw Error('This tree exceeds the interactive budget of 512 peak nodes. Reduce branch generations.');
  for(const key of ['length','lengthRatio','stemLength','branchWidth','falloff','valley','wall'])if(p[key]<=0)throw Error(`${key} must be positive to form a non-degenerate volume.`);
  if(p.spineWidth<=0||p.projectionWidth<=0||p.branchTaper<=0||p.branchReach<=0)throw Error('Width ratios must be positive.');
  if(p.widthFill<=0)throw Error('Branch fullness must be positive.');
  if(p.height<=p.wall)throw Error('Central peak height must be above the eave height.');
  function add(x,y,g,parent=null,heading=0,kind='branch'){const id=nodes.length;nodes.push({id,parent,birthParent:parent,generation:g,heading,kind,point:[x,y,p.wall+(p.height-p.wall)*p.falloff**g]});if(parent!==null)edges.push([parent,id]);return id;}
  const root=add(0,0,0,null,0,'root');
  function fork(parent,g){
    if(g>p.levels)return;
    const source=nodes[parent],length=p.length*p.lengthRatio**(g-1),forkAngle=p.angle*p.angleRatio**(g-1)+p.forkIncrement*(g-1),turn=forkAngle*Math.PI/360;
    if(forkAngle<=0||forkAngle>=360)throw Error("Progressive fork angles must stay between 0 and 360 degrees.");
    for(const sign of [-1,1]){const heading=source.heading+sign*turn;const child=add(source.point[0]+Math.sin(heading)*length,source.point[1]+Math.cos(heading)*length,g,parent,heading);fork(child,g+1);}
  }
  if(!p.morphology&&!p.balanceMode){fork(root,1);add(0,-p.stemLength,1,root,Math.PI,'stem');}
  else {
    const turn=p.angle*Math.PI/360;
    const headings=p.morphology===0?[-turn,turn,Math.PI-turn,Math.PI+turn]:p.morphology===1?[0,Math.PI]:p.morphology===2?[0,Math.PI/2,Math.PI,Math.PI*1.5]:Array.from({length:6},(_,i)=>i*Math.PI/3);
    for(const heading of headings){const child=add(Math.sin(heading)*p.length,Math.cos(heading)*p.length,1,root,heading);fork(child,2);}
  }
  if(p.leftRight<=0||p.leftRight>=1||p.frontBack<=0||p.frontBack>=1)throw Error('Body balances must be between 0 and 1, excluding collapsed endpoints.');
  for(const n of nodes){n.point[0]*=2*(n.point[0]>=0?p.leftRight:1-p.leftRight);n.point[1]*=2*(n.point[1]>=0?p.frontBack:1-p.frontBack);}
  // Parametric production: F(L) -> F(s)[+B][-B] ... F(remainder).
  // Apply to every existing edge, including the rear stem; recurse on new spurs.
  if(p.growth){
    if(p.spacing<=0||p.spurRatio<=0||p.spurAngle<=0||p.spurAngle>=180||p.descent<=0||p.descent>=1)throw Error('Growth needs positive spacing/length, an angle between 0 and 180 degrees, and descent between 0 and 100%.');
    for(const key of ['angleRatio','spacingRatio','growthLength','growthAngle'])if(p[key]<=0)throw Error(`${key} must be positive.`);
    for(let pass=0;pass<p.growth;pass++){const angle=p.spurAngle*p.growthAngle**pass+p.sideIncrement*pass;if(angle<=0||angle>=180)throw Error('Progressive side angles must stay between 0 and 180 degrees.');}
    if(p.growth>5)throw Error('Use at most 5 lateral growth passes for interactive geometry.');
    let frontier=edges.splice(0);
    for(let pass=0;pass<p.growth;pass++){
      const next=[],obstacles=[...edges,...frontier];
      for(const [a,b] of frontier){
        const A=nodes[a],B=nodes[b],dx=B.point[0]-A.point[0],dy=B.point[1]-A.point[1],L=Math.hypot(dx,dy),heading=Math.atan2(dx,dy);
        const count=Math.max(0,Math.floor(L/(p.spacing*p.spacingRatio**pass))-1),step=L/(count+1);let previous=a;
        for(let i=1;i<=count;i++){
          if(nodes.length+3>512)throw Error('Growth exceeds 512 peaks; increase spacing or reduce passes.');
          const t=i/(count+1),x=A.point[0]+dx*t,y=A.point[1]+dy*t;
          const station=add(x,y,A.generation+t,previous,heading,'station');
          nodes[station].axisStart=a;nodes[station].axisEnd=b;nodes[station].axisT=t;
          nodes[station].point[2]=A.point[2]*(1-t)+B.point[2]*t;
          previous=station;
          let clearance=Infinity;
          for(const [u,v] of obstacles){if(u===a&&v===b)continue;const P=nodes[u].point,Q=nodes[v].point,ex=Q[0]-P[0],ey=Q[1]-P[1],k=Math.max(0,Math.min(1,((x-P[0])*ex+(y-P[1])*ey)/(ex*ex+ey*ey)));clearance=Math.min(clearance,Math.hypot(x-P[0]-ex*k,y-P[1]-ey*k));}
          const requestedLength=pass===0?step*p.spurRatio:L*p.growthLength;
          const length=Math.min(requestedLength,clearance*.35);
          for(const sign of [-1,1]){
            const h=heading+sign*(p.spurAngle*p.growthAngle**pass+p.sideIncrement*pass)*Math.PI/180;
            const child=add(x+Math.sin(h)*length,y+Math.cos(h)*length,A.generation+t+1,null,h,'spur');
            nodes[child].birthParent=station;nodes[child].growthPass=pass+1;nodes[child].requestedLength=requestedLength;nodes[child].actualLength=length;nodes[child].parent=station;nodes[child].point[2]=p.wall+(nodes[station].point[2]-p.wall)*p.descent;
            next.push([station,child]);
          }
        }
        edges.push([previous,b]);
        nodes[b].parent=previous;
      }
      frontier=next;
    }
    edges.push(...frontier);
  }
  if(nodes.some(n=>n.point.some(v=>!Number.isFinite(v))))throw Error("These values exceed numerical precision. Reduce the lengths or height ratios.");
  return {parameters:p,nodes,edges};
}
function edgeUses(faces){const map=new Map();for(const f of faces)for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],key=edgeKey(a,b);if(!map.has(key))map.set(key,[]);map.get(key).push([a,b]);}return map;}
function outline(mesh){const edges=[...edgeUses(mesh.faces).values()].filter(v=>v.length===1).map(v=>v[0]);const next=new Map(edges);const ids=[edges[0][0]];let v=next.get(ids[0]);while(v!==ids[0]){if(v===undefined||ids.length>edges.length)throw Error('Disconnected roof perimeter');ids.push(v);v=next.get(v);}if(ids.length!==edges.length)throw Error('Multiple roof boundaries');return ids;}
function simple(points){for(let i=0;i<points.length;i++)for(let j=i+2;j<points.length;j++){if(i===0&&j===points.length-1)continue;const [a,b,c,d]=[points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]];if(cross(a,b,c)*cross(a,b,d)<-1e-9&&cross(c,d,a)*cross(c,d,b)<-1e-9)return false;}return true;}

function naveLayout(graph){
  const {nodes,edges,parameters:p}=graph;
  const adjacency=nodes.map(()=>[]),joins=new Map(),widths=new Map(),spineEdges=new Set();
  for(const [a,b] of edges){adjacency[a].push(b);adjacency[b].push(a);}
  // Infer the grammar depth through station nodes, which retain their parent order.
  function order(id){const n=nodes[id];if(n.growthPass)return n.growthPass;if(n.kind==='station'&&n.parent!==null)return order(n.parent);return Math.max(0,Math.floor(n.generation)-1);}
  for(const [a,b] of edges){const depth=Math.max(order(a),order(b));if(depth===0)spineEdges.add(edgeKey(a,b));widths.set(edgeKey(a,b),p.branchWidth/2*(depth?p.projectionWidth:p.spineWidth)*Math.pow(p.branchTaper,depth)*p.widthFill);}
  for(const n of nodes){
    const list=adjacency[n.id].map(id=>{const q=nodes[id].point,dx=q[0]-n.point[0],dy=q[1]-n.point[1],L=Math.hypot(dx,dy);return {id,d:[dx/L,dy/L],angle:Math.atan2(dy,dx),w:widths.get(edgeKey(n.id,id))};}).sort((a,b)=>a.angle-b.angle);
    if(list.length===1)continue;
    for(let i=0;i<list.length;i++){
      const a=list[i],b=list[(i+1)%list.length],A=[-a.d[1]*a.w,a.d[0]*a.w],B=[b.d[1]*b.w,-b.d[0]*b.w],det=a.d[0]*b.d[1]-a.d[1]*b.d[0];
      let q;
      if(Math.abs(det)<1e-8){q=[(A[0]+B[0])/2,(A[1]+B[1])/2];}
      else {const t=((B[0]-A[0])*b.d[1]-(B[1]-A[1])*b.d[0])/det;q=[A[0]+t*a.d[0],A[1]+t*a.d[1]];}
      joins.set(`${n.id}:${a.id}:left`,q);joins.set(`${n.id}:${b.id}:right`,q);
    }
  }
  const original=nodes.map(n=>[...n.point]);
  function place(parent){for(const child of adjacency[parent]){if(nodes[child].parent!==parent)continue;const A=original[parent],B=original[child],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy),d=[dx/L,dy/L];
    let reach=0;for(const [u,v,sign] of [[parent,child,1],[child,parent,-1]])for(const side of ['left','right']){const q=joins.get(`${u}:${v}:${side}`);if(q)reach=Math.max(reach,sign*(q[0]*d[0]+q[1]*d[1]));}
    const span=L*p.packing*(spineEdges.has(edgeKey(parent,child))?1:p.branchReach)+2*reach;
    nodes[child].point[0]=nodes[parent].point[0]+d[0]*span;nodes[child].point[1]=nodes[parent].point[1]+d[1]*span;
    place(child);
  }}
  place(0);return {joins,widths,spineEdges};
}

function roofFor(graph,width) {
  const {nodes,edges,parameters:p}=graph,vertices=nodes.map(n=>[...n.point]),faces=[],ridges=[],gableFaces=[],vertexOwners=nodes.map(n=>[n.id]);
  const architectural=graph.architectural;
  const adjacency=nodes.map(()=>[]),sides=new Map(),widths=[],branchProfiles=[];
  // Each branch uses its own available space. Short terminal forks no longer
  // force the trunk and every other branch down to one global minimum width.
  const distanceToSegment=(q,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy)));return {distance:Math.hypot(q[0]-a[0]-t*dx,q[1]-a[1]-t*dy),t};};
  const localWidth=(point,own)=>{
    if(architectural){const value=architectural.widths.get(edgeKey(...own));widths.push(value*2);return value;}
    const clearance=Math.min(...edges.filter(e=>edgeKey(...e)!==edgeKey(...own)).map(([a,b])=>{const {distance,t}=distanceToSegment(point,nodes[a].point,nodes[b].point);const sharedEnd=t<1e-8&&own.includes(a)||t>1-1e-8&&own.includes(b);return distance*(sharedEnd?.8*p.widthFill:Math.min(.49,.45*p.widthFill));}));
    const projection=own.some(id=>nodes[id].kind==='spur')||own.every(id=>nodes[id].generation>1);
    const requested=width*(projection?p.projectionWidth:p.spineWidth);
    const value=Number.isFinite(clearance)?clearance*Math.tanh(requested/clearance):requested;widths.push(value*2);return value;
  };
  edges.forEach(([a,b])=>{adjacency[a].push(b);adjacency[b].push(a);});
  const vertex=(point,owners)=>{vertexOwners.push(owners);return vertices.push(point)-1;};
  const tri=(a,b,c)=>{if(cross(vertices[a],vertices[b],vertices[c])<0)[b,c]=[c,b];faces.push([a,b,c]);};
  nodes.forEach(n=>{
    const [x,y]=n.point;
    const neighbors=adjacency[n.id].map(id=>({id,angle:Math.atan2(nodes[id].point[1]-y,nodes[id].point[0]-x)})).sort((a,b)=>a.angle-b.angle);
    if(neighbors.length===1){const {angle,id}=neighbors[0],tipWidth=localWidth(n.point,[n.id,id]),nx=-Math.sin(angle)*tipWidth,ny=Math.cos(angle)*tipWidth;
      const left=vertex([x+nx,y+ny,p.wall],[n.id]),right=vertex([x-nx,y-ny,p.wall],[n.id]);sides.set(`${n.id}:${id}`,{left,right});
      // Outward end gable; its XY projection is a line, its 3D area is positive.
      const noseLength=tipWidth*p.tipNose;
      const center=vertex([x-Math.cos(angle)*noseLength,y-Math.sin(angle)*noseLength,p.wall+(noseLength>0?(n.point[2]-p.wall)*.3:0)],[n.id]);
      if(noseLength>0)ridges.push([n.id,center]);
      gableFaces.push([n.id,left,center],[n.id,center,right]);return;
    }
    const corners=neighbors.map((a,i)=>{if(architectural){const q=architectural.joins.get(`${n.id}:${a.id}:left`);return vertex([x+q[0],y+q[1],p.wall],[n.id,a.id,neighbors[(i+1)%neighbors.length].id]);}const b=neighbors[(i+1)%neighbors.length];let gap=b.angle-a.angle;if(gap<=0)gap+=Math.PI*2;const angle=a.angle+gap/2,reach=Math.min(.45,.22*p.widthFill)*Math.min(...[a.id,b.id].map(id=>Math.hypot(nodes[id].point[0]-x,nodes[id].point[1]-y))),r=Math.min(width/Math.sin(gap/2),reach);return vertex([x+Math.cos(angle)*r,y+Math.sin(angle)*r,p.wall],[n.id,a.id,b.id]);});
    neighbors.forEach((other,i)=>sides.set(`${n.id}:${other.id}`,{left:corners[i],right:corners[(i+corners.length-1)%corners.length]}));
  });
  for(const [u,v] of edges){
    const U=vertices[u],V=vertices[v],point=mix(U,V);point[2]=p.wall+(Math.min(U[2],V[2])-p.wall)*p.valley;
    const saddle=vertex(point,[u,v]);ridges.push([u,saddle],[saddle,v]);
    const middleWidth=localWidth(point,[u,v]);branchProfiles.push({edge:[u,v],width:middleWidth*2});
    const a=sides.get(`${u}:${v}`),b=sides.get(`${v}:${u}`);
    for(const [side,[lu,lv]] of [[a.left,b.right],[a.right,b.left]].entries()){
      // One perpendicular collar shared by both ends: each ridge is bordered
      // by two exactly mirrored triangular pitches, including terminal wedges.
      const dx=V[0]-U[0],dy=V[1]-U[1],length=Math.hypot(dx,dy),sign=side===0?1:-1;
      const mid=vertex([point[0]-sign*dy/length*middleWidth,point[1]+sign*dx/length*middleWidth,p.wall],[u,v]);
      tri(u,saddle,mid);tri(u,mid,lu);tri(v,mid,saddle);tri(v,lv,mid);
    }
  }
  const tipFaces=faces.length;faces.push(...gableFaces);
  return {vertices,faces,ridges,vertexOwners,tipFaceStart:tipFaces,gableFaces:gableFaces.length,widths,branchProfiles};
}

export function buildBranching(input={}, {capture=false}={}) {
  if(Number(input.generator)===1)return buildLeaf(normalize(input),{capture},closeRoof);
  const snapshots=[];
  const record=(label,roof,boundary,operation)=>{if(capture)snapshots.push({label,operation,roof:structuredClone(roof),boundary:[...boundary]});};
  const graph=tree(input),p=graph.parameters;
  const originalSpan=Math.max(...graph.nodes.map(n=>Math.hypot(n.point[0],n.point[1])));
  if(p.tipNose<0)throw Error('Tip projection must be nonnegative.');
  if(p.packing<=0)throw Error('Packing must be positive.');
  if(p.nave)graph.architectural=naveLayout(graph);
  let width=p.branchWidth/2,roof,boundary;
  for(let attempt=0;attempt<12;attempt++){
    roof=roofFor(graph,width);
    try{boundary=outline(roof);}catch(error){if(attempt===11)throw error;width*=.7;continue;}
    const polygon=boundary.map(i=>roof.vertices[i]);
    const area=Math.abs(polygon.reduce((s,a,i)=>{const b=polygon[(i+1)%polygon.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
    const roofArea=roof.faces.reduce((sum,f)=>sum+Math.abs(cross(...f.map(i=>roof.vertices[i])))/2,0);
    if(simple(polygon)&&Math.abs(area-roofArea)<1e-6)break;
    if(p.nave){if(attempt===11)throw Error('These branch directions cross even after reserving width. Adjust the fork angles.');const previous=graph.nodes.map(n=>[...n.point]);const children=graph.nodes.map(()=>[]);for(const n of graph.nodes)if(n.parent!==null)children[n.parent].push(n.id);function spread(id){for(const child of children[id]){const factor=graph.architectural.spineEdges.has(edgeKey(id,child))?1.2:1;for(let axis=0;axis<2;axis++)graph.nodes[child].point[axis]=graph.nodes[id].point[axis]+(previous[child][axis]-previous[id][axis])*factor;spread(child);}}spread(0);graph.layoutScale=(graph.layoutScale??1)*1.2;continue;}
    width*=.7;if(attempt===11)throw Error('Cannot form non-overlapping branch corridors');
  }
  // Width reservation expands plan dimensions. Keep the original vertical
  // proportions instead of leaving the mass visually flattened by that expansion.
  const heightScale=p.nave&&p.proportionLock?Math.max(1,Math.max(...graph.nodes.map(n=>Math.hypot(n.point[0],n.point[1])))/originalSpan):1;
  if(heightScale!==1){for(const v of roof.vertices)v[2]=p.wall+(v[2]-p.wall)*heightScale;for(const n of graph.nodes)n.point[2]=p.wall+(n.point[2]-p.wall)*heightScale;}
  if(p.verticalSteps>6||p.minArea<=0||p.verticalLift<0||p.verticalLift>.55)throw Error('Vertical E/C needs 0-6 steps, positive minimum area, and strength between 0 and 55%.');
  // Raise short closure panels proportionally to their own adjacent roof cell,
  // rather than leaving every branch on the same shallow plinth.
  if(p.baseRiseRatio<0||p.baseRiseRatio>=1)throw Error('Base panel height ratio must be between 0 and 100%, excluding 100%.');
  if(p.baseRiseRatio>0){
    const heights=roof.vertices.map(v=>v[2]),adjacency=roof.vertices.map(()=>new Set());
    for(const f of roof.faces)for(const a of f)for(const b of f)if(a!==b)adjacency[a].add(b);
    for(const id of boundary){const higher=[...adjacency[id]].map(i=>heights[i]).filter(z=>z>heights[id]+1e-7);if(!higher.length)continue;
      const target=p.wall+(Math.min(...higher)-p.wall)*p.baseRiseRatio;
      roof.vertices[id][2]=Math.max(heights[id],target);
    }
  }
  if(capture)for(const frame of planStages(graph,roof,boundary))record(frame.label,frame.roof,frame.boundary,frame.operation);
  record("Plan - complete branch folds",roof,boundary);
  const margins=developMargins(roof,boundary,p,(mesh,loop)=>{
    const polygon=loop.map(i=>mesh.vertices[i]);
    const area=Math.abs(polygon.reduce((s,a,i)=>{const b=polygon[(i+1)%polygon.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
    const roofArea=mesh.faces.reduce((sum,f)=>sum+Math.abs(cross(...f.map(i=>mesh.vertices[i])))/2,0);
    return simple(polygon)&&Math.abs(area-roofArea)<Math.max(1e-5,area*1e-9);
  },capture?(label,r,b)=>record(label,r,b):null);
  const refinement=developVerticalEC(roof,p,capture?(label,r)=>record(label,r,boundary):null);
  const solid=closeRoof(roof,boundary);
  const triangleBalance=balanceTriangles(solid,p.triangleSize);
  if(p.triangleSize>0){roof.vertices=solid.vertices;roof.faces=solid.faces.slice(...solid.regions.roof);}
  const integrity=meshIntegrity(solid);if(!integrity.watertight)throw Error(`Branch volume failed validation: ${JSON.stringify(integrity)}`);
  const sequence=capture?snapshots.map(frame=>{const solid=closeRoof(frame.roof,frame.boundary),integrity=meshIntegrity(solid);if(!integrity.watertight)throw Error(frame.label+" is not closed");return {...frame,solid,integrity};}):undefined;
  return {...graph,roof,solid,boundary,integrity,triangleBalance,refinement,margins,heightScale,sequence,branchWidth:Math.max(...roof.widths),widthRange:[Math.min(...roof.widths),Math.max(...roof.widths)]};
}

export function closeRoof(roof,boundary){
  const solid={vertices:roof.vertices.map(p=>[...p]),faces:roof.faces.map(f=>[...f])};
  // Project the roof cell complex onto the ground. Reusing its connectivity
  // preserves branch-local symmetry on the underside too. Coincident XY points
  // (peak and gable center) share a single ground vertex.
  const ground=new Map(),bottom=roof.vertices.map(([x,y])=>{
    const key=[x,y].map(v=>(Math.abs(v)<1e-8?0:v).toFixed(8)).join(',');
    if(!ground.has(key))ground.set(key,solid.vertices.push([x,y,0])-1);
    return ground.get(key);
  });
  const wallStart=solid.faces.length;
  const roofEdgeFaces=new Map();for(const f of roof.faces)for(let i=0;i<3;i++)roofEdgeFaces.set(edgeKey(f[i],f[(i+1)%3]),f);
  for(let i=0;i<boundary.length;i++){
    const j=(i+1)%boundary.length,loop=[boundary[i],bottom[boundary[i]],bottom[boundary[j]],boundary[j]];
    // Choose the diagonal from the roof cell's own peak, not perimeter order.
    // Reflected branch panels therefore get reflected diagonals without an X.
    const face=roofEdgeFaces.get(edgeKey(boundary[i],boundary[j]));
    const peak=roof.vertices[face.find(id=>id!==boundary[i]&&id!==boundary[j])];
    const distance=id=>{const v=roof.vertices[id];return (v[0]-peak[0])**2+(v[1]-peak[1])**2;};
    const a=boundary[i],b=boundary[j],delta=distance(a)-distance(b);
    const anchorA=Math.abs(delta)<1e-9?a<b:delta<0;
    if(anchorA)solid.faces.push([loop[0],loop[1],loop[2]],[loop[0],loop[2],loop[3]]);
    else solid.faces.push([loop[0],loop[1],loop[3]],[loop[1],loop[2],loop[3]]);

  }
  const baseStart=solid.faces.length;
  for(const [a,b,c] of roof.faces){
    if(Math.abs(cross(roof.vertices[a],roof.vertices[b],roof.vertices[c]))<1e-9)continue;
    solid.faces.push([bottom[c],bottom[b],bottom[a]]);
  }
  solid.regions={roof:[0,wallStart],walls:[wallStart,baseStart],base:[baseStart,solid.faces.length]};
  return solid;
}
