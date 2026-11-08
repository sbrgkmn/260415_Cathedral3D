import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBranching,tree,normalize,MOUNTAIN_DEFAULTS} from './branching.mjs';
import {meshIntegrity} from './section-solid.mjs';
import {encodeBinarySTL} from './polarity.mjs';
import {decodeBinarySTL} from './stl.mjs';
const key=p=>p.map(v=>v.toFixed(6).replace('-0.000000','0.000000')).join(',');
test('binary plan is a connected symmetric tree with inherited height hierarchy',()=>{
 for(const levels of [1,2,3,4]){
  const g=tree({levels});assert.equal(g.nodes.length,2**(levels+1));assert.equal(g.edges.length,g.nodes.length-1);
  const positions=new Set(g.nodes.map(n=>key(n.point)));
  g.nodes.forEach(n=>{assert.ok(positions.has(key([-n.point[0],n.point[1],n.point[2]])));if(n.parent!==null)assert.ok(g.nodes[n.parent].point[2]>n.point[2]);});
 }
});
test('every tree node is an actual local roof peak separated by lower saddles',()=>{
 const m=buildBranching();
 for(const n of m.nodes){assert.deepEqual(m.roof.vertices[n.id],n.point);const adjacent=new Set(m.roof.faces.filter(f=>f.includes(n.id)).flat().filter(i=>i!==n.id));for(const i of adjacent)assert.ok(m.roof.vertices[i][2]<n.point[2]);}
 assert.equal(m.roof.ridges.length,m.edges.length*2);
});
test('roof triangles and footprint are bilaterally symmetric',()=>{
 const m=buildBranching();const keys=new Set(m.roof.faces.map(f=>f.map(i=>key(m.roof.vertices[i])).sort().join('|')));
 for(const f of m.roof.faces)assert.ok(keys.has(f.map(i=>{const [x,y,z]=m.roof.vertices[i];return key([-x,y,z]);}).sort().join('|')));
});
test('supported combined extremes stay one closed positive solid without degenerate faces',()=>{
 for(const levels of [1,2,3,4])for(const controls of [{},{angle:10,length:120,lengthRatio:.4,stemLength:10,height:80,wall:60,branchWidth:40,falloff:.55,valley:.35},{angle:90,length:25,lengthRatio:.85,stemLength:80,height:200,wall:8,branchWidth:2,falloff:.88,valley:.9}]){
  const m=buildBranching({...controls,levels});assert.ok(m.integrity.watertight);assert.equal(m.integrity.components,1);assert.equal(m.integrity.euler,2);
  // XY area equality used by the builder rejects overlapping roof corridors.
  assert.ok(m.branchWidth>0);
 }
});
test('height edits preserve plan topology, and width controls real geometry',()=>{
 const a=buildBranching(),b=buildBranching({height:180,falloff:.6,valley:.4}),c=buildBranching({branchWidth:2});
 assert.deepEqual(a.edges,b.edges);assert.deepEqual(a.nodes.map(n=>n.point.slice(0,2)),b.nodes.map(n=>n.point.slice(0,2)));assert.notDeepEqual(a.roof.vertices,b.roof.vertices);assert.ok(c.branchWidth<a.branchWidth);
});
test('binary STL round trip remains watertight, and invalid input normalizes',()=>{
 const m=buildBranching();const copy=decodeBinarySTL(encodeBinarySTL(m.solid));assert.ok(meshIntegrity(copy).watertight);
 const p=normalize({levels:99,height:NaN,length:-5});assert.equal(p.levels,99);assert.equal(p.height,125);assert.equal(p.length,-5);
 assert.throws(()=>buildBranching({levels:99}),/budget/);assert.throws(()=>buildBranching({length:-5}),/positive/);
});

