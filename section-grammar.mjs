// A section grammar, in X / height coordinates. 3D is derived from this contour.
export const DEFAULTS = Object.freeze({ width: 64, height: 110, expansion: .64, contraction: .68, springing: .60, nave: .58, web: 2.4, pinnacle: .55, slenderness: .72, buttress: .65, longitudinal: .8, depth: 42, fold: .72, bays: 5, gap: 0 });
const clamp = (v, lo, hi, fallback) => Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : fallback;
const copy = value => JSON.parse(JSON.stringify(value));
export function normalizeParameters(input = {}) {
  return Object.fromEntries(Object.entries({width:[30,130],height:[50,180],expansion:[0,1],contraction:[0,1],springing:[.35,.8],nave:[.4,.75],web:[.8,6],pinnacle:[.15,1],slenderness:[0,1],buttress:[0,1],longitudinal:[0,1],depth:[12,80],fold:[0,1],bays:[2,8],gap:[0,12]}).map(([k,[lo,hi]]) => [k, k === 'bays' ? Math.round(clamp(input[k],lo,hi,DEFAULTS[k])) : clamp(input[k],lo,hi,DEFAULTS[k])]));
}
export function alternatingRules(count = 6, p = DEFAULTS) {
  return Array.from({length:Math.max(0,Math.min(10,Math.round(count)))}, (_,i) => ({kind:i % 2 ? 'C' : 'E', amount:i % 2 ? p.contraction : p.expansion}));
}
export function roofHeight(roof, x) {
  x = Math.abs(x);
  for (let i = 1; i < roof.length; i++) {
    const a = roof[i-1], b = roof[i];
    if (x <= b[0] + 1e-8) return a[1] + (b[1]-a[1]) * (x-a[0]) / (b[0]-a[0]);
  }
  return 0;
}
function archPath(arch) {
  return arch.half.slice(1).reverse().map(([x,y])=>[arch.center-x,y]).concat(arch.half.map(([x,y])=>[arch.center+x,y]));
}
function allOpenings(state) {
  const openings = state.openings.flatMap(o => o.center === 0 ? [copy(o)] : [{...copy(o),center:-o.center},copy(o)]);
  return openings.sort((a,b)=>a.center-b.center);
}
function contour(state) {
  const roof = state.roof.slice(1).reverse().map(([x,y])=>[-x,y]).concat(copy(state.roof));
  const foot = state.roof.at(-1)[0];
  const floor = [[-foot,0],...allOpenings(state).flatMap(archPath),[foot,0]];
  return roof.concat(floor.slice(1,-1).reverse());
}
// Keep the load-carrying roof separate from its local, additive spires. A C
// narrows each existing collar; it never cuts into the roof reserved for arches.
function articulateRoof(state,p) {
  if(!state.branches)return {roof:copy(state.roof),carrierRoof:copy(state.roof),pinnacles:[]};
  const roof=[],carrierRoof=[],pinnacles=[];
  for(let i=0;i<state.roof.length;i++) {
    const point=state.roof[i],previous=state.roof[i-1],next=state.roof[i+1];
    if(!next||(previous&&!(point[1]>previous[1]&&point[1]>next[1]))) {
      roof.push(copy(point));carrierRoof.push(copy(point));continue;
    }
    const age=state.refinements[i===0?0:Math.floor(i/2)]??0;
    const span=Math.min(previous?point[0]-previous[0]:next[0]-point[0],next[0]-point[0]);
    // Slenderness and successive C rules contract a fixed shoulder footprint.
    const width=span*.34,neck=.78-(.22+.28*p.slenderness)*(1-Math.exp(-age));
    const rise=point[1]*(.10+.48*p.pinnacle),stem=rise*.25;
    const left=[point[0]-width,roofHeight(state.roof,point[0]-width)];
    const right=[point[0]+width,roofHeight(state.roof,point[0]+width)];
    const feature={center:point[0],base:point[1],tip:point[1]+rise,stem:point[1]+stem,width,neck,left,right,age};
    pinnacles.push(feature);
    if(i) {roof.push(left,[point[0]-width*neck,feature.stem]);carrierRoof.push(left);}
    roof.push([point[0],feature.tip],[point[0]+width*neck,feature.stem],right);
    carrierRoof.push(copy(point),right);
  }
  return {roof,carrierRoof,pinnacles};
}
function archIsSafe(state, arch, web) {
  const points = archPath(arch);
  for (let i=1;i<points.length;i++) {
    const [a,b]=[points[i-1],points[i]];
    if(Math.abs(b[0]-a[0])<1e-10) {
      if(Math.max(a[1],b[1])>roofHeight(state.roof,a[0])-web+1e-7)return false;
      continue;
    }
    const xs=[a[0],b[0],...state.roof.flatMap(p=>[p[0],-p[0]]).filter(x=>x>a[0]&&x<b[0])];
    for (const x of xs) {
      const z=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
      if (z>roofHeight(state.roof,x)-web+1e-7) return false;
    }
  }
  return true;
}
function fitOpening(state, center, radius, wantedHeight, web) {
  let lo=0, hi=wantedHeight;
  for(let i=0;i<40;i++) {
    const h=(lo+hi)/2;
    if(archIsSafe(state,{center,half:[[0,h],[radius,0]]},web)) lo=h; else hi=h;
  }
  return {center,half:[[0,lo],[radius,0]],generation:0,springing:0};
}
function expand(state, amount, p) {
  if(amount === 0) return {motions:[],guides:[],note:'Zero expansion: the section is retained.'};
  const [a,b]=state.roof.slice(-2), dx=b[0]-a[0];
  // Replace only the active outer slope. Its shorter child slope becomes
  // the next recursion site. Both inserted points lie above their parent edge.
  if(dx<p.width*.0001||a[1]<p.height*.0001)return {motions:[],guides:[],note:'The outer branch has reached the detail limit. Earlier tiers are retained.',title:'Retain the outer tier',target:'Smallest outer slope',invariant:'Existing structure',result:'Detail limit reached'};
  const valley=[a[0]+dx*.62,a[1]*(.38+.29*amount)];
  const peak=[a[0]+dx*.86,a[1]*(.14+.86*amount)];
  const foot=[b[0]+dx*.60*amount,0];
  const fromValley=[valley[0],a[1]*.38], fromPeak=[peak[0],a[1]*.14];
  state.roof.splice(-1,1,valley,peak,foot);
  state.branchFeet.push(foot[0]);
  state.branches++;
  state.refinements.push(0);
  state.construction.push([copy(a),copy(b)],[copy(peak),[peak[0],0]]);
  return {motions:[[fromValley,valley],[fromPeak,peak],[copy(b),foot]],guides:[[copy(a),copy(b)]],title:state.branches===1?'Establish the buttresses':state.branches===2?'Branch the side aisles':'Grow the outer pinnacles',target:`Outer slope · tier ${state.branches}`,invariant:'Earlier peaks and openings',result:`Buttress pair ${state.branches}`,note:`E${state.branches}: split the outer slope, raise a subordinate pinnacle, and extend its foot. The smaller child slope carries the next expansion.`};
}
function contract(state, amount, p) {
  if(amount === 0) return {motions:[],guides:[],note:'Zero contraction: the section is retained.'};
  state.refinements=state.refinements.map(age=>age+amount);
  const R=p.width/2, web=p.web, pier=Math.max(web,R*.045), motions=[], guides=[];
  // Subdivision moves each new arch point horizontally into the black mass.
  // Previous apices and feet remain fixed. Fit against the actual roof, including
  // its valleys, so repeated operations cannot sever the web above an opening.
  for(const opening of state.openings) {
    const before=copy(opening.half), refined=[before[0]];
    for(let i=1;i<before.length;i++) {
      const [a,b]=[before[i-1],before[i]];
      const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
      const establish=opening.generation===0;
      let spring=a[1]*p.springing;
      if(establish) {
        let low=0,high=spring;
        for(let n=0;n<32;n++) {
          const h=(low+high)/2,candidate={...opening,half:[a,[b[0],h],b]};
          if(archIsSafe(state,candidate,web))low=h;else high=h;
        }
        opening.springingLimited=low<spring-1e-6;spring=low;
      }
      const desired=establish ? [b[0],spring] : [mid[0]+(b[0]-a[0])*.30*amount,mid[1]];
      // The first refinement opens the nave up to a vertical springing line.
      // Later refinements segment only the arch; collinear pier edges stay vertical.
      let lo=0, hi=establish?Math.min(1,amount/.45):1;
      for(let n=0;n<30;n++) {
        const t=(lo+hi)/2, point=mid.map((v,k)=>v+(desired[k]-v)*t);
        const candidate={...opening,half:[...before.slice(0,i),point,...before.slice(i)]};
        if(archIsSafe(state,candidate,web)) lo=t; else hi=t;
      }
      const next=mid.map((v,k)=>v+(desired[k]-v)*lo);
      if(establish&&Math.abs(next[0]-b[0])<1e-7)next[0]=b[0];
      if(establish)opening.springing=next[1];
      refined.push(next,b);
      for(const sign of [-1,1]) motions.push([[opening.center+sign*mid[0],mid[1]],[opening.center+sign*next[0],next[1]]]);
      guides.push([[opening.center+a[0],a[1]],[opening.center+b[0],b[1]]]);
    }
    opening.half=refined; opening.generation++;
  }
  let added;
  if(!state.openings.length) {
    added=fitOpening(state,0,R*p.nave*(.72+.28*amount),p.height*(.59+.29*amount),web);
  } else {
    const outer=state.openings.at(-1);
    const start=outer.center+outer.half.at(-1)[0]+pier;
    const limit=state.branchFeet.find(x=>x-start>R*.15) ?? state.roof.at(-1)[0];
    const end=limit-pier;
    if(end-start>R*.09) {
      const center=(start+end)/2;
      added=fitOpening(state,center,(end-start)/2,roofHeight(state.roof,center)*(.59+.26*amount),web);
      if(added.half[0][1]<web*2) added=undefined;
    }
  }
  if(added&&added.half[0][1]>web*.25) {
    state.openings.push(added);
    motions.push([[added.center,0],[added.center,added.half[0][1]]]);
  }
  const generation=state.openings[0]?.generation??0;
  const limited=state.openings.some(o=>o.springingLimited);
  const note=generation===0?'C1: contract the mass from below to open the central nave. Retain the roof apex and a continuous web above the opening.':generation===1?'C2: open the nave up to its springing line, retaining the crown and feet. Cut a lower pair of side aisles between the buttress tiers.':'C: subdivide the arch shoulders into smaller pointed facets. Preserve vertical pier zones and refine the subordinate aisles.';
  return {motions,guides,title:generation===0?'Open the nave':generation===1?'Establish the springing':'Refine the pointed arches',target:generation===0?'Solid ground interval':'Existing arch sides and outer pier interval',invariant:'Roof, arch crowns and pier feet',result:generation===0?'Central pointed nave':generation===1?'Vertical piers and side aisles':'Segmented ogives and smaller aisles',note:note+(limited?' Springing height is limited where needed to retain the minimum roof web.':'')};
}
export function polygonArea(points) {
  return Math.abs(points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
}
export function buildSections(input = {}, inputRules) {
  const parameters=normalizeParameters(input);
  const rules=(inputRules ?? alternatingRules(6,parameters)).slice(0,10).map(r=>({kind:r.kind==='C'?'C':'E',amount:clamp(r.amount,0,1,r.kind==='C'?parameters.contraction:parameters.expansion)}));
  const state={roof:[[0,parameters.height],[parameters.width/2,0]],openings:[],branchFeet:[],branches:0,construction:[],refinements:[0]};
  const frames=[];
  const snapshot=(kind,amount,operation) => {
    const {roof,carrierRoof,pinnacles}=articulateRoof(state,parameters);
    const points=contour({...state,roof}), openings=allOpenings(state);
    const details=copy(operation);
    if(pinnacles.length&&amount>0) {
      details.note+=(kind==='E'?' Each new peak grows a raised stem and a pointed crown.':' Contract the pinnacle collars into narrower stems, retaining every tip. In the bay, lift the longitudinal spans between grounded support planes.');
      details.invariant=kind==='C'?'Roof web, pinnacle tips, arch crowns and feet':details.invariant;
    }
    frames.push({index:frames.length,kind,amount,points,roof,baseRoof:copy(state.roof),carrierPoints:contour({...state,roof:carrierRoof}),pinnacles,openings,branches:state.branches,construction:copy(state.construction),area:polygonArea(points),...details});
  };
  snapshot('S',0,{motions:[],guides:[],title:'The triangular seed',target:'One triangle',invariant:'Bilateral axis',result:'Undivided section',note:'A single, solid triangle. Every later section develops from this seed through mirrored expansion and contraction.'});
  for(const rule of rules) snapshot(rule.kind,rule.amount,rule.kind==='E'?expand(state,rule.amount,parameters):contract(state,rule.amount,parameters));
  const final=frames.at(-1), halfWidth=final.roof.at(-1)[0];
  return {parameters,rules,frames,bounds:{minX:-halfWidth,maxX:halfWidth,minY:0,maxY:Math.max(...frames.flatMap(f=>f.roof.map(p=>p[1])))}};
}
export function bayOffsets(parameters, array = false) {
  const p=normalizeParameters(parameters), count=array?p.bays:1;
  return Array.from({length:count},(_,i)=>(i-(count-1)/2)*(p.depth+p.gap));
}
export function svgPath(points) { return points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(5)},${(-p[1]).toFixed(5)}`).join(' ')+' Z'; }
