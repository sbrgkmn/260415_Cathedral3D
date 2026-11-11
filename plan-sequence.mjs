const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const inside=(p,a,b,c)=>cross(a,b,p)>=-1e-8&&cross(b,c,p)>=-1e-8&&cross(c,a,p)>=-1e-8;
function triangulate(vertices,loop){
 const remaining=[...loop],faces=[];
 while(remaining.length>3){let found=false;
  for(let i=0;i<remaining.length;i++){
   const a=remaining[(i+remaining.length-1)%remaining.length],b=remaining[i],c=remaining[(i+1)%remaining.length];
   if(cross(vertices[a],vertices[b],vertices[c])<=1e-9)continue;
   if(remaining.some(id=>id!==a&&id!==b&&id!==c&&inside(vertices[id],vertices[a],vertices[b],vertices[c])))continue;
   faces.push([a,b,c]);remaining.splice(i,1);found=true;break;
  }
  if(!found)throw Error('Cannot triangulate this intermediate plan');
 }
 if(cross(...remaining.map(id=>vertices[id]))>1e-9)faces.push(remaining);
 return faces;
}
function insertPoint(vertices,faces,id){
 const p=vertices[id];if(faces.some(f=>f.includes(id)))return;
 const found=faces.findIndex(f=>inside(p,...f.map(i=>vertices[i])));if(found<0)return;
 const f=faces[found];
 // Split both sides of an existing edge to avoid a hanging vertex.
 const e=f.findIndex((a,i)=>Math.abs(cross(vertices[a],vertices[f[(i+1)%3]],p))<1e-8);
 if(e>=0){const a=f[e],b=f[(e+1)%3];
  if(Math.hypot(p[0]-vertices[a][0],p[1]-vertices[a][1])<1e-8||Math.hypot(p[0]-vertices[b][0],p[1]-vertices[b][1])<1e-8)return;
  for(let j=faces.length-1;j>=0;j--){const t=faces[j],k=t.findIndex((x,i)=>x===a&&t[(i+1)%3]===b||x===b&&t[(i+1)%3]===a);if(k<0)continue;
   const u=t[k],v=t[(k+1)%3],w=t[(k+2)%3];faces.splice(j,1,[u,id,w],[id,v,w]);}
 }else faces.splice(found,1,[f[0],f[1],id],[f[1],f[2],id],[f[2],f[0],id]);
}
// Select four existing convex-hull anchors. The final positions are never altered.
function anchors(vertices,boundary){
 const sorted=[...boundary].sort((a,b)=>vertices[a][0]-vertices[b][0]||vertices[a][1]-vertices[b][1]);
 const half=list=>{const h=[];for(const id of list){while(h.length>1&&cross(vertices[h.at(-2)],vertices[h.at(-1)],vertices[id])<=1e-9)h.pop();h.push(id);}return h;};
 const lo=half(sorted),hi=half([...sorted].reverse());const hull=[...lo.slice(0,-1),...hi.slice(0,-1)];
 while(hull.length>4){let best=-1,score=Infinity;
  for(let i=0;i<hull.length;i++){const candidate=hull.filter((_,j)=>i!==j);if(candidate.some((a,j)=>cross(vertices[a],vertices[candidate[(j+1)%candidate.length]],vertices[0])<=1e-8))continue;
   const area=Math.abs(cross(vertices[hull[(i+hull.length-1)%hull.length]],vertices[hull[i]],vertices[hull[(i+1)%hull.length]]));if(area<score){score=area;best=i;}}
  if(best<0)break;hull.splice(best,1);
 }
 if(hull.length!==4)throw Error('This plan cannot form four anchors around the central peak');
 return hull;
}

