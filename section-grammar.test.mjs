import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSections,alternatingRules,DEFAULTS,normalizeParameters,roofHeight,polygonArea,bayOffsets,svgPath} from './section-grammar.mjs';
import {sectionSVG} from './section-drawing.mjs';
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function assertSimple(points) {
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length];
    assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>1e-9,'zero-length contour edge');
    for(let j=i+2;j<points.length;j++) {
      if(i===0&&j===points.length-1)continue;
      const c=points[j],d=points[(j+1)%points.length];
      assert.ok(!(cross(a,b,c)*cross(a,b,d)<-1e-12 && cross(c,d,a)*cross(c,d,b)<-1e-12),'crossing boundary edges');
    }
  }
}
test('seed is precisely one solid triangle',()=>{
  const {frames}=buildSections({},[]);
  assert.deepEqual(frames[0].points,[[-32,0],[0,110],[32,0]]);
  assert.equal(frames[0].area,64*110/2);assert.equal(frames[0].openings.length,0);
});
test('default sequence creates nave, paired aisles, and smaller recursive buttresses',()=>{
  const s=buildSections();
  assert.deepEqual(s.frames.map(f=>f.kind),['S','E','C','E','C','E','C']);
  assert.deepEqual(s.frames.map(f=>f.openings.length),[0,0,1,1,3,3,5]);
  assert.deepEqual(s.frames.map(f=>f.branches),[0,1,1,2,2,3,3]);
  const roof=s.frames.at(-1).roof, peaks=roof.filter((p,i)=>i&&i<roof.length-1&&p[1]>roof[i-1][1]&&p[1]>roof[i+1][1]);
  assert.equal(peaks.length,3);
  for(let i=1;i<peaks.length;i++)assert.ok(peaks[i][0]>peaks[i-1][0]&&peaks[i][1]<peaks[i-1][1]);
});
test('expansion adds area, preserves voids, and works on the previous outer slope',()=>{
  const s=buildSections();
  for(let i=1;i<s.frames.length;i++) {
    const a=s.frames[i-1],b=s.frames[i];if(b.kind!=='E')continue;
    assert.ok(b.area>a.area);assert.deepEqual(b.openings,a.openings);
    assert.deepEqual(b.baseRoof.slice(0,a.baseRoof.length-1),a.baseRoof.slice(0,-1));
    assert.ok(b.roof.at(-1)[0]>a.roof.at(-1)[0]);
    for(let x=0;x<a.roof.at(-1)[0];x+=.05)assert.ok(roofHeight(b.roof,x)>=roofHeight(a.roof,x)-1e-8);
  }
});
test('contraction narrows pinnacle collars while preserving the carrier roof, tips, arch apices, and feet',()=>{
  const s=buildSections();
  for(let i=1;i<s.frames.length;i++) {
    const a=s.frames[i-1],b=s.frames[i];if(b.kind!=='C')continue;
    assert.ok(b.area<a.area);assert.deepEqual(b.baseRoof,a.baseRoof);
    for(let k=0;k<a.pinnacles.length;k++) {
      assert.equal(b.pinnacles[k].tip,a.pinnacles[k].tip);
      assert.ok(b.pinnacles[k].neck<a.pinnacles[k].neck);
    }
    for(const old of a.openings) {
      const next=b.openings.find(o=>o.center===old.center);
      assert.deepEqual(next.half[0],old.half[0]);assert.deepEqual(next.half.at(-1),old.half.at(-1));
      assert.equal(next.half.length,2*old.half.length-1);
      for(const point of old.half)assert.ok(next.half.some(p=>p[0]===point[0]&&p[1]===point[1]));
    }
  }
});
test('zero-strength rules retain the exact contour',()=>{
  const s=buildSections({},[{kind:'E',amount:0},{kind:'C',amount:0}]);
  for(const f of s.frames)assert.deepEqual(f.points,s.frames[0].points);
});
test('rule ordering and a selected-step edit affect only that stage and its descendants',()=>{
  const rules=alternatingRules(), a=buildSections({},rules);
  rules[3]={kind:'E',amount:.82};const b=buildSections({},rules);
  assert.deepEqual(a.frames.slice(0,4),b.frames.slice(0,4));assert.notDeepEqual(a.frames[4].points,b.frames[4].points);
  assert.equal(b.frames[4].kind,'E');assert.notDeepEqual(a.frames.at(-1).points,b.frames.at(-1).points);
});
test('custom orders and parameter extremes keep simple, symmetric, finite sections',()=>{
  const cases=['ECECECEC','CECECECE','EEEECCCC','CCCCEEEE','EEEEEEEE','CCCCCCCC','EECCCECE'];
  for(const width of [30,130])for(const height of [50,180])for(const amount of [.05,.64,1])for(const order of cases) {
    const s=buildSections({width,height},[...order].map(kind=>({kind,amount})));
    for(let i=0;i<s.frames.length;i++) {
      const f=s.frames[i];assertSimple(f.points);assert.ok(f.area>0);
      const keys=new Set(f.points.map(([x,y])=>`${x.toFixed(6)},${y.toFixed(6)}`));
      for(const [x,y] of f.points){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&y>=0);assert.ok(keys.has(`${(-x).toFixed(6)},${y.toFixed(6)}`)||Math.abs(x)<1e-8);}
      for(const opening of f.openings)for(const [x,y] of opening.half)for(const sign of [-1,1])assert.ok(y<roofHeight(f.roof,opening.center+sign*x),'openings must leave connecting material');
      if(i)assert.ok(f.kind==='E'?f.area>=s.frames[i-1].area-1e-6:f.area<=s.frames[i-1].area+1e-6,'polarity must agree with area change');
    }
  }
});
test('ten recursive cuts are bounded and leave no intersecting openings',()=>{
  const s=buildSections({},Array.from({length:10},()=>({kind:'C',amount:1}))),f=s.frames.at(-1);
  assert.ok(f.points.length<10000);assert.ok(f.area>0);
  for(let i=1;i<f.openings.length;i++)assert.ok(f.openings[i].center-f.openings[i].half.at(-1)[0]>f.openings[i-1].center+f.openings[i-1].half.at(-1)[0]);
});
test('snapshots and caller parameters are independent and repeatable',()=>{
  const rules=alternatingRules(),s=buildSections(DEFAULTS,rules),other=buildSections(DEFAULTS,rules);
  assert.deepEqual(s,other);s.frames.at(-1).roof[0][1]=0;s.frames[2].openings[0].half[0][1]=0;
  assert.equal(s.frames[0].roof[0][1],DEFAULTS.height);assert.equal(DEFAULTS.height,110);assert.equal(rules[0].amount,.64);
});
test('array positions preserve bay dimensions, spacing, and central alignment',()=>{
  assert.deepEqual(bayOffsets(DEFAULTS,false),[0]);
  const positions=bayOffsets(DEFAULTS,true);assert.equal(positions.length,5);
  near(positions.reduce((s,x)=>s+x,0),0);
  for(let i=1;i<positions.length;i++)near(positions[i]-positions[i-1],DEFAULTS.depth+DEFAULTS.gap);
  assert.deepEqual(bayOffsets({...DEFAULTS,bays:2,gap:0},true),[-21,21]);
});
test('SVG is generated from the actual selected contour at shared sequence bounds',()=>{
  const s=buildSections(),f=s.frames.at(-1),svg=sectionSVG(f,s.bounds);
  assert.ok(svg.includes(svgPath(f.points)));assert.ok(svg.includes('NAVE'));
  assert.equal(sectionSVG(s.frames[0],s.bounds).match(/viewBox="([^"]+)"/)[1],svg.match(/viewBox="([^"]+)"/)[1]);
  assert.equal(polygonArea(f.points),f.area);
});
test('inputs and recursion limits are normalized',()=>{
  const p=normalizeParameters({width:-5,height:Infinity,depth:100,bays:4.6});
  assert.equal(p.width,30);assert.equal(p.height,110);assert.equal(p.depth,80);assert.equal(p.bays,5);
  assert.equal(buildSections({},alternatingRules(100)).rules.length,10);
});
test('successive contractions establish vertical piers before refining the pointed vault',()=>{
  for(const springing of [.35,.60,.8]) {
    const s=buildSections({springing}),nave=s.frames[4].openings.find(o=>o.center===0),final=s.frames[6].openings.find(o=>o.center===0);
    const radius=nave.half.at(-1)[0];
    near(nave.half[1][0],radius);near(nave.half[1][1],nave.springing);
    assert.ok(nave.springing<=nave.half[0][1]*springing+1e-7);
    if(springing<=.6)near(nave.half[1][1],nave.half[0][1]*springing);
    else assert.equal(nave.springingLimited,true,'high springing must preserve the roof clearance');
    for(const point of final.half.filter(p=>p[1]<=nave.springing+1e-7))near(point[0],radius);
    assert.ok(final.half.filter(p=>p[1]>nave.springing).length>1,'pointed vault should subdivide above the piers');
  }
});
test('minimum web reserves roof material through arch refinements',()=>{
  for(const web of [.8,2.4,6]) {
    const s=buildSections({web});
    for(const f of s.frames)for(const opening of f.openings)for(let i=1;i<opening.half.length;i++) {
      const a=opening.half[i-1],b=opening.half[i];
      for(let t=0;t<=1;t+=.05)for(const sign of [-1,1]) {
        const x=opening.center+sign*(a[0]+(b[0]-a[0])*t),y=a[1]+(b[1]-a[1])*t;
        assert.ok(roofHeight(f.roof,x)-y>=web-1e-6);
      }
    }
  }
});

test('pinnacle rise and slenderness change proportions without adding branches',()=>{
  const low=buildSections({pinnacle:.15}).frames.at(-1),high=buildSections({pinnacle:1}).frames.at(-1);
  const broad=buildSections({slenderness:0}).frames.at(-1),slender=buildSections({slenderness:1}).frames.at(-1);
  assert.equal(low.branches,high.branches);assert.equal(low.points.length,high.points.length);
  assert.deepEqual(low.openings,high.openings);
  for(let i=0;i<low.pinnacles.length;i++)assert.ok(high.pinnacles[i].tip>low.pinnacles[i].tip);
  for(let i=0;i<broad.pinnacles.length;i++) {
    assert.ok(slender.pinnacles[i].neck<broad.pinnacles[i].neck);
    assert.equal(slender.pinnacles[i].tip,broad.pinnacles[i].tip);
  }
});
