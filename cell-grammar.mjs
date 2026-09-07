// E/C acts on a connected complex of polygonal material cells. The boundary
// polygon and the bay are derived outputs; no architectural parts are inserted.
export const DEFAULTS=Object.freeze({width:84,height:132,expansion:.62,contraction:.68,scale:.64,bias:3.6,web:.6,depth:38,fold:.65,bays:5,gap:0});
const ranges={width:[40,140],height:[60,180],expansion:[0,1],contraction:[0,1],scale:[.4,.8],bias:[1,5],web:[.3,2],depth:[12,80],fold:[0,1],bays:[2,8],gap:[0,12]};
export function normalizeParameters(input={}){return Object.fromEntries(Object.entries(ranges).map(([k,[a,b]])=>{let v=input[k]===undefined?DEFAULTS[k]:Number(input[k]);v=Number.isFinite(v)?Math.max(a,Math.min(b,v)):DEFAULTS[k];return[k,k==='bays'?Math.round(v):v];}));}
export function alternatingRules(count=6,p=DEFAULTS){return Array.from({length:Math.max(0,Math.min(10,Math.round(count)))},(_,i)=>({kind:i%2?'C':'E',amount:i%2?p.contraction:p.expansion}));}
export const svgPath=points=>points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(6)},${(-y).toFixed(6)}`).join(' ')+' Z';
export const signedArea=points=>points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2;
export const polygonArea=points=>Math.abs(signedArea(points));
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function pointSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return dist(p,[a[0]+t*dx,a[1]+t*dy]);}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(pointSegment(p,a,b)<1e-8)return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function intersects(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<-1e-12&&cross(c,d,a)*cross(c,d,b)<-1e-12;}
export function isSimple(poly){for(let i=0;i<poly.length;i++){if(dist(poly[i],poly[(i+1)%poly.length])<1e-8)return false;for(let j=i+2;j<poly.length;j++){if(i===0&&j===poly.length-1)continue;if(intersects(poly[i],poly[(i+1)%poly.length],poly[j],poly[(j+1)%poly.length]))return false;}}return true;}

function complex(p){
  const state={vertices:[],lookup:new Map(),cells:[],history:[],kinds:new Map(),motions:[]};
  state.vertex=point=>{const key=point.map(v=>(Math.abs(v)<1e-9?0:v).toFixed(9)).join(',');if(!state.lookup.has(key)){state.lookup.set(key,state.vertices.length);state.vertices.push(point.map(v=>Math.abs(v)<1e-9?0:v));}return state.lookup.get(key);};
  const [a,t,b]=[[-p.width/2,0],[0,p.height],[p.width/2,0]].map(state.vertex);
  state.cells=[{id:'0',parent:null,generation:0,loop:[a,t,b],mouth:[a,b],budget:p.height}];
  state.kinds.set(edgeKey(a,t),'roof');state.kinds.set(edgeKey(t,b),'roof');state.kinds.set(edgeKey(b,a),'ground');
  return state;
}
function incidence(state){const edges=new Map();for(const cell of state.cells)for(let i=0;i<cell.loop.length;i++){const a=cell.loop[i],b=cell.loop[(i+1)%cell.loop.length],key=edgeKey(a,b);if(!edges.has(key))edges.set(key,[]);edges.get(key).push({a,b,cell});}return edges;}
function splitEdge(state,a,b,point){
  const m=state.vertex(point),kind=state.kinds.get(edgeKey(a,b));
  if(m===a||m===b)return m;
  for(const cell of state.cells)for(let i=0;i<cell.loop.length;i++){const x=cell.loop[i],y=cell.loop[(i+1)%cell.loop.length];if(edgeKey(x,y)===edgeKey(a,b)){cell.loop.splice(i+1,0,m);break;}}
  state.kinds.delete(edgeKey(a,b));state.kinds.set(edgeKey(a,m),kind);state.kinds.set(edgeKey(m,b),kind);
  return m;
}
function boundary(state){
  const edges=[...incidence(state).values()].filter(uses=>uses.length===1).map(uses=>uses[0]);
  const next=new Map(edges.map(e=>[e.a,e.b])),start=edges[0].a,ids=[start];
  let current=next.get(start);while(current!==start){if(current===undefined||ids.length>edges.length)throw new Error('Cell boundary is disconnected.');ids.push(current);current=next.get(current);}
  if(ids.length!==edges.length)throw new Error('Unexpected disconnected material boundary.');
  return ids;
}
function grow(state,s,p){
  let changed=0,limited=0;
  const edges=[...incidence(state).entries()].filter(([key,uses])=>uses.length===1&&state.kinds.get(key)==='roof');
  if(state.vertices.length+edges.length>900)return {changed:0,limited:edges.length};
  for(const [, [{a,b,cell}]] of edges){
    const A=state.vertices[a],B=state.vertices[b],length=dist(A,B),dx=B[0]-A[0];
    if(dx<1e-6||length<p.web*3||state.vertices.length>900){limited++;continue;}
    const m=lerp(A,B,.5),gain=.36*s*p.scale**cell.generation;
    // An anisotropic outward normal; clamp X to retain the ordering of the
    // roof boundary. Its positive vertical separation guarantees E adds area.
    const x=Math.max(A[0]+dx*.18,Math.min(B[0]-dx*.18,m[0]-gain*(B[1]-A[1])));
    const y=Math.max(m[1]+gain*dx*p.bias,A[1]+(B[1]-A[1])*(x-A[0])/dx+gain*length*.12);
    const point=[x,y];splitEdge(state,a,b,point);state.motions.push([m,point]);changed++;
  }
  return {changed,limited};
}
function refineVoids(state,s,p){
  const proposals=[],polygons=new Map(state.cells.map(c=>[c.id,c.loop.map(i=>[...state.vertices[i]])]));
  const edges=[...incidence(state).entries()].filter(([key,uses])=>uses.length===1&&state.kinds.get(key)==='void');
  if(state.vertices.length+edges.length>900)return 0;
  for(const [, [{a,b,cell}]] of edges){
    const A=state.vertices[a],B=state.vertices[b],length=dist(A,B);
    if(length<p.web*3||state.vertices.length>900)continue;
    const mid=lerp(A,B,.5),poly=polygons.get(cell.id);
    const move=[(B[1]-A[1])*.18*s,-(B[0]-A[0])*.18*s*p.bias];
    const index=cell.loop.indexOf(a);
    const safe=point=>{
      if(!inside(point,poly))return false;
      for(let i=0;i<poly.length;i++){
        if(i===index)continue;
        const c=poly[i],d=poly[(i+1)%poly.length];
        if(pointSegment(point,c,d)<p.web)return false;
        if(intersects(A,point,c,d)||intersects(point,B,c,d))return false;
      }
      return true;
    };
    let lo=0,hi=1;for(let n=0;n<28;n++){const t=(lo+hi)/2;if(safe([mid[0]+move[0]*t,mid[1]+move[1]*t]))lo=t;else hi=t;}
    if(lo<1e-4)continue;
    const point=[mid[0]+move[0]*lo,mid[1]+move[1]*lo];
    proposals.push({a,b,mid,point});
  }
  // Evaluate an entire refinement generation against the same parent cells.
  // A shared reduction preserves bilateral symmetry if neighboring cuts meet.
  let factor=1;
  for(let attempt=0;attempt<20;attempt++){
    const candidates=new Map(proposals.map(q=>[edgeKey(q.a,q.b),lerp(q.mid,q.point,factor)]));
    const valid=state.cells.every(c=>{
      const poly=[];for(let i=0;i<c.loop.length;i++){poly.push(state.vertices[c.loop[i]]);const next=candidates.get(edgeKey(c.loop[i],c.loop[(i+1)%c.loop.length]));if(next)poly.push(next);}
      return signedArea(poly)<-1e-8&&isSimple(poly);
    });
    if(valid){for(const q of proposals){const point=lerp(q.mid,q.point,factor);splitEdge(state,q.a,q.b,point);state.motions.push([q.mid,point]);}return proposals.length;}
    factor*=.5;
  }
  return 0;
}
function contractJunctions(state,s,p){
  let moved=0;
  for(const event of state.history){
    const [S,T]=event.junction,from=[...state.vertices[T]],toward=[...state.vertices[S]],length=dist(from,toward);
    if(length<=p.web*2)continue;
    const fraction=Math.min(s,(1-p.web*2/length)/.85),owners=state.cells.filter(c=>c.loop.includes(T)||c.loop.includes(S));
    const oldBoundary=boundary(state).map(i=>state.vertices[i]),oldArea=polygonArea(oldBoundary);
    const safe=t=>{
      state.vertices[T]=lerp(from,toward,.65*t);
      state.vertices[S]=lerp(toward,from,.20*t);
      const outer=boundary(state).map(i=>state.vertices[i]);
      return isSimple(outer)&&polygonArea(outer)<=oldArea+1e-7&&owners.every(c=>{const points=c.loop.map(i=>state.vertices[i]);return signedArea(points)<-1e-8&&isSimple(points);});
    };
    let lo=0,hi=fraction;for(let n=0;n<26;n++){const t=(lo+hi)/2;if(safe(t))lo=t;else hi=t;}
    const point=lerp(from,toward,.65*lo),shoulder=lerp(toward,from,.20*lo);state.vertices[T]=point;state.vertices[S]=shoulder;
    if(lo<1e-6)continue;
    const key=v=>v.map(x=>(Math.abs(x)<1e-9?0:x).toFixed(9)).join(',');
    state.lookup.delete(key(from));state.lookup.delete(key(toward));state.lookup.set(key(point),T);state.lookup.set(key(shoulder),S);state.motions.push([from,point],[toward,shoulder]);moved++;
  }
  return moved;
}
function divide(state,cell,s,p){
  const [ai,bi]=cell.mouth,A=state.vertices[ai],B=state.vertices[bi],span=B[0]-A[0];
  if(span<p.web*4.5||cell.generation>=4||state.vertices.length>900)return false;
  const x=(A[0]+B[0])/2;
  let roofEdge,roofPoint;
  for(let i=0;i<cell.loop.length-1;i++){
    const a=state.vertices[cell.loop[i]],b=state.vertices[cell.loop[i+1]];
    if((x>=Math.min(a[0],b[0])-1e-8)&&(x<=Math.max(a[0],b[0])+1e-8)&&Math.abs(b[0]-a[0])>1e-8){
      const point=[x,a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])];
      if(point[1]>A[1]+1e-7&&(!roofPoint||point[1]<roofPoint[1])){roofPoint=point;roofEdge=[cell.loop[i],cell.loop[i+1]];}
    }
  }
  if(!roofPoint)return false;
  const margin=Math.max(p.web,span*(1-.82*s)/2);
  if(span-2*margin<p.web)return false;
  const ql=[A[0]+margin,A[1]],qr=[B[0]-margin,B[1]],poly=cell.loop.map(i=>state.vertices[i]);
  const maximum=Math.min(roofPoint[1]-p.web,A[1]+cell.budget*1.10*s);
  const safe=tip=>{
    if(!inside(tip,poly))return false;
    for(let i=0;i<poly.length-1;i++){
      const c=poly[i],d=poly[i+1];
      if(pointSegment(tip,c,d)<p.web)return false;
      if(intersects(ql,tip,c,d)||intersects(tip,qr,c,d))return false;
    }
    return inside(lerp(ql,tip,.5),poly)&&inside(lerp(qr,tip,.5),poly);
  };
  let lo=A[1],hi=maximum;for(let n=0;n<32;n++){const h=(lo+hi)/2;if(safe([x,h]))lo=h;else hi=h;}
  if(lo-A[1]<p.web*2)return false;
  const S=splitEdge(state,...roofEdge,roofPoint),T=state.vertex([x,lo]),L=state.vertex(ql),R=state.vertex(qr);
  const at=cell.loop.indexOf(S),left={id:cell.id+'L',parent:cell.id,generation:cell.generation+1,loop:[...cell.loop.slice(0,at+1),T,L],mouth:[ai,L],budget:cell.budget*p.scale};
  const right={id:cell.id+'R',parent:cell.id,generation:cell.generation+1,loop:[R,T,...cell.loop.slice(at)],mouth:[R,bi],budget:cell.budget*p.scale};
  state.kinds.set(edgeKey(S,T),'seam');state.kinds.set(edgeKey(T,L),'void');state.kinds.set(edgeKey(R,T),'void');state.kinds.set(edgeKey(L,ai),'ground');state.kinds.set(edgeKey(bi,R),'ground');
  const index=state.cells.indexOf(cell);state.cells.splice(index,1,left,right);
  state.history.push({id:cell.id,parent:cell.parent,generation:cell.generation,children:[left.id,right.id],junction:[S,T],opening:[L,T,R]});
  state.motions.push([[x,A[1]],[x,lo]]);
  return true;
}
export function buildSections(input={},inputRules){
  const parameters=normalizeParameters(input),p=parameters;
  const rules=(inputRules??alternatingRules(6,p)).slice(0,10).map(r=>({kind:r.kind==='C'?'C':'E',amount:Math.max(0,Math.min(1,Number.isFinite(Number(r.amount))?Number(r.amount):.5))}));
  const state=complex(p),frames=[];
  function snapshot(kind,amount,info={}){
    const ids=boundary(state),points=ids.map(i=>[...state.vertices[i]]),edges=incidence(state);
    const seams=[...edges.entries()].filter(([key,uses])=>uses.length===2&&state.kinds.get(key)==='seam').map(([,uses])=>[state.vertices[uses[0].a],state.vertices[uses[0].b]].map(p=>[...p]));
    const cells=state.cells.map(c=>({id:c.id,parent:c.parent,generation:c.generation,points:c.loop.map(i=>[...state.vertices[i]]),mouth:c.mouth.map(i=>[...state.vertices[i]])}));
    const openingCount=state.history.length;
    const active=state.cells.filter(c=>state.vertices[c.mouth[1]][0]-state.vertices[c.mouth[0]][0]>=p.web*4.5&&c.generation<4).length;
    frames.push({index:frames.length,kind,amount,points,cells,seams,history:JSON.parse(JSON.stringify(state.history)),motions:state.motions.map(s=>s.map(p=>[...p])),area:polygonArea(points),openingCount,activeCount:active,maxGeneration:Math.max(...cells.map(c=>c.generation)),...info});
  }
  snapshot('S',0,{title:'One material cell',label:'Triangle',target:'A filled triangle',invariant:'Mirror axis and ground endpoints',result:'One active region',note:'A single filled triangle. All later material regions descend from this cell.'});
  for(const rule of rules){
    state.motions=[];
    if(rule.amount===0){snapshot(rule.kind,0,{title:'Retain the current cells',label:'No change',target:'Current cell complex',invariant:'Every vertex and region',result:'Zero-strength rule',note:'A zero-strength rule retains the exact geometry and lineage.'});continue;}
    if(rule.kind==='E'){
      const {changed,limited}=grow(state,rule.amount,p);
      snapshot('E',rule.amount,{title:'Expand the exposed edges',label:'Grow edges',target:'Exposed upper edges of each child',invariant:'Existing junctions, openings and feet',result:`${changed} displaced midpoints`,note:`E inserts ${changed} outward midpoints. Vertical bias directs growth; child scale reduces movement in later generations.${limited?' Small edges are retained at the detail limit.':''}`});
    }else{
      const moved=contractJunctions(state,rule.amount,p),refined=refineVoids(state,rule.amount,p);let split=0;
      if(state.vertices.length+state.cells.length*4<=900)for(const cell of [...state.cells])if(divide(state,cell,rule.amount,p))split++;
      snapshot('C',rule.amount,{title:split?'Split the remaining material':'Refine the inherited boundaries',label:split?'Split cells':'Refine voids',target:'Cell mouths, shared crowns and void edges',invariant:'Connected cap bands and shared junctions',result:`${split} splits · ${moved} shared crowns · ${refined} refinements`,note:`C opens ${split} tapered notches, contracts ${moved} shared crowns, and refines ${refined} inherited void edges. Neighboring cells move together at their shared junction.${!split?' Mouths have reached the minimum band; this step refines existing geometry.':''}`});
    }
  }
  const all=frames.flatMap(f=>f.points);
  return {parameters,rules,frames,bounds:{minX:Math.min(...all.map(p=>p[0])),maxX:Math.max(...all.map(p=>p[0])),minY:0,maxY:Math.max(...all.map(p=>p[1]))}};
}
export function bayOffsets(input={},array=false){const p=normalizeParameters(input),n=array?p.bays:1;return Array.from({length:n},(_,i)=>(i-(n-1)/2)*(p.depth+p.gap));}
