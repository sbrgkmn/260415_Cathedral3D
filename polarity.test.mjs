import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeBinarySTL } from './stl.mjs';
import { DEFAULTS, buildStudy, analyzeMesh, encodeBinarySTL } from './polarity.mjs';

const coordKey = p => p.map(v => v.toFixed(7)).join(',');
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-7, `${a} ≠ ${b}`);
const distance = (a,b) => Math.hypot(...a.map((n,i)=>n-b[i]));
function areaXY(frame) {
  return frame.faces.reduce((sum,[ia,ib,ic]) => {
    const [a,b,c] = [ia,ib,ic].map(i=>frame.vertices[i]);
    return sum + ((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])) / 2;
  },0);
}
function boundary(frame) {
  const edges=new Map();
  for(const [a,b,c] of frame.faces) for(const [u,v] of [[a,b],[b,c],[c,a]]) {
    const key=u<v?`${u}:${v}`:`${v}:${u}`;
    if(!edges.has(key)) edges.set(key,{u,v,count:0});
    edges.get(key).count++;
  }
  return [...edges.values()].filter(e=>e.count===1).map(({u,v})=>[frame.vertices[u],frame.vertices[v]]);
}
function connected(frame) {
  const adjacent = new Map(frame.vertices.map((p,i)=>[i,new Set()]));
  frame.faces.forEach(([a,b,c])=>[[a,b],[b,c],[c,a]].forEach(([u,v])=>{adjacent.get(u).add(v);adjacent.get(v).add(u);}));
  const seen=new Set([0]),queue=[0];
  while(queue.length) for(const next of adjacent.get(queue.pop())) if(!seen.has(next)){seen.add(next);queue.push(next);}
  return seen.size===frame.vertices.length;
}

test('complete plan growth precedes every vertical and surface step',()=>{
  const {frames}=buildStudy();
  assert.deepEqual(frames.map(f=>f.faces.length),[2,4,8,16,32,128,512,2048,8192]);
  assert.deepEqual(frames.map(f=>f.phase),['seed','plan','plan','plan','plan','plan','vertical','vertical','surface']);
  const lastPlan=frames.filter(f=>f.phase==='plan').at(-1);
  frames.filter(f=>['vertical','surface'].includes(f.phase)).forEach(f=>close(areaXY(f),areaXY(lastPlan)));
});

test('plan E/C creates alternating lobes and recesses without creating heights',()=>{
  const {frames,options:p}=buildStudy();
  const plan=frames.filter(f=>f.phase==='plan');
  for(const f of plan) {
    if(f.kind==='divide') {assert.equal(f.motions.length,0);continue;}
    assert.ok(f.vertices.every(v=>v[2]===0 || v[2]===p.height));
    for(const {from,to} of f.motions) {
      close(from[2],0);close(to[2],0);
      const delta=Math.hypot(to[0],to[1])-Math.hypot(from[0],from[1]);
      assert.ok(f.kind==='expand'?delta>0:delta<0);
      close(from[0]*to[1]-from[1]*to[0],0);
    }
    const prior=frames[f.index-1];
    assert.equal(f.faces.length,prior.faces.length*2);
    assert.ok(f.kind==='expand'?areaXY(f)>areaXY(prior):areaXY(f)<areaXY(prior));
  }
  const another=buildStudy({expansion:0.9,contraction:0.8,height:p.height,generations:2}).frames.filter(f=>f.phase==='plan');
  assert.deepEqual(plan,another,'Vertical controls must not change the completed plan');
});

test('plan depth creates more sectors before the vertical phase starts',()=>{
  for(const cycles of [1,2,3]) {
    const s=buildStudy({planCycles:cycles,detail:0});
    const plan=s.frames.filter(f=>f.phase==='plan');
    assert.equal(plan.length,2*cycles+1);
    assert.equal(plan.at(-1).faces.length,2*4**(cycles+1));
    assert.equal(s.frames.find(f=>f.phase==='vertical').index,2+2*cycles);
  }
});

test('expansion rises and contraction lowers only new points; prior peaks survive',()=>{
  const {frames}=buildStudy({generations:2,detail:0});
  for(let i=0;i<frames.length;i++) {
    if(frames[i].phase!=='vertical') continue;
    const f=frames[i], sign=f.kind==='expand'?1:-1;
    assert.ok(f.motions.length>0);
    f.motions.forEach(({from,to})=>{
      close(from[0],to[0]);close(from[1],to[1]);assert.ok(sign*(to[2]-from[2])>0);
    });
    const current=new Set(f.vertices.map(coordKey));
    frames[i-1].vertices.forEach(p=>assert.ok(current.has(coordKey(p)),'Existing vertex moved or lost'));
  }
  const f=frames.filter(f=>f.phase==='vertical').at(-1);
  const neighbors=new Map(f.vertices.map((p,i)=>[i,new Set()]));
  f.faces.forEach(([a,b,c])=>[[a,b],[b,c],[c,a]].forEach(([u,v])=>{neighbors.get(u).add(v);neighbors.get(v).add(u);}));
  const peaks=f.vertices.filter((p,i)=>p[2]>DEFAULTS.height*.5 && [...neighbors.get(i)].every(j=>p[2]>f.vertices[j][2]+1e-7));
  assert.ok(peaks.length>=5,'Branches should produce several distinct local apices');
});

