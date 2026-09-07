import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSections,DEFAULTS,polygonArea} from './section-grammar.mjs';
import {buildFoldedBay,repeatFoldedBay} from './folded-bay.mjs';
import {meshIntegrity,sectionProfile,triangulateSection} from './section-solid.mjs';
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
test('every development stage is a positive, watertight manifold volume',()=>{
  for(const frame of buildSections().frames)closed(buildFoldedBay(frame));
});
test('both triangle panels and caps mirror across the nave and bay axes',()=>{
  for(const frame of buildSections().frames) {
    const mesh=buildFoldedBay(frame),keys=new Set(mesh.vertices.map(key));
    const triangles=new Set(mesh.faces.map(f=>f.map(i=>key(mesh.vertices[i])).sort().join('|')));
    for(const axis of [0,2]) {
      const reflect=p=>p.map((v,i)=>i===axis?-v:v);
      for(const p of mesh.vertices)assert.ok(keys.has(key(reflect(p))));
      for(const f of mesh.faces)assert.ok(triangles.has(f.map(i=>key(reflect(mesh.vertices[i]))).sort().join('|')));
    }
  }
});
test('end caps close the carrier section while pinnacles occupy only the bay middle',()=>{
  for(const frame of buildSections().frames) {
    const mesh=buildFoldedBay(frame);
    for(const kind of ['front','back']) {
      const area=mesh.faces.reduce((sum,f,i)=>sum+(mesh.faceKinds[i]===kind?polygonArea(f.map(j=>mesh.vertices[j].slice(0,2))):0),0);
      assert.ok(Math.abs(area-polygonArea(frame.carrierPoints))<1e-5,`${kind}: ${area} != ${frame.area}`);
    }
    const {half}=sectionProfile(frame.points);assert.equal(triangulateSection(half).length,half.length-2);
  }
});
test('the actual middle slice contains every point of the drawn refined section',()=>{
  for(const frame of buildSections().frames) {
    const mesh=buildFoldedBay(frame),points=new Set(mesh.vertices.filter(p=>p[2]===0).map(p=>key(p)));
    const clean=sectionProfile(frame.points).profile;
    for(const [x,y] of clean)assert.ok(points.has(key([x,y,0])),`missing section vertex ${x},${y}`);
  }
});
test('vault and buttress controls move geometric folds; zero values flatten the carrier',()=>{
  const frame=buildSections().frames.at(-1),a=buildFoldedBay(frame),b=buildFoldedBay(frame,{fold:0,buttress:0,longitudinal:0});
  const variation=mesh=>{const f=mesh.faces[0],g=mesh.faces[1];const normal=f=>{const[a,b,c]=f.map(i=>mesh.vertices[i]),n=cross(sub(b,a),sub(c,a)),l=Math.hypot(...n);return n.map(v=>v/l);};return Math.hypot(...sub(normal(f),normal(g)));};
  assert.ok(variation(a)>1e-4);assert.ok(variation(b)<1e-8);closed(b);
});
test('touching array bays remove internal caps and weld into one closed body',()=>{
  const single=buildFoldedBay(buildSections().frames.at(-1)),a=closed(single),array=repeatFoldedBay(single,{bays:5,gap:0},true),b=closed(array);
  const caps=single.faceKinds.filter(k=>k!=='shell').length;
  assert.equal(array.faces.length,single.faces.length*5-caps*4);
  assert.ok(Math.abs(b.volume-a.volume*5)<a.volume*1e-8);
});
test('separated bays are individually closed, outward-oriented volumes',()=>{
  const single=buildFoldedBay(buildSections().frames.at(-1)),array=repeatFoldedBay(single,{bays:3,gap:4},true);
  closed(array,3);assert.equal(array.faces.length,single.faces.length*3);
});
test('custom rule orders and section proportions preserve closed topology',()=>{
  for(const order of ['ECECECEC','CECECECE','EEEECCCC','CCCCEEEE','EEEEEEEE','CCCCCCCC'])for(const amount of [.05,.64,1]) {
    const p={width:30,height:180,web:.8,nave:.7,springing:.75};
    const frame=buildSections(p,[...order].map(kind=>({kind,amount}))).frames.at(-1);closed(buildFoldedBay(frame,p));
  }
});
test('maximum fold and bay depths produce no crossing panels at supported section extremes',()=>{
  for(const width of [30,130])for(const height of [50,180])for(const fold of [0,1]) {
    const p={width,height,depth:80,fold},mesh=buildFoldedBay(buildSections(p).frames.at(-1),p);closed(mesh);assertNoCrossingPanels(mesh);
  }
  for(const f of buildSections().frames)assertNoCrossingPanels(buildFoldedBay(f));
});
test('float32 STL round-trip remains watertight and preserves the actual folded coordinates',()=>{
  for(const array of [false,true]) {
    const mesh=repeatFoldedBay(buildFoldedBay(buildSections().frames.at(-1)),{},array),vertices=mesh.vertices.map(([x,y,z])=>[x,-z,y]);
    const buffer=encodeBinarySTL({vertices,faces:mesh.faces}),decoded=decodeBinarySTL(buffer,'closed-bay.stl');
    assert.equal(buffer.byteLength,84+50*mesh.faces.length);closed(decoded);
    for(let i=0;i<mesh.faces.length;i++)for(let j=0;j<3;j++)assert.deepEqual(decoded.vertices[decoded.faces[i][j]],vertices[mesh.faces[i][j]].map(Math.fround));
  }
});
test('integrity checks reject punctures, reversed faces, and duplicate faces',()=>{
  const mesh=buildFoldedBay(buildSections().frames.at(-1));
  assert.equal(meshIntegrity({...mesh,faces:mesh.faces.slice(1)}).watertight,false);
  assert.equal(meshIntegrity({...mesh,faces:[mesh.faces[0].slice().reverse(),...mesh.faces.slice(1)]}).watertight,false);
  assert.equal(meshIntegrity({...mesh,faces:[...mesh.faces,mesh.faces[0]]}).watertight,false);
});