test('every ridge, including terminal ends, has two geometrically mirrored wedge faces',()=>{
 for(const levels of [1,2,3,4]){
  const {roof}=buildBranching({levels});
  for(const [a,b] of roof.ridges){
   const pair=roof.faces.filter(f=>f.includes(a)&&f.includes(b));assert.equal(pair.length,2);
   const A=roof.vertices[a],B=roof.vertices[b];
   const tips=pair.map(f=>roof.vertices[f.find(i=>i!==a&&i!==b)]);
   const dx=B[0]-A[0],dy=B[1]-A[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
   const [P,Q]=tips,along=(P[0]-A[0])*ux+(P[1]-A[1])*uy;
   const reflected=[2*(A[0]+along*ux)-P[0],2*(A[1]+along*uy)-P[1],P[2]];
   reflected.forEach((v,i)=>assert.ok(Math.abs(v-Q[i])<1e-7,'Wedge faces must reflect across their own ridge plane'));
  }
 }
});

test('complete solid face connectivity reflects across the whole-tree symmetry plane',()=>{
 for(const levels of [1,2,3,4]){
  const {solid}=buildBranching({levels});const keys=new Set(solid.faces.map(f=>f.map(i=>key(solid.vertices[i])).sort().join('|')));
  for(const f of solid.faces)assert.ok(keys.has(f.map(i=>{const [x,y,z]=solid.vertices[i];return key([-x,y,z]);}).sort().join('|')),'Roof, wall and base triangles must all have reflected partners');
 }
});
test('terminal half-branches reflect their entire roof, gable, wall and base topology locally',()=>{
 for(const levels of [1,2,3,4]){
  const m=buildBranching({levels}),keys=new Set(m.solid.faces.map(f=>f.map(i=>key(m.solid.vertices[i])).sort().join('|')));
  for(const node of m.nodes){
   const incident=m.edges.filter(e=>e.includes(node.id));if(incident.length!==1)continue;
   const neighbor=m.nodes[incident[0].find(i=>i!==node.id)].point,A=node.point;
   const dx=neighbor[0]-A[0],dy=neighbor[1]-A[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
   const local=p=>[(p[0]-A[0])*ux+(p[1]-A[1])*uy,-(p[0]-A[0])*uy+(p[1]-A[1])*ux];
   const ridge=m.roof.ridges.find(e=>e.includes(node.id)),saddle=ridge.find(i=>i!==node.id);
   const midpointHalf=Math.max(...m.roof.faces.filter(f=>f.includes(node.id)&&f.includes(saddle)).flat().map(i=>Math.abs(local(m.roof.vertices[i])[1])));
   const endHalf=Math.max(...m.roof.faces.filter(f=>f.includes(node.id)&&f.every(i=>Math.abs(local(m.roof.vertices[i])[0])<1e-6)).flat().map(i=>Math.abs(local(m.roof.vertices[i])[1])));
   const faces=m.solid.faces.filter(f=>f.every(i=>{const [along,across]=local(m.solid.vertices[i]);const localHalf=endHalf+(midpointHalf-endHalf)*along/(length/2);return along>=-1e-6&&along<=length/2+1e-6&&Math.abs(across)<=localHalf+1e-6;}));
   for(const [start,end] of Object.values(m.solid.regions))assert.ok(faces.some(f=>m.solid.faces.slice(start,end).includes(f)),'Check roof, walls and base in each terminal cell');
   for(const face of faces){
    const reflected=face.map(i=>{const p=m.solid.vertices[i],[along]=local(p);return key([2*(A[0]+along*ux)-p[0],2*(A[1]+along*uy)-p[1],p[2]]);}).sort().join('|');
    assert.ok(keys.has(reflected),`Terminal surface triangle lacks its locally reflected partner: level ${levels}, node ${node.id}, face ${face}, points ${JSON.stringify(face.map(i=>m.solid.vertices[i]))}`);
   }
  }
 }
});

test('wall panels use only two triangles and have no center-fan vertices',()=>{
 const m=buildBranching(),[start,end]=m.solid.regions.walls;
 assert.equal(end-start,m.boundary.length*2);
 const boundaryXY=new Set(m.boundary.map(i=>key(m.roof.vertices[i].slice(0,2))));
 for(const f of m.solid.faces.slice(start,end))for(const i of f)assert.ok(boundaryXY.has(key(m.solid.vertices[i].slice(0,2))));
});

test('branch lengths and local fork angles match their recursive parameters',()=>{
 for(const angle of [10,70,90])for(const lengthRatio of [.4,.7,.85]){
  const g=tree({angle,length:75,lengthRatio,levels:4,stemLength:28});
  for(const n of g.nodes){
   if(n.parent===null)continue;
   const parent=g.nodes[n.parent],length=Math.hypot(n.point[0]-parent.point[0],n.point[1]-parent.point[1]);
   assert.ok(Math.abs(length-(n.kind==='stem'?28:75*lengthRatio**(n.generation-1)))<1e-8);
   if(n.kind==='stem')continue;
   const turn=Math.abs(n.heading-parent.heading)*180/Math.PI;
   assert.ok(Math.abs(turn-angle/2*.5**(n.generation-1))<1e-8);
  }
 }
});
test('legacy spread and depth bookmarks migrate into explicit angle and length controls',()=>{
 const p=normalize({spread:200,depth:105,thickness:.71});
 assert.ok(Math.abs(p.angle-2*Math.atan2(50,52.5)*180/Math.PI)<1e-8);
 assert.equal(p.length,72.5);assert.ok(Math.abs(p.stemLength-29.4)<1e-8);
 assert.ok(!('spread' in p)&&!('depth' in p)&&!('thickness' in p));
 const override=normalize({spread:200,depth:105,angle:60,length:80});assert.equal(override.angle,60);assert.equal(override.length,80);
});

test('parameters retain values beyond old slider ranges and build valid experiments',()=>{
 for(const parameters of [{height:500,falloff:1.2},{length:250,stemLength:150},{angle:120,lengthRatio:1.1},{valley:1.2},{levels:5}]){
  const m=buildBranching(parameters);for(const [k,v] of Object.entries(parameters))assert.equal(m.parameters[k],v);assert.ok(m.integrity.watertight);
 }
});
test('peak controls change measured heights independently and allow reversed hierarchy',()=>{
 const a=tree({height:500,wall:20,falloff:.5}),b=tree({height:500,wall:20,falloff:1.2});
 assert.equal(a.nodes.find(n=>n.generation===1).point[2],260);
 assert.equal(a.nodes.find(n=>n.generation===2).point[2],140);
 assert.equal(b.nodes[0].point[2],500);
 assert.ok(b.nodes.find(n=>n.generation===1).point[2]>500);
 assert.deepEqual(a.nodes.map(n=>n.point.slice(0,2)),b.nodes.map(n=>n.point.slice(0,2)));
 assert.throws(()=>buildBranching({height:20,wall:30}),/above the eave/);
});

test('compact branches thicken independently while the central fork remains open',()=>{
 const m=buildBranching(MOUNTAIN_DEFAULTS),p=m.parameters;
 const oldUniformLimit=2*.48*p.length*p.lengthRatio*Math.tan(p.angle*Math.PI/720);
 const main=m.roof.branchProfiles.filter(({edge:[a,b]})=>a===0&&m.nodes[b].kind==='branch');
 assert.equal(main.length,2);for(const branch of main)assert.ok(branch.width>oldUniformLimit*3);
 assert.equal(m.roof.branchProfiles.length,m.edges.length);
 const polygon=m.boundary.map(i=>m.roof.vertices[i]),point=[0,p.length/2];let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 assert.equal(inside,false,'The fork gap must not be filled into an enclosing outline');
 assert.ok(m.integrity.watertight);assert.equal(m.integrity.faces,198);
});

 test('lateral grammar accumulates along long edges and cascades symmetrically',()=>{
 const p={...MOUNTAIN_DEFAULTS,length:90,stemLength:55,angle:150,growth:2,spacing:16,spurRatio:.85,spurAngle:80,descent:.62};
 const m=buildBranching(p),one=buildBranching({...p,growth:1});
 assert.ok(m.nodes.length>one.nodes.length);
 assert.ok(buildBranching({...p,length:110}).nodes.length>m.nodes.length);
 for(const n of m.nodes){
 assert.ok(m.nodes.some(q=>Math.abs(q.point[0]+n.point[0])<1e-7&&Math.abs(q.point[1]-n.point[1])<1e-7&&Math.abs(q.point[2]-n.point[2])<1e-7));
 if(n.kind==='spur')assert.ok(n.point[2]<m.nodes[n.parent].point[2]);
 }
 assert.ok(m.integrity.watertight);assert.equal(m.integrity.components,1);
 });

test('recursive length and angle rules change descendants while retaining earlier peaks',()=>{
 const p={...MOUNTAIN_DEFAULTS,length:90,stemLength:55,angle:150,growth:2,spacing:16,spurRatio:.85};
 const a=buildBranching({...p,growthLength:.3,growthAngle:.65});
 const b=buildBranching({...p,growthLength:.8,growthAngle:.9});
 const descendants=m=>m.nodes.filter(n=>n.growthPass===2);
 assert.ok(descendants(a).length>0);
 assert.notDeepEqual(descendants(a).map(n=>n.point),descendants(b).map(n=>n.point));
 assert.deepEqual(a.nodes.filter(n=>n.growthPass===1).map(n=>n.point),b.nodes.filter(n=>n.growthPass===1).map(n=>n.point));
 for(const m of [a,b])assert.ok(m.integrity.watertight);
});

test('fullness increases mass without merging topology and angle increments open later forks',()=>{
 const p={...MOUNTAIN_DEFAULTS,length:90,stemLength:55,angle:150,growth:2,spacing:16};
 const a=buildBranching(p),b=buildBranching({...p,widthFill:1.5});
 assert.ok(b.integrity.volume>a.integrity.volume);assert.equal(a.solid.faces.length,b.solid.faces.length);assert.ok(b.integrity.watertight);
 const c=buildBranching({...p,forkIncrement:10,sideIncrement:10,widthFill:1.5});
 assert.notDeepEqual(a.nodes.map(n=>n.point),c.nodes.map(n=>n.point));
 for(const n of c.nodes)assert.ok(c.nodes.some(q=>Math.abs(q.point[0]+n.point[0])<1e-7&&Math.abs(q.point[1]-n.point[1])<1e-7));
 assert.ok(c.integrity.watertight);
});

test('area-adaptive vertical development closes at mixed depths and preserves the footprint',()=>{
 const p={...MOUNTAIN_DEFAULTS,verticalSteps:3,minArea:8,verticalLift:.4};
 const m=buildBranching(p),base=buildBranching({...p,verticalSteps:0});
 assert.ok(m.refinement.splits>0);assert.ok(m.integrity.watertight);assert.equal(m.integrity.components,1);
 assert.deepEqual(m.boundary.map(i=>m.roof.vertices[i]),base.boundary.map(i=>base.roof.vertices[i]));
 assert.ok(m.integrity.volume>base.integrity.volume);
 const coarse=buildBranching({...p,minArea:80});assert.ok(coarse.refinement.splits<m.refinement.splits);
 for(const v of m.roof.vertices)assert.ok(m.roof.vertices.some(q=>Math.abs(q[0]+v[0])<1e-7&&Math.abs(q[1]-v[1])<1e-7&&Math.abs(q[2]-v[2])<1e-7));
});

test('architectural thickness applies requested widths and reserves open junction space',()=>{
 const p={...MOUNTAIN_DEFAULTS,levels:1,angle:150,length:90,stemLength:55,growth:2,spacing:16,spurRatio:.85,spurAngle:80,sideIncrement:10,widthFill:1.5,nave:1};
 let previous=0;
 for(const branchWidth of [8,28,60,179]){
 const m=buildBranching({...p,branchWidth,verticalSteps:1});
 assert.ok(m.integrity.watertight);assert.equal(m.integrity.components,1);
 assert.ok(Math.abs(m.widthRange[1]-branchWidth*p.widthFill)<1e-7);
 assert.ok(m.widthRange[1]>previous);previous=m.widthRange[1];
 assert.ok(meshIntegrity(decodeBinarySTL(encodeBinarySTL(m.solid))).watertight);
 const keys=new Set(m.roof.vertices.map(key));for(const [x,y,z] of m.roof.vertices)assert.ok(keys.has(key([-x,y,z])));
 }
});

test('nave ratios independently taper widths and shorten clear side spans',()=>{
 const p={...MOUNTAIN_DEFAULTS,levels:1,angle:150,length:90,stemLength:55,growth:2,spacing:16,spurRatio:.85,spurAngle:80,sideIncrement:10,nave:1};
 const a=buildBranching(p),b=buildBranching({...p,branchTaper:.4,branchReach:.6});
 assert.equal(a.widthRange[1],b.widthRange[1]);assert.ok(b.widthRange[0]<a.widthRange[0]);assert.ok(b.integrity.watertight);
 const c=buildBranching({...p,branchReach:.5});
 assert.deepEqual(c.widthRange,a.widthRange);
 const length=(m,e)=>Math.hypot(...[0,1].map(i=>m.nodes[e[0]].point[i]-m.nodes[e[1]].point[i]));
 for(const e of a.edges.filter(e=>!a.architectural.spineEdges.has(e.join(':'))))assert.ok(length(c,e)<length(a,e)+1e-7);
});

test('proportion lock restores vertical prominence and all atlas morphologies close',async()=>{
 const {variationRecipes}=await import('./branching-variations.mjs');
 const p={...MOUNTAIN_DEFAULTS,levels:1,nave:1,packing:.6,verticalSteps:2};
 const locked=buildBranching(p),absolute=buildBranching({...p,proportionLock:0});
 assert.ok(locked.nodes[0].point[2]>=absolute.nodes[0].point[2]);
 assert.equal(locked.refinement.splits,absolute.refinement.splits);
 for(const recipe of variationRecipes(p)){const m=buildBranching(recipe);assert.ok(m.integrity.watertight);assert.equal(m.integrity.components,1);assert.ok(m.refinement.splits>0);}
 const tight=buildBranching({...p,packing:.4}),loose=buildBranching({...p,packing:1});
 const span=m=>Math.max(...m.nodes.map(n=>Math.hypot(n.point[0],n.point[1])));assert.ok(span(tight)<span(loose));
});

test('vertical E/C creates descending notches toward tips without changing the plan or opening seams',async()=>{
 const {developVerticalEC}=await import('./vertical-ec.mjs');
 const roof={vertices:[[0,0,0],[0,10,100],[-5,0,0],[5,0,0]],faces:[[0,1,2],[1,0,3]],ridges:[[0,1]]};
 const result=developVerticalEC(roof,{verticalSteps:2,minArea:1,verticalLift:.3});
 assert.equal(result.depth,2);assert.equal(result.expansions,result.contractions);
 const ridge=roof.ridges.map(e=>roof.vertices[e[0]]).concat([roof.vertices[1]]);
 assert.ok(ridge.some((v,i)=>i&&v[2]<ridge[i-1][2]),'An E shoulder must be followed by a lower C notch');
 assert.deepEqual(roof.vertices[1],[0,10,100]);
 const p={...MOUNTAIN_DEFAULTS,nave:1,verticalSteps:3,minArea:8,verticalLift:.3};
 const m=buildBranching(p),base=buildBranching({...p,verticalSteps:0});
 assert.deepEqual(m.nodes,base.nodes);assert.ok(m.integrity.watertight);
 assert.ok(meshIntegrity(decodeBinarySTL(encodeBinarySTL(m.solid))).watertight);
 const faces=new Set(m.roof.faces.map(f=>f.map(i=>key(m.roof.vertices[i])).sort().join('|')));
 for(const f of m.roof.faces)assert.ok(faces.has(f.map(i=>{const [x,y,z]=m.roof.vertices[i];return key([-x,y,z]);}).sort().join('|')));
});

test('every terminal gets a projecting nose and its tip ridge develops E/C while staying closed',()=>{
 const p={...MOUNTAIN_DEFAULTS,nave:1,tipNose:.6,minArea:1};
 const base=buildBranching(p),developed=buildBranching({...p,verticalSteps:2});
 for(const n of base.nodes){const edges=base.edges.filter(e=>e.includes(n.id));if(edges.length!==1)continue;
 const q=base.nodes[edges[0].find(id=>id!==n.id)].point;
 const nose=base.roof.ridges.find(([a,b])=>a===n.id&&[0,1].reduce((sum,i)=>sum+(base.roof.vertices[b][i]-n.point[i])*(q[i]-n.point[i]),0)<0);
 assert.ok(nose,'Each terminal has a ridge projecting outward');
 assert.ok(!developed.roof.ridges.some(([a,b])=>a===nose[0]&&b===nose[1]),'The nose ridge must split into E/C segments');
 }
 assert.ok(developed.integrity.watertight);assert.ok(meshIntegrity(decodeBinarySTL(encodeBinarySTL(developed.solid))).watertight);
 const keys=new Set(developed.roof.vertices.map(key));for(const [x,y,z] of developed.roof.vertices)assert.ok(keys.has(key([-x,y,z])));
});

test('marginal growth articulates the footprint symmetrically and closes roof, walls and base',()=>{
 const p={...MOUNTAIN_DEFAULTS,nave:1,tipNose:.6,verticalSteps:2};
 const base=buildBranching(p),m=buildBranching({...p,marginSteps:2,marginMin:3});
 assert.deepEqual(m.nodes,base.nodes);assert.ok(m.boundary.length>base.boundary.length);assert.ok(m.margins.lobes>0);assert.ok(m.margins.notches>0);
 assert.ok(m.integrity.watertight);assert.ok(meshIntegrity(decodeBinarySTL(encodeBinarySTL(m.solid))).watertight);
 const keys=new Set(m.roof.vertices.map(key));for(const [x,y,z] of m.roof.vertices)assert.ok(keys.has(key([-x,y,z])));
 const [start,end]=m.solid.regions.base;for(const face of m.solid.faces.slice(start,end))for(const id of face)assert.equal(m.solid.vertices[id][2],0);
 const stopped=buildBranching({...p,marginSteps:2,marginMin:10000});assert.equal(stopped.margins.lobes,0);
});

test('balanced body plans mirror both axes and coefficients produce asymmetric growth',()=>{
 for(const morphology of [0,1,2,3]){
 const p={...MOUNTAIN_DEFAULTS,levels:1,balanceMode:1,morphology,length:80,growth:1,spacing:20,nave:1};
 const symmetric=buildBranching(p),positions=new Set(symmetric.nodes.map(n=>key(n.point)));
 for(const {point:[x,y,z]} of symmetric.nodes){assert.ok(positions.has(key([-x,y,z])));assert.ok(positions.has(key([x,-y,z])));}
 const asymmetric=buildBranching({...p,leftRight:.3,frontBack:.7});assert.ok(asymmetric.integrity.watertight);
 assert.notDeepEqual(asymmetric.nodes.map(n=>n.point),symmetric.nodes.map(n=>n.point));
 }
});

test('base panels rise with local roofs without moving peaks or opening the volume',()=>{
 const p={...MOUNTAIN_DEFAULTS,nave:1,tipNose:.6};const low=buildBranching(p),tall=buildBranching({...p,baseRiseRatio:.3});
 assert.deepEqual(low.nodes,tall.nodes);assert.deepEqual(low.boundary,tall.boundary);
 let raised=0;for(const id of low.boundary){assert.ok(tall.roof.vertices[id][2]>=low.roof.vertices[id][2]);if(tall.roof.vertices[id][2]>low.roof.vertices[id][2])raised++;}
 assert.ok(raised>low.boundary.length/2);
 const detailed=buildBranching({...p,baseRiseRatio:.3,marginSteps:1,verticalSteps:2});assert.ok(detailed.integrity.watertight);assert.ok(meshIntegrity(decodeBinarySTL(encodeBinarySTL(detailed.solid))).watertight);
});