test('neutral rules preserve the original two triangular planes',()=>{
  const {frames,options:p}=buildStudy({planExpansion:0,planContraction:0,contraction:0,expansion:0,relief:0});
  frames.forEach(f=>f.vertices.forEach(([x,y,z])=>close(Math.abs(x)/(p.width/2)+y/p.depth+z/p.height,1)));
});

test('finishing subdivision preserves every boundary segment, including its height',()=>{
  const {frames}=buildStudy({detail:3,relief:0.15});
  for(let i=0;i<frames.length;i++) {
    if(frames[i].phase!=='surface') continue;
    const oldBoundary=boundary(frames[i-1]);
    for(const edge of boundary(frames[i])) for(const point of edge) {
      assert.ok(oldBoundary.some(([a,b])=>Math.abs(distance(a,point)+distance(point,b)-distance(a,b))<1e-7),'Surface detail changed the outline');
    }
  }
});

test('parameter extremes remain a connected symmetric disk without degenerate or inverted faces',()=>{
  const configurations=[
    {}, {planExpansion:0,planContraction:0,contraction:0,expansion:0,relief:0},
    {planCycles:3,planExpansion:0.8,planContraction:0.8,uprightness:0.9},
    {planCycles:3,planExpansion:0,planContraction:0.8,width:40,depth:15,height:60},
    {contraction:0.85,expansion:0.9,relief:0.15,depth:30,width:240,height:60},
    {contraction:0.85,expansion:0.9,relief:0.15,depth:120,width:80,height:180},
    {generations:2,detail:3,decay:0.25},
    {generations:3,detail:3,decay:0.85,contraction:0.85,expansion:0.9},
  ];
  for(const options of configurations) for(const frame of buildStudy(options).frames) {
    const s=analyzeMesh(frame);
    assert.equal(s.degenerate,0);assert.equal(s.reversedPlan,0);
    assert.equal(s.nonManifoldEdges,0);assert.equal(s.euler,1);assert.equal(s.symmetric,true);
    assert.ok(connected(frame));assert.ok(s.triangles<=32768);
    assert.ok(frame.vertices.every(p=>p.every(Number.isFinite)&&p[2]>=0));
    assert.equal(new Set(frame.vertices.map(coordKey)).size,frame.vertices.length,'Unwelded duplicate positions');
  }
});

test('snapshots are independent and output is deterministic',()=>{
  const {frames}=buildStudy();
  const original=JSON.stringify(frames[0]);
  frames.at(-1).vertices[0][2]=999;
  assert.equal(JSON.stringify(frames[0]),original);
  assert.deepEqual(buildStudy(),buildStudy());
});

test('options are normalized and recursion never exceeds the study budget',()=>{
  const {options,frames}=buildStudy({generations:20,detail:20,width:NaN,depth:-50,expansion:Infinity});
  assert.equal(options.generations,2);assert.equal(options.detail,0);
  assert.equal(options.width,DEFAULTS.width);assert.equal(options.depth,15);
  assert.equal(options.expansion,DEFAULTS.expansion);assert.equal(frames.at(-1).faces.length,32768);
});

test('binary STL round-trips the selected stage with unit normals and Z-up vertices',()=>{
  for(const frame of buildStudy().frames) {
    const buffer=encodeBinarySTL(frame),data=new DataView(buffer);
    assert.equal(data.getUint32(80,true),frame.faces.length);
    assert.equal(buffer.byteLength,84+50*frame.faces.length);
    frame.faces.forEach((face,i)=>{
      const base=84+i*50;
      const normal=[0,4,8].map(offset=>data.getFloat32(base+offset,true));
      assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-6);
      assert.ok(normal[2]>0);
      face.forEach((vertex,j)=>frame.vertices[vertex].forEach((value,k)=>{
        assert.equal(data.getFloat32(base+12+j*12+k*4,true),Math.fround(value));
      }));
      assert.equal(data.getUint16(base+48,true),0);
    });
  }
});


test('all six original STL files decode with their original face counts and coordinates',()=>{
  const counts=[8192,8192,8192,8192,2048,32768];
  for(let i=1;i<=6;i++) {
    const file=readFileSync(new URL(`./Old Project FIles/Target_${i}.stl`,import.meta.url));
    const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
    const frame=decodeBinarySTL(buffer),source=new DataView(buffer);
    assert.equal(frame.faces.length,counts[i-1]);
    frame.faces.forEach((face,j)=>face.forEach((id,k)=>frame.vertices[id].forEach((v,n)=>{
      assert.equal(v,source.getFloat32(84+j*50+12+k*12+n*4,true));
    })));
  }
});

test('STL decoder rejects truncated data',()=>{
  assert.throws(()=>decodeBinarySTL(new ArrayBuffer(12)),/Incomplete/);
  const buffer=new ArrayBuffer(84);new DataView(buffer).setUint32(80,1,true);
  assert.throws(()=>decodeBinarySTL(buffer),/length/);
});


test('plan cell division adds local connections without deforming its parent surface',()=>{
  const {frames}=buildStudy();
  const cells=frames.find(f=>f.kind==='divide'),parent=frames[cells.index-1];
  const allowed=new Set(parent.vertices.map(coordKey));
  parent.faces.forEach(([a,b,c])=>[[a,b],[b,c],[c,a]].forEach(([u,v])=>{
    allowed.add(coordKey(parent.vertices[u].map((n,i)=>(n+parent.vertices[v][i])/2)));
  }));
  assert.ok(cells.vertices.every(p=>allowed.has(coordKey(p))));
  assert.equal(cells.faces.length,4*parent.faces.length);
  close(areaXY(cells),areaXY(parent));
});