test('every section peak has one isolated pinnacle tip above its entire collar',()=>{
  for(const pinnacle of [.15,.55,1])for(const slenderness of [0,1])for(const longitudinal of [0,1]) {
    const p={pinnacle,slenderness,longitudinal,buttress:1,depth:80,fold:1};
    const frame=buildSections(p).frames.at(-1),mesh=buildFoldedBay(frame,p);
    assert.equal(mesh.pinnacleTips.length,frame.branches*2+1);
    for(const tip of mesh.pinnacleTips) {
      const neighbors=new Set(mesh.faces.filter(f=>f.includes(tip)).flat());neighbors.delete(tip);
      for(const j of neighbors)assert.ok(mesh.vertices[j][1]<mesh.vertices[tip][1],`tip ${tip} falls below its collar`);
    }
    closed(mesh);assertNoCrossingPanels(mesh);
  }
});

test('longitudinal contraction opens the lower silhouette and keeps support planes grounded',()=>{
  const frame=buildSections().frames.at(-1),mesh=buildFoldedBay(frame),flat=buildFoldedBay(frame,{longitudinal:0});
  for(const z of [-DEFAULTS.depth/2,0,DEFAULTS.depth/2])assert.equal(Math.min(...mesh.vertices.filter(p=>p[2]===z).map(p=>p[1])),0);
  for(const sign of [-1,1]) {
    const station=mesh.vertices.filter(p=>Math.abs(p[2]-sign*DEFAULTS.depth*.22)<1e-7);
    assert.ok(Math.min(...station.map(p=>p[1]))>frame.pinnacles.at(-1).base*.3);
  }
  assert.equal(mesh.faces.length,flat.faces.length);assert.notDeepEqual(mesh.vertices,flat.vertices);
});

test('buttress projection changes the plan geometry without changing topology',()=>{
  const frame=buildSections().frames.at(-1),a=buildFoldedBay(frame,{buttress:0}),b=buildFoldedBay(frame,{buttress:1});
  assert.deepEqual(a.faces,b.faces);
  assert.ok(Math.max(...b.vertices.map(p=>p[0]))>Math.max(...a.vertices.map(p=>p[0]))*1.2);
  for(const mesh of [a,b])closed(mesh);
});

test('combined extreme proportions retain nonintersecting, pointed closed bays',()=>{
  for(const width of [30,130])for(const height of [50,180])for(const depth of [12,80])for(const pinnacle of [.15,1]) {
    const p={width,height,depth,pinnacle,longitudinal:1,buttress:1,fold:1,slenderness:0,nave:.75,springing:.8,web:.8};
    const frame=buildSections(p).frames.at(-1),mesh=buildFoldedBay(frame,p);
    closed(mesh);assertNoCrossingPanels(mesh);
    for(const tip of mesh.pinnacleTips)for(const f of mesh.faces.filter(f=>f.includes(tip)))for(const v of f)if(v!==tip)assert.ok(mesh.vertices[v][1]<mesh.vertices[tip][1]);
  }
});