// One production owns at most two branch axes. Stations inherit their supporting
// axis, so a child cannot be scheduled before its parent. Arc length orders
// attachments from the root/base outwards, rather than by generation alone.
export function branchEvents(graph){
 const {nodes}=graph,groups=new Map(),distance=new Map([[0,0]]);
 const path=id=>{if(distance.has(id))return distance.get(id);const n=nodes[id],parent=n.parent;
  const d=path(parent)+Math.hypot(n.point[0]-nodes[parent].point[0],n.point[1]-nodes[parent].point[1]);distance.set(id,d);return d;};
 const support=id=>{const n=nodes[id];return n.kind==='station'?support(n.axisStart):id;};
 for(const n of nodes){if(n.id===0||n.kind==='station')continue;
  const parent=n.birthParent??n.parent,key=parent;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n.id);
 }
 const pending=[];
 for(const [parent,ids] of groups){
  // At radial roots, opposite axes form a pair. Else siblings already form a pair.
  const remaining=[...ids];while(remaining.length){const a=remaining.shift();let pair=[a];
   if(remaining.length){let index=0;if(parent===0){const A=nodes[a].point;let best=Infinity;
    remaining.forEach((b,i)=>{const B=nodes[b].point,score=(A[0]*B[0]+A[1]*B[1])/(Math.hypot(A[0],A[1])*Math.hypot(B[0],B[1]));if(score<best){best=score;index=i;}});}
    pair.push(remaining.splice(index,1)[0]);}
   pending.push({parent,branches:pair,dependency:support(parent),distance:path(parent),kind:nodes[pair[0]].kind==='spur'?'side':'main'});
  }
 }
 const active=new Set([0]),events=[];
 while(pending.length){const ready=pending.filter(e=>active.has(e.dependency)).sort((a,b)=>a.distance-b.distance||a.parent-b.parent||a.branches[0]-b.branches[0]);
  if(!ready.length)throw Error('Cyclic branch production dependency');const event=ready[0];pending.splice(pending.indexOf(event),1);events.push(event);event.branches.forEach(id=>active.add(id));
 }
 if(!graph.parameters.symmetryGroups)return events;
 const key=p=>p.map(x=>(Math.abs(x)<1e-6?0:x).toFixed(5)).join(':'),lookup=new Map(nodes.map(n=>[key(n.point),n.id]));
 const transforms=[([x,y,z])=>[-x,y,z],([x,y,z])=>[x,-y,z]];
 if(graph.parameters.morphology===2)transforms.push(([x,y,z])=>[-y,x,z]);
 const orbit=id=>{const set=new Set([id]);for(const n of set)for(const transform of transforms){const other=lookup.get(key(transform(nodes[n].point)));if(other===undefined)throw Error('Symmetric study requires mirrored branch coordinates');set.add(other);}return set;};
 const remaining=[...events],symmetricGroups=[];
 while(remaining.length){const first=remaining.shift(),family=new Set(first.branches.flatMap(id=>[...orbit(id)])),members=[first];
  for(let i=remaining.length-1;i>=0;i--)if(remaining[i].branches.some(id=>family.has(id)))members.push(...remaining.splice(i,1));
  symmetricGroups.push({...first,branches:members.flatMap(e=>e.branches),parents:members.map(e=>e.parent),symmetryGroup:true});
 }
 return symmetricGroups;
}
export function planStages(graph,roof,boundary){
 const v=roof.vertices,events=branchEvents(graph),ranks=new Map([[0,0]]);
 events.forEach((e,i)=>e.branches.forEach(id=>ranks.set(id,i+1)));
 const rank=id=>{if(ranks.has(id))return ranks.get(id);const n=graph.nodes[id];const value=rank(n.axisStart);ranks.set(id,value);return value;};
 // Choose the smallest available four-anchor core containing the root, not
 // distant terminal tips: the initial pyramid must not pre-draw future branches.
 const sorted=[...boundary].sort((a,b)=>v[a][0]-v[b][0]||v[a][1]-v[b][1]);
 const half=list=>{const h=[];for(const id of list){while(h.length>1&&cross(v[h.at(-2)],v[h.at(-1)],v[id])<=1e-9)h.pop();h.push(id);}return h;};
 const seed=[...half(sorted).slice(0,-1),...half([...sorted].reverse()).slice(0,-1)];
 const keep=new Set(seed),plans=[{label:'Seed - fixed outer envelope',loop:seed,faces:seed.map((a,i)=>[0,a,seed[(i+1)%seed.length]]),operation:{phase:'seed',addedBranches:[]},rank:0}];
 const owners=id=>roof.vertexOwners[id]??[];
 const vertexRank=id=>Math.max(0,...owners(id).map(rank));
 const append=(loop,label,operation,r)=>{const faces=triangulate(v,loop);plans.push({loop,faces,label,operation,rank:r});};
 for(let i=0;i<events.length;i++){
  const event=events[i],r=i+1,target=boundary.filter(id=>keep.has(id)||vertexRank(id)<=r);
  // E introduces the outer shoulders of just this production. C inserts the
  // intervening reentrant corners, separating that pair into distinct branches.
  const expansion=target.filter((id,j)=>keep.has(id)||cross(v[target[(j+target.length-1)%target.length]],v[id],v[target[(j+1)%target.length]])>=-1e-9);
  const metadata={phase:'plan',cycle:r,parent:event.parent,branchKind:event.kind,baseDistance:event.distance,branches:event.branches,symmetryGroup:Boolean(event.symmetryGroup)};
  append(expansion,`Plan E${r} - expand ${event.kind} ${event.symmetryGroup?'group':'pair'}`,{...metadata,type:'E',addedBranches:[]},r);
  expansion.forEach(id=>keep.add(id));
  append(target,`Plan C${r} - ${event.kind==='side'?'separate side':'fold main'} ${event.symmetryGroup?'group':'pair'}`,{...metadata,type:'C',addedBranches:event.branches},r);
  target.forEach(id=>keep.add(id));
 }
 // Only introduce peaks that remain inside all later recessed plans. Their
 // coordinates, and all boundary coordinates, are the final branch coordinates.
 for(let i=1;i<plans.length;i++){
  const limit=plans[i].rank-(plans[i].operation.type==='E'?1:0);
  for(let id=0;id<v.length;id++){
   if(boundary.includes(id)||vertexRank(id)>limit)continue;
   const point=v[id];
   if(plans.slice(i).every(plan=>!plan.loop.some((a,k)=>{const b=plan.loop[(k+1)%plan.loop.length];return Math.abs(cross(v[a],v[b],point))<1e-8&&(point[0]-v[a][0])*(point[0]-v[b][0])+(point[1]-v[a][1])*(point[1]-v[b][1])<=0;})&&plan.faces.some(f=>inside(point,...f.map(j=>v[j])))))insertPoint(v,plans[i].faces,id);
  }
 }
 // Keep the final peak envelope as well as the plan span. Twin/crown peaks
 // can be taller than the root and must not appear to scale the study later.
 const highest=Math.max(...v.map(p=>p[2]));
 const crown=v.map((p,id)=>Math.abs(p[2]-highest)<1e-8?id:-1).filter(id=>id>=0);
 for(const plan of plans)for(const id of crown)insertPoint(v,plan.faces,id);
 for(const plan of plans)plan.faces=repairSymmetry(v,plan.loop,symmetricFaces(v,plan.loop,plan.faces));
 return plans.map(p=>({label:p.label,operation:p.operation,roof:{...roof,faces:p.faces},boundary:p.loop}));
}

