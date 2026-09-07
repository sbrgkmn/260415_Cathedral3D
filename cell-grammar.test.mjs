import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSections,alternatingRules,DEFAULTS,normalizeParameters,polygonArea,isSimple} from './cell-grammar.mjs';
import {sectionSVG} from './cell-drawing.mjs';
const key=([x,y])=>`${(Math.abs(x)<1e-6?0:x).toFixed(6)},${y.toFixed(6)}`;
function assertComplex(f){
  assert.ok(isSimple(f.points));
  assert.ok(Math.abs(f.area-f.cells.reduce((sum,c)=>sum+polygonArea(c.points),0))<1e-5);
  const mirror=new Set(f.points.map(key));
  for(const [x,y] of f.points){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&y>=0);assert.ok(mirror.has(key([-x,y])),`unpaired point ${x},${y}`);}
  const edges=new Map();
  for(const c of f.cells){assert.ok(isSimple(c.points));assert.ok(polygonArea(c.points)>0);for(let i=0;i<c.points.length;i++){const edge=[key(c.points[i]),key(c.points[(i+1)%c.points.length])].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}}
  assert.ok([...edges.values()].every(n=>n<=2));
  assert.equal([...edges.values()].filter(n=>n===1).length,f.points.length);
}
test('seed is exactly one solid triangle; default C steps produce a binary lineage',()=>{
  const s=buildSections();assert.deepEqual(s.frames[0].points,[[-42,0],[0,132],[42,0]]);
  assert.deepEqual(s.frames.map(f=>f.cells.length),[1,1,2,2,4,4,8]);
  assert.deepEqual(s.frames.map(f=>f.openingCount),[0,0,1,1,3,3,7]);
  for(const f of s.frames)assertComplex(f);
  assert.deepEqual(s.frames.at(-1).cells.map(c=>c.id),['0LLL','0LLR','0LRL','0LRR','0RLL','0RLR','0RRL','0RRR']);
});
test('E adds material and C removes material, with connected shared-edge partitions',()=>{
  for(const order of ['ECECECECEC','CECECECE','EEEECCCC','CCCCEEEE','CCCCCCCCCC','EEEEEEEEEE'])for(const amount of [.05,.62,1]){
    const s=buildSections({},[...order].map(kind=>({kind,amount})));
    for(let i=0;i<s.frames.length;i++){const f=s.frames[i];assertComplex(f);if(i)assert.ok(f.kind==='E'?f.area>=s.frames[i-1].area-1e-6:f.area<=s.frames[i-1].area+1e-6,`${order}, ${amount}, step ${i}`);}
  }
});
test('zero strength retains geometry and tiny contraction does not introduce a large opening',()=>{
  const s=buildSections({},[{kind:'E',amount:0},{kind:'C',amount:0}]);
  for(const f of s.frames){assert.deepEqual(f.points,s.frames[0].points);assert.equal(f.cells.length,1);}
  const tiny=buildSections({},[{kind:'C',amount:.001}]);assert.ok(tiny.frames[0].area-tiny.frames[1].area<1);
});
test('later C steps move shared crowns consistently in all descendant cells',()=>{
  const s=buildSections(),first=s.frames[2],next=s.frames[4];
  const tip=f=>f.points.filter(([x,y])=>Math.abs(x)<1e-6&&y<DEFAULTS.height).at(-1);
  assert.ok(tip(next)[1]>tip(first)[1]);
  for(const [a,b] of next.seams)for(const point of [a,b])assert.ok(next.cells.filter(c=>c.points.some(p=>key(p)===key(point))).length>=2);
});
test('selected rule edits regenerate descendants without changing earlier frames',()=>{
  const rules=alternatingRules(),a=buildSections({},rules);rules[3]={kind:'E',amount:.8};const b=buildSections({},rules);
  assert.deepEqual(a.frames.slice(0,4),b.frames.slice(0,4));assert.notDeepEqual(a.frames.at(-1).points,b.frames.at(-1).points);
});
test('child scale and vertical bias control geometry, while band limits stop tiny splits',()=>{
  const a=buildSections({scale:.4}),b=buildSections({scale:.8});assert.notDeepEqual(a.frames.at(-1).points,b.frames.at(-1).points);
  const low=buildSections({bias:1}),high=buildSections({bias:5});assert.ok(high.frames[1].area>low.frames[1].area);
  for(const web of [.3,2]){const s=buildSections({web},alternatingRules(10));for(const f of s.frames)assertComplex(f);assert.ok(s.frames.at(-1).cells.length<=32);}
});
test('extreme seed proportions and rule strengths preserve valid cell complexes',()=>{
  for(const width of [40,140])for(const height of [60,180])for(const amount of [.05,1])for(const bias of [1,5]){
    const s=buildSections({width,height,bias,web:.3,scale:.8},alternatingRules(8,{expansion:amount,contraction:amount}));for(const f of s.frames)assertComplex(f);
  }
});
test('snapshots are independent and inputs normalize safely',()=>{
  const s=buildSections();s.frames.at(-1).cells[0].points[0][0]=999;assert.equal(s.frames[0].points[0][0],-42);
  assert.equal(normalizeParameters({width:NaN}).width,84);assert.equal(normalizeParameters({bias:100}).bias,5);
});
test('cell drawings expose actual partitions and share sequence bounds',()=>{
  const s=buildSections(),svg=sectionSVG(s.frames[6],s.bounds,{cells:true});assert.ok(svg.includes('Cell 0LLL'));assert.ok(svg.includes('parent 0LL'));
  assert.equal(svg.match(/viewBox="([^"]+)"/)[1],sectionSVG(s.frames[0],s.bounds).match(/viewBox="([^"]+)"/)[1]);
});
