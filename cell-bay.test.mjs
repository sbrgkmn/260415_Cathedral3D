import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSections,alternatingRules,DEFAULTS,polygonArea} from './cell-grammar.mjs';
import {buildFoldedBay,repeatFoldedBay} from './cell-bay.mjs';
import {meshIntegrity,sectionProfile} from './section-solid.mjs';
import {encodeBinarySTL} from './polarity.mjs';
import {decodeBinarySTL} from './stl.mjs';
const key=p=>p.map(x=>(Math.abs(x)<1e-6?0:x).toFixed(6)).join(',');
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function closed(mesh,components=1) {
  const r=meshIntegrity(mesh);assert.equal(r.watertight,true,JSON.stringify(r));assert.equal(r.components,components);assert.equal(r.euler,2*components);return r;
}
function rayTriangle(a,b,tri) {
  const direction=sub(b,a),e1=sub(tri[1],tri[0]),e2=sub(tri[2],tri[0]),h=cross(direction,e2),det=dot(e1,h);
  if(Math.abs(det)<1e-9)return false;
  const s=sub(a,tri[0]),u=dot(s,h)/det;if(u<=1e-7||u>=1-1e-7)return false;
  const q=cross(s,e1),v=dot(direction,q)/det;if(v<=1e-7||u+v>=1-1e-7)return false;
  const t=dot(e2,q)/det;return t>1e-7&&t<1-1e-7;
}
function assertNoCrossingPanels(mesh) {
  const triangles=mesh.faces.map(f=>f.map(i=>mesh.vertices[i]));
  const boxes=triangles.map(t=>[0,1,2].map(k=>[Math.min(...t.map(p=>p[k])),Math.max(...t.map(p=>p[k]))]));
  for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++) {
    if(boxes[i].some((r,k)=>r[1]<boxes[j][k][0]-1e-8||r[0]>boxes[j][k][1]+1e-8))continue;
    for(let k=0;k<3;k++) {
      assert.ok(!rayTriangle(triangles[i][k],triangles[i][(k+1)%3],triangles[j]),`panels ${i},${j} intersect`);
      assert.ok(!rayTriangle(triangles[j][k],triangles[j][(k+1)%3],triangles[i]),`panels ${j},${i} intersect`);
    }
  }
}

test('every cell generation produces a closed positive folded volume with the exact middle section',()=>{
  for(const frame of buildSections().frames){
    const mesh=buildFoldedBay(frame);closed(mesh);assertNoCrossingPanels(mesh);
    const points=new Set(mesh.vertices.filter(p=>p[2]===0).map(key));
    for(const [x,y] of sectionProfile(frame.points).profile)assert.ok(points.has(key([x,y,0])));
  }
});
test('folded panels and cap triangulation preserve both mirror planes',()=>{
  const mesh=buildFoldedBay(buildSections().frames.at(-1));
  const triangles=new Set(mesh.faces.map(f=>f.map(i=>key(mesh.vertices[i])).sort().join('|')));
  for(const axis of [0,2])for(const f of mesh.faces)assert.ok(triangles.has(f.map(i=>key(mesh.vertices[i].map((v,k)=>k===axis?-v:v))).sort().join('|')));
});
test('fold amplitude changes the geometry and preserves an exact unwarped zero setting',()=>{
  const frame=buildSections().frames.at(-1),a=buildFoldedBay(frame,{fold:0}),b=buildFoldedBay(frame,{fold:1});
  assert.notDeepEqual(a.vertices,b.vertices);closed(a);closed(b);
  const positions=new Set(a.profile.map(p=>key([...p,0])));for(const [x,y] of a.vertices)assert.ok(positions.has(key([x,y,0])));
});
test('arrays weld touching bays and keep spaced bays as individually closed solids',()=>{
  const mesh=buildFoldedBay(buildSections().frames.at(-1)),volume=closed(mesh).volume;
  const together=repeatFoldedBay(mesh,{bays:3},true),apart=repeatFoldedBay(mesh,{bays:3,gap:5},true);
  assert.ok(Math.abs(closed(together).volume-volume*3)<volume*1e-8);closed(apart,3);
});
test('combined extreme parameters and alternate rule orders produce closed noncrossing panels',()=>{
  for(const width of [40,140])for(const height of [60,180])for(const fold of [0,1]){
    const p={width,height,fold,depth:80,web:.3,bias:5,scale:.8},s=buildSections(p);
    const mesh=buildFoldedBay(s.frames.at(-1),p);closed(mesh);assertNoCrossingPanels(mesh);
  }
  for(const order of ['EEEECCCC','CCCCEEEE','CECECECE']){
    const frame=buildSections({},[...order].map(kind=>({kind,amount:.9}))).frames.at(-1);closed(buildFoldedBay(frame));
  }
});
test('actual float32 single-bay and array STL files remain watertight',()=>{
  for(const array of [false,true]){
    const mesh=repeatFoldedBay(buildFoldedBay(buildSections().frames.at(-1)),{},array);
    const data=encodeBinarySTL({vertices:mesh.vertices.map(([x,y,z])=>[x,-z,y]),faces:mesh.faces});
    const decoded=decodeBinarySTL(data,'cell-study.stl');closed(decoded);assert.equal(decoded.faces.length,mesh.faces.length);
  }
});