// Triangulate one fundamental sector, then copy that topology through all
// detected reflections. Only existing final-position vertices are permitted.
function symmetricFaces(v,loop,original){
 const eps=1e-6,key=p=>p.map(x=>(Math.abs(x)<eps?0:x).toFixed(5)).join(':'),used=[...new Set(original.flat())];
 const lookup=new Map(used.map(id=>[key(v[id]),id])),boundaryKeys=new Set(loop.map(id=>key(v[id])));
 const transform=(p,angle,reflection=false)=>{const c=Math.cos(angle),s=Math.sin(angle),y=reflection?-p[1]:p[1];return [c*p[0]-s*y,s*p[0]+c*y,p[2]];};
 const axes=[];for(let k=0;k<12;k++){const a=k*Math.PI/12;
  if(used.every(id=>lookup.has(key(transform(v[id],2*a,true))))&&loop.every(id=>boundaryKeys.has(key(transform(v[id],2*a,true)))))axes.push(a);
 }
 if(!axes.length)return symmetricEarFaces(v,loop,original);
 const start=axes[0],width=axes.length>1?Math.min(...axes.slice(1).map(a=>a-start)):Math.PI;
 const local=p=>transform(p,-start),inSector=p=>{const q=local(p),angle=Math.atan2(q[1],q[0]);return angle>=-eps&&angle<=width+eps;};
 const chain=loop.filter(id=>inSector(v[id]));
 // A sector cut must follow existing boundary vertices, never a new midpoint.
 if(chain.length<2)return symmetricEarFaces(v,loop,original);
 const angle=id=>{const q=local(v[id]);return Math.atan2(q[1],q[0]);};
 const first=chain.findIndex(id=>Math.abs(angle(id))<eps);
 if(first<0)return symmetricEarFaces(v,loop,original);
 const ordered=[...chain.slice(first),...chain.slice(0,first)];
 if(Math.abs(angle(ordered.at(-1))-width)>eps)return symmetricEarFaces(v,loop,original);
 const faces=triangulate(v,[0,...ordered]);
 for(const id of used)if(id!==0&&!loop.includes(id)&&inSector(v[id]))insertPoint(v,faces,id);
 const output=[],seen=new Set(),count=Math.round(Math.PI/width);
 for(let k=0;k<count;k++)for(const reflection of [false,true])for(const face of faces){
  const f=face.map(id=>{const p=local(v[id]),q=transform(p,2*k*width,reflection);return lookup.get(key(transform(q,start)));});
  if(f.includes(undefined))return symmetricEarFaces(v,loop,original);
  if(cross(...f.map(id=>v[id]))<0)[f[1],f[2]]=[f[2],f[1]];
  const signature=[...f].sort((a,b)=>a-b).join(':');if(!seen.has(signature)){seen.add(signature);output.push(f);}
 }
 const area=fs=>fs.reduce((sum,f)=>sum+Math.abs(cross(...f.map(id=>v[id]))),0);
 if(Math.abs(area(output)-area(original))>eps*Math.max(1,area(original)))return symmetricEarFaces(v,loop,original);
 if(new Set(output.flat()).size!==used.length)return symmetricEarFaces(v,loop,original);
 return output;
}

