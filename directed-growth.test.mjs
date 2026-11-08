import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStudy,analyzeMesh} from './polarity.mjs';
test('directed stages retain one upper child per half and preserve the apex and existing vertices',()=>{
 const s=buildStudy({planCycles:1,directedCycles:3,detail:0});
 const directed=s.frames.filter(f=>f.phase==='directed');
 assert.equal(directed.length,7);
 let previousArea=Infinity;
 for(const f of directed){
  assert.equal(f.activeFaces.length,2);
  const face=f.faces[f.activeFaces[0]], points=face.map(i=>f.vertices[i]);
  assert.ok(points.some(p=>p[0]===0&&p[1]===0&&p[2]===s.options.height));
  const [a,b,c]=points;
  const area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
  assert.ok(area<previousArea);previousArea=area;
  const positions=new Set(f.vertices.map(p=>JSON.stringify(p)));
  s.frames[f.index-1].vertices.forEach(p=>assert.ok(positions.has(JSON.stringify(p))));
  for(const m of f.motions){assert.equal(m.from[0],m.to[0]);assert.equal(m.from[1],m.to[1]);assert.ok(f.kind==='expand'?m.to[2]>m.from[2]:m.to[2]<m.from[2]);}
 }
 assert.ok(s.frames.findIndex(f=>f.phase==='vertical')>directed.at(-1).index);
});
test('directed transitions remain connected symmetric disks at parameter extremes',()=>{
 for(const controls of [{},{shoulder:1,recess:1,width:40,height:220},{shoulder:0,recess:0,width:240,height:60}]){
  for(const f of buildStudy({...controls,planCycles:1,directedCycles:4,detail:0}).frames){
   const a=analyzeMesh(f);assert.equal(a.nonManifoldEdges,0);assert.equal(a.degenerate,0);assert.equal(a.reversedPlan,0);assert.equal(a.euler,1);assert.equal(a.symmetric,true);
   const edges=new Map();for(const [a,b,c] of f.faces)for(const [u,v] of [[a,b],[b,c],[c,a]]){const k=u<v?`${u}:${v}`:`${v}:${u}`;edges.set(k,(edges.get(k)||0)+1);}
   for(const [k,n] of edges)if(n===1){const [a,b]=k.split(':').map(i=>f.vertices[Number(i)]);assert.ok((a[2]===0&&b[2]===0)||(a[1]===0&&b[1]===0),'unexpected interior crack');}
  }
 }
});