function symmetricEarFaces(v,loop,original){
 const key=p=>p.map(x=>(Math.abs(x)<1e-6?0:x).toFixed(5)).join(':'),used=[...new Set(original.flat())],lookup=new Map(used.map(id=>[key(v[id]),id]));
 const maps=[];
 for(let k=0;k<12;k++){const a=k*Math.PI/6,c=Math.cos(a),s=Math.sin(a),map=new Map(used.map(id=>{const [x,y,z]=v[id];return [id,lookup.get(key([c*x+s*y,s*x-c*y,z]))];}));if(used.every(id=>map.get(id)!==undefined)&&loop.every(id=>loop.includes(map.get(id))))maps.push(map);}
 if(!maps.length)return original;
 const orbit=id=>{const out=new Set([id]);for(const a of out)for(const m of maps)out.add(m.get(a));return [...out];};
 const remaining=[...loop],faces=[];
 const star=()=>remaining.every((a,i)=>cross(v[0],v[a],v[remaining[(i+1)%remaining.length]])>1e-8);
 while(!star()&&remaining.length>3){let clipped=false;
  for(const id of remaining){const ids=orbit(id),indices=ids.map(x=>remaining.indexOf(x));if(indices.some(i=>i<0)||indices.some(i=>indices.includes((i+1)%remaining.length)))continue;
   const ears=indices.map(i=>[remaining[(i+remaining.length-1)%remaining.length],remaining[i],remaining[(i+1)%remaining.length]]);
   if(ears.some(f=>cross(...f.map(i=>v[i]))<=1e-8||remaining.some(x=>!f.includes(x)&&inside(v[x],...f.map(i=>v[i])))||inside(v[0],...f.map(i=>v[i]))))continue;
   faces.push(...ears);for(const index of indices.sort((a,b)=>b-a))remaining.splice(index,1);clipped=true;break;
  }
  if(!clipped)return original;
 }
 if(star())for(let i=0;i<remaining.length;i++)faces.push([0,remaining[i],remaining[(i+1)%remaining.length]]);else faces.push(remaining);
 const interior=used.filter(id=>id!==0&&!loop.includes(id)).sort((a,b)=>orbit(a).length-orbit(b).length||Math.hypot(...v[a].slice(0,2))-Math.hypot(...v[b].slice(0,2)));
 const inserted=new Set();for(const id of interior){if(inserted.has(id))continue;for(const member of orbit(id)){insertPoint(v,faces,member);inserted.add(member);}}
 return faces;
}

function repairSymmetry(v,loop,faces){
 const key=p=>p.map(x=>(Math.abs(x)<1e-6?0:x).toFixed(5)).join(':'),used=[...new Set(faces.flat())],lookup=new Map(used.map(id=>[key(v[id]),id])),faceKey=f=>[...f].sort((a,b)=>a-b).join(':');
 const maps=[];for(let k=0;k<12;k++){const a=k*Math.PI/6,c=Math.cos(a),s=Math.sin(a),map=new Map(used.map(id=>{const [x,y,z]=v[id];return [id,lookup.get(key([c*x+s*y,s*x-c*y,z]))];}));if(used.every(id=>map.get(id)!==undefined)&&loop.every(id=>loop.includes(map.get(id))))maps.push(map);}
 const index=new Map(faces.map((f,i)=>[faceKey(f),i]));
 const bad=faces.map((f,i)=>maps.some(m=>!index.has(faceKey(f.map(id=>m.get(id)))))?i:-1).filter(i=>i>=0);
 if(!bad.length)return faces;
 let patch=new Set(bad);
 const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
 for(let pass=0;pass<12;pass++){
  const edges=new Map();for(const i of patch){const f=faces[i];for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],k=edgeKey(a,b);if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}}
  const boundary=[...edges.values()],vertices=[...new Set([...patch].flatMap(i=>faces[i]))];
  for(const anchor of vertices.filter(id=>maps.every(m=>m.get(id)===id))){
   if(boundary.some(([a,b])=>cross(v[anchor],v[a],v[b])<-1e-8))continue;
   const replacement=boundary.filter(([a,b])=>cross(v[anchor],v[a],v[b])>1e-8).map(([a,b])=>[anchor,a,b]);
   for(const id of vertices.sort((a,b)=>maps.filter(m=>m.get(b)===b).length-maps.filter(m=>m.get(a)===a).length))insertPoint(v,replacement,id);
   const set=new Set(replacement.map(faceKey));
   if(new Set(replacement.flat()).size!==vertices.length||replacement.some(f=>maps.some(m=>!set.has(faceKey(f.map(id=>m.get(id)))))))continue;
   return [...faces.filter((_,i)=>!patch.has(i)),...replacement];
  }
  const next=new Set(patch);faces.forEach((f,i)=>{if(f.some((a,j)=>edges.has(edgeKey(a,f[(j+1)%3])))){next.add(i);for(const m of maps){const sibling=index.get(faceKey(f.map(id=>m.get(id))));if(sibling!==undefined)next.add(sibling);}}});
  if(next.size===patch.size)break;patch=next;
 }
 return faces;
}
